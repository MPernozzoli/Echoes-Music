import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Copy, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/useAuth";
import {
  fetchActiveHomepageDiscountPromotion,
  localizedPromotionMessage,
  normalizePromotionMessages,
  type HomepageDiscountPromotion,
} from "@/services/homepageDiscountPromotion";

const SUBSCRIPTION_PRODUCT_IDS = new Set([
  "prod_UQtOkhToUuJFAA",
  "prod_UQtOvEkrSURxiY",
]);

const HomepageDiscountBanner = () => {
  const { i18n, t } = useTranslation();
  const { user, loading: authLoading, plan } = useAuth();
  const [promotion, setPromotion] = useState<HomepageDiscountPromotion | null>(null);
  const [eligible, setEligible] = useState(false);
  const [checkingEligibility, setCheckingEligibility] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await fetchActiveHomepageDiscountPromotion();
        if (!cancelled) setPromotion(data);
      } catch {
        if (!cancelled) setPromotion(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setCheckingEligibility(true);

    void (async () => {
      if (!promotion) {
        if (!cancelled) {
          setEligible(false);
          setCheckingEligibility(false);
        }
        return;
      }

      if (authLoading) return;

      if (!user) {
        if (!cancelled) {
          setEligible(true);
          setCheckingEligibility(false);
        }
        return;
      }

      const appliesToProducts = promotion.applies_to_products ?? [];
      const appliesToSubscriptions =
        appliesToProducts.length === 0 ||
        appliesToProducts.some((productId) => SUBSCRIPTION_PRODUCT_IDS.has(productId));

      if (appliesToSubscriptions && plan === "premium") {
        if (!cancelled) {
          setEligible(false);
          setCheckingEligibility(false);
        }
        return;
      }

      if (promotion.first_time_only) {
        const [{ data: subscriptions }, { data: purchases }] = await Promise.all([
          supabase
            .from("user_subscriptions")
            .select("id, stripe_customer_id, stripe_subscription_id")
            .eq("user_id", user.id)
            .limit(1),
          supabase
            .from("token_transactions")
            .select("id")
            .eq("user_id", user.id)
            .eq("type", "purchase")
            .limit(1),
        ]);

        const hasPreviousStripeActivity = Boolean(subscriptions?.length || purchases?.length);
        if (!cancelled) {
          setEligible(!hasPreviousStripeActivity);
          setCheckingEligibility(false);
        }
        return;
      }

      if (!cancelled) {
        setEligible(true);
        setCheckingEligibility(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, plan, promotion, user]);

  const message = useMemo(() => {
    if (!promotion) return "";
    return localizedPromotionMessage(
      normalizePromotionMessages(promotion.messages),
      i18n.resolvedLanguage || i18n.language,
    );
  }, [i18n.language, i18n.resolvedLanguage, promotion]);

  if (!promotion || !message || checkingEligibility || !eligible) return null;

  const copyCode = () => {
    void navigator.clipboard.writeText(promotion.code);
    toast.success(t("landing.promoCodeCopied"));
  };

  return (
    <div className="relative z-20 mx-auto mb-7 w-full max-w-3xl px-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-primary/25 bg-background/78 px-4 py-3 text-left shadow-glow backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary ring-1 ring-primary/20">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium leading-snug text-foreground">{message}</p>
            <button
              type="button"
              onClick={copyCode}
              className="mt-1 inline-flex items-center gap-1.5 rounded-md font-mono text-xs font-semibold text-primary transition-colors hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ringGlow"
            >
              {promotion.code}
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <Button size="sm" className="shrink-0 rounded-lg" asChild>
          <Link to="/pricing">{t("landing.promoBannerCta")}</Link>
        </Button>
      </div>
    </div>
  );
};

export default HomepageDiscountBanner;
