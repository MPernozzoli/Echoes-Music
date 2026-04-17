type MusicKitTokenInstance = {
  musicUserToken?: string | null;
};

function getMusicKitInstance(): MusicKitTokenInstance | undefined {
  return (window as unknown as { MusicKit?: { getInstance: () => MusicKitTokenInstance } }).MusicKit?.getInstance();
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

/**
 * MusicKit on the Web can restore the user token lazily after the tab becomes active again.
 * Retry briefly before treating the session as missing and asking the user to re-authorize.
 */
export async function getAppleMusicUserToken(options?: {
  retries?: number;
  delayMs?: number;
}): Promise<string | null> {
  const retries = options?.retries ?? 6;
  const delayMs = options?.delayMs ?? 250;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const token = getMusicKitInstance()?.musicUserToken?.trim();
    if (token) return token;
    if (attempt < retries) await sleep(delayMs);
  }

  return null;
}
