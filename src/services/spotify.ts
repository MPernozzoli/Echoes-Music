import { supabase } from "@/integrations/supabase/client";
import { getSessionId } from "./sessionId";

const SESSION_ID = getSessionId();
const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;

function functionsUrl(name: string) {
  return `https://${PROJECT_ID}.supabase.co/functions/v1/${name}`;
}

export async function getSpotifyAuthUrl(redirectUri: string): Promise<string | null> {
  const res = await fetch(functionsUrl("spotify-auth"), {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
    body: JSON.stringify({ action: "get_auth_url", redirect_uri: redirectUri, session_id: SESSION_ID }),
  });
  const data = await res.json();
  return data.url ?? null;
}

export async function exchangeSpotifyCode(code: string, redirectUri: string) {
  const res = await fetch(functionsUrl("spotify-auth"), {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
    body: JSON.stringify({ action: "exchange_code", code, redirect_uri: redirectUri, session_id: SESSION_ID }),
  });
  return res.json();
}

export async function getSpotifyToken(): Promise<{ access_token: string; product: string } | null> {
  const res = await fetch(functionsUrl("spotify-auth"), {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
    body: JSON.stringify({ action: "get_token", session_id: SESSION_ID }),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function disconnectSpotify() {
  await fetch(functionsUrl("spotify-auth"), {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
    body: JSON.stringify({ action: "disconnect", session_id: SESSION_ID }),
  });
}

export async function getSpotifyConnection() {
  const { data } = await supabase
    .from("spotify_connections")
    .select("spotify_user_id, display_name, product")
    .eq("anonymous_session_id", SESSION_ID)
    .maybeSingle();
  return data;
}

// Search Spotify for a track (uses client credentials, no user auth needed)
export async function searchSpotifyTrack(query: string): Promise<string | null> {
  // For preview playback, we use Spotify's oEmbed which doesn't need auth
  return `https://open.spotify.com/embed/track/${encodeURIComponent(query)}`;
}

export async function spotifySaveTracks(
  trackIds: string[],
): Promise<{ ok: true } | { error: string }> {
  const res = await fetch(functionsUrl("spotify-auth"), {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
    body: JSON.stringify({ action: "save_tracks", session_id: SESSION_ID, track_ids: trackIds }),
  });
  const data = await res.json();
  if (!res.ok) return { error: typeof data.error === "string" ? data.error : "Spotify: errore" };
  return { ok: true };
}

export async function spotifyListPlaylists(): Promise<
  { playlists: { id: string; name: string }[] } | { error: string }
> {
  const res = await fetch(functionsUrl("spotify-auth"), {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
    body: JSON.stringify({ action: "list_playlists", session_id: SESSION_ID }),
  });
  const data = await res.json();
  if (!res.ok) return { error: typeof data.error === "string" ? data.error : "Spotify: errore" };
  return { playlists: data.playlists ?? [] };
}

export async function spotifyAddTrackToPlaylist(
  playlistId: string,
  trackId: string,
): Promise<{ ok: true } | { error: string }> {
  const res = await fetch(functionsUrl("spotify-auth"), {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
    body: JSON.stringify({
      action: "add_to_playlist",
      session_id: SESSION_ID,
      playlist_id: playlistId,
      track_id: trackId,
    }),
  });
  const data = await res.json();
  if (!res.ok) return { error: typeof data.error === "string" ? data.error : "Spotify: errore" };
  return { ok: true };
}

export async function spotifyEnsureEchoesPlaylist(): Promise<{ playlist_id: string } | { error: string }> {
  const res = await fetch(functionsUrl("spotify-auth"), {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
    body: JSON.stringify({ action: "ensure_echoes_playlist", session_id: SESSION_ID }),
  });
  const data = await res.json();
  if (!res.ok) return { error: typeof data.error === "string" ? data.error : "Spotify: errore" };
  const id = data.playlist_id;
  if (typeof id !== "string" || !id) return { error: "Spotify: playlist Echoes non disponibile" };
  return { playlist_id: id };
}

export async function spotifyReplacePlaylistTracks(
  playlistId: string,
  trackIds: string[],
): Promise<{ ok: true } | { error: string }> {
  const res = await fetch(functionsUrl("spotify-auth"), {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
    body: JSON.stringify({
      action: "replace_playlist_tracks",
      session_id: SESSION_ID,
      playlist_id: playlistId,
      track_ids: trackIds,
    }),
  });
  const data = await res.json();
  if (!res.ok) return { error: typeof data.error === "string" ? data.error : "Spotify: errore" };
  return { ok: true };
}
