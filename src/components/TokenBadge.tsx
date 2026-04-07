import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Coins } from "lucide-react";
import { useAuth } from "@/context/useAuth";
import { TOKEN_WARNING_THRESHOLD } from "@/constants/tokenAlerts";
import { cn } from "@/lib/utils";

const badgeClass = "flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm font-medium text-primary";

const TokenBadge = () => {
  const { t } = useTranslation();
  const { tokenBalance, user } = useAuth();

  if (!user || tokenBalance === null) return null;

  const low = tokenBalance <= TOKEN_WARNING_THRESHOLD;
  const content = (
    <>
      <Coins className="h-3.5 w-3.5" />
      <span>{tokenBalance}</span>
    </>
  );

  if (low) {
    return (
      <Link
        to="/pricing/tokens"
        className={cn(badgeClass, "hover:bg-primary/10 transition-colors")}
        aria-label={t("pricing.tokenBadgeLowAria")}
      >
        {content}
      </Link>
    );
  }

  return <div className={badgeClass}>{content}</div>;
};

export default TokenBadge;
