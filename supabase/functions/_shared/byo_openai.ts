export type ByoErrorCode =
  | "invalid_key"
  | "unsupported"
  | "quota_exceeded"
  | "rate_limited"
  | "connection_failed"
  | "unknown_provider_error";

const OPENAI_CHAT = "https://api.openai.com/v1/chat/completions";

export function mapByoCodeToDbStatus(code: ByoErrorCode): string {
  switch (code) {
    case "invalid_key":
    case "unsupported":
      return "invalid";
    case "quota_exceeded":
      return "quota_exceeded";
    case "rate_limited":
      return "rate_limited";
    case "connection_failed":
      return "connection_failed";
    default:
      return "unknown";
  }
}

export function userMessageForByoCode(code: ByoErrorCode): string {
  switch (code) {
    case "invalid_key":
      return "Your API key was rejected. Verify it is correct and active.";
    case "unsupported":
      return "This key or account cannot access the required model or configuration.";
    case "quota_exceeded":
      return "Your API account appears to be out of credits or quota.";
    case "rate_limited":
      return "Your provider rate-limited this request. Try again in a moment.";
    case "connection_failed":
      return "We could not reach the AI provider. Check connectivity and try again.";
    default:
      return "Something went wrong with your custom AI setup.";
  }
}

function parseOpenAiError(status: number, body: string): ByoErrorCode {
  if (status === 401) return "invalid_key";
  if (status === 403) return "unsupported";
  if (status === 429) return "rate_limited";
  if (status >= 500 || status === 0) return "connection_failed";
  try {
    const j = JSON.parse(body) as { error?: { code?: string; type?: string; message?: string } };
    const c = j?.error?.code ?? "";
    const t = j?.error?.type ?? "";
    const m = (j?.error?.message ?? "").toLowerCase();
    if (c === "insufficient_quota" || t === "insufficient_quota") return "quota_exceeded";
    if (c === "invalid_api_key" || m.includes("invalid api key")) return "invalid_key";
    if (c === "model_not_found" || m.includes("does not exist") || m.includes("not found")) return "unsupported";
    if (c === "rate_limit_exceeded" || m.includes("rate limit")) return "rate_limited";
  } catch {
    /* ignore */
  }
  return "unknown_provider_error";
}

export class ByoOpenAiError extends Error {
  readonly code: ByoErrorCode;
  readonly httpStatus: number;
  constructor(code: ByoErrorCode, httpStatus: number) {
    super(`BYO:${code}`);
    this.name = "ByoOpenAiError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

export async function openAiChatCompletion(
  apiKey: string,
  model: string,
  payload: Record<string, unknown>,
): Promise<{ json: unknown; requestId: string | null }> {
  let res: Response;
  try {
    res = await fetch(OPENAI_CHAT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...payload, model }),
    });
  } catch {
    throw new ByoOpenAiError("connection_failed", 0);
  }

  const text = await res.text();
  if (!res.ok) {
    throw new ByoOpenAiError(parseOpenAiError(res.status, text), res.status);
  }
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new ByoOpenAiError("unknown_provider_error", res.status);
  }
  const id = typeof (json as { id?: string }).id === "string" ? (json as { id: string }).id : null;
  return { json, requestId: id };
}

/** Minimal call to verify the key works (no logging of key or response body). */
export async function pingOpenAiKey(apiKey: string, model: string): Promise<{ ok: true } | { ok: false; code: ByoErrorCode }> {
  try {
    await openAiChatCompletion(apiKey, model, {
      messages: [{ role: "user", content: "ok" }],
      max_tokens: 1,
    });
    return { ok: true };
  } catch (e) {
    if (e instanceof ByoOpenAiError) return { ok: false, code: e.code };
    return { ok: false, code: "unknown_provider_error" };
  }
}
