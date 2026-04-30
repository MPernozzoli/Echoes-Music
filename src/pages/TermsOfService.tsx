import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import LegalDocumentView from "@/components/LegalDocumentView";
import { termsSectionsFor } from "@/legal/termsContent";

const TermsOfService = () => {
  const { t, i18n } = useTranslation();
  const sections = termsSectionsFor(i18n.language);

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
        <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">{t("legal.termsTitle")}</h1>
        <p className="text-sm text-muted-foreground font-body mb-8">{t("legal.lastUpdated")}</p>
        <LegalDocumentView sections={sections} />
        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-muted-foreground font-body pb-12">
          <Link to="/privacy" className="text-primary hover:underline">
            {t("legal.privacyTitle")}
          </Link>
          <span aria-hidden>·</span>
          <Link to="/cookies" className="text-primary hover:underline">
            {t("legal.cookiesTitle")}
          </Link>
        </nav>
      </div>
    </AppLayout>
  );
};

export default TermsOfService;
