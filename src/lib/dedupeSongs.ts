import type { Song } from "@/data/mockData";

/** Primo artista principale (prima di feat./,&). */
function normalizeArtist(artist: string): string {
  return artist
    .toLowerCase()
    .split(/\s+(?:feat\.|ft\.|featuring)\s+/i)[0]
    .split(/,/)[0]
    .trim()
    .replace(/\s+/g, " ");
}

function isVersionParenContent(inner: string): boolean {
  const s = inner.toLowerCase();
  return (
    /\blive\b/.test(s) ||
    /remaster/.test(s) ||
    /\bmono\b|\bstereo\b/.test(s) ||
    /\bedit\b|\bversion\b/.test(s) ||
    /\bsingle\b|\bradio\b/.test(s) ||
    /acoustic/.test(s) ||
    /re-?record/.test(s) ||
    /deluxe|bonus/.test(s) ||
    /\d{4}\s*(remaster|version)/.test(s) ||
    /clean|explicit/.test(s) ||
    /^from\s/.test(s) ||
    /soundtrack|\bost\b/.test(s) ||
    /unplugged|session|demo/.test(s) ||
    /instrumental/.test(s)
  );
}

/** Titolo “canonico” per raggruppare varianti (remaster, mono/stereo, ecc.). */
function titleBaseForGrouping(title: string): string {
  let t = title.toLowerCase().trim();
  const paren = /\s*\(([^)]*)\)\s*$/;
  for (let i = 0; i < 12; i++) {
    const m = t.match(paren);
    if (!m) break;
    if (!isVersionParenContent(m[1])) break;
    t = t.slice(0, m.index).trim();
  }
  return t.replace(/\s+/g, " ");
}

/** True se il titolo originale indica una registrazione live (merita convivenza con lo studio). */
function titleImpliesLiveRecording(title: string): boolean {
  return /\([^)]*\blive\b[^)]*\)/i.test(title) || /\s-\s*live\s*$/i.test(title.trim());
}

function workGroupKey(song: Song): string {
  return `${normalizeArtist(song.artist)}||${titleBaseForGrouping(song.title)}`;
}

function compareCandidates(a: Song, b: Song): number {
  if (b.relevanceScore !== a.relevanceScore) return b.relevanceScore - a.relevanceScore;
  const ar = /remaster/i.test(a.title) ? 1 : 0;
  const br = /remaster/i.test(b.title) ? 1 : 0;
  if (br !== ar) return br - ar;
  return a.title.localeCompare(b.title);
}

type Indexed = { song: Song; index: number };

/**
 * Riduce duplicati dello stesso brano (remaster, riedizioni, ecc.).
 * Mantiene al massimo una versione “studio” e una “live” per stesso titolo+artista,
 * scegliendo quella col punteggio più alto (a parità, preferenza remaster).
 */
export function dedupeSongVersions(songs: Song[]): Song[] {
  if (songs.length <= 1) return songs;

  const byKey = new Map<string, { studio: Indexed[]; live: Indexed[] }>();
  const keyOrder: string[] = [];

  songs.forEach((song, index) => {
    const key = workGroupKey(song);
    if (!byKey.has(key)) {
      byKey.set(key, { studio: [], live: [] });
      keyOrder.push(key);
    }
    const bucket = byKey.get(key)!;
    const entry = { song, index };
    if (titleImpliesLiveRecording(song.title)) bucket.live.push(entry);
    else bucket.studio.push(entry);
  });

  const pickBest = (items: Indexed[]): Indexed[] => {
    if (items.length === 0) return [];
    const sorted = [...items].sort((a, b) => {
      const c = compareCandidates(a.song, b.song);
      if (c !== 0) return c;
      return a.index - b.index;
    });
    return [sorted[0]];
  };

  const out: Song[] = [];
  for (const key of keyOrder) {
    const { studio, live } = byKey.get(key)!;
    const merged = [...pickBest(studio), ...pickBest(live)].sort((a, b) => a.index - b.index);
    out.push(...merged.map((x) => x.song));
  }

  return out;
}
