import { supabase } from "@/integrations/supabase/client";
import type { Json, Tables } from "@/integrations/supabase/types";
import type { SupportedUiLang } from "@/i18n/config";

export type PromotionMessages = Partial<Record<SupportedUiLang, string>>;
export type HomepageDiscountPromotion = Tables<"homepage_discount_promotions">;

export const PROMOTION_LANGS: SupportedUiLang[] = ["it", "en", "fr", "de", "es", "pt"];

export function normalizePromotionMessages(value: Json | null | undefined): PromotionMessages {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return PROMOTION_LANGS.reduce<PromotionMessages>((acc, lang) => {
    const raw = (value as Record<string, unknown>)[lang];
    if (typeof raw === "string" && raw.trim()) acc[lang] = raw.trim();
    return acc;
  }, {});
}

export function localizedPromotionMessage(
  messages: PromotionMessages,
  language: string | undefined,
): string {
  const lang = language?.split("-")[0] as SupportedUiLang | undefined;
  if (lang && messages[lang]) return messages[lang] ?? "";
  return messages.en ?? messages.it ?? Object.values(messages).find(Boolean) ?? "";
}

export async function fetchActiveHomepageDiscountPromotion() {
  const { data, error } = await supabase
    .from("homepage_discount_promotions")
    .select("*")
    .eq("active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function fetchAdminHomepageDiscountPromotions() {
  const { data, error } = await supabase
    .from("homepage_discount_promotions")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function saveHomepageDiscountPromotion(input: {
  promotionCodeId: string;
  code: string;
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
  messages: PromotionMessages;
  firstTimeOnly: boolean;
  appliesToProducts: string[];
}) {
  const messages = PROMOTION_LANGS.reduce<Record<string, string>>((acc, lang) => {
    const value = input.messages[lang]?.trim();
    if (value) acc[lang] = value;
    return acc;
  }, {});

  const { data, error } = await supabase.rpc("admin_upsert_homepage_discount_promotion", {
    p_promotion_code_id: input.promotionCodeId,
    p_code: input.code,
    p_active: input.active,
    p_starts_at: input.startsAt,
    p_ends_at: input.endsAt,
    p_messages: messages,
    p_first_time_only: input.firstTimeOnly,
    p_applies_to_products: input.appliesToProducts,
  });

  if (error) throw error;
  return data;
}

export async function generatePromotionTranslations(input: {
  sourceLanguage: SupportedUiLang;
  message: string;
  code: string;
}) {
  const { data, error } = await supabase.functions.invoke("discount-promotion-translations", {
    body: {
      source_language: input.sourceLanguage,
      message: input.message,
      code: input.code,
    },
  });
  if (error) throw error;
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return (data as { translations?: PromotionMessages }).translations ?? {};
}
