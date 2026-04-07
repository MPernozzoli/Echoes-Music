import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Crown, Coins, Sparkles, Check, Loader2 } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { STRIPE_PLANS, type PlanKey } from "@/constants/stripePlans";
import { toast } from "sonner";

const Pricing = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, plan, tokenBalance } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);

  const handleCheckout = async (planKey: PlanKey) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    setLoading(planKey);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { plan_key: planKey },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (e) {
      toast.error("Failed to start checkout");
    } finally {
      setLoading(null);
    }
  };

  const isPremium = plan === "premium";

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 pb-20 md:pb-8">
        <div className="text-center mb-10">
          <h1 className="font-display text-3xl font-bold mb-2">
            {t("pricing.title", "Choose your plan")}
          </h1>
          <p className="text-muted-foreground">
            {t("pricing.subtitle", "Start free, upgrade anytime")}
          </p>
          {tokenBalance !== null && (
            <p className="mt-2 text-sm text-muted-foreground flex items-center justify-center gap-1">
              <Coins className="w-4 h-4" /> {tokenBalance} tokens remaining
            </p>
          )}
        </div>

        {/* Subscription Plans */}
        <div className="grid md:grid-cols-3 gap-6 mb-10">
          {/* Free */}
          <div className="glass-card rounded-2xl p-6 flex flex-col">
            <h3 className="font-display text-xl font-semibold mb-1">Free</h3>
            <p className="text-2xl font-bold mb-4">€0</p>
            <ul className="space-y-2 text-sm text-muted-foreground flex-1">
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> 20 free tokens</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> Basic search</li>
            </ul>
            <Button variant="outline" className="mt-6 w-full" disabled>
              {plan === "free" ? "Current Plan" : "Free"}
            </Button>
          </div>

          {/* Premium Monthly */}
          <div className={`glass-card rounded-2xl p-6 flex flex-col border-2 ${isPremium ? "border-primary" : "border-transparent"}`}>
            <div className="flex items-center gap-2 mb-1">
              <Crown className="w-5 h-5 text-primary" />
              <h3 className="font-display text-xl font-semibold">Premium</h3>
            </div>
            <p className="text-2xl font-bold mb-4">€9.99<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
            <ul className="space-y-2 text-sm text-muted-foreground flex-1">
              {STRIPE_PLANS.premium_monthly.features.map((f) => (
                <li key={f} className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> {f}</li>
              ))}
            </ul>
            <Button
              className="mt-6 w-full"
              onClick={() => handleCheckout("premium_monthly")}
              disabled={loading !== null || isPremium}
            >
              {loading === "premium_monthly" ? <Loader2 className="w-4 h-4 animate-spin" /> : isPremium ? "Current Plan" : "Subscribe"}
            </Button>
          </div>

          {/* Premium Annual */}
          <div className="glass-card rounded-2xl p-6 flex flex-col relative">
            <div className="absolute -top-3 right-4 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
              Save 25%
            </div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-primary" />
              <h3 className="font-display text-xl font-semibold">Annual</h3>
            </div>
            <p className="text-2xl font-bold mb-4">€89.99<span className="text-sm font-normal text-muted-foreground">/yr</span></p>
            <ul className="space-y-2 text-sm text-muted-foreground flex-1">
              {STRIPE_PLANS.premium_annual.features.map((f) => (
                <li key={f} className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> {f}</li>
              ))}
            </ul>
            <Button
              className="mt-6 w-full"
              onClick={() => handleCheckout("premium_annual")}
              disabled={loading !== null || isPremium}
            >
              {loading === "premium_annual" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Subscribe Yearly"}
            </Button>
          </div>
        </div>

        {/* Token Packs */}
        <h2 className="font-display text-xl font-semibold mb-4 text-center">
          {t("pricing.tokenPacks", "Token Packs")}
        </h2>
        <div className="grid md:grid-cols-2 gap-6 max-w-lg mx-auto">
          <div className="glass-card rounded-2xl p-6 text-center">
            <Coins className="w-8 h-8 mx-auto text-primary mb-2" />
            <h3 className="font-semibold text-lg">50 Tokens</h3>
            <p className="text-2xl font-bold my-2">€4.99</p>
            <p className="text-xs text-muted-foreground mb-4">€0.10/search</p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleCheckout("tokens_50")}
              disabled={loading !== null}
            >
              {loading === "tokens_50" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Buy"}
            </Button>
          </div>
          <div className="glass-card rounded-2xl p-6 text-center">
            <Coins className="w-8 h-8 mx-auto text-primary mb-2" />
            <h3 className="font-semibold text-lg">120 Tokens</h3>
            <p className="text-2xl font-bold my-2">€8.99</p>
            <p className="text-xs text-muted-foreground mb-4">€0.075/search</p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleCheckout("tokens_120")}
              disabled={loading !== null}
            >
              {loading === "tokens_120" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Buy"}
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Pricing;
