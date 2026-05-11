import { normalizeQueryKey } from "@/lib/trackKeyNormalize";
import { getAppleMusicDeveloperToken } from "@/services/appleMusic";
import {
  fetchAppleMatchFromStreamingCache,
  mergeStreamingIdsToCache,
} from "@/services/trackStreamingIdCache";
import type { AppleMusicCatalogMatch } from "@/services/streamingCatalogTypes";

export type { AppleMusicCatalogMatch } from "@/services/streamingCatalogTypes";

type Listener = (songId: string) => void;

const SESSION_PREFIX = "echoes_am_v1:";
const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7; // 7 giorni

/** Cache in memoria: songId → match Apple Music catalog (o `null` se risoluzione tentata senza match) */
const songIdCache = new Map<string, AppleMusicCatalogMatch | null>();
/** Cache parallela per query (title|artist) — evita round-trip duplicati tra card e dock */
const queryCache = new Map<string, AppleMusicCatalogMatch | null>();
type InflightResult = { match: AppleMusicCatalogMatch | null };

const inflight = new Map<string, Promise<InflightResult>>();
const listeners = new Set<Listener>();

function stableQueryHash(key: string): string {
  let h = 5381;
  for (let i = 0; i < key.length; i++) h = Math.imul(h, 33) ^ key.charCodeAt(i);
  return (h >>> 0).toString(36);
}

type SessionPayload = { id: string; previewUrl?: string; artworkUrl?: string; storefront: string; savedAt: number };

function readSessionMatch(qKey: string): AppleMusicCatalogMatch | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_PREFIX + stableQueryHash(qKey));
    if (!raw) return null;
    const p = JSON.parse(raw) as SessionPayload;
    if (!p?.id || !p.storefront || typeof p.savedAt !== "number") return null;
    if (Date.now() - p.savedAt > SESSION_MAX_AGE_MS) {
      sessionStorage.removeItem(SESSION_PREFIX + stableQueryHash(qKey));
      return null;
    }
    return {
      id: p.id,
      previewUrl: p.previewUrl,
      artworkUrl: p.artworkUrl,
      storefront: p.storefront,
    };
  } catch {
    return null;
  }
}

function writeSessionMatch(qKey: string, m: AppleMusicCatalogMatch): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    const payload: SessionPayload = {
      id: m.id,
      previewUrl: m.previewUrl,
      artworkUrl: m.artworkUrl,
      storefront: m.storefront,
      savedAt: Date.now(),
    };
    sessionStorage.setItem(SESSION_PREFIX + stableQueryHash(qKey), JSON.stringify(payload));
  } catch {
    // quota / private mode
  }
}

function clearSessionAppleMatches(): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k?.startsWith(SESSION_PREFIX)) keys.push(k);
    }
    for (const k of keys) sessionStorage.removeItem(k);
  } catch {
    /* ignore */
  }
}

function notify(songId: string) {
  for (const fn of listeners) fn(songId);
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

/** Storefront effettivo dell'utente in MusicKit, se autorizzato. Va sempre privilegiato rispetto
 *  alla lingua del browser: la riproduzione passa per lo storefront di MusicKit e un ID
 *  trovato in un altro storefront genera CONTENT_UNAVAILABLE. */
function storefrontFromMusicKit(): string | null {
  try {
    const mk = (window as unknown as { MusicKit?: { getInstance: () => { storefrontId?: string | null } } }).MusicKit;
    const sf = mk?.getInstance().storefrontId?.toLowerCase();
    return sf && sf.length >= 2 ? sf : null;
  } catch {
    return null;
  }
}

function uniqueStorefronts(primary: string): string[] {
  return [...new Set([primary, "us", "gb", "it"])];
}

async function searchAppleCatalog(
  query: string,
  storefront: string,
  token: string,
  signal?: AbortSignal,
): Promise<AppleMusicCatalogMatch | null> {
  try {
    const res = await fetch(
      `https://api.music.apple.com/v1/catalog/${storefront}/search?types=songs&limit=3&term=${encodeURIComponent(query)}`,
      { headers: { Authorization: `Bearer ${token}` }, signal },
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

/** Primo storefront che risponde con un match; annulla le altre richieste in corso. */
async function searchFirstAcrossStorefronts(
  query: string,
  storefronts: string[],
  token: string,
): Promise<AppleMusicCatalogMatch | null> {
  if (storefronts.length === 0) return null;
  if (storefronts.length === 1) {
    return searchAppleCatalog(query, storefronts[0], token);
  }
  const ac = new AbortController();
  return new Promise((resolve) => {
    let settled = false;
    let pending = storefronts.length;
    const finish = (m: AppleMusicCatalogMatch | null) => {
      if (settled) return;
      if (m) {
        settled = true;
        ac.abort();
        resolve(m);
        return;
      }
      pending -= 1;
      if (pending <= 0) {
        settled = true;
        resolve(null);
      }
    };
    for (const sf of storefronts) {
      void searchAppleCatalog(query, sf, token, ac.signal)
        .then((m) => finish(m))
        .catch(() => finish(null));
    }
  });
}

export interface ResolveInput {
  songId: string;
  title: string;
  artist: string;
  languageHint?: string;
  /** ID traccia Spotify (senza prefisso `spotify:track:`) se noto — accoppiato in cache con l’ID Apple. */
  spotifyTrackId?: string;
}

/** Cerca il brano nel catalogo Apple Music lato client. Risolutore “best-effort”, risultato memorizzato in cache. */
export async function resolveAppleMusicSong(input: ResolveInput): Promise<AppleMusicCatalogMatch | null> {
  const userSf = storefrontFromMusicKit();
  /** Se l'utente è autorizzato a uno storefront specifico (es. "it") e abbiamo in cache un match risolto
   *  in un altro storefront, MusicKit darebbe CONTENT_UNAVAILABLE. Ri-risolviamo. */
  const isStaleForUserStorefront = (m: AppleMusicCatalogMatch | null): boolean =>
    !!(m && userSf && m.storefront && m.storefront.toLowerCase() !== userSf);

  const cachedById = songIdCache.has(input.songId) ? (songIdCache.get(input.songId) ?? null) : undefined;
  if (cachedById !== undefined && !isStaleForUserStorefront(cachedById)) return cachedById;

  const qKey = normalizeQueryKey(input.title, input.artist);
  if (queryCache.has(qKey)) {
    const cached = queryCache.get(qKey) ?? null;
    if (!isStaleForUserStorefront(cached)) {
      songIdCache.set(input.songId, cached);
      notify(input.songId);
      return cached;
    }
    queryCache.delete(qKey);
  }

  const fromSession = readSessionMatch(qKey);
  if (fromSession && !isStaleForUserStorefront(fromSession)) {
    queryCache.set(qKey, fromSession);
    songIdCache.set(input.songId, fromSession);
    notify(input.songId);
    return fromSession;
  }

  const existing = inflight.get(qKey);
  if (existing) {
    const { match: cached } = await existing;
    songIdCache.set(input.songId, cached);
    notify(input.songId);
    return cached;
  }

  const pending = (async (): Promise<InflightResult> => {
    const fromDb = await fetchAppleMatchFromStreamingCache(input.title, input.artist);
    if (fromDb && !isStaleForUserStorefront(fromDb)) return { match: fromDb };

    const token = await getAppleMusicDeveloperToken();
    if (!token) return { match: null };
    const query = `${input.artist} ${input.title}`.trim();
    if (!query) return { match: null };
    // Lo storefront di MusicKit (se autorizzato) è autoritativo per la riproduzione: cerchiamo prima lì.
    const primary = storefrontFromMusicKit() ?? storefrontFromHint(input.languageHint);
    const m = await searchFirstAcrossStorefronts(query, uniqueStorefronts(primary), token);
    if (m) {
      void mergeStreamingIdsToCache({
        title: input.title,
        artist: input.artist,
        match: m,
        spotifyTrackId: input.spotifyTrackId,
      });
    }
    return { match: m };
  })();
  inflight.set(qKey, pending);

  const { match: result } = await pending;
  inflight.delete(qKey);
  if (result) {
    queryCache.set(qKey, result);
    writeSessionMatch(qKey, result);
  } else {
    queryCache.set(qKey, null);
  }
  songIdCache.set(input.songId, result);
  notify(input.songId);
  return result;
}

/** True se per questo brano la risoluzione Apple è già stata tentata (match o miss in cache). */
export function isAppleMusicResolutionComplete(songId: string): boolean {
  return songIdCache.has(songId);
}

export function getResolvedAppleMusic(songId: string): AppleMusicCatalogMatch | null {
  if (!songIdCache.has(songId)) return null;
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
  clearSessionAppleMatches();
}
