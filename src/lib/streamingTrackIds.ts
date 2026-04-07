import type { Song } from "@/data/mockData";

/** Id traccia Spotify (senza prefisso `spotify:track:`) se disponibile dai metadati del brano. */
export function spotifyTrackIdFromSong(song: Song): string | undefined {
  const u = song.spotifyUri?.trim();
  if (u) return u.replace(/^spotify:track:/i, "");
  const url = song.spotifyUrl?.trim();
  if (url?.includes("open.spotify.com/track/")) {
    const m = url.match(/track\/([a-zA-Z0-9]+)/);
    if (m?.[1]) return m[1];
  }
  return undefined;
}
