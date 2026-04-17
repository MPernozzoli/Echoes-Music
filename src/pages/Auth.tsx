import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Gift, Music, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/useAuth";
import { SIGNUP_TOKEN_BONUS } from "@/constants/tokenEconomy";
import { PENDING_REFERRAL_STORAGE_KEY } from "@/constants/referralStorage";
import { startGoogleAuth } from "@/services/auth";
import { toast } from "sonner";
import { mockSongs } from "@/data/mockData";
import { cn } from "@/lib/utils";

const Auth = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      navigate("/chat", { replace: true });
    }
  }, [user, loading, navigate]);

  const hasPendingReferral = (() => {
    if (typeof window === "undefined") return false;
    try {
      return Boolean(localStorage.getItem(PENDING_REFERRAL_STORAGE_KEY)?.trim());
    } catch {
      return false;
    }
  })();

  const handleGoogleLogin = async () => {
    const result = await startGoogleAuth();

    if (result.error) {
      toast.error(t("auth.loginError", "Login failed. Please try again."));
      return;
    }

    if (result.redirected) {
      return;
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground font-body">…</div>
      </div>
    );
  }

  const collage = mockSongs.slice(0, 6);

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="relative hidden lg:flex flex-col justify-between p-12 overflow-hidden">
        <div className="absolute inset-0 bg-brand-gradient opacity-[0.12] animate-gradient-drift motion-reduce:animate-none" aria-hidden />
        <div className="absolute inset-0 bg-artwork-radial opacity-40" aria-hidden />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-12 w-12 rounded-2xl bg-primary/15 flex items-center justify-center ring-1 ring-primary/25">
              <Music className="h-6 w-6 text-primary" />
            </div>
            <span className="font-display text-2xl font-bold gradient-warm-text">Echoes</span>
          </div>
          <p className="font-display text-3xl xl:text-4xl font-semibold text-foreground/95 max-w-md leading-tight text-balance">
            {t("auth.subtitle", "Discover music that resonates with your emotions")}
          </p>
        </div>
        <div className="relative z-10 flex flex-wrap gap-3 justify-center items-end pb-8">
          {collage.map((song, i) => (
            <div
              key={song.id}
              className={cn(
                "rounded-2xl overflow-hidden shadow-elevated ring-2 ring-background/80 w-24 h-24 xl:w-28 xl:h-28",
                i % 3 === 0 && "rotate-[-4deg]",
                i % 3 === 1 && "translate-y-4 rotate-[3deg]",
                i % 3 === 2 && "rotate-[5deg] -translate-y-2",
              )}
            >
              <img src={song.artwork} alt="" className="w-full h-full object-cover" width={112} height={112} />
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col items-center justify-center px-6 py-14 lg:py-10">
        <div className="w-full max-w-sm space-y-8 text-center">
          <div className="flex flex-col items-center gap-3 lg:hidden">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
              <Music className="h-8 w-8 text-primary" />
            </div>
            <h1 className="font-display text-3xl font-bold text-foreground">Echoes</h1>
          </div>

          <p className="text-muted-foreground font-body text-sm lg:hidden">{t("auth.subtitle", "Discover music that resonates with your emotions")}</p>

          <div className="flex items-center justify-center gap-2 rounded-full border border-primary/25 bg-primary/5 px-4 py-2.5 text-sm text-primary font-body">
            <Sparkles className="h-4 w-4 shrink-0" />
            <span>{t("auth.freeTokens", { count: SIGNUP_TOKEN_BONUS })}</span>
          </div>

          {hasPendingReferral ? (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-500/25 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300 font-body text-left">
              <Gift className="h-4 w-4 shrink-0" />
              <span>{t("auth.referralPending", "Referral detected: finish with Google and the invite bonus will be credited automatically.")}</span>
            </div>
          ) : null}

          <Button onClick={handleGoogleLogin} variant="hero" className="w-full gap-3 py-6 text-base rounded-2xl shadow-glow">
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            {t("auth.continueWithGoogle", "Continue with Google")}
          </Button>

          <p className="text-xs text-muted-foreground font-body">{t("auth.terms", "By continuing, you agree to our Terms of Service and Privacy Policy")}</p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
