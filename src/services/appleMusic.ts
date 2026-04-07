const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

let cachedToken: string | null = null;

/** Decodifica `exp` dal JWT (developer token Apple) per non tenere in cache token scaduti. */
function jwtExpSeconds(token: string): number | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    let b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4;
    if (pad) b64 += "=".repeat(4 - pad);
    const payload = JSON.parse(atob(b64)) as { exp?: number };
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

function isCachedDeveloperTokenValid(token: string): boolean {
  const exp = jwtExpSeconds(token);
  const now = Math.floor(Date.now() / 1000);
  // Stesso margine dell’edge function (~1h) così MusicKit non resta agganciato a un JWT morto
  if (exp == null) return false;
  return exp > now + 3600;
}

export async function getAppleMusicDeveloperToken(): Promise<string | null> {
  if (cachedToken && isCachedDeveloperTokenValid(cachedToken)) return cachedToken;
  cachedToken = null;

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
