import { supabase } from "@/integrations/supabase/client";
import type { PlanKey } from "@/constants/stripePlans";

export const STRIPE_CHECKOUT_RETURN_PATHS = [
  "/profile",
  "/pricing",
  "/pricing/plan",
  "/pricing/tokens",
  "/chat",
] as const;

export type StripeReturnPath = (typeof STRIPE_CHECKOUT_RETURN_PATHS)[number];

const allowedReturn = new Set<string>(STRIPE_CHECKOUT_RETURN_PATHS);

export async function startStripeCheckout(
  planKey: PlanKey,
  options?: { returnPath?: StripeReturnPath }
): Promise<string | null> {
  const return_path =
    options?.returnPath && allowedReturn.has(options.returnPath) ? options.returnPath : undefined;
  const { data, error } = await supabase.functions.invoke("create-checkout", {
    body: { plan_key: planKey, ...(return_path ? { return_path } : {}) },
  });
  if (error) throw error;
  return (data as { url?: string })?.url ?? null;
}

export async function openCustomerPortal(): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke("customer-portal");
  if (error) throw error;
  return (data as { url?: string })?.url ?? null;
}
