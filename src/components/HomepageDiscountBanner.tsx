import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Copy, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  fetchActiveHomepageDiscountPromotion,
  localizedPromotionMessage,
  normalizePromotionMessages,
  type HomepageDiscountPromotion,
} from "@/services/homepageDiscountPromotion";

const HomepageDiscountBanner = () => {
  const { i18n, t } = useTranslation();
  const [promotion, setPromotion] = useState<HomepageDiscountPromotion | null>(null);

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

  const message = useMemo(() => {
    if (!promotion) return "";
    return localizedPromotionMessage(
      normalizePromotionMessages(promotion.messages),
      i18n.resolvedLanguage || i18n.language,
    );
  }, [i18n.language, i18n.resolvedLanguage, promotion]);

  if (!promotion || !message) return null;

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
