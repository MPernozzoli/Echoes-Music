const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const fnUrl = `https://${PROJECT_ID}.supabase.co/functions/v1/apple-music-library`;

export async function addAppleMusicSongToLibrary(
  songId: string,
  musicUserToken: string,
): Promise<{ ok: true } | { error: string }> {
  const id = String(songId ?? "").trim();
  if (!id) return { error: "song_id mancante" };
  const res = await fetch(fnUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON_KEY },
    body: JSON.stringify({ song_id: id, music_user_token: musicUserToken }),
  });
  const data = await res.json();
  if (!res.ok) return { error: typeof data.error === "string" ? data.error : "Apple Music: richiesta non riuscita" };
  return { ok: true };
}

export async function listAppleMusicPlaylists(
  musicUserToken: string,
): Promise<{ playlists: { id: string; name: string }[] } | { error: string }> {
  const res = await fetch(fnUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON_KEY },
    body: JSON.stringify({ action: "list_playlists", music_user_token: musicUserToken }),
  });
  const data = await res.json();
  if (!res.ok) return { error: typeof data.error === "string" ? data.error : "Apple Music: errore playlist" };
  return { playlists: data.playlists ?? [] };
}

export async function addAppleMusicSongToPlaylist(
  playlistId: string,
  songId: string,
  musicUserToken: string,
): Promise<{ ok: true } | { error: string }> {
  const id = String(songId ?? "").trim();
  if (!id) return { error: "song_id mancante" };
  const res = await fetch(fnUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON_KEY },
    body: JSON.stringify({
      action: "add_to_playlist",
      playlist_id: playlistId,
      song_id: id,
      music_user_token: musicUserToken,
    }),
  });
  const data = await res.json();
  if (!res.ok) return { error: typeof data.error === "string" ? data.error : "Apple Music: non aggiunto alla playlist" };
  return { ok: true };
}

export async function ensureAppleMusicEchoesPlaylist(
  musicUserToken: string,
): Promise<{ playlist_id: string } | { error: string }> {
  const res = await fetch(fnUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON_KEY },
    body: JSON.stringify({
      action: "ensure_echoes_playlist",
      music_user_token: musicUserToken,
    }),
  });
  const data = await res.json();
  if (!res.ok) return { error: typeof data.error === "string" ? data.error : "Apple Music: playlist Echoes" };
  const id = data.playlist_id;
  if (typeof id !== "string" || !id) return { error: "Apple Music: playlist Echoes non disponibile" };
  return { playlist_id: id };
}

export async function syncAppleMusicPlaylistToCatalogIds(
  playlistId: string,
  catalogSongIds: string[],
  musicUserToken: string,
): Promise<{ ok: true } | { error: string }> {
  const res = await fetch(fnUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON_KEY },
    body: JSON.stringify({
      action: "sync_playlist_tracks",
      playlist_id: playlistId,
      catalog_song_ids: catalogSongIds,
      music_user_token: musicUserToken,
    }),
  });
  const data = await res.json();
  if (!res.ok) return { error: typeof data.error === "string" ? data.error : "Apple Music: sync playlist" };
  return { ok: true };
}
