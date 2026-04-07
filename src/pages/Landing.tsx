import { useState, useMemo } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles, Search, Music, Wand2 } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";
import PromptInput, { type PromptSubmitPayload } from "@/components/PromptInput";
import SongCard from "@/components/SongCard";
import { mockSongs } from "@/data/mockData";
import { pickDiscoverPromptSuggestions } from "@/lib/discoverPromptSuggestions";
import { useApp } from "@/context/useApp";
import { useConversations } from "@/context/useConversations";
import { callMusicSearch } from "@/services/musicSearchApi";
import { Button } from "@/components/ui/button";
import { AppLogo } from "@/components/AppLogo";
import { toast } from "sonner";

const Landing = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { descriptionLanguage } = useApp();
  const { userTasteProfile, conversations, activeConversationId } = useConversations();
  const [luckyLoading, setLuckyLoading] = useState(false);

  const landingPrompts = useMemo(() => {
    const completedSearchCount = conversations.reduce(
      (acc, c) => acc + c.messages.filter((m) => m.role === "assistant").length,
      0
    );
    return pickDiscoverPromptSuggestions({
      userTasteProfile,
      completedSearchCount,
      descriptionLanguage,
      count: 3,
      sessionKey: "landing",
    });
  }, [conversations, userTasteProfile, descriptionLanguage]);

  const handlePromptSubmit = (payload: PromptSubmitPayload) => {
    const text = payload.text.trim();
    const hasImg = Boolean(payload.imageBase64 && payload.imageMimeType);
    if (!text && !hasImg) return;
    if (hasImg) {
      navigate("/chat", {
        state: {
          landingSearch: {
            text: payload.text,
            ...(payload.imageBase64 && payload.imageMimeType
              ? { imageBase64: payload.imageBase64, imageMimeType: payload.imageMimeType }
              : {}),
          },
        },
      });
      return;
    }
    navigate(`/chat?q=${encodeURIComponent(text)}`);
  };

  const handleLucky = async () => {
    const convId = activeConversationId ?? conversations[0]?.id;
    if (!convId) {
      toast.error(t("landing.toastNoConversation"));
      return;
    }
    setLuckyLoading(true);
    try {
      const data = await callMusicSearch({
        mode: "lucky",
        userTasteProfile,
        descriptionLanguage,
        conversationId: convId,
      });
      if (data.error) {
        if (data.code?.startsWith("anon_")) {
          toast.error(data.error || t("chat.anonQuotaLogin"));
          navigate("/auth", { replace: true });
          return;
        }
        if (data.code?.startsWith("byo_")) {
          toast.error(data.error || t("landing.toastGenericError"), {
            description: data.byo_fallback_suggested
              ? "You can return to Echoes managed AI under Profile → Advanced AI Settings."
              : undefined,
          });
          return;
        }
        if (data.error.includes("Rate") || data.error.includes("429")) toast.error(t("landing.toastRateLimit"));
        else if (data.error.includes("credits") || data.error.includes("402")) toast.error(t("landing.toastNoCredits"));
        else toast.error(data.error);
        return;
      }
      if (!data.emotionalProfile || !data.songs?.length) {
        toast.error(t("landing.toastNoSongs"));
        return;
      }
      navigate(`/chat?conversation=${encodeURIComponent(convId)}`, { state: { luckyPayload: data } });
    } catch {
      toast.error(t("landing.toastGenericError"));
    } finally {
      setLuckyLoading(false);
    }
  };

  const steps = useMemo(
    () => [
      { icon: Sparkles, title: t("landing.step1Title"), desc: t("landing.step1Desc") },
      { icon: Search, title: t("landing.step2Title"), desc: t("landing.step2Desc") },
      { icon: Music, title: t("landing.step3Title"), desc: t("landing.step3Desc") },
    ],
    [t]
  );

  return (
    <div className="min-h-screen bg-background">
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        <img
          src={heroBg}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-40"
          width={1920}
          height={1080}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/60 to-background" />

        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border bg-card/50 text-muted-foreground text-sm font-body mb-8 animate-fade-in">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            {t("landing.badge")}
          </div>

          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold text-foreground leading-[1.1] mb-6 animate-fade-up">
            {t("landing.title")}{" "}
            <span className="gradient-warm-text italic">{t("landing.titleItalic")}</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground font-body max-w-xl mx-auto mb-10 animate-fade-up" style={{ animationDelay: "100ms" }}>
            {t("landing.subtitle")}
          </p>

          <div className="max-w-2xl mx-auto mb-4 animate-fade-up" style={{ animationDelay: "200ms" }}>
            <PromptInput
              onSubmit={handlePromptSubmit}
              allowImageAttachment
              size="hero"
              placeholder={t("promptInput.placeholderDefault")}
            />
          </div>

          <div className="flex justify-center mb-8 animate-fade-up" style={{ animationDelay: "250ms" }}>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="rounded-full px-6 gap-2 border-primary/30 hover:bg-primary/10 font-body"
              disabled={luckyLoading}
              onClick={() => void handleLucky()}
            >
              {luckyLoading ? (
                <span className="text-sm">{t("landing.luckyLoading")}</span>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 text-primary" />
                  {t("landing.luckyButton")}
                </>
              )}
            </Button>
          </div>

          <div className="flex flex-wrap justify-center gap-2 animate-fade-up" style={{ animationDelay: "300ms" }}>
            {landingPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => handlePromptSubmit({ text: prompt })}
                className="text-xs px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all font-body"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-center mb-16">
            <Trans
              i18nKey="landing.howHeading"
              components={[<span key="e" className="gradient-warm-text" />]}
            />
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <div key={i} className="glass-card rounded-2xl p-6 text-center">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <step.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-display text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground font-body leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-6 gradient-warm rounded-t-3xl">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs uppercase tracking-widest text-primary font-body mb-3 text-center">{t("landing.preview")}</p>
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-center mb-4">
            {t("landing.resultsTitle")} <span className="italic">{t("landing.resultsTitleItalic")}</span>
            {t("landing.resultsTitleEnd")}
          </h2>
          <p className="text-muted-foreground text-center font-body mb-12 max-w-lg mx-auto">
            {t("landing.resultsSubtitle")}
          </p>

          <div className="space-y-4">
            {mockSongs.slice(0, 3).map((song, i) => (
              <SongCard key={song.id} {...song} index={i} />
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              to="/chat"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-body font-medium hover:opacity-90 transition-opacity"
            >
              {t("landing.enterEchoes")}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="py-12 px-6 text-center">
        <div className="flex flex-col items-center gap-2 mb-2">
          <AppLogo size={40} className="rounded-xl" />
          <p className="font-display text-lg gradient-warm-text">Echoes</p>
        </div>
        <p className="text-xs text-muted-foreground font-body">{t("landing.footerTagline")}</p>
      </footer>
    </div>
  );
};

export default Landing;
