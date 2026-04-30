import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Coins, Loader2, Info } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/useAuth";
import { STRIPE_PLANS, type PlanKey } from "@/constants/stripePlans";
import { startStripeCheckout } from "@/lib/stripeCheckout";
import PricingFaq from "@/components/PricingFaq";
import { toast } from "sonner";

const TOKEN_KEYS = ["tokens_50", "tokens_120"] as const satisfies readonly PlanKey[];

const BuyTokens = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, tokenBalance, plan } = useAuth();
  const hasUnlimitedTokens = plan === "premium";
  const [loading, setLoading] = useState<PlanKey | null>(null);

  const runCheckout = async (planKey: PlanKey) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    setLoading(planKey);
    try {
      const url = await startStripeCheckout(planKey, { returnPath: "/pricing/tokens" });
      if (url) window.location.href = url;
      else toast.error(t("pricing.checkoutError"));
    } catch {
      toast.error(t("pricing.checkoutError"));
    } finally {
      setLoading(null);
    }
  };

  return (
    <AppLayout>
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-artwork-radial opacity-25" aria-hidden />
        <div className="relative max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12 pb-24 md:pb-10">
          <Button variant="ghost" size="sm" className="mb-8 -ml-2 gap-1.5 text-muted-foreground hover:text-foreground" asChild>
            <Link to="/pricing">
              <ArrowLeft className="w-4 h-4" />
              {t("pricing.backHub")}
            </Link>
          </Button>

          <div className="text-center mb-10">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/25 to-emotional-tag/10 ring-1 ring-primary/20 mb-5 animate-glow-pulse motion-reduce:animate-none">
              <Coins className="w-8 h-8 text-primary" />
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold mb-3 text-balance">{t("pricing.tokensPageTitle")}</h1>
            <p className="text-muted-foreground max-w-lg mx-auto text-balance leading-relaxed">{t("pricing.tokensPageSubtitle")}</p>
            {tokenBalance !== null && user && (
              <p className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground surface-card rounded-full px-4 py-2 border border-border/50">
                <Coins className="w-4 h-4 text-primary" />
                {hasUnlimitedTokens ? t("pricing.tokensUnlimited") : t("pricing.tokensRemaining", { count: tokenBalance })}
              </p>
            )}
            <p className="mt-4 text-sm">
              <Link to="/pricing/plan" className="text-primary hover:underline font-medium">
                {t("pricing.wantSubscriptionInstead")}
              </Link>
            </p>
          </div>

          <div className="surface-card rounded-2xl p-5 mb-10 flex gap-4 text-sm text-muted-foreground border border-border/50">
            <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <p className="leading-relaxed">{t("pricing.tokensInfoBox")}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto mb-8">
            {TOKEN_KEYS.map((key) => {
              const pack = STRIPE_PLANS[key];
              return (
                <div
                  key={key}
                  className="surface-elevated rounded-3xl p-8 text-center flex flex-col border border-border/50 hover:border-primary/30 hover:shadow-glow transition-all duration-300"
                >
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-4 ring-1 ring-primary/15">
                    <Coins className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-display font-semibold text-xl">{t("pricing.packTokens", { count: pack.tokens })}</h3>
                  <p className="text-3xl font-bold my-3">{pack.price}</p>
                  <p className="text-xs text-muted-foreground mb-6">
                    {t("pricing.perSearchApprox", {
                      amount: `€${(pack.priceAmount / pack.tokens).toFixed(2)}`,
                    })}
                  </p>
                  <Button
                    variant="hero"
                    className="w-full mt-auto rounded-full"
                    onClick={() => void runCheckout(key)}
                    disabled={loading !== null}
                  >
                    {loading === key ? <Loader2 className="w-4 h-4 animate-spin" /> : t("pricing.buy")}
                  </Button>
                </div>
              );
            })}
          </div>

          <PricingFaq />
        </div>
      </div>
    </AppLayout>
  );
};

export default BuyTokens;
