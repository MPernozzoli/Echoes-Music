import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Brain, Heart, Music2, Search, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface MusicSearchThinkingProps {
  active: boolean;
  className?: string;
}

const MusicSearchThinking = ({ active, className }: MusicSearchThinkingProps) => {
  const { t } = useTranslation();
  const [phase, setPhase] = useState(0);

  const steps = useMemo(
    () =>
      [
        { icon: Sparkles, label: t("thinking.step1") },
        { icon: Brain, label: t("thinking.step2") },
        { icon: Heart, label: t("thinking.step3") },
        { icon: Search, label: t("thinking.step4") },
        { icon: Music2, label: t("thinking.step5") },
      ] as const,
    [t]
  );

  useEffect(() => {
    if (!active) {
      setPhase(0);
      return;
    }
    setPhase(0);
    const timer = window.setInterval(() => {
      setPhase((p) => (p < steps.length - 1 ? p + 1 : p));
    }, 2200);
    return () => window.clearInterval(timer);
  }, [active, steps.length]);

  if (!active) return null;

  return (
    <div
      className={cn(
        "rounded-2xl border border-primary/15 bg-gradient-to-b from-primary/[0.06] to-card/40 p-4 md:p-5 shadow-sm",
        className
      )}
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/12 ring-1 ring-primary/20">
          <Sparkles className="h-4 w-4 text-primary animate-pulse" />
        </div>
        <div>
          <p className="text-xs font-body uppercase tracking-wider text-muted-foreground">{t("thinking.working")}</p>
          <p className="text-sm font-display font-semibold text-foreground">{t("thinking.moment")}</p>
        </div>
      </div>

      <ol className="space-y-2 mb-5">
        {steps.map((step, i) => {
          const Icon = step.icon;
          const done = i < phase;
          const current = i === phase;
          return (
            <li
              key={step.label}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-body transition-all duration-500",
                current && "bg-primary/10 text-foreground ring-1 ring-primary/20",
                done && !current && "text-muted-foreground/80",
                !done && !current && "text-muted-foreground/40"
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0",
                  current && "text-primary",
                  done && "text-primary/60",
                  !done && !current && "text-muted-foreground/30"
                )}
              />
              <span>{step.label}</span>
              {current && (
                <span className="ml-auto flex gap-1" aria-hidden>
                  <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-pulse" />
                  <span className="h-1.5 w-1.5 rounded-full bg-primary/40 animate-pulse [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-primary/25 animate-pulse [animation-delay:300ms]" />
                </span>
              )}
            </li>
          );
        })}
      </ol>

      <div className="space-y-3 rounded-xl border border-border/40 bg-muted/20 p-3">
        <div className="h-3 w-[55%] max-w-[220px] rounded-md bg-muted/70 animate-pulse" />
        <div className="h-3 w-full rounded-md bg-muted/50 animate-pulse [animation-delay:100ms]" />
        <div className="h-3 w-[72%] rounded-md bg-muted/40 animate-pulse [animation-delay:200ms]" />
        <div className="flex gap-2 pt-1">
          <div className="h-16 w-16 shrink-0 rounded-lg bg-muted/60 animate-pulse" />
          <div className="flex-1 space-y-2 min-w-0">
            <div className="h-3 w-[66%] rounded bg-muted/60 animate-pulse" />
            <div className="h-2 w-[34%] rounded bg-muted/40 animate-pulse" />
            <div className="flex gap-1.5">
              <div className="h-5 w-14 rounded-full bg-muted/35 animate-pulse" />
              <div className="h-5 w-20 rounded-full bg-muted/35 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MusicSearchThinking;
