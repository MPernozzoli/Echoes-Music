import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const codes = [
      { code: "ECHOES40", coupon: "MDBCMWfU" },
      { code: "ECHOES50", coupon: "2XZW9rCO" },
      { code: "ECHOES80", coupon: "1a8wJSz6" },
    ];

    const results = [];
    for (const c of codes) {
      try {
        const promo = await stripe.promotionCodes.create({
          coupon: c.coupon,
          code: c.code,
          active: true,
        });
        results.push({ code: c.code, id: promo.id, status: "created" });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        results.push({ code: c.code, status: "error", error: msg });
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
