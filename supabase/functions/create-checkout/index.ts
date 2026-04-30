import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLANS: Record<string, { price_id: string; product_id: string; mode: "subscription" | "payment"; tokens?: number }> = {
  premium_monthly: {
    price_id: "price_1TS1cGLvrRMVmRrQ4Sqamye3",
    product_id: "prod_UQtOkhToUuJFAA",
    mode: "subscription",
  },
  premium_annual: {
    price_id: "price_1TS1cJLvrRMVmRrQkwagAU0b",
    product_id: "prod_UQtOvEkrSURxiY",
    mode: "subscription",
  },
  tokens_50: {
    price_id: "price_1TS1cMLvrRMVmRrQPehHnS2o",
    product_id: "prod_UQtOxKrJQtBKc8",
    mode: "payment",
    tokens: 65,
  },
  tokens_120: {
    price_id: "price_1TS1cQLvrRMVmRrQgba4cATx",
    product_id: "prod_UQtOrUFUpiWOaq",
    mode: "payment",
    tokens: 160,
  },
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated");

    const body = await req.json().catch(() => ({})) as {
      plan_key?: string;
      return_path?: string;
    };
    const { plan_key } = body;
    const allowedReturn = new Set([
      "/profile",
      "/pricing",
      "/pricing/plan",
      "/pricing/tokens",
      "/chat",
    ]);
    const returnPath =
      typeof body.return_path === "string" && allowedReturn.has(body.return_path)
        ? body.return_path
        : "/profile";
    const plan = plan_key ? PLANS[plan_key] : undefined;
    if (!plan || !plan_key) throw new Error(`Invalid plan: ${plan_key ?? ""}`);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const origin = req.headers.get("origin") || "https://id-preview--5e15204f-2c03-4ad3-a1ba-02fecf2770c5.lovable.app";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      client_reference_id: user.id,
      metadata: { plan_key, user_id: user.id, tokens: plan.tokens?.toString() ?? "" },
      line_items: [{ price: plan.price_id, quantity: 1 }],
      mode: plan.mode,
      allow_promotion_codes: true,
      // Regime forfettario: nessuna IVA applicata
      automatic_tax: { enabled: false },
      ...(plan.mode === "subscription"
        ? {
          subscription_data: {
            metadata: { supabase_user_id: user.id, plan_key },
          },
        }
        : {}),
      success_url: `${origin}${returnPath}?checkout=success&plan=${encodeURIComponent(plan_key)}`,
      cancel_url: `${origin}${returnPath}?checkout=cancelled`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
