import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import LegalDocumentView from "@/components/LegalDocumentView";
import { cookiesSectionsFor } from "@/legal/cookiesContent";

const CookiePolicy = () => {
  const { t, i18n } = useTranslation();
  const sections = cookiesSectionsFor(i18n.language);

  return (
    <AppLayout headerVariant="marketing">
      <div className="max-w-3xl mx-auto px-4 md:px-6 pt-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground font-body transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("legal.backHome")}
        </Link>
        <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">{t("legal.cookiesTitle")}</h1>
        <p className="text-sm text-muted-foreground font-body mb-8">{t("legal.lastUpdated")}</p>
        <LegalDocumentView sections={sections} />
        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-muted-foreground font-body pb-12">
          <Link to="/terms" className="text-primary hover:underline">
            {t("legal.termsTitle")}
          </Link>
          <span aria-hidden>·</span>
          <Link to="/privacy" className="text-primary hover:underline">
            {t("legal.privacyTitle")}
          </Link>
        </nav>
      </div>
    </AppLayout>
  );
};

export default CookiePolicy;
