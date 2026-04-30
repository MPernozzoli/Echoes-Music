import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "next-themes";
import { useNavigate, Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import {
  User,
  Music,
  Palette,
  LogOut,
  ExternalLink,
  Shield,
  Check,
  Loader2,
  X,
  Globe,
  LogIn,
  Coins,
  ListMusic,
  Crown,
  Gift,
  Copy,
  Languages,
} from "lucide-react";
import { getUserSettings, persistThemePreference, setAllowAnonymizedData } from "@/services/tracking";
import { getSpotifyAuthUrl, disconnectSpotify, getSpotifyRedirectUri } from "@/services/spotify";
import { useSpotify } from "@/context/useSpotify";
import { useAppleMusic } from "@/context/useAppleMusic";
import { useApp } from "@/context/useApp";
import { useAuth } from "@/context/useAuth";
import { SUPPORTED_UI_LANGS, type SupportedUiLang } from "@/i18n/config";
import { openCustomerPortal } from "@/lib/stripeCheckout";
import { toast } from "sonner";
import { AdvancedAISettings } from "@/components/profile/AdvancedAISettings";
import { supabase } from "@/integrations/supabase/client";
import { REFERRAL_QUERY_PARAM } from "@/constants/referralStorage";
import { REFERRAL_PRO_BONUS_RATE, REFERRAL_SIGNUP_BONUS_EACH } from "@/constants/tokenEconomy";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

const DESCRIPTION_LANGS: { value: string; label: string }[] = [
  { value: "it", label: "Italiano" },
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
  { value: "pt", label: "Português" },
  { value: "ja", label: "日本語" },
  { value: "ko", label: "한국어" },
];

const UI_LANG_LABEL: Record<SupportedUiLang, string> = {
  it: "Italiano",
  en: "English",
  fr: "Français",
  de: "Deutsch",
  es: "Español",
  pt: "Português",
};

const Profile = () => {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [allowData, setAllowData] = useState(true);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [connectingSpotify, setConnectingSpotify] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralLoading, setReferralLoading] = useState(false);
  const [referralCopied, setReferralCopied] = useState(false);
  const {
    descriptionLanguage,
    setDescriptionLanguage,
    uiLanguage,
    setUiLanguage,
    syncFavoritesEchoesPlaylist,
    setSyncFavoritesEchoesPlaylist,
    refreshPreferencesFromServer,
  } = useApp();
  const { user, tokenBalance, plan, signOut } = useAuth();
  const { isConnected: spotifyConnected, displayName: spotifyName, isPremium, loading: spotifyLoading, setDisconnected } = useSpotify();
  const {
    isAvailable: appleMusicAvailable,
    isAuthorized: appleMusicAuthorized,
    isLinkedAccount: appleMusicLinkedAccount,
    loading: appleMusicLoading,
    authorize: authorizeApple,
    unauthorize: unauthorizeApple,
  } = useAppleMusic();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!user?.id) {
      setReferralCode(null);
      return;
    }
    setReferralLoading(true);
    void supabase
      .from("profiles")
      .select("referral_code")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setReferralCode(data?.referral_code ?? null);
        setReferralLoading(false);
      });
  }, [user?.id]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await refreshPreferencesFromServer();
      if (cancelled) return;
      const s = await getUserSettings();
      if (cancelled) return;
      if (s) {
        setAllowData(s.allow_anonymized_improvement_data);
        const th = s.theme;
        if (th === "light" || th === "dark" || th === "system") setTheme(th);
      }
      if (!cancelled) setLoadingSettings(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshPreferencesFromServer, user?.id, setTheme]);

  const handlePrivacySwitch = async (checked: boolean) => {
    setAllowData(checked);
    await setAllowAnonymizedData(checked);
  };

  const handleConnectSpotify = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    setConnectingSpotify(true);
    const redirectUri = getSpotifyRedirectUri();
    const url = await getSpotifyAuthUrl(redirectUri);
    if (url) {
      window.location.href = url;
    } else {
      setConnectingSpotify(false);
      toast.error(t("profile.streamingLoginRequired"));
      navigate("/auth");
    }
  };

  const handleDisconnectSpotify = async () => {
    await disconnectSpotify();
    setDisconnected();
  };

  const referralUrl =
    referralCode && typeof window !== "undefined"
      ? `${window.location.origin}/invite/${encodeURIComponent(referralCode)}?${REFERRAL_QUERY_PARAM}=${encodeURIComponent(referralCode)}`
      : "";

  const handleCopyReferral = useCallback(async () => {
    if (!referralUrl) return;
    try {
      await navigator.clipboard.writeText(referralUrl);
      setReferralCopied(true);
      toast.success(t("referral.copied"));
      window.setTimeout(() => setReferralCopied(false), 2000);
    } catch {
      toast.error(t("referral.copyFailed"));
    }
  }, [referralUrl, t]);

  const handleBillingPortal = useCallback(async () => {
    setPortalLoading(true);
    try {
      const url = await openCustomerPortal();
      if (url) window.location.href = url;
      else toast.error(t("pricing.portalError"));
    } catch {
      toast.error(t("pricing.portalError"));
    } finally {
      setPortalLoading(false);
    }
  }, [t]);

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-8 pb-24 md:pb-10">
        <div className="mb-10">
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-1">{t("profile.title")}</h1>
          <p className="text-sm text-muted-foreground font-body">{user?.email ?? t("profile.demoEmail")}</p>
        </div>

        {/* Account Section */}
        <div className="surface-elevated rounded-3xl p-6 md:p-8 mb-8 border border-border/50 shadow-soft">
          <div className="flex items-center gap-5">
            {user ? (
              <>
                <img
                  src={user.user_metadata?.avatar_url || user.user_metadata?.picture}
                  alt=""
                  className="w-20 h-20 rounded-2xl object-cover ring-2 ring-primary/15 shadow-md"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <div className="flex-1">
                  <h2 className="font-display text-xl font-semibold">
                    {user.user_metadata?.full_name || user.user_metadata?.name || user.email}
                  </h2>
                  <p className="text-sm text-muted-foreground font-body truncate">{user.email}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize">{plan}</span>
                    {tokenBalance !== null && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Coins className="w-3 h-3" /> {tokenBalance} token
                      </span>
                    )}
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={signOut} className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0">
                  <LogOut className="w-4 h-4" />
                  <span className="hidden md:inline">{t("profile.logoutShort")}</span>
                </Button>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h2 className="font-display text-lg font-semibold">{t("profile.demoUser")}</h2>
                  <p className="text-sm text-muted-foreground font-body">{t("profile.demoEmail")}</p>
                </div>
                <button
                  onClick={() => navigate("/auth")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-primary hover:bg-primary/10 transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  {t("nav.login")}
                </button>
              </>
            )}
          </div>
        </div>

        {user && (
          <div className="surface-card rounded-3xl p-6 md:p-7 mb-6 border border-border/50 space-y-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Crown className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-body text-sm font-medium text-foreground">{t("profile.billingTitle")}</h3>
                  <p className="text-xs text-muted-foreground font-body">{t("profile.billingHint")}</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                <Link
                  to="/pricing/plan"
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full border border-border text-sm font-body text-muted-foreground hover:text-foreground hover:border-primary/35 transition-all"
                >
                  <Crown className="w-3.5 h-3.5" />
                  {t("profile.billingPlans")}
                </Link>
                <Link
                  to="/pricing/tokens"
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full border border-border text-sm font-body text-muted-foreground hover:text-foreground hover:border-primary/35 transition-all"
                >
                  <Coins className="w-3.5 h-3.5" />
                  {t("profile.billingTokens")}
                </Link>
                {plan === "premium" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-full gap-1.5"
                    onClick={() => void handleBillingPortal()}
                    disabled={portalLoading}
                  >
                    {portalLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
                    {t("profile.billingManage")}
                  </Button>
                )}
              </div>
            </div>
            <div className="border-t border-border/40 pt-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Gift className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-body text-sm font-medium text-foreground">{t("referral.title")}</h3>
                  <p className="text-xs text-muted-foreground font-body mt-0.5">
                    {t("referral.subtitle", {
                      signup: REFERRAL_SIGNUP_BONUS_EACH,
                      pct: Math.round(REFERRAL_PRO_BONUS_RATE * 100),
                    })}
                  </p>
                </div>
              </div>
              {referralLoading ? (
                <p className="text-xs text-muted-foreground font-body">{t("referral.loading")}</p>
              ) : referralUrl ? (
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input readOnly value={referralUrl} className="font-mono text-xs h-10 rounded-xl" />
                  <Button type="button" variant="outline" className="shrink-0 gap-2 h-10 rounded-full" onClick={() => void handleCopyReferral()}>
                    {referralCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {t("referral.copy")}
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {user ? (
          <>
            <div id="streaming-services" className="surface-card rounded-3xl p-6 mb-6 scroll-mt-24 border border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[hsl(141,73%,42%)]/10 flex items-center justify-center">
                    <Music className="w-5 h-5 text-[hsl(141,73%,42%)]" />
                  </div>
                  <div>
                    <h3 className="font-body text-sm font-medium text-foreground">{t("profile.spotify")}</h3>
                    {spotifyLoading ? (
                      <p className="text-xs text-muted-foreground font-body">{t("profile.checking")}</p>
                    ) : spotifyConnected ? (
                      <div>
                        <p className="text-xs text-primary font-body flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          {spotifyName}
                        </p>
                        <p className="text-xs text-muted-foreground font-body">
                          {isPremium ? t("profile.premiumFull") : t("profile.freePreview")}
                        </p>
                        <p className="text-xs text-muted-foreground font-body mt-1 max-w-[240px] leading-snug">{t("profile.libraryHint")}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground font-body">{t("profile.connectPlayback")}</p>
                    )}
                  </div>
                </div>
                {spotifyConnected ? (
                  <button
                    type="button"
                    onClick={handleDisconnectSpotify}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-destructive/30 text-sm font-body text-destructive/70 hover:text-destructive hover:border-destructive/50 transition-all"
                  >
                    <X className="w-3 h-3" />
                    {t("profile.disconnect")}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleConnectSpotify}
                    disabled={connectingSpotify}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border text-sm font-body text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all disabled:opacity-50"
                  >
                    {connectingSpotify ? <Loader2 className="w-3 h-3 animate-spin" /> : <ExternalLink className="w-3 h-3" />}
                    {t("profile.connect")}
                  </button>
                )}
              </div>
            </div>

            <div className="surface-card rounded-3xl p-6 mb-6 border border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[hsl(350,80%,55%)]/10 flex items-center justify-center">
                    <Music className="w-5 h-5 text-[hsl(350,80%,55%)]" />
                  </div>
                  <div>
                    <h3 className="font-body text-sm font-medium text-foreground">{t("profile.appleMusic")}</h3>
                    {appleMusicLoading ? (
                      <p className="text-xs text-muted-foreground font-body">{t("profile.loadingMusickit")}</p>
                    ) : !appleMusicAvailable ? (
                      <p className="text-xs text-muted-foreground font-body">{t("profile.musickitUnavailable")}</p>
                    ) : appleMusicAuthorized ? (
                      <div>
                        <p className="text-xs text-[hsl(350,80%,55%)] font-body flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          {t("profile.appleConnected")}
                        </p>
                        <p className="text-xs text-muted-foreground font-body mt-1">
                          {t("profile.appleLinkedOnAccount")}
                        </p>
                      </div>
                    ) : appleMusicLinkedAccount ? (
                      <div>
                        <p className="text-xs text-[hsl(350,80%,55%)] font-body flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          {t("profile.appleLinkedAccount")}
                        </p>
                        <p className="text-xs text-muted-foreground font-body mt-1 max-w-[260px] leading-snug">
                          {t("profile.appleLinkedNeedsBrowser")}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground font-body">{t("profile.appleConnectHint")}</p>
                    )}
                  </div>
                </div>
                {appleMusicAuthorized ? (
                  <button
                    type="button"
                    onClick={unauthorizeApple}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-destructive/30 text-sm font-body text-destructive/70 hover:text-destructive hover:border-destructive/50 transition-all"
                  >
                    <X className="w-3 h-3" />
                    {t("profile.disconnect")}
                  </button>
                ) : appleMusicAvailable ? (
                  <button
                    type="button"
                    onClick={authorizeApple}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border text-sm font-body text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
                  >
                    <ExternalLink className="w-3 h-3" />
                    {appleMusicLinkedAccount ? t("profile.appleConfirmBrowser") : t("profile.connect")}
                  </button>
                ) : null}
              </div>
            </div>

            <div className="surface-card rounded-3xl p-6 mb-6 border border-border/50">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <ListMusic className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-body text-sm font-medium text-foreground">{t("profile.favoritesPlaylistTitle")}</h3>
                    <p className="text-xs text-muted-foreground font-body">{t("profile.favoritesPlaylistHint")}</p>
                  </div>
                </div>
                <Switch checked={syncFavoritesEchoesPlaylist} onCheckedChange={(v) => void setSyncFavoritesEchoesPlaylist(v)} />
              </div>
            </div>
          </>
        ) : (
          <div className="glass-card rounded-2xl p-6 mb-6 scroll-mt-24">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Music className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-body text-sm font-medium text-foreground">{t("profile.spotify")} / {t("profile.appleMusic")}</h3>
                  <p className="text-xs text-muted-foreground font-body max-w-md">{t("profile.streamingLoginRequired")}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate("/auth")}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-border text-sm font-body text-primary hover:bg-primary/10 transition-all shrink-0"
              >
                <LogIn className="w-4 h-4" />
                {t("profile.streamingLoginCta")}
              </button>
            </div>
          </div>
        )}

        <div className="surface-card rounded-3xl p-6 mb-6 border border-border/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Globe className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-body text-sm font-medium text-foreground">{t("profile.uiLanguage")}</h3>
                <p className="text-xs text-muted-foreground font-body">{t("profile.uiLanguageHint")}</p>
              </div>
            </div>
            <select
              value={uiLanguage}
              onChange={(e) => setUiLanguage(e.target.value as SupportedUiLang)}
              className="text-sm font-body px-3 py-1.5 rounded-lg bg-muted text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary w-full sm:w-auto"
            >
              {SUPPORTED_UI_LANGS.map((code) => (
                <option key={code} value={code}>
                  {UI_LANG_LABEL[code]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="surface-card rounded-3xl p-6 mb-6 border border-border/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emotional-tag/15 flex items-center justify-center ring-1 ring-emotional-tag/20">
                <Languages className="w-5 h-5 text-emotional-tag" />
              </div>
              <div>
                <h3 className="font-body text-sm font-medium text-foreground">{t("profile.descriptionLanguage")}</h3>
                <p className="text-xs text-muted-foreground font-body">{t("profile.descriptionLanguageHint")}</p>
              </div>
            </div>
            <select
              value={descriptionLanguage}
              onChange={(e) => setDescriptionLanguage(e.target.value)}
              className="text-sm font-body px-3 py-1.5 rounded-lg bg-muted text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary w-full sm:w-auto"
            >
              <option value="auto">{t("profile.langAuto")}</option>
              {DESCRIPTION_LANGS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="surface-card rounded-3xl p-6 mb-6 border border-border/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Palette className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-body text-sm font-medium text-foreground">{t("profile.theme")}</h3>
                <p className="text-xs text-muted-foreground font-body">{t("profile.themeHint")}</p>
              </div>
            </div>
            <select
              value={mounted ? theme ?? "system" : "dark"}
              onChange={(e) => {
                const v = e.target.value;
                setTheme(v);
                void persistThemePreference(v);
              }}
              disabled={!mounted}
              className="text-sm font-body px-3 py-1.5 rounded-lg bg-muted text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary w-full sm:w-auto"
            >
              <option value="light">{t("profile.themeLight")}</option>
              <option value="dark">{t("profile.themeDark")}</option>
              <option value="system">{t("profile.themeSystem")}</option>
            </select>
          </div>
        </div>

        {user ? (
          <AdvancedAISettings />
        ) : (
          <div className="surface-card rounded-3xl p-6 mb-6 border border-border/50">
            <h3 className="font-display text-base font-semibold text-foreground">{t("profile.advancedAiGuestTitle")}</h3>
            <p className="text-xs text-muted-foreground font-body mt-2 leading-relaxed">{t("profile.advancedAiGuestBody")}</p>
            <Button type="button" variant="outline" size="sm" className="mt-4 rounded-full gap-1.5" onClick={() => navigate("/auth")}>
              <LogIn className="w-3.5 h-3.5" />
              {t("nav.login")}
            </Button>
          </div>
        )}

        <div className="surface-card rounded-3xl p-6 mb-6 border border-border/50">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-body text-sm font-medium text-foreground">{t("profile.privacyTitle")}</h3>
                <p className="text-xs text-muted-foreground font-body max-w-xs">{t("profile.privacyHint")}</p>
              </div>
            </div>
            <Switch checked={allowData} onCheckedChange={(v) => void handlePrivacySwitch(v)} disabled={loadingSettings} />
          </div>
        </div>

        <Button type="button" variant="ghost" className="gap-2 text-muted-foreground hover:text-destructive font-body mt-2" onClick={signOut}>
          <LogOut className="w-4 h-4" />
          {t("profile.signOut")}
        </Button>
      </div>
    </AppLayout>
  );
};

export default Profile;
