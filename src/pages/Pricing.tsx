import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Crown, Coins, ArrowRight } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/context/useAuth";
import PricingFaq from "@/components/PricingFaq";

const Pricing = () => {
  const { t } = useTranslation();
  const { user, tokenBalance } = useAuth();

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 pb-20 md:pb-8">
        <div className="text-center mb-10">
          <h1 className="font-display text-3xl font-bold mb-2">{t("pricing.hubTitle")}</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">{t("pricing.hubSubtitle")}</p>
          {tokenBalance !== null && user && (
            <p className="mt-3 text-sm text-muted-foreground flex items-center justify-center gap-1">
              <Coins className="w-4 h-4" />
              {t("pricing.tokensRemaining", { count: tokenBalance })}
            </p>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <Link
            to="/pricing/plan"
            className="glass-card rounded-2xl p-8 flex flex-col gap-4 border-2 border-transparent hover:border-primary/30 transition-colors group"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Crown className="w-6 h-6 text-primary" />
            </div>
            <div className="text-left flex-1">
              <h2 className="font-display text-xl font-semibold mb-2">{t("pricing.hubCardPlanTitle")}</h2>
              <p className="text-sm text-muted-foreground">{t("pricing.hubCardPlanDesc")}</p>
            </div>
            <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
              {t("pricing.hubCardCta")}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </Link>

          <Link
            to="/pricing/tokens"
            className="glass-card rounded-2xl p-8 flex flex-col gap-4 border-2 border-transparent hover:border-primary/30 transition-colors group"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Coins className="w-6 h-6 text-primary" />
            </div>
            <div className="text-left flex-1">
              <h2 className="font-display text-xl font-semibold mb-2">{t("pricing.hubCardTokensTitle")}</h2>
              <p className="text-sm text-muted-foreground">{t("pricing.hubCardTokensDesc")}</p>
            </div>
            <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
              {t("pricing.hubCardCta")}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </Link>
        </div>

        <p className="text-center text-xs text-muted-foreground mb-10">{t("pricing.hubFootnote")}</p>

        <PricingFaq />
      </div>
    </AppLayout>
  );
};

export default Pricing;
