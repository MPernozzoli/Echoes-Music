import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { decryptApiKey, encryptApiKey, importAes256GcmKeyFromEnv, maskApiKey } from "../_shared/byo_crypto.ts";
import {
  mapByoCodeToDbStatus,
  pingOpenAiKey,
  userMessageForByoCode,
} from "../_shared/byo_openai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BYO_PROVIDER = "openai";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function textModel(): string {
  return Deno.env.get("BYO_OPENAI_MODEL")?.trim() || "gpt-4o-mini";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!url || !anon || !service) return json({ error: "Server misconfigured" }, 500);

  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!jwt || jwt === anon) return json({ error: "Unauthorized" }, 401);

  const userClient = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${jwt}` } } });
  const { data: { user }, error: userErr } = await userClient.auth.getUser();
  if (userErr || !user) return json({ error: "Unauthorized" }, 401);

  const admin = createClient(url, service, { auth: { persistSession: false } });
  const userId = user.id;

  async function getSettingsRow() {
    const { data } = await admin
      .from("user_settings")
      .select(
        "id, ai_provider_mode, byo_ai_provider, byo_api_key_masked, byo_key_status, byo_key_last_validated_at, byo_disclaimer_accepted_at",
      )
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data;
  }

  async function ensureSettingsId(): Promise<string> {
    const row = await getSettingsRow();
    if (row?.id) return row.id as string;
    const { data: ins, error } = await admin
      .from("user_settings")
      .insert({ user_id: userId, allow_anonymized_improvement_data: true, ai_provider_mode: "managed" })
      .select("id")
      .single();
    if (error || !ins?.id) throw new Error("settings_create_failed");
    return ins.id as string;
  }

  if (req.method === "GET") {
    const row = await getSettingsRow();
    const { data: sec } = await admin.from("user_byo_ai_secrets").select("user_id").eq("user_id", userId).maybeSingle();
    return json({
      ai_provider_mode: row?.ai_provider_mode ?? "managed",
      byo_ai_provider: row?.byo_ai_provider ?? null,
      byo_api_key_masked: row?.byo_api_key_masked ?? null,
      byo_key_status: row?.byo_key_status ?? null,
      byo_key_last_validated_at: row?.byo_key_last_validated_at ?? null,
      has_stored_key: !!sec,
      supported_provider: BYO_PROVIDER,
    });
  }

  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const action = typeof body.action === "string" ? body.action : "";

  const master = await importAes256GcmKeyFromEnv();
  if (!master) return json({ error: "BYO encryption is not configured on the server." }, 503);

  try {
    if (action === "test") {
      const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
      if (!apiKey) return json({ error: "API key is required", code: "validation" }, 400);
      const ping = await pingOpenAiKey(apiKey, textModel());
      if (!ping.ok) {
        return json({
          ok: false,
          code: ping.code,
          message: userMessageForByoCode(ping.code),
        });
      }
      return json({ ok: true });
    }

    if (action === "test_saved") {
      const { data: sec } = await admin
        .from("user_byo_ai_secrets")
        .select("iv, ciphertext")
        .eq("user_id", userId)
        .maybeSingle();
      if (!sec?.iv || !sec?.ciphertext) {
        return json({ ok: false, code: "no_key", message: "No saved API key to test." });
      }
      let apiKey: string;
      try {
        apiKey = await decryptApiKey(sec.iv, sec.ciphertext, master);
      } catch {
        return json({ ok: false, code: "decrypt_failed", message: "Could not read stored credentials." });
      }
      const ping = await pingOpenAiKey(apiKey.trim(), textModel());
      const now = new Date().toISOString();
      if (ping.ok) {
        await admin
          .from("user_settings")
          .update({
            byo_key_status: "valid",
            byo_key_last_validated_at: now,
            updated_at: now,
          })
          .eq("user_id", userId);
        return json({ ok: true });
      }
      await admin
        .from("user_settings")
        .update({
          byo_key_status: mapByoCodeToDbStatus(ping.code),
          byo_key_last_validated_at: now,
          updated_at: now,
        })
        .eq("user_id", userId);
      return json({ ok: false, code: ping.code, message: userMessageForByoCode(ping.code) });
    }

    if (action === "save") {
      const disclaimerAccepted = body.disclaimerAccepted === true;
      const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
      if (!disclaimerAccepted) {
        return json({ error: "You must confirm the disclaimer.", code: "disclaimer_required" }, 400);
      }
      if (!apiKey) return json({ error: "API key is required", code: "validation" }, 400);

      const ping = await pingOpenAiKey(apiKey, textModel());
      if (!ping.ok) {
        return json({
          ok: false,
          code: ping.code,
          message: userMessageForByoCode(ping.code),
        }, 422);
      }

      const enc = await encryptApiKey(apiKey, master);
      const now = new Date().toISOString();
      const masked = maskApiKey(apiKey);

      await admin.from("user_byo_ai_secrets").upsert({
        user_id: userId,
        iv: enc.iv,
        ciphertext: enc.ciphertext,
        updated_at: now,
      });

      await ensureSettingsId();
      await admin
        .from("user_settings")
        .update({
          ai_provider_mode: "byo_key",
          byo_ai_provider: BYO_PROVIDER,
          byo_api_key_masked: masked,
          byo_key_status: "valid",
          byo_key_last_validated_at: now,
          byo_disclaimer_accepted_at: now,
          updated_at: now,
        })
        .eq("user_id", userId);

      return json({
        ok: true,
        ai_provider_mode: "byo_key",
        byo_api_key_masked: masked,
        byo_key_status: "valid",
        byo_key_last_validated_at: now,
      });
    }

    if (action === "set_mode") {
      const mode = body.mode === "managed" ? "managed" : body.mode === "byo_key" ? "byo_key" : "";
      if (mode !== "managed" && mode !== "byo_key") {
        return json({ error: "Invalid mode", code: "validation" }, 400);
      }
      await ensureSettingsId();
      if (mode === "byo_key") {
        const { data: sec } = await admin.from("user_byo_ai_secrets").select("user_id").eq("user_id", userId).maybeSingle();
        if (!sec) {
          return json({ error: "Save an API key before enabling custom AI.", code: "no_stored_key" }, 400);
        }
      }
      await admin
        .from("user_settings")
        .update({
          ai_provider_mode: mode,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
      return json({ ok: true, ai_provider_mode: mode });
    }

    if (action === "clear") {
      await admin.from("user_byo_ai_secrets").delete().eq("user_id", userId);
      await admin
        .from("user_settings")
        .update({
          ai_provider_mode: "managed",
          byo_ai_provider: null,
          byo_api_key_masked: null,
          byo_key_status: null,
          byo_key_last_validated_at: null,
          byo_disclaimer_accepted_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
      return json({ ok: true, ai_provider_mode: "managed" });
    }

    return json({ error: "Unknown action", code: "unknown_action" }, 400);
  } catch (e) {
    console.error("byo-ai-settings error:", e instanceof Error ? e.message : e);
    return json({ error: "Request failed" }, 500);
  }
});
