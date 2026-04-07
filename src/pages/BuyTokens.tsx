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
  const { user, tokenBalance } = useAuth();
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
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 pb-20 md:pb-8">
        <Button variant="ghost" size="sm" className="mb-6 -ml-2 gap-1 text-muted-foreground" asChild>
          <Link to="/pricing">
            <ArrowLeft className="w-4 h-4" />
            {t("pricing.backHub")}
          </Link>
        </Button>

        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold mb-2">{t("pricing.tokensPageTitle")}</h1>
          <p className="text-muted-foreground max-w-lg mx-auto">{t("pricing.tokensPageSubtitle")}</p>
          {tokenBalance !== null && user && (
            <p className="mt-3 text-sm text-muted-foreground flex items-center justify-center gap-1">
              <Coins className="w-4 h-4" />
              {t("pricing.tokensRemaining", { count: tokenBalance })}
            </p>
          )}
          <p className="mt-2 text-sm">
            <Link to="/pricing/plan" className="text-primary hover:underline">
              {t("pricing.wantSubscriptionInstead")}
            </Link>
          </p>
        </div>

        <div className="glass-card rounded-2xl p-4 mb-8 flex gap-3 text-sm text-muted-foreground">
          <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <p>{t("pricing.tokensInfoBox")}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto mb-4">
          {TOKEN_KEYS.map((key) => {
            const pack = STRIPE_PLANS[key];
            return (
              <div key={key} className="glass-card rounded-2xl p-6 text-center flex flex-col">
                <Coins className="w-8 h-8 mx-auto text-primary mb-2" />
                <h3 className="font-semibold text-lg">
                  {t("pricing.packTokens", { count: pack.tokens })}
                </h3>
                <p className="text-2xl font-bold my-2">{pack.price}</p>
                <p className="text-xs text-muted-foreground mb-4">
                  {key === "tokens_50" ? t("pricing.perSearchApprox", { amount: "€0.10" }) : t("pricing.perSearchApprox", { amount: "€0.075" })}
                </p>
                <Button
                  variant="outline"
                  className="w-full mt-auto"
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
    </AppLayout>
  );
};

export default BuyTokens;
