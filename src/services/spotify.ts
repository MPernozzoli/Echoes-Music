import { supabase } from "@/integrations/supabase/client";
import { getSessionId } from "./sessionId";

const SESSION_ID = getSessionId();
const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;

export function getSpotifyRedirectUri() {
  const configuredRedirectUri = import.meta.env.VITE_SPOTIFY_REDIRECT_URI?.trim();
  if (configuredRedirectUri) return configuredRedirectUri;

  const origin = new URL(window.location.origin);
  if (origin.hostname === "localhost") {
    origin.hostname = "127.0.0.1";
  }
  return `${origin.origin}/spotify-callback`;
}

function functionsUrl(name: string) {
  return `https://${PROJECT_ID}.supabase.co/functions/v1/${name}`;
}

async function spotifyFetch(body: Record<string, unknown>) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  };
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }
  return fetch(functionsUrl("spotify-auth"), {
    method: "POST",
    headers,
    body: JSON.stringify({ ...body, session_id: SESSION_ID }),
  });
}

/** Dopo login: collega la connessione Spotify di questa sessione anonima all'utente. */
export async function linkSpotifyConnectionToUser(userId: string) {
  await supabase
    .from("spotify_connections")
    .update({ user_id: userId })
    .eq("anonymous_session_id", SESSION_ID)
    .is("user_id", null);
}

export async function getSpotifyAuthUrl(redirectUri: string): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;
  const res = await spotifyFetch({ action: "get_auth_url", redirect_uri: redirectUri });
  const data = await res.json();
  return data.url ?? null;
}

export async function exchangeSpotifyCode(code: string, redirectUri: string) {
  const res = await spotifyFetch({ action: "exchange_code", code, redirect_uri: redirectUri });
  // La edge function può rispondere in plain text se è crashata (es. /me Spotify ha restituito
  // testo non-JSON per un utente fuori allowlist). Wrappiamo per non rompere l'UI.
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { error: text || `Spotify exchange failed (HTTP ${res.status})` };
  }
}

export async function getSpotifyToken(): Promise<{ access_token: string; product: string } | null> {
  const res = await spotifyFetch({ action: "get_token" });
  if (!res.ok) return null;
  return res.json();
}

export async function disconnectSpotify() {
  await spotifyFetch({ action: "disconnect" });
}

export async function getSpotifyConnection() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    const { data } = await supabase
      .from("spotify_connections")
      .select("spotify_user_id, display_name, product")
      .eq("user_id", session.user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) return data;
  }
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
  const res = await spotifyFetch({ action: "save_tracks", track_ids: trackIds });
  const data = await res.json();
  if (!res.ok) return { error: typeof data.error === "string" ? data.error : "Spotify: errore" };
  return { ok: true };
}

export async function spotifyListPlaylists(): Promise<
  { playlists: { id: string; name: string }[] } | { error: string }
> {
  const res = await spotifyFetch({ action: "list_playlists" });
  const data = await res.json();
  if (!res.ok) return { error: typeof data.error === "string" ? data.error : "Spotify: errore" };
  return { playlists: data.playlists ?? [] };
}

export async function spotifyAddTrackToPlaylist(
  playlistId: string,
  trackId: string,
): Promise<{ ok: true } | { error: string }> {
  const res = await spotifyFetch({
    action: "add_to_playlist",
    playlist_id: playlistId,
    track_id: trackId,
  });
  const data = await res.json();
  if (!res.ok) return { error: typeof data.error === "string" ? data.error : "Spotify: errore" };
  return { ok: true };
}

export async function spotifyEnsureEchoesPlaylist(): Promise<{ playlist_id: string } | { error: string }> {
  const res = await spotifyFetch({ action: "ensure_echoes_playlist" });
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
  const res = await spotifyFetch({
    action: "replace_playlist_tracks",
    playlist_id: playlistId,
    track_ids: trackIds,
  });
  const data = await res.json();
  if (!res.ok) return { error: typeof data.error === "string" ? data.error : "Spotify: errore" };
  return { ok: true };
}
