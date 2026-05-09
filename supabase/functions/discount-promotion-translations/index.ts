import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AI_MODEL = "google/gemini-3-flash-preview";
const LANGUAGES = ["it", "en", "fr", "de", "es", "pt"] as const;

type Lang = (typeof LANGUAGES)[number];

type Body = {
  source_language?: Lang;
  message?: string;
  code?: string;
};

const SYSTEM_PROMPT = `You translate short ecommerce promotion banner copy for a music discovery web app.
Return ONLY valid JSON with exactly these keys: it, en, fr, de, es, pt.
Keep each translation natural, concise, promotional, and under 120 characters.
Preserve any discount code exactly as written if it appears in the source.
Do not add markdown or explanations.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) throw new Error("Not authenticated");

    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) throw new Error("Not authorized");

    const body = await req.json() as Body;
    const message = body.message?.trim();
    if (!message) {
      return json({ error: "Missing message" }, 400);
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const sourceLanguage = LANGUAGES.includes(body.source_language as Lang) ? body.source_language : "it";
    const code = body.code?.trim();
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: JSON.stringify({
              source_language: sourceLanguage,
              source_message: message.slice(0, 300),
              discount_code: code || null,
            }),
          },
        ],
        max_tokens: 260,
        temperature: 0.2,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("discount-promotion-translations: AI gateway error", res.status, text.slice(0, 400));
      throw new Error("AI translation failed");
    }

    const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content) as Partial<Record<Lang, unknown>>;
    const translations = Object.fromEntries(
      LANGUAGES.map((lang) => [lang, typeof parsed[lang] === "string" ? String(parsed[lang]).trim() : ""]),
    ) as Record<Lang, string>;

    translations[sourceLanguage] = message;

    return json({ translations });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({ error: msg }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
