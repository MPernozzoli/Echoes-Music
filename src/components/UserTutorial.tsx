import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Heart, ListMusic, MessageSquare, Music, Sparkles, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/useAuth";
import { getUserSettings, persistTutorialCompletedAt } from "@/services/tracking";
import { cn } from "@/lib/utils";
import { OPEN_TUTORIAL_EVENT } from "@/lib/tutorialEvents";

const FEATURE_LAUNCHED_AT = Date.parse("2026-04-30T00:00:00.000Z");

const completedStorageKey = (userId: string) => `echoes_tutorial_completed_${userId}`;
const promptedStorageKey = (userId: string) => `echoes_tutorial_prompted_${userId}`;

export function UserTutorial() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  const steps = useMemo(
    () => [
      {
        icon: MessageSquare,
        title: t("tutorial.steps.describe.title", "Start from a feeling"),
        body: t(
          "tutorial.steps.describe.body",
          "Open the chat and describe a mood, memory, scene, or image. Echoes turns that emotional context into song recommendations."
        ),
      },
      {
        icon: Sparkles,
        title: t("tutorial.steps.results.title", "Echoes explains the match"),
        body: t(
          "tutorial.steps.results.body",
          "Results include a match score, emotional tags, and a short reason why the track fits. Use that context to refine the next message."
        ),
      },
      {
        icon: Music,
        title: t("tutorial.steps.playback.title", "Connect your streaming service"),
        body: t(
          "tutorial.steps.playback.body",
          "Echoes works without it, but it is better with Spotify or Apple Music connected: full playback, playlist actions, and synced favorites become available."
        ),
      },
      {
        icon: Heart,
        title: t("tutorial.steps.memory.title", "Build your music memory"),
        body: t(
          "tutorial.steps.memory.body",
          "Save favorites, revisit history, and keep related searches in the same chat. The more context you keep, the easier it is to find songs that feel right."
        ),
      },
    ],
    [t]
  );

  const isLastStep = step === steps.length - 1;

  const markCompleted = useCallback(async () => {
    if (user?.id) {
      localStorage.setItem(completedStorageKey(user.id), "true");
      await persistTutorialCompletedAt();
    }
  }, [user?.id]);

  const closeTutorial = useCallback(
    (complete: boolean) => {
      setOpen(false);
      setStep(0);
      if (complete) void markCompleted();
    },
    [markCompleted]
  );

  useEffect(() => {
    const onOpenTutorial = () => {
      setStep(0);
      setOpen(true);
    };
    window.addEventListener(OPEN_TUTORIAL_EVENT, onOpenTutorial);
    return () => window.removeEventListener(OPEN_TUTORIAL_EVENT, onOpenTutorial);
  }, []);

  useEffect(() => {
    if (loading || !user?.id) return;

    let cancelled = false;
    void (async () => {
      const createdAt = Date.parse(user.created_at ?? "");
      const isNewUser = Number.isFinite(createdAt) && createdAt >= FEATURE_LAUNCHED_AT;
      if (!isNewUser) return;

      const localCompleted = localStorage.getItem(completedStorageKey(user.id)) === "true";
      const alreadyPrompted = sessionStorage.getItem(promptedStorageKey(user.id)) === "true";
      if (localCompleted || alreadyPrompted) return;

      const settings = await getUserSettings();
      if (cancelled) return;
      if (settings?.tutorial_completed_at) {
        localStorage.setItem(completedStorageKey(user.id), "true");
        return;
      }

      sessionStorage.setItem(promptedStorageKey(user.id), "true");
      setStep(0);
      setOpen(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [loading, user?.created_at, user?.id]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeTutorial(Boolean(user));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeTutorial, open, user]);

  if (!open) return null;

  const currentStep = steps[step];
  const CurrentIcon = currentStep.icon;

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-background/55 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="echoes-tutorial-title"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-4 right-4 top-4 h-20 rounded-[1.5rem] border border-primary/40 bg-primary/10 shadow-[0_0_0_9999px_rgba(0,0,0,0.22)] md:left-24 md:right-24 md:top-5" />
        <div className="absolute bottom-24 left-4 right-4 h-24 rounded-[1.5rem] border border-emotional-tag/35 bg-emotional-tag/10 md:bottom-8 md:left-1/2 md:right-auto md:h-20 md:w-[520px] md:-translate-x-1/2" />
      </div>

      <section className="absolute inset-x-3 bottom-3 mx-auto max-w-3xl rounded-3xl border border-border/70 bg-card/95 p-4 shadow-elevated backdrop-blur-xl sm:bottom-6 sm:p-5 md:right-6 md:left-auto md:mx-0 md:w-[660px]">
        <button
          type="button"
          className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          onClick={() => closeTutorial(Boolean(user))}
          aria-label={t("tutorial.close", "Close tutorial")}
        >
          <X className="h-4 w-4" />
        </button>

        <div className="grid gap-5 md:grid-cols-[180px_1fr]">
          <div className="flex flex-col justify-between gap-4 rounded-2xl bg-primary/10 p-4 ring-1 ring-primary/15">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-background/70 ring-1 ring-border/60">
              <ListMusic className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-body text-xs uppercase tracking-[0.18em] text-muted-foreground">
                {t("tutorial.kicker", "Quick start")}
              </p>
              <h2 id="echoes-tutorial-title" className="mt-2 font-display text-xl font-semibold leading-tight text-foreground">
                {t("tutorial.heroTitle", "How Echoes works")}
              </h2>
            </div>
          </div>

          <div className="pr-8 md:pr-2">
            <div className="mb-4 flex items-center gap-2">
              {steps.map((item, index) => (
                <button
                  key={item.title}
                  type="button"
                  className={cn(
                    "h-1.5 flex-1 rounded-full transition-colors",
                    index <= step ? "bg-primary" : "bg-muted"
                  )}
                  onClick={() => setStep(index)}
                  aria-label={t("tutorial.goToStep", "Go to tutorial step {{step}}", { step: index + 1 })}
                />
              ))}
            </div>

            <div className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                <CurrentIcon className="h-5 w-5 text-primary" />
              </span>
              <div>
                <h3 className="font-display text-xl font-semibold leading-tight text-foreground">
                  {currentStep.title}
                </h3>
                <p className="mt-2 font-body text-sm leading-relaxed text-muted-foreground">
                  {currentStep.body}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Button
                type="button"
                variant="ghost"
                className="rounded-full text-muted-foreground"
                onClick={() => closeTutorial(Boolean(user))}
              >
                {t("tutorial.skip", "Skip")}
              </Button>
              <div className="flex gap-2">
                {step > 0 ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full"
                    onClick={() => setStep((value) => Math.max(0, value - 1))}
                  >
                    {t("tutorial.back", "Back")}
                  </Button>
                ) : null}
                {isLastStep ? (
                  <Button
                    type="button"
                    variant="hero"
                    className="rounded-full"
                    onClick={() => {
                      closeTutorial(Boolean(user));
                      navigate("/chat");
                    }}
                  >
                    {t("tutorial.start", "Start with chat")}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="hero"
                    className="rounded-full"
                    onClick={() => setStep((value) => Math.min(steps.length - 1, value + 1))}
                  >
                    {t("tutorial.next", "Next")}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
