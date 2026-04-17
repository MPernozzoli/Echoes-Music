import type { EmotionalProfile as EmotionalProfileType } from "@/data/mockData";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { stringToMeterPercent } from "@/lib/emotionalMeter";

interface EmotionalProfileProps {
  profile: EmotionalProfileType;
}

const EmotionalProfileCard = ({ profile }: EmotionalProfileProps) => {
  const { t } = useTranslation();

  const rows: { key: keyof EmotionalProfileType; labelKey: string }[] = [
    { key: "mood", labelKey: "emotionalProfile.mood" },
    { key: "energy", labelKey: "emotionalProfile.energy" },
    { key: "intimacy", labelKey: "emotionalProfile.intimacy" },
    { key: "catharsis", labelKey: "emotionalProfile.catharsis" },
    { key: "emotionalTension", labelKey: "emotionalProfile.tension" },
  ];

  return (
    <div className="surface-card rounded-2xl p-6 md:p-7 animate-fade-in overflow-hidden relative">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" aria-hidden />
      <div className="relative">
        <h3 className="font-display text-lg font-semibold text-foreground mb-1">{t("emotionalProfile.title")}</h3>
        <p className="text-xs text-muted-foreground font-body mb-5">{t("emotionalProfile.subtitle")}</p>

        <div className="flex flex-wrap gap-2 mb-6">
          {profile.themes.map((theme) => (
            <Badge key={theme} variant="mood" className="font-body font-medium">
              {theme}
            </Badge>
          ))}
        </div>

        <div className="space-y-4">
          {rows.map(({ key, labelKey }) => {
            const raw = profile[key];
            const text = typeof raw === "string" ? raw : "";
            const pct = stringToMeterPercent(text || key);
            return (
              <div key={key} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-body">{t(labelKey)}</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted/80 overflow-hidden border border-border/40">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary/80 via-emotional-tag/70 to-primary transition-[width] duration-700 ease-out"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-sm text-foreground/90 font-body leading-snug">{text}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default EmotionalProfileCard;
