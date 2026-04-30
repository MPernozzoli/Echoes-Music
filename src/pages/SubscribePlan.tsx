import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Crown, Sparkles, Check, Loader2, Coins, ExternalLink } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/useAuth";
import { STRIPE_PLANS, type PlanKey } from "@/constants/stripePlans";
import { startStripeCheckout, openCustomerPortal } from "@/lib/stripeCheckout";
import PricingFaq from "@/components/PricingFaq";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-artwork-radial opacity-25" aria-hidden />
        <div className="relative max-w-5xl mx-auto px-4 md:px-6 py-8 md:py-12 pb-24 md:pb-10">
          <Button variant="ghost" size="sm" className="mb-8 -ml-2 gap-1.5 text-muted-foreground hover:text-foreground" asChild>
            <Link to="/pricing">
              <ArrowLeft className="w-4 h-4" />
              {t("pricing.backHub")}
            </Link>
          </Button>

          <div className="text-center mb-12">
            <h1 className="font-display text-3xl md:text-4xl font-bold mb-3 text-balance">{t("pricing.planPageTitle")}</h1>
            <p className="text-muted-foreground max-w-lg mx-auto text-balance">{t("pricing.planPageSubtitle")}</p>
            {tokenBalance !== null && user && (
              <p className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground surface-card rounded-full px-4 py-2 border border-border/50">
                <Coins className="w-4 h-4 text-primary" />
                {isPremium ? t("pricing.tokensUnlimited") : t("pricing.tokensRemaining", { count: tokenBalance })}
              </p>
            )}
            <p className="mt-4 text-sm">
              <Link to="/pricing/tokens" className="text-primary hover:underline inline-flex items-center gap-1.5 font-medium">
                <Coins className="w-3.5 h-3.5" />
                {t("pricing.needOnlyTokens")}
              </Link>
            </p>
          </div>

          {isPremium && user && (
            <div className="surface-card rounded-2xl p-5 mb-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border border-primary/15">
              <p className="text-sm text-muted-foreground">{t("pricing.alreadyPremiumHint")}</p>
              <Button variant="outline" size="sm" className="gap-1.5 shrink-0 rounded-full" onClick={() => void runPortal()} disabled={loading !== null}>
                {loading === "portal" ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                {t("pricing.manageBilling")}
              </Button>
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-5 md:gap-6 mb-8 items-stretch">
            <div className="surface-elevated rounded-3xl p-6 md:p-7 flex flex-col border border-border/50 h-full">
              <h3 className="font-display text-xl font-semibold mb-1">{t("pricing.tierFree")}</h3>
              <p className="text-3xl font-bold mb-6">€0</p>
              <ul className="space-y-3 text-sm text-muted-foreground flex-1">
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  {t("pricing.freeTokensLine")}
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  {t("pricing.freeSearchLine")}
                </li>
              </ul>
              <Button variant="outline" className="mt-8 w-full rounded-full" disabled>
                {plan === "free" ? t("pricing.currentPlan") : t("pricing.tierFree")}
              </Button>
            </div>

            <div
              className={cn(
                "rounded-3xl p-6 md:p-7 flex flex-col relative overflow-hidden h-full",
                "surface-elevated border-2 shadow-glow",
                isPremium ? "border-primary ring-2 ring-primary/20" : "border-primary/30 hover:border-primary/50",
              )}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.07] to-transparent pointer-events-none" aria-hidden />
              <div className="relative flex items-center gap-2 mb-2">
                <Crown className="w-5 h-5 text-primary" />
                <h3 className="font-display text-xl font-semibold">{t("pricing.tierPremiumMonthly")}</h3>
                <Badge variant="default" className="ml-auto text-[10px] uppercase tracking-wide">
                  {t("pricing.popularBadge")}
                </Badge>
              </div>
              <p className="relative text-3xl font-bold mb-6">
                €9.99<span className="text-sm font-normal text-muted-foreground">/mo</span>
              </p>
              <ul className="relative space-y-3 text-sm text-muted-foreground flex-1">
                {STRIPE_PLANS.premium_monthly.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                variant="hero"
                className="mt-8 w-full rounded-full"
                onClick={() => void runCheckout("premium_monthly")}
                disabled={loading !== null || isPremium}
              >
                {loading === "premium_monthly" ? <Loader2 className="w-4 h-4 animate-spin" /> : isPremium ? t("pricing.currentPlan") : t("pricing.subscribe")}
              </Button>
            </div>

            <div className="surface-elevated rounded-3xl p-6 md:p-7 flex flex-col relative border border-border/50 h-full overflow-hidden">
              <Badge className="absolute top-4 right-4 rounded-full bg-brand-gradient text-primary-foreground border-0 shadow-sm text-xs">
                {t("pricing.savePct", { pct: 25 })}
              </Badge>
              <div className="flex items-center gap-2 mb-2 pr-16">
                <Sparkles className="w-5 h-5 text-primary" />
                <h3 className="font-display text-xl font-semibold">{t("pricing.tierPremiumAnnual")}</h3>
              </div>
              <p className="text-3xl font-bold mb-6">
                €89.99<span className="text-sm font-normal text-muted-foreground">/yr</span>
              </p>
              <ul className="space-y-3 text-sm text-muted-foreground flex-1">
                {STRIPE_PLANS.premium_annual.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                variant="soft"
                className="mt-8 w-full rounded-full font-semibold border-primary/25"
                onClick={() => void runCheckout("premium_annual")}
                disabled={loading !== null || isPremium}
              >
                {loading === "premium_annual" ? <Loader2 className="w-4 h-4 animate-spin" /> : t("pricing.subscribeYearly")}
              </Button>
            </div>
          </div>

          <PricingFaq />
        </div>
      </div>
    </AppLayout>
  );
};

export default SubscribePlan;
