import type { Song } from "@/data/mockData";

/** Allineato a `MIN_RELEVANCE_SCORE` in `supabase/functions/music-search/index.ts`. */
export const MIN_RELEVANCE_SCORE = 65;

export function filterSongsByMinRelevance(songs: Song[]): Song[] {
  return songs.filter((s) => s.relevanceScore >= MIN_RELEVANCE_SCORE);
}

/** Primo artista principale (prima di feat./,&). */
function normalizeArtist(artist: string): string {
  return artist
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’`´ʻʼʹ]/g, "'")
    .toLowerCase()
    .split(/\s+(?:feat\.|ft\.|featuring)\s+/i)[0]
    .split(/,/)[0]
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeTitleTypography(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’`´ʻʼʹ]/g, "'")
    .replace(/['"]/g, "")
    .replace(/[^\p{L}\p{N}\s-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isVersionParenContent(inner: string): boolean {
  const s = inner.toLowerCase();
  return (
    /\blive\b/.test(s) ||
    /remaster/.test(s) ||
    /\bmono\b|\bstereo\b/.test(s) ||
    /\bedit\b|\bversion\b/.test(s) ||
    /\bremix\b|\bre-?mix\b|club\s+mix|extended\s+mix|radio\s+mix|dub\s+mix/.test(s) ||
    /extended|rework|vip\b|dub\b/.test(s) ||
    /\bsingle\b|\bradio\b/.test(s) ||
    /acoustic/.test(s) ||
    /re-?record/.test(s) ||
    /deluxe|bonus/.test(s) ||
    /\d{4}\s*(remaster|version)/.test(s) ||
    /clean|explicit/.test(s) ||
    /^from\s/.test(s) ||
    /soundtrack|\bost\b/.test(s) ||
    /unplugged|session|demo/.test(s) ||
    /instrumental/.test(s) ||
    /karaoke|sped up|slowed|8d\b/.test(s)
  );
}

/** Suffix tipo " - Live at …", " (Remastered 2023)" inline. */
function stripTrailingVersionSuffixes(t: string): string {
  let s = normalizeTitleTypography(t);
  const dashLive = /\s+-\s*live\b/i;
  if (dashLive.test(s)) s = s.split(dashLive)[0].trim();
  const paren = /\s*\(([^)]*)\)\s*$/;
  for (let i = 0; i < 12; i++) {
    const m = s.match(paren);
    if (!m) break;
    if (!isVersionParenContent(m[1])) break;
    s = s.slice(0, m.index).trim();
  }
  return s.replace(/\s+/g, " ");
}

/** Titolo “canonico” per raggruppare varianti (remaster, mono/stereo, remix, ecc.). */
function titleBaseForGrouping(title: string): string {
  return stripTrailingVersionSuffixes(title.toLowerCase());
}

function workGroupKey(song: Song): string {
  return `${normalizeArtist(song.artist)}||${titleBaseForGrouping(song.title)}`;
}

function compareCandidates(a: Song, b: Song): number {
  if (b.relevanceScore !== a.relevanceScore) return b.relevanceScore - a.relevanceScore;
  const av = titleBaseForGrouping(a.title) !== a.title.toLowerCase() ? 1 : 0;
  const bv = titleBaseForGrouping(b.title) !== b.title.toLowerCase() ? 1 : 0;
  if (av !== bv) return av - bv;
  return a.title.localeCompare(b.title);
}

type Indexed = { song: Song; index: number };

/**
 * Riduce duplicati dello stesso brano (remaster, riedizioni, ecc.).
 * Mantiene una sola versione canonica per stesso titolo+artista,
 * scegliendo quella col punteggio piu alto (a parita, preferenza remaster).
 * In UI, "studio" e "live" dello stesso pezzo vengono percepiti comunque come doppioni.
 */
export function dedupeSongVersions(songs: Song[]): Song[] {
  if (songs.length <= 1) return songs;

  const byKey = new Map<string, Indexed[]>();
  const keyOrder: string[] = [];

  songs.forEach((song, index) => {
    const key = workGroupKey(song);
    if (!byKey.has(key)) {
      byKey.set(key, []);
      keyOrder.push(key);
    }
    byKey.get(key)!.push({ song, index });
  });

  const pickBest = (items: Indexed[]): Indexed | null => {
    if (items.length === 0) return null;
    return [...items].sort((a, b) => {
      const c = compareCandidates(a.song, b.song);
      if (c !== 0) return c;
      return a.index - b.index;
    })[0];
  };

  const out: Song[] = [];
  for (const key of keyOrder) {
    const items = byKey.get(key)!;
    const best = pickBest(items);
    if (!best) continue;
    const alternateVersions = items
      .filter((item) => item.song.id !== best.song.id)
      .map((item) => ({
        id: item.song.id,
        title: item.song.title,
        artist: item.song.artist,
        album: item.song.album,
        ...(item.song.releaseYear != null ? { releaseYear: item.song.releaseYear } : {}),
        ...(item.song.provider ? { provider: item.song.provider } : {}),
        ...(item.song.spotifyUri ? { spotifyUri: item.song.spotifyUri } : {}),
        ...(item.song.appleMusicId ? { appleMusicId: item.song.appleMusicId } : {}),
        ...(item.song.previewUrl ? { previewUrl: item.song.previewUrl } : {}),
      }));

    out.push({
      ...best.song,
      ...(alternateVersions.length ? { alternateVersions } : {}),
    });
  }

  return out;
}
