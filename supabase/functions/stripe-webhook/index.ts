import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

/** Allineare a src/constants/tokenEconomy.ts */
const PREMIUM_PRODUCT_MONTHLY = "prod_UIBycXCJF3PNRB";
const PREMIUM_PRODUCT_ANNUAL = "prod_UIByOkXl3FXIIZ";
const TOKENS_MONTHLY_CYCLE = 120;
const TOKENS_ANNUAL_CYCLE = 1440;
/** Allineare a src/constants/tokenEconomy.ts REFERRAL_PRO_BONUS_RATE */
const REFERRAL_PRO_BONUS_RATE = 0.5;

function tokensForPremiumProduct(productId: string | undefined): number {
  if (productId === PREMIUM_PRODUCT_MONTHLY) return TOKENS_MONTHLY_CYCLE;
  if (productId === PREMIUM_PRODUCT_ANNUAL) return TOKENS_ANNUAL_CYCLE;
  return 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!stripeKey || !webhookSecret || !serviceKey) {
    return new Response(JSON.stringify({ error: "Missing env" }), { status: 500, headers: corsHeaders });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return new Response(JSON.stringify({ error: "No signature" }), { status: 400, headers: corsHeaders });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), { status: 400, headers: corsHeaders });
  }

  const { error: dupErr } = await admin.from("stripe_processed_events").insert({ id: event.id });
  if (dupErr) {
    const isDup = dupErr.code === "23505" || dupErr.message?.includes("duplicate");
    if (isDup) {
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.error("stripe_processed_events insert:", dupErr);
    return new Response(JSON.stringify({ error: dupErr.message }), { status: 500, headers: corsHeaders });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "payment" && session.payment_status === "paid") {
          const userId = session.client_reference_id;
          const raw = session.metadata?.tokens ?? "";
          const amount = parseInt(raw, 10);
          if (userId && amount > 0) {
            const { error } = await admin.rpc("grant_tokens", {
              p_user_id: userId,
              p_amount: amount,
              p_type: "purchase",
              p_description: `Token pack (${amount})`,
            });
            if (error) console.error("grant_tokens pack:", error);
          }
        }
        if (session.mode === "subscription" && session.subscription) {
          const subId = session.subscription as string;
          const sub = await stripe.subscriptions.retrieve(subId);
          const userId = sub.metadata?.supabase_user_id ?? session.client_reference_id ?? undefined;
          const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
          if (userId && customerId) {
            await syncSubscriptionRow(admin, userId, customerId, sub);
          }
        }
        break;
      }
      case "invoice.payment_succeeded": {
        const inv = event.data.object as Stripe.Invoice;
        if (inv.status !== "paid") break;
        if ((inv.amount_paid ?? 0) <= 0) break;
        const subId = typeof inv.subscription === "string" ? inv.subscription : inv.subscription?.id;
        if (!subId) break;
        const sub = await stripe.subscriptions.retrieve(subId);
        const userId = sub.metadata?.supabase_user_id;
        if (!userId) break;
        const customerId = typeof inv.customer === "string" ? inv.customer : inv.customer?.id;
        if (customerId) await syncSubscriptionRow(admin, userId, customerId, sub);

        const line = inv.lines?.data?.[0];
        const price = line?.price;
        const productId = typeof price?.product === "string"
          ? price.product
          : (price?.product as Stripe.Product | undefined)?.id;
        const grant = tokensForPremiumProduct(productId);
        if (grant > 0) {
          const { error } = await admin.rpc("grant_tokens", {
            p_user_id: userId,
            p_amount: grant,
            p_type: "subscription_cycle",
            p_description: `Premium allowance (${grant} tokens)`,
          });
          if (error) console.error("grant_tokens subscription:", error);
          const referralBonus = Math.floor(grant * REFERRAL_PRO_BONUS_RATE);
          if (referralBonus > 0) {
            const { error: refErr } = await admin.rpc("try_grant_referral_pro_bonus", {
              p_referee_id: userId,
              p_bonus: referralBonus,
            });
            if (refErr) console.error("try_grant_referral_pro_bonus:", refErr);
          }
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.supabase_user_id;
        if (!userId) break;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        if (event.type === "customer.subscription.deleted" || sub.status === "canceled") {
          await admin.from("user_subscriptions").update({
            status: "canceled",
            updated_at: new Date().toISOString(),
          }).eq("stripe_subscription_id", sub.id);
        } else {
          await syncSubscriptionRow(admin, userId, customerId, sub);
        }
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error("stripe-webhook handler:", e);
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

async function syncSubscriptionRow(
  admin: ReturnType<typeof createClient>,
  userId: string,
  customerId: string,
  sub: Stripe.Subscription,
) {
  const row = {
    user_id: userId,
    plan: "premium",
    status: sub.status === "active" ? "active" : sub.status,
    stripe_customer_id: customerId,
    stripe_subscription_id: sub.id,
    current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
    current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  };
  const { data: existing } = await admin.from("user_subscriptions").select("id").eq("user_id", userId).maybeSingle();
  if (existing?.id) {
    await admin.from("user_subscriptions").update(row).eq("id", existing.id);
  } else {
    await admin.from("user_subscriptions").insert(row);
  }
}
