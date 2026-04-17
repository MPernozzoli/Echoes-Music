import { useState, useMemo, useEffect } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles, Search, Music, Wand2 } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";
import PromptInput, { type PromptSubmitPayload } from "@/components/PromptInput";
import SongCard from "@/components/SongCard";
import { mockSongs, type Song } from "@/data/mockData";
import { fetchRecentSearchArtworks, fetchRecentSearchPreviewSongs } from "@/services/recentSearchGallery";
import { pickDiscoverPromptSuggestions } from "@/lib/discoverPromptSuggestions";
import { useApp } from "@/context/useApp";
import { useAuth } from "@/context/useAuth";
import { useConversations } from "@/context/useConversations";
import { callMusicSearch } from "@/services/musicSearchApi";
import { Button } from "@/components/ui/button";
import AppLayout from "@/components/AppLayout";
import { AppLogo } from "@/components/AppLogo";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { artworkTintFromId } from "@/lib/artworkTint";

const Landing = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { descriptionLanguage } = useApp();
  const { refreshTokenBalance } = useAuth();
  const { userTasteProfile, conversations, activeConversationId } = useConversations();
  const [luckyLoading, setLuckyLoading] = useState(false);
  const [heroArtworkUrls, setHeroArtworkUrls] = useState<string[]>(() => mockSongs.slice(0, 4).map((s) => s.artwork));
  const [previewSongs, setPreviewSongs] = useState<Song[]>(() => mockSongs.slice(0, 3));
  const [communityGalleryActive, setCommunityGalleryActive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [urls, songs] = await Promise.all([
          fetchRecentSearchArtworks(4),
          fetchRecentSearchPreviewSongs(3),
        ]);
        if (cancelled) return;
        const fromDb = urls.length > 0 || songs.length > 0;
        setCommunityGalleryActive(fromDb);

        if (urls.length >= 4) setHeroArtworkUrls(urls.slice(0, 4));
        else if (urls.length > 0) {
          const pad = mockSongs.map((s) => s.artwork).filter((u) => !urls.includes(u));
          setHeroArtworkUrls([...urls, ...pad].slice(0, 4));
        }

        if (songs.length >= 3) setPreviewSongs(songs.slice(0, 3));
        else if (songs.length > 0) {
          const ids = new Set(songs.map((s) => s.id));
          const pad = mockSongs.filter((s) => !ids.has(s.id));
          setPreviewSongs([...songs, ...pad].slice(0, 3));
        }
      } catch {
        if (!cancelled) setCommunityGalleryActive(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const landingPrompts = useMemo(() => {
    const completedSearchCount = conversations.reduce(
      (acc, c) => acc + c.messages.filter((m) => m.role === "assistant").length,
      0,
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
          void refreshTokenBalance();
          return;
        }
        if (data.error.includes("Rate") || data.error.includes("429")) toast.error(t("landing.toastRateLimit"));
        else if (
          data.error.includes("credits") ||
          data.error.includes("402") ||
          data.error.includes("Insufficient")
        ) {
          toast.error(t("landing.toastNoCredits"));
        } else toast.error(data.error);
        void refreshTokenBalance();
        return;
      }
      if (!data.emotionalProfile || !data.songs?.length) {
        toast.error(t("landing.toastNoSongs"));
        void refreshTokenBalance();
        return;
      }
      void refreshTokenBalance();
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
    [t],
  );

  return (
    <AppLayout headerVariant="marketing">
      <div className="min-h-screen bg-background">
        <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden">
          <img
            src={heroBg}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-35 scale-105 motion-reduce:scale-100"
            width={1920}
            height={1080}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />
          <div
            className="absolute inset-0 opacity-[0.15] dark:opacity-[0.22] bg-brand-gradient bg-[length:200%_200%] animate-gradient-drift motion-reduce:animate-none"
            aria-hidden
          />

          {/* Silhouette copertine — parallax leggero */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
            {heroArtworkUrls.map((src, idx) => (
              <div
                key={`${src}-${idx}`}
                className={cn(
                  "absolute rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/10 dark:ring-white/5 opacity-25 blur-[1px]",
                  idx === 0 && "w-28 h-28 -left-4 top-[18%] rotate-[-8deg] animate-artwork-float",
                  idx === 1 && "w-24 h-24 right-[8%] top-[22%] rotate-[10deg] animate-artwork-float [animation-delay:1s]",
                  idx === 2 && "w-32 h-32 left-[12%] bottom-[20%] rotate-[6deg] animate-artwork-float [animation-delay:0.5s]",
                  idx === 3 && "w-20 h-20 right-[18%] bottom-[28%] rotate-[-12deg] animate-artwork-float [animation-delay:1.5s]",
                )}
                style={{ animationDuration: `${5 + idx}s` }}
              >
                <img src={src} alt="" className="w-full h-full object-cover" width={128} height={128} />
              </div>
            ))}
          </div>

          <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-card/60 backdrop-blur-md text-muted-foreground text-sm font-body mb-8 animate-fade-in shadow-soft">
              <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
              {t("landing.badge")}
            </div>

            <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold text-foreground leading-[1.08] mb-6 animate-fade-up text-balance">
              {t("landing.title")}{" "}
              <span className="gradient-warm-text italic">{t("landing.titleItalic")}</span>
            </h1>

            <p
              className="text-lg md:text-xl text-muted-foreground font-body max-w-xl mx-auto mb-10 animate-fade-up text-balance"
              style={{ animationDelay: "100ms" }}
            >
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
                variant="soft"
                size="lg"
                className="rounded-full px-7 gap-2 font-body border-primary/20"
                disabled={luckyLoading}
                onClick={() => void handleLucky()}
              >
                {luckyLoading ? (
                  <span className="text-sm">{t("landing.luckyLoading")}</span>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 text-primary shrink-0" />
                    {t("landing.luckyButton")}
                  </>
                )}
              </Button>
            </div>

            <div className="flex flex-wrap justify-center gap-2 animate-fade-up" style={{ animationDelay: "300ms" }}>
              {landingPrompts.map((prompt, i) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handlePromptSubmit({ text: prompt })}
                  className="group text-xs px-4 py-2 rounded-full border border-border/70 bg-card/40 backdrop-blur-sm text-muted-foreground hover:text-foreground hover:border-primary/35 hover:bg-primary/[0.06] hover:shadow-md transition-all font-body hover:-rotate-1 hover:scale-[1.02] motion-reduce:hover:rotate-0 motion-reduce:hover:scale-100 animate-fade-slide-up"
                  style={{ animationDelay: `${320 + i * 50}ms` }}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-primary/60 group-hover:text-primary transition-colors shrink-0" />
                    {prompt}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="py-24 md:py-28 px-6 relative">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" aria-hidden />
          <div className="max-w-5xl mx-auto">
            <h2 className="font-display text-3xl md:text-4xl font-semibold text-center mb-16 text-balance">
              <Trans i18nKey="landing.howHeading" components={[<span key="e" className="gradient-warm-text" />]} />
            </h2>

            <div className="grid md:grid-cols-3 gap-6 md:gap-8">
              {steps.map((step, i) => (
                <div
                  key={i}
                  className="surface-elevated rounded-2xl p-8 text-center hover:shadow-glow transition-shadow duration-300 border border-border/40 hover:border-primary/20 group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-emotional-tag/10 ring-1 ring-primary/20 flex items-center justify-center mx-auto mb-5 group-hover:scale-105 transition-transform motion-reduce:group-hover:scale-100">
                    <step.icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="font-display text-xl font-semibold mb-3">{step.title}</h3>
                  <p className="text-sm text-muted-foreground font-body leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          className="py-24 md:py-28 px-6 relative overflow-hidden rounded-t-[2.5rem] md:rounded-t-[3rem]"
          style={previewSongs[0] ? artworkTintFromId(previewSongs[0].id) : undefined}
        >
          <div className="absolute inset-0 gradient-warm rounded-t-[2.5rem] md:rounded-t-[3rem]" aria-hidden />
          <div className="absolute inset-0 bg-artwork-radial opacity-50 pointer-events-none rounded-t-[2.5rem] md:rounded-t-[3rem]" aria-hidden />
          <div className="relative max-w-2xl mx-auto">
            <p className="text-xs uppercase tracking-widest text-primary font-body mb-3 text-center">{t("landing.preview")}</p>
            <h2 className="font-display text-3xl md:text-4xl font-semibold text-center mb-4 text-balance">
              {t("landing.resultsTitle")} <span className="italic">{t("landing.resultsTitleItalic")}</span>
              {t("landing.resultsTitleEnd")}
            </h2>
            <p className="text-muted-foreground text-center font-body mb-12 max-w-lg mx-auto text-balance">{t("landing.resultsSubtitle")}</p>
            {communityGalleryActive ? (
              <p className="text-center text-xs text-muted-foreground/75 font-body mb-8 -mt-6 max-w-md mx-auto text-balance">
                {t("landing.liveCommunityArtwork")}
              </p>
            ) : null}

            <div className="space-y-5">
              {previewSongs.map((song, i) => (
                <SongCard key={`${song.id}-${i}`} {...song} index={i} />
              ))}
            </div>

            <div className="text-center mt-14">
              <Button variant="hero" size="lg" className="rounded-full px-8 gap-2 font-body" asChild>
                <Link to="/chat">
                  {t("landing.enterEchoes")}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <footer className="py-14 px-6 text-center border-t border-border/40 bg-muted/20">
          <div className="flex flex-col items-center gap-2 mb-2">
            <AppLogo size={44} className="rounded-xl shadow-soft" />
            <p className="font-display text-xl gradient-warm-text">Echoes</p>
          </div>
          <p className="text-xs text-muted-foreground font-body">{t("landing.footerTagline")}</p>
          <nav className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs font-body">
            <Link to="/privacy" className="text-muted-foreground hover:text-foreground underline-offset-4 hover:underline">
              {t("landing.footerPrivacy")}
            </Link>
            <span className="text-border" aria-hidden>
              ·
            </span>
            <Link to="/cookies" className="text-muted-foreground hover:text-foreground underline-offset-4 hover:underline">
              {t("landing.footerCookies")}
            </Link>
          </nav>
        </footer>
      </div>
    </AppLayout>
  );
};

export default Landing;
