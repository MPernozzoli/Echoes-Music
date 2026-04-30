import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Body =
  | { action: "list" }
  | {
      action: "create";
      code: string;
      coupon_name: string;
      discount_type: "percent" | "amount";
      discount_value: number;
      duration: "once" | "repeating" | "forever";
      duration_in_months?: number;
      applies_to?: string[];
      max_redemptions?: number;
      redeem_by?: number;
    }
  | { action: "deactivate"; promotion_code_id: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) throw new Error("Not authenticated");

    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) throw new Error("Not authorized");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", { apiVersion: "2025-08-27.basil" });
    const body = await req.json() as Body;

    if (body.action === "list") {
      const coupons = await stripe.coupons.list({ limit: 100 });
      const result = await Promise.all(
        coupons.data.map(async (c) => {
          const pcs = await stripe.promotionCodes.list({ coupon: c.id, limit: 20 });
          return {
            coupon_id: c.id,
            name: c.name,
            percent_off: c.percent_off,
            amount_off: c.amount_off,
            currency: c.currency,
            duration: c.duration,
            duration_in_months: c.duration_in_months,
            applies_to: c.applies_to,
            valid: c.valid,
            times_redeemed: c.times_redeemed,
            promotion_codes: pcs.data.map((p) => ({
              id: p.id,
              code: p.code,
              active: p.active,
              times_redeemed: p.times_redeemed,
              max_redemptions: p.max_redemptions,
              expires_at: p.expires_at,
            })),
          };
        })
      );
      return ok({ data: result });
    }

    if (body.action === "create") {
      const coupon = await stripe.coupons.create({
        name: body.coupon_name || body.code,
        duration: body.duration,
        ...(body.duration === "repeating" ? { duration_in_months: body.duration_in_months } : {}),
        ...(body.discount_type === "percent"
          ? { percent_off: body.discount_value }
          : { amount_off: body.discount_value, currency: "eur" }),
        ...(body.applies_to?.length ? { applies_to: { products: body.applies_to } } : {}),
      });

      const promoCode = await stripe.promotionCodes.create({
        coupon: coupon.id,
        code: body.code.toUpperCase().replace(/\s+/g, ""),
        ...(body.max_redemptions ? { max_redemptions: body.max_redemptions } : {}),
        ...(body.redeem_by ? { expires_at: body.redeem_by } : {}),
      });

      return ok({ coupon_id: coupon.id, promotion_code_id: promoCode.id, code: promoCode.code });
    }

    if (body.action === "deactivate") {
      await stripe.promotionCodes.update(body.promotion_code_id, { active: false });
      return ok({ success: true });
    }

    throw new Error("Unknown action");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

function ok(data: unknown) {
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}
