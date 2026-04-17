type MusicKitTokenInstance = {
  musicUserToken?: string | null;
};

const CACHE_KEY_PREFIX = "echoes_apple_music_user_token";

function getMusicKitInstance(): MusicKitTokenInstance | undefined {
  return (window as unknown as { MusicKit?: { getInstance: () => MusicKitTokenInstance } }).MusicKit?.getInstance();
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function cacheKey(userId?: string | null) {
  return userId ? `${CACHE_KEY_PREFIX}:${userId}` : CACHE_KEY_PREFIX;
}

export function getCachedAppleMusicUserToken(userId?: string | null): string | null {
  const token = localStorage.getItem(cacheKey(userId))?.trim();
  return token || null;
}

export function setCachedAppleMusicUserToken(token: string, userId?: string | null) {
  const clean = token.trim();
  if (!clean) return;
  localStorage.setItem(cacheKey(userId), clean);
}

export function clearCachedAppleMusicUserToken(userId?: string | null) {
  localStorage.removeItem(cacheKey(userId));
}

/**
 * MusicKit on the Web can restore the user token lazily after the tab becomes active again.
 * Retry briefly before treating the session as missing and asking the user to re-authorize.
 */
export async function getAppleMusicUserToken(options?: {
  retries?: number;
  delayMs?: number;
  userId?: string | null;
}): Promise<string | null> {
  const retries = options?.retries ?? 6;
  const delayMs = options?.delayMs ?? 250;
  const userId = options?.userId ?? null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const token = getMusicKitInstance()?.musicUserToken?.trim();
    if (token) {
      setCachedAppleMusicUserToken(token, userId);
      return token;
    }
    if (attempt < retries) await sleep(delayMs);
  }

  return getCachedAppleMusicUserToken(userId);
}
