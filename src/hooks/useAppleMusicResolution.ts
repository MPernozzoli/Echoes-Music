import { useEffect, useReducer, useRef } from "react";
import type { Song } from "@/data/mockData";
import { useStreamingPlaybackMode } from "@/hooks/useStreamingPlaybackMode";
import { useApp } from "@/context/useApp";
import {
  getResolvedAppleMusic,
  resolveAppleMusicSong,
  subscribeAppleMusicResolution,
  type AppleMusicCatalogMatch,
} from "@/services/appleMusicEnrichment";
import { parseSpotifyTrackIdFromUri } from "@/services/trackStreamingIdCache";

/**
 * Arricchisce un brano con `appleMusicId` risolto lato client (catalogo Apple Music)
 * quando l’utente è in modalità Apple e il brano manca dell’ID Apple.
 * Ritorna il brano “enriched” (con appleMusicId e, se mancante, previewUrl aggiornato).
 */
export function useAppleEnrichedSong(song: Song | null | undefined): Song | null {
  const mode = useStreamingPlaybackMode();
  const { descriptionLanguage } = useApp();
  const [, force] = useReducer((x: number) => x + 1, 0);
  const attemptedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    return subscribeAppleMusicResolution((songId) => {
      if (song && songId === song.id) force();
    });
  }, [song, force]);

  useEffect(() => {
    if (!song || mode !== "apple") return;
    if (song.appleMusicId) return;
    if (attemptedRef.current.has(song.id)) return;
    attemptedRef.current.add(song.id);
    void resolveAppleMusicSong({
      songId: song.id,
      title: song.title,
      artist: song.artist,
      languageHint: descriptionLanguage,
      spotifyTrackId: parseSpotifyTrackIdFromUri(song.spotifyUri),
    });
  }, [song, mode, descriptionLanguage]);

  if (!song) return null;
  if (song.appleMusicId) return song;
  const resolved: AppleMusicCatalogMatch | null = getResolvedAppleMusic(song.id);
  if (!resolved) return song;
  return {
    ...song,
    appleMusicId: resolved.id,
    previewUrl: song.previewUrl || resolved.previewUrl || undefined,
  };
}
