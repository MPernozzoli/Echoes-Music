import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Crown, Coins, ArrowRight } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/context/useAuth";
import PricingFaq from "@/components/PricingFaq";
import { Badge } from "@/components/ui/badge";

const Pricing = () => {
  const { t } = useTranslation();
  const { user, tokenBalance, plan } = useAuth();
  const hasUnlimitedTokens = plan === "premium";

  return (
    <AppLayout>
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-artwork-radial opacity-30" aria-hidden />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-primary/[0.08] to-transparent" aria-hidden />
        <div className="relative max-w-4xl mx-auto px-4 md:px-6 py-10 md:py-14 pb-24 md:pb-12">
          <div className="text-center mb-12 md:mb-14">
            <Badge variant="mood" className="mb-4 font-body">
              Echoes
            </Badge>
            <h1 className="font-display text-3xl md:text-4xl font-bold mb-3 text-balance">{t("pricing.hubTitle")}</h1>
            <p className="text-muted-foreground max-w-xl mx-auto text-balance leading-relaxed">{t("pricing.hubSubtitle")}</p>
            {tokenBalance !== null && user && (
              <p className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground surface-card rounded-full px-4 py-2 border border-border/50">
                <Coins className="w-4 h-4 text-primary shrink-0" />
                {hasUnlimitedTokens ? t("pricing.tokensUnlimited") : t("pricing.tokensRemaining", { count: tokenBalance })}
              </p>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-6 md:gap-8 mb-8">
            <Link
              to="/pricing/plan"
              className="group surface-elevated rounded-3xl p-8 md:p-10 flex flex-col gap-5 border border-border/50 hover:border-primary/35 hover:shadow-glow transition-all duration-300"
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/25 to-emotional-tag/10 flex items-center justify-center ring-1 ring-primary/20 group-hover:scale-105 transition-transform motion-reduce:group-hover:scale-100">
                <Crown className="w-7 h-7 text-primary" />
              </div>
              <div className="text-left flex-1">
                <h2 className="font-display text-xl md:text-2xl font-semibold mb-2">{t("pricing.hubCardPlanTitle")}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">{t("pricing.hubCardPlanDesc")}</p>
              </div>
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary font-body">
                {t("pricing.hubCardCta")}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>

            <Link
              to="/pricing/tokens"
              className="group surface-elevated rounded-3xl p-8 md:p-10 flex flex-col gap-5 border border-border/50 hover:border-primary/35 hover:shadow-glow transition-all duration-300"
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/25 to-emotional-tag/10 flex items-center justify-center ring-1 ring-primary/20 group-hover:scale-105 transition-transform motion-reduce:group-hover:scale-100">
                <Coins className="w-7 h-7 text-primary" />
              </div>
              <div className="text-left flex-1">
                <h2 className="font-display text-xl md:text-2xl font-semibold mb-2">{t("pricing.hubCardTokensTitle")}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">{t("pricing.hubCardTokensDesc")}</p>
              </div>
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary font-body">
                {t("pricing.hubCardCta")}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
          </div>

          <p className="text-center text-xs text-muted-foreground mb-12">{t("pricing.hubFootnote")}</p>

          <PricingFaq />
        </div>
      </div>
    </AppLayout>
  );
};

export default Pricing;
