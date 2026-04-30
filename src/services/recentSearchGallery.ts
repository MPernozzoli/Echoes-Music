import { supabase } from "@/integrations/supabase/client";
import type { Song } from "@/data/mockData";

function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

type ResultRow = {
  id: string;
  search_id: string;
  track_id: string;
  track_title: string;
  artist_name: string;
  album_name: string | null;
  artwork_url: string | null;
  emotional_tags: unknown;
  match_explanation: string;
  relevance_score: number | null;
  position: number;
  created_at: string;
};

/**
 * Copertine da ricerche reali tracciate (tutti gli utenti / sessioni anonime).
 * Ordine recente, dedupe per URL, poi mescolatura leggera per variare la home.
 */
export async function fetchRecentSearchArtworks(count: number): Promise<string[]> {
  const { data, error } = await supabase
    .from("search_results")
    .select("artwork_url, track_id, created_at")
    .not("artwork_url", "is", null)
    .lte("position", 6)
    .order("created_at", { ascending: false })
    .limit(450);

  if (error || !data?.length) return [];

  const seen = new Set<string>();
  const urls: string[] = [];
  for (const row of data) {
    const u = row.artwork_url?.trim();
    if (!u || seen.has(u)) continue;
    seen.add(u);
    urls.push(u);
    if (urls.length >= Math.max(count * 10, 40)) break;
  }
  shuffleInPlace(urls);
  return urls.slice(0, count);
}

function tagsFromJson(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((t): t is string => typeof t === "string").slice(0, 8);
}

function rowToSong(row: ResultRow): Song {
  const score = Number(row.relevance_score);
  const relevanceScore = Number.isFinite(score)
    ? Math.min(99, Math.max(70, Math.round(score)))
    : 88;
  return {
    id: row.track_id || row.id,
    title: row.track_title,
    artist: row.artist_name,
    album: row.album_name ?? "",
    artwork: row.artwork_url!.trim(),
    emotionalTags: tagsFromJson(row.emotional_tags),
    explanation: row.match_explanation,
    relevanceScore,
  };
}

export type MicroConversation = {
  searchId: string;
  displayPrompt: string;
  songs: Song[];
};

/**
 * Ricerche approvate per la home: prompt pubblico + top 3 risultati.
 * Solo ricerche con display_approved = true.
 */
export async function fetchRecentMicroConversations(count: number): Promise<MicroConversation[]> {
  const { data: searches, error: searchErr } = await supabase
    .from("searches")
    .select("id, display_prompt, created_at")
    .eq("display_approved", true)
    .order("created_at", { ascending: false })
    .limit(count * 12);

  if (searchErr || !searches?.length) return [];

  const searchIds = searches.map((s) => s.id);

  const { data: results, error: resultsErr } = await supabase
    .from("search_results")
    .select(
      "id, search_id, track_id, track_title, artist_name, album_name, artwork_url, emotional_tags, match_explanation, relevance_score, position, created_at",
    )
    .in("search_id", searchIds)
    .not("artwork_url", "is", null)
    .lte("position", 3)
    .order("position", { ascending: true });

  if (resultsErr || !results?.length) return [];

  const bySearch = new Map<string, ResultRow[]>();
  for (const row of results as ResultRow[]) {
    if (!row.artwork_url?.trim()) continue;
    const list = bySearch.get(row.search_id) ?? [];
    list.push(row);
    bySearch.set(row.search_id, list);
  }

  const convos: MicroConversation[] = [];
  for (const search of searches) {
    if (!search.display_prompt) continue;
    const rows = bySearch.get(search.id);
    if (!rows?.length) continue;
    const songs = rows.slice(0, 3).map(rowToSong);
    if (!songs.length) continue;
    convos.push({ searchId: search.id, displayPrompt: search.display_prompt, songs });
  }

  shuffleInPlace(convos);
  return convos.slice(0, count);
}

/**
 * Brani campione per anteprima (es. SongCard): ultime ricerche, dedupe per track_id.
 */
export async function fetchRecentSearchPreviewSongs(count: number): Promise<Song[]> {
  const { data, error } = await supabase
    .from("search_results")
    .select(
      "id, track_id, track_title, artist_name, album_name, artwork_url, emotional_tags, match_explanation, relevance_score, position, created_at",
    )
    .not("artwork_url", "is", null)
    .lte("position", 6)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error || !data?.length) return [];

  const rows = data as ResultRow[];
  const byTrack = new Map<string, ResultRow>();
  for (const row of rows) {
    if (!row.artwork_url?.trim()) continue;
    const tid = row.track_id || row.id;
    if (!byTrack.has(tid)) byTrack.set(tid, row);
  }
  const unique = [...byTrack.values()];
  shuffleInPlace(unique);
  return unique.slice(0, count).map(rowToSong);
}
