const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export async function addAppleMusicSongToLibrary(
  songId: string,
  musicUserToken: string,
): Promise<{ ok: true } | { error: string }> {
  const res = await fetch(`https://${PROJECT_ID}.supabase.co/functions/v1/apple-music-library`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON_KEY },
    body: JSON.stringify({ song_id: songId, music_user_token: musicUserToken }),
  });
  const data = await res.json();
  if (!res.ok) return { error: typeof data.error === "string" ? data.error : "Apple Music: richiesta non riuscita" };
  return { ok: true };
}
