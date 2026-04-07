const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

let cachedToken: string | null = null;

export async function getAppleMusicDeveloperToken(): Promise<string | null> {
  if (cachedToken) return cachedToken;

  const res = await fetch(`https://${PROJECT_ID}.supabase.co/functions/v1/apple-music-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": ANON_KEY },
  });

  if (!res.ok) return null;
  const data = await res.json();
  cachedToken = data.token;
  return data.token;
}

export function clearAppleMusicToken() {
  cachedToken = null;
}
