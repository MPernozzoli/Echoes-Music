import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AI_MODEL = 'google/gemini-3-flash-preview';

const SYSTEM_PROMPT = `You are a content moderator for a public music discovery platform.
Decide if a user's music search prompt is safe to display publicly as an example search.

REJECT if the prompt contains any of:
- Personal names (real people other than well-known artists), addresses, emails, phone numbers, or other PII
- Sensitive health info: illness, grief, trauma, medical conditions, mental health struggles
- Politically controversial, offensive, or legally sensitive content
- Sexual, violent, or disturbing content
- Suicidal ideation or self-harm references

APPROVE if it is a genuine, generic music search: a mood, atmosphere, moment, activity, music style, era, etc.

If approved: write a clean version. You may slightly rephrase for clarity or anonymize if needed. Keep the original language (Italian or English). Max 120 characters.

Respond ONLY with valid JSON (no markdown):
{"approved": true or false, "display_prompt": "clean version" or null}`;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const apiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!supabaseUrl || !serviceKey || !apiKey) {
      return new Response(JSON.stringify({ error: 'Missing configuration' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const body = await req.json() as { search_id?: string; raw_prompt?: string };
    const { search_id, raw_prompt } = body;

    if (!search_id || !raw_prompt) {
      return new Response(JSON.stringify({ error: 'Missing search_id or raw_prompt' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Skip if already processed
    const { data: existing } = await admin
      .from('searches')
      .select('id, display_processed')
      .eq('id', search_id)
      .single();

    if (!existing) {
      return new Response(JSON.stringify({ error: 'Search not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (existing.display_processed) {
      return new Response(JSON.stringify({ skipped: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Call AI gateway
    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: raw_prompt.slice(0, 500) },
        ],
        max_tokens: 120,
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }),
    });

    let approved = false;
    let displayPrompt: string | null = null;

    if (res.ok) {
      const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
      const content = data.choices?.[0]?.message?.content ?? '';
      try {
        const parsed = JSON.parse(content) as { approved?: boolean; display_prompt?: string | null };
        approved = parsed.approved === true;
        displayPrompt = approved ? (parsed.display_prompt?.trim() || null) : null;
      } catch {
        console.error('process-display-prompt: failed to parse AI response:', content.slice(0, 200));
      }
    } else {
      console.error('process-display-prompt: AI gateway error', res.status);
    }

    await admin
      .from('searches')
      .update({
        display_processed: true,
        display_approved: approved,
        display_prompt: displayPrompt,
      })
      .eq('id', search_id);

    return new Response(JSON.stringify({ approved, display_prompt: displayPrompt }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('process-display-prompt error:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
