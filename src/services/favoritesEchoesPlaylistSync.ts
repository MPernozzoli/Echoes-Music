import type { Song } from "@/data/mockData";
import { spotifyTrackIdFromSong } from "@/lib/streamingTrackIds";
import {
  ensureAppleMusicEchoesPlaylist,
  syncAppleMusicPlaylistToCatalogIds,
} from "@/services/appleMusicLibrary";
import { spotifyEnsureEchoesPlaylist, spotifyReplacePlaylistTracks } from "@/services/spotify";

const LS_SPOTIFY_PLAYLIST = "echoes_playlist_echoes_spotify_id";
const LS_APPLE_PLAYLIST_PREFIX = "echoes_playlist_echoes_apple_id";

function looksLikeNotFound(msg: string): boolean {
  const m = msg.toLowerCase();
  return (
    m.includes("404") ||
    m.includes("not found") ||
    m.includes("nonexistent") ||
    m.includes("invalid id") ||
    m.includes("resource not found") ||
    m.includes("does not exist")
  );
}

function applePlaylistStorageKey(musicUserToken: string): string {
  // Scope the cached playlist id to the current Apple Music session so a prior account
  // cannot poison syncs after a re-authorization in the same browser.
  let hash = 2166136261;
  for (let i = 0; i < musicUserToken.length; i += 1) {
    hash ^= musicUserToken.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `${LS_APPLE_PLAYLIST_PREFIX}:${(hash >>> 0).toString(36)}`;
}

/**
 * Allinea la playlist «Echoes» su Spotify e/o Apple Music al contenuto attuale dei preferiti
 * (solo brani con id mappabile per quel servizio).
 */
export async function runEchoesFavoritesPlaylistSync(params: {
  favorites: Song[];
  spotifyConnected: boolean;
  spotifyLoading: boolean;
  appleAuthorized: boolean;
  appleAvailable: boolean;
  appleLoading: boolean;
  getAppleToken: () => Promise<string | undefined | null>;
}): Promise<void> {
  const {
    favorites,
    spotifyConnected,
    spotifyLoading,
    appleAuthorized,
    appleAvailable,
    appleLoading,
    getAppleToken,
  } = params;

  if (spotifyLoading || appleLoading) return;

  const spotifyIds = [...new Set(favorites.map(spotifyTrackIdFromSong).filter((x): x is string => Boolean(x)))];
  const appleIds = [
    ...new Set(favorites.map((s) => String(s.appleMusicId ?? "").trim()).filter((x): x is string => Boolean(x))),
  ];

  if (spotifyConnected) {
    let pid = localStorage.getItem(LS_SPOTIFY_PLAYLIST);
    if (!pid) {
      const en = await spotifyEnsureEchoesPlaylist();
      if ("error" in en) throw new Error(`spotify:${en.error}`);
      pid = en.playlist_id;
      localStorage.setItem(LS_SPOTIFY_PLAYLIST, pid);
    }
    let repl = await spotifyReplacePlaylistTracks(pid, spotifyIds);
    if ("error" in repl && looksLikeNotFound(repl.error)) {
      localStorage.removeItem(LS_SPOTIFY_PLAYLIST);
      const en = await spotifyEnsureEchoesPlaylist();
      if ("error" in en) throw new Error(`spotify:${en.error}`);
      pid = en.playlist_id;
      localStorage.setItem(LS_SPOTIFY_PLAYLIST, pid);
      repl = await spotifyReplacePlaylistTracks(pid, spotifyIds);
    }
    if ("error" in repl) throw new Error(`spotify:${repl.error}`);
  }

  if (appleAvailable && appleAuthorized) {
    const token = await getAppleToken();
    if (!token) throw new Error("apple:no_token");
    const applePlaylistStorage = applePlaylistStorageKey(token);

    let pid = localStorage.getItem(applePlaylistStorage);
    if (!pid) {
      const en = await ensureAppleMusicEchoesPlaylist(token);
      if ("error" in en) throw new Error(`apple:${en.error}`);
      pid = en.playlist_id;
      localStorage.setItem(applePlaylistStorage, pid);
    }
    let sync = await syncAppleMusicPlaylistToCatalogIds(pid, appleIds, token);
    if ("error" in sync && looksLikeNotFound(sync.error)) {
      localStorage.removeItem(applePlaylistStorage);
      const en = await ensureAppleMusicEchoesPlaylist(token);
      if ("error" in en) throw new Error(`apple:${en.error}`);
      pid = en.playlist_id;
      localStorage.setItem(applePlaylistStorage, pid);
      sync = await syncAppleMusicPlaylistToCatalogIds(pid, appleIds, token);
    }
    if ("error" in sync) throw new Error(`apple:${sync.error}`);
  }
}
