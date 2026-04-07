import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Crown, Sparkles, Check, Loader2, Coins, ExternalLink } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/useAuth";
import { STRIPE_PLANS, type PlanKey } from "@/constants/stripePlans";
import { startStripeCheckout, openCustomerPortal } from "@/lib/stripeCheckout";
import PricingFaq from "@/components/PricingFaq";
import { toast } from "sonner";

const SubscribePlan = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, plan, tokenBalance } = useAuth();
  const [loading, setLoading] = useState<PlanKey | "portal" | null>(null);

  const isPremium = plan === "premium";

  const runCheckout = async (planKey: PlanKey) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    setLoading(planKey);
    try {
      const url = await startStripeCheckout(planKey, { returnPath: "/pricing/plan" });
      if (url) window.location.href = url;
      else toast.error(t("pricing.checkoutError"));
    } catch {
      toast.error(t("pricing.checkoutError"));
    } finally {
      setLoading(null);
    }
  };

  const runPortal = async () => {
    if (!user) return;
    setLoading("portal");
    try {
      const url = await openCustomerPortal();
      if (url) window.location.href = url;
      else toast.error(t("pricing.portalError"));
    } catch {
      toast.error(t("pricing.portalError"));
    } finally {
      setLoading(null);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 pb-20 md:pb-8">
        <Button variant="ghost" size="sm" className="mb-6 -ml-2 gap-1 text-muted-foreground" asChild>
          <Link to="/pricing">
            <ArrowLeft className="w-4 h-4" />
            {t("pricing.backHub")}
          </Link>
        </Button>

        <div className="text-center mb-10">
          <h1 className="font-display text-3xl font-bold mb-2">{t("pricing.planPageTitle")}</h1>
          <p className="text-muted-foreground max-w-lg mx-auto">{t("pricing.planPageSubtitle")}</p>
          {tokenBalance !== null && user && (
            <p className="mt-3 text-sm text-muted-foreground flex items-center justify-center gap-1">
              <Coins className="w-4 h-4" />
              {t("pricing.tokensRemaining", { count: tokenBalance })}
            </p>
          )}
          <p className="mt-2 text-sm">
            <Link to="/pricing/tokens" className="text-primary hover:underline inline-flex items-center gap-1">
              <Coins className="w-3.5 h-3.5" />
              {t("pricing.needOnlyTokens")}
            </Link>
          </p>
        </div>

        {isPremium && user && (
          <div className="glass-card rounded-2xl p-4 mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-sm text-muted-foreground">{t("pricing.alreadyPremiumHint")}</p>
            <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={() => void runPortal()} disabled={loading !== null}>
              {loading === "portal" ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
              {t("pricing.manageBilling")}
            </Button>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6 mb-4">
          <div className="glass-card rounded-2xl p-6 flex flex-col">
            <h3 className="font-display text-xl font-semibold mb-1">{t("pricing.tierFree")}</h3>
            <p className="text-2xl font-bold mb-4">€0</p>
            <ul className="space-y-2 text-sm text-muted-foreground flex-1">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-primary shrink-0" />
                {t("pricing.freeTokensLine")}
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-primary shrink-0" />
                {t("pricing.freeSearchLine")}
              </li>
            </ul>
            <Button variant="outline" className="mt-6 w-full" disabled>
              {plan === "free" ? t("pricing.currentPlan") : t("pricing.tierFree")}
            </Button>
          </div>

          <div className={`glass-card rounded-2xl p-6 flex flex-col border-2 ${isPremium ? "border-primary" : "border-transparent"}`}>
            <div className="flex items-center gap-2 mb-1">
              <Crown className="w-5 h-5 text-primary" />
              <h3 className="font-display text-xl font-semibold">{t("pricing.tierPremiumMonthly")}</h3>
            </div>
            <p className="text-2xl font-bold mb-4">
              €9.99<span className="text-sm font-normal text-muted-foreground">/mo</span>
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground flex-1">
              {STRIPE_PLANS.premium_monthly.features.map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Button
              className="mt-6 w-full"
              onClick={() => void runCheckout("premium_monthly")}
              disabled={loading !== null || isPremium}
            >
              {loading === "premium_monthly" ? <Loader2 className="w-4 h-4 animate-spin" /> : isPremium ? t("pricing.currentPlan") : t("pricing.subscribe")}
            </Button>
          </div>

          <div className="glass-card rounded-2xl p-6 flex flex-col relative">
            <div className="absolute -top-3 right-4 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
              {t("pricing.savePct", { pct: 25 })}
            </div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-primary" />
              <h3 className="font-display text-xl font-semibold">{t("pricing.tierPremiumAnnual")}</h3>
            </div>
            <p className="text-2xl font-bold mb-4">
              €89.99<span className="text-sm font-normal text-muted-foreground">/yr</span>
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground flex-1">
              {STRIPE_PLANS.premium_annual.features.map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Button
              className="mt-6 w-full"
              onClick={() => void runCheckout("premium_annual")}
              disabled={loading !== null || isPremium}
            >
              {loading === "premium_annual" ? <Loader2 className="w-4 h-4 animate-spin" /> : t("pricing.subscribeYearly")}
            </Button>
          </div>
        </div>

        <PricingFaq />
      </div>
    </AppLayout>
  );
};

export default SubscribePlan;
