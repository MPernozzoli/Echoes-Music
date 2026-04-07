/** AES-256-GCM helpers for BYO API keys. Master key: BYO_AI_ENCRYPTION_KEY (base64, 32 bytes). */

export function maskApiKey(key: string): string {
  const t = key.trim();
  if (t.length <= 12) return "••••••••";
  return `${t.slice(0, 4)}…${t.slice(-4)}`;
}

export async function importAes256GcmKeyFromEnv(): Promise<CryptoKey | null> {
  const b64 = Deno.env.get("BYO_AI_ENCRYPTION_KEY")?.trim();
  if (!b64) return null;
  let raw: Uint8Array;
  try {
    raw = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
  if (raw.length !== 32) return null;
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

export async function encryptApiKey(plaintext: string, key: CryptoKey): Promise<{ iv: string; ciphertext: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const buf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, tagLength: 128 },
    key,
    new TextEncoder().encode(plaintext),
  );
  const combined = new Uint8Array(buf);
  return {
    iv: btoa(String.fromCharCode(...iv)),
    ciphertext: btoa(String.fromCharCode(...combined)),
  };
}

export async function decryptApiKey(ivB64: string, ciphertextB64: string, key: CryptoKey): Promise<string> {
  const iv = Uint8Array.from(atob(ivB64), (c) => c.charCodeAt(0));
  const combined = Uint8Array.from(atob(ciphertextB64), (c) => c.charCodeAt(0));
  const dec = await crypto.subtle.decrypt({ name: "AES-GCM", iv, tagLength: 128 }, key, combined);
  return new TextDecoder().decode(dec);
}
