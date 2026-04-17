import { getAppleMusicDeveloperToken } from "@/services/appleMusic";

export interface AppleMusicCatalogMatch {
  id: string;
  previewUrl?: string;
  artworkUrl?: string;
  storefront: string;
}

type Listener = (songId: string) => void;

/** Cache in memoria: songId → match Apple Music catalog */
const songIdCache = new Map<string, AppleMusicCatalogMatch | null>();
/** Cache parallela per query (title|artist) — evita round-trip duplicati tra card e dock */
const queryCache = new Map<string, AppleMusicCatalogMatch | null>();
const inflight = new Map<string, Promise<AppleMusicCatalogMatch | null>>();
const listeners = new Set<Listener>();

function notify(songId: string) {
  for (const fn of listeners) fn(songId);
}

function normalizeQueryKey(title: string, artist: string): string {
  return `${title.trim().toLowerCase()}||${artist.trim().toLowerCase()}`;
}

function storefrontFromHint(hint?: string): string {
  const raw = (hint ?? (typeof navigator !== "undefined" ? navigator.language : "")).toLowerCase();
  const region = raw.includes("-") ? raw.split("-")[1] : raw;
  const map: Record<string, string> = {
    it: "it", en: "us", gb: "gb", uk: "gb", us: "us",
    fr: "fr", de: "de", es: "es", pt: "pt", br: "br", jp: "jp",
    ca: "ca", au: "au", mx: "mx", nl: "nl",
  };
  return map[region] || "us";
}

function uniqueStorefronts(primary: string): string[] {
  return [...new Set([primary, "us", "gb", "it"])];
}

async function searchAppleCatalog(
  query: string,
  storefront: string,
  token: string,
): Promise<AppleMusicCatalogMatch | null> {
  try {
    const res = await fetch(
      `https://api.music.apple.com/v1/catalog/${storefront}/search?types=songs&limit=5&term=${encodeURIComponent(query)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      results?: {
        songs?: {
          data?: Array<{
            id: string;
            attributes?: {
              previews?: Array<{ url?: string }>;
              artwork?: { url?: string };
            };
          }>;
        };
      };
    };
    const hit = data.results?.songs?.data?.[0];
    if (!hit?.id) return null;
    return {
      id: hit.id,
      previewUrl: hit.attributes?.previews?.[0]?.url,
      artworkUrl: (hit.attributes?.artwork?.url || "").replace("{w}", "300").replace("{h}", "300"),
      storefront,
    };
  } catch {
    return null;
  }
}

export interface ResolveInput {
  songId: string;
  title: string;
  artist: string;
  languageHint?: string;
}

/** Cerca il brano nel catalogo Apple Music lato client. Risolutore “best-effort”, risultato memorizzato in cache. */
export async function resolveAppleMusicSong(input: ResolveInput): Promise<AppleMusicCatalogMatch | null> {
  if (songIdCache.has(input.songId)) return songIdCache.get(input.songId) ?? null;
  const qKey = normalizeQueryKey(input.title, input.artist);
  if (queryCache.has(qKey)) {
    const cached = queryCache.get(qKey) ?? null;
    songIdCache.set(input.songId, cached);
    if (cached) notify(input.songId);
    return cached;
  }

  const existing = inflight.get(qKey);
  if (existing) {
    const cached = await existing;
    songIdCache.set(input.songId, cached);
    if (cached) notify(input.songId);
    return cached;
  }

  const pending = (async () => {
    const token = await getAppleMusicDeveloperToken();
    if (!token) return null;
    const query = `${input.artist} ${input.title}`.trim();
    if (!query) return null;
    const primary = storefrontFromHint(input.languageHint);
    for (const storefront of uniqueStorefronts(primary)) {
      const match = await searchAppleCatalog(query, storefront, token);
      if (match) return match;
    }
    return null;
  })();
  inflight.set(qKey, pending);

  const result = await pending;
  inflight.delete(qKey);
  // Solo i match positivi vengono messi in cache: i null vengono riprovati se cambiano token/rete.
  if (result) {
    queryCache.set(qKey, result);
    songIdCache.set(input.songId, result);
    notify(input.songId);
  }
  return result;
}

export function getResolvedAppleMusic(songId: string): AppleMusicCatalogMatch | null {
  return songIdCache.get(songId) ?? null;
}

export function subscribeAppleMusicResolution(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Test-only: svuota tutte le cache (usato dal logout/unauthorize). */
export function clearAppleMusicEnrichmentCache(): void {
  songIdCache.clear();
  queryCache.clear();
  inflight.clear();
}
