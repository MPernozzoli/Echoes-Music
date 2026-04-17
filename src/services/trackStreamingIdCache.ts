import type { Database } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { normalizeTitleArtist } from "@/lib/trackKeyNormalize";
import type { AppleMusicCatalogMatch } from "@/services/streamingCatalogTypes";

type CacheRow = Database["public"]["Tables"]["track_streaming_id_cache"]["Row"];

export function parseSpotifyTrackIdFromUri(uri?: string | null): string | undefined {
  if (!uri) return undefined;
  const s = uri.replace(/^spotify:track:/i, "").trim();
  return s || undefined;
}

function rowToAppleMatch(row: Pick<CacheRow, "apple_music_catalog_id" | "apple_music_storefront" | "preview_url" | "artwork_url_template">): AppleMusicCatalogMatch | null {
  const id = row.apple_music_catalog_id?.trim();
  if (!id) return null;
  const rawArt = (row.artwork_url_template || "").trim();
  return {
    id,
    previewUrl: row.preview_url?.trim() || undefined,
    artworkUrl: rawArt ? rawArt.replace("{w}", "300").replace("{h}", "300") : undefined,
    storefront: (row.apple_music_storefront || "us").trim() || "us",
  };
}

/** Lettura cache + incremento hit_count (popolarità). */
export async function fetchAppleMatchFromStreamingCache(
  title: string,
  artist: string,
): Promise<AppleMusicCatalogMatch | null> {
  const { title: tn, artist: an } = normalizeTitleArtist(title, artist);
  if (!tn || !an) return null;

  const { data, error } = await supabase.rpc("get_track_streaming_id_cache", {
    p_title_normalized: tn,
    p_artist_normalized: an,
  });
  if (error || !data?.length) return null;
  return rowToAppleMatch(data[0]);
}

/** Upsert ID Apple (e opzionalmente Spotify / preview) dopo un match riuscito. Fire-and-forget lato caller. */
export async function mergeStreamingIdsToCache(input: {
  title: string;
  artist: string;
  match: AppleMusicCatalogMatch;
  spotifyTrackId?: string | null;
}): Promise<void> {
  const { title: tn, artist: an } = normalizeTitleArtist(input.title, input.artist);
  if (!tn || !an) return;

  const spotify = input.spotifyTrackId?.trim() || null;
  const { error } = await supabase.rpc("merge_track_streaming_id_cache", {
    p_title_normalized: tn,
    p_artist_normalized: an,
    p_apple_music_catalog_id: input.match.id,
    p_apple_music_storefront: input.match.storefront,
    p_spotify_track_id: spotify,
    p_preview_url: input.match.previewUrl?.trim() || null,
    p_artwork_url_template: input.match.artworkUrl?.trim() || null,
  });
  if (error) console.warn("merge_track_streaming_id_cache:", error.message);
}
