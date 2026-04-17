import { useEffect, useState, type CSSProperties } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Gift, Loader2, Sparkles, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/useAuth";
import { REFERRAL_SIGNUP_BONUS_EACH } from "@/constants/tokenEconomy";
import { PENDING_REFERRAL_STORAGE_KEY } from "@/constants/referralStorage";
import { startGoogleAuth } from "@/services/auth";
import { REFERRAL_STORAGE_UPDATED_EVENT } from "@/components/ReferralProgram";

const Invite = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const [startingAuth, setStartingAuth] = useState(false);

  useEffect(() => {
    const trimmed = code?.trim();
    if (!trimmed) {
      navigate("/", { replace: true });
      return;
    }

    try {
      localStorage.setItem(PENDING_REFERRAL_STORAGE_KEY, trimmed);
      window.dispatchEvent(new Event(REFERRAL_STORAGE_UPDATED_EVENT));
    } catch {
      /* ignore */
    }
  }, [code, navigate]);

  useEffect(() => {
    if (!loading && user) {
      navigate("/chat", { replace: true });
    }
  }, [loading, navigate, user]);

  const handleContinue = async () => {
    if (!code?.trim()) return;
    setStartingAuth(true);
    const result = await startGoogleAuth();
    if (result.error) {
      setStartingAuth(false);
      toast.error(t("invite.loginError", "Unable to start Google sign-in. Please try again."));
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <div
        className="absolute inset-0 bg-artwork-radial opacity-50"
        style={
          {
            "--artwork-h": "280",
            "--artwork-s": "60%",
            "--artwork-l": "50%",
          } as CSSProperties
        }
      />
      <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.08] via-transparent to-background" aria-hidden />
      <div className="relative z-10 w-full max-w-md rounded-3xl border border-border/50 surface-elevated p-8 md:p-10 text-center shadow-elevated backdrop-blur-xl">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Gift className="h-8 w-8 text-primary" />
        </div>

        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm text-primary">
          <Sparkles className="h-4 w-4" />
          <span>{t("invite.badge", "You were invited to Echoes")}</span>
        </div>

        <h1 className="mb-3 font-display text-3xl font-bold text-foreground">
          {t("invite.title", "Join with Google and unlock your invite bonus")}
        </h1>
        <p className="mb-6 text-sm leading-6 text-muted-foreground">
          {t(
            "invite.subtitle",
            "Your invite code is already attached. Finish sign-up with Google and both accounts will receive the referral reward."
          )}
        </p>

        <div className="mb-8 grid gap-3 text-left">
          <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background/70 px-4 py-3">
            <Users className="h-4 w-4 text-primary" />
            <span className="text-sm text-foreground">
              {t("invite.signupBonus", {
                count: REFERRAL_SIGNUP_BONUS_EACH,
                defaultValue: "{{count}} bonus searches for you and your friend after sign-up.",
              })}
            </span>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background/70 px-4 py-3">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm text-foreground">
              {t("invite.googleOnly", "The sign-up flow continues with Google.")}
            </span>
          </div>
        </div>

        <Button
          onClick={() => void handleContinue()}
          className="w-full gap-3 py-6 text-base"
          disabled={startingAuth || loading}
        >
          {startingAuth ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
          {t("invite.cta", "Continue with Google")}
        </Button>

        <p className="mt-4 text-xs text-muted-foreground">
          {t("invite.disclaimer", "If you already have an account, opening this invite still links the referral when eligible.")}
        </p>
      </div>
    </div>
  );
};

export default Invite;
