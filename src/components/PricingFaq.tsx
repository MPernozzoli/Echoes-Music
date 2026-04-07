import { useTranslation } from "react-i18next";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ_KEYS = ["whatAreTokens", "premiumVsTokens", "afterPurchase", "cancelSub", "payment"] as const;

const PricingFaq = () => {
  const { t } = useTranslation();

  return (
    <section className="mt-12 max-w-2xl mx-auto">
      <h2 className="font-display text-xl font-semibold mb-4 text-center">{t("pricing.faqTitle")}</h2>
      <Accordion type="single" collapsible className="w-full glass-card rounded-2xl px-4">
        {FAQ_KEYS.map((key) => (
          <AccordionItem key={key} value={key} className="border-border/60">
            <AccordionTrigger className="text-left text-sm font-medium hover:no-underline">
              {t(`pricing.faq.${key}.q`)}
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground pb-4">
              {t(`pricing.faq.${key}.a`)}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
};

export default PricingFaq;
