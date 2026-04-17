import { useEffect, useMemo } from "react";
import type { Song } from "@/data/mockData";
import { resolveAppleMusicSong } from "@/services/appleMusicEnrichment";
import { parseSpotifyTrackIdFromUri } from "@/services/trackStreamingIdCache";

/**
 * Avvia in background la risoluzione catalogo Apple per tutti i brani passati (dedupe per `song.id`).
 * Usare con `enabled` solo in modalità Apple: le chiamate sono comunque no-op in cache dopo il primo hit.
 */
export function usePrefetchAppleMusicCatalogIds(
  songs: Song[] | null | undefined,
  enabled: boolean,
  languageHint: string | undefined,
): void {
  const idsKey = useMemo(() => (songs?.length ? songs.map((s) => s.id).join("\0") : ""), [songs]);

  useEffect(() => {
    if (!enabled || !songs?.length) return;
    for (const s of songs) {
      if (s.appleMusicId) continue;
      void resolveAppleMusicSong({
        songId: s.id,
        title: s.title,
        artist: s.artist,
        languageHint,
        spotifyTrackId: parseSpotifyTrackIdFromUri(s.spotifyUri),
      });
    }
    // `idsKey` evita loop quando `songs` è una nuova istanza array con gli stessi id
  }, [enabled, languageHint, idsKey, songs]);
}
