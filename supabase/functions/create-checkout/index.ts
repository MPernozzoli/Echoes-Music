import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLANS: Record<string, { price_id: string; product_id: string; mode: "subscription" | "payment"; tokens?: number }> = {
  premium_monthly: {
    price_id: "price_1TJbaSLDyBUZjAjaEESklylw",
    product_id: "prod_UIBycXCJF3PNRB",
    mode: "subscription",
  },
  premium_annual: {
    price_id: "price_1TJbajLDyBUZjAjaEWAcXTHX",
    product_id: "prod_UIByOkXl3FXIIZ",
    mode: "subscription",
  },
  tokens_50: {
    price_id: "price_1TJbb7LDyBUZjAjaSnbhOqxp",
    product_id: "prod_UIBzdydTivyNco",
    mode: "payment",
    tokens: 50,
  },
  tokens_120: {
    price_id: "price_1TJbbPLDyBUZjAja6Ug6CRRx",
    product_id: "prod_UIBzM97S90Mchr",
    mode: "payment",
    tokens: 120,
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

    const { plan_key } = await req.json();
    const plan = PLANS[plan_key];
    if (!plan) throw new Error(`Invalid plan: ${plan_key}`);

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
      success_url: `${origin}/profile?checkout=success&plan=${plan_key}`,
      cancel_url: `${origin}/profile?checkout=cancelled`,
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
