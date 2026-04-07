import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Coins } from "lucide-react";
import { useAuth } from "@/context/useAuth";
import { TOKEN_URGENT_THRESHOLD, TOKEN_WARNING_THRESHOLD } from "@/constants/tokenAlerts";
import { Button } from "@/components/ui/button";

const TokenLowBanner = () => {
  const { t } = useTranslation();
  const { user, tokenBalance } = useAuth();

  if (!user || tokenBalance === null) return null;

  if (tokenBalance === 0) {
    return (
      <div className="border-b border-destructive/40 bg-destructive/10 px-4 py-3">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-2 text-sm">
            <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-foreground font-medium">{t("pricing.bannerEmpty")}</p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Button size="sm" variant="secondary" asChild>
              <Link to="/pricing/tokens">{t("pricing.buyTokensCta")}</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/pricing/plan">{t("pricing.viewPlansCta")}</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (tokenBalance > TOKEN_WARNING_THRESHOLD) return null;

  const urgent = tokenBalance <= TOKEN_URGENT_THRESHOLD;

  return (
    <div
      className={`border-b px-4 py-2.5 ${
        urgent ? "border-amber-500/50 bg-amber-500/10" : "border-primary/25 bg-primary/5"
      }`}
    >
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2 text-sm">
          <Coins className={`w-4 h-4 shrink-0 ${urgent ? "text-amber-600 dark:text-amber-400" : "text-primary"}`} />
          <p className={urgent ? "text-amber-950 dark:text-amber-100 font-medium" : "text-muted-foreground"}>
            {t("pricing.bannerLow", { count: tokenBalance })}
          </p>
        </div>
        <Button size="sm" variant={urgent ? "default" : "outline"} className="shrink-0 w-fit" asChild>
          <Link to="/pricing/tokens">{t("pricing.topUpCta")}</Link>
        </Button>
      </div>
    </div>
  );
};

export default TokenLowBanner;
