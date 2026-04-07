import { supabase } from "@/integrations/supabase/client";

function projectUrl(): string {
  const id = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  return `https://${id}.supabase.co/functions/v1/byo-ai-settings`;
}

export type ByoAiSettingsStatus = {
  ai_provider_mode: "managed" | "byo_key";
  byo_ai_provider: string | null;
  byo_api_key_masked: string | null;
  byo_key_status: string | null;
  byo_key_last_validated_at: string | null;
  has_stored_key: boolean;
  supported_provider: string;
};

async function authHeaders(): Promise<Record<string, string>> {
  const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const { data: { session } } = await supabase.auth.getSession();
  const bearer = session?.access_token;
  if (!bearer) throw new Error("Not signed in");
  return {
    "Content-Type": "application/json",
    apikey: ANON_KEY,
    Authorization: `Bearer ${bearer}`,
  };
}

export async function getByoAiSettings(): Promise<ByoAiSettingsStatus> {
  const headers = await authHeaders();
  const res = await fetch(projectUrl(), { method: "GET", headers });
  const data = (await res.json().catch(() => ({}))) as ByoAiSettingsStatus & { error?: string };
  if (!res.ok) throw new Error(data.error || "Failed to load settings");
  return data;
}

export async function postByoAiSettings(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const headers = await authHeaders();
  const res = await fetch(projectUrl(), {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown> & {
    error?: string;
    message?: string;
  };
  if (!res.ok) {
    const msg =
      typeof data.message === "string"
        ? data.message
        : typeof data.error === "string"
          ? data.error
          : "Request failed";
    const err = new Error(msg);
    (err as Error & { status?: number; payload?: unknown }).status = res.status;
    (err as Error & { payload?: unknown }).payload = data;
    throw err;
  }
  return data;
}
