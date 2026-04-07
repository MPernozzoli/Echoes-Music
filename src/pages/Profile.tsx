import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "next-themes";
import { useNavigate, Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
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
} from "lucide-react";
import { getUserSettings, setAllowAnonymizedData } from "@/services/tracking";
import { getSpotifyAuthUrl, disconnectSpotify } from "@/services/spotify";
import { useSpotify } from "@/context/useSpotify";
import { useAppleMusic } from "@/context/useAppleMusic";
import { useApp } from "@/context/useApp";
import { useAuth } from "@/context/useAuth";
import { SUPPORTED_UI_LANGS, type SupportedUiLang } from "@/i18n/config";
import { openCustomerPortal } from "@/lib/stripeCheckout";
import { toast } from "sonner";

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
  const {
    descriptionLanguage,
    setDescriptionLanguage,
    uiLanguage,
    setUiLanguage,
    syncFavoritesEchoesPlaylist,
    setSyncFavoritesEchoesPlaylist,
  } = useApp();
  const { user, tokenBalance, plan, signOut } = useAuth();
  const { isConnected: spotifyConnected, displayName: spotifyName, isPremium, loading: spotifyLoading, setDisconnected } = useSpotify();
  const { isAvailable: appleMusicAvailable, isAuthorized: appleMusicAuthorized, loading: appleMusicLoading, authorize: authorizeApple, unauthorize: unauthorizeApple } = useAppleMusic();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    getUserSettings().then((s) => {
      if (s) setAllowData(s.allow_anonymized_improvement_data);
      setLoadingSettings(false);
    });
  }, []);

  const handleToggle = async () => {
    const next = !allowData;
    setAllowData(next);
    await setAllowAnonymizedData(next);
  };

  const handleConnectSpotify = async () => {
    setConnectingSpotify(true);
    const redirectUri = `${window.location.origin}/spotify-callback`;
    const url = await getSpotifyAuthUrl(redirectUri);
    if (url) {
      window.location.href = url;
    } else {
      setConnectingSpotify(false);
    }
  };

  const handleDisconnectSpotify = async () => {
    await disconnectSpotify();
    setDisconnected();
  };

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
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-8 pb-20 md:pb-8">
        <h1 className="font-display text-3xl font-bold mb-8">{t("profile.title")}</h1>

        {/* Account Section */}
        <div className="glass-card rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <img
                  src={user.user_metadata?.avatar_url || user.user_metadata?.picture}
                  alt=""
                  className="w-14 h-14 rounded-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <div className="flex-1">
                  <h2 className="font-display text-lg font-semibold">
                    {user.user_metadata?.full_name || user.user_metadata?.name || user.email}
                  </h2>
                  <p className="text-sm text-muted-foreground font-body">{user.email}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize">{plan}</span>
                    {tokenBalance !== null && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Coins className="w-3 h-3" /> {tokenBalance} token
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={signOut}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden md:inline">Logout</span>
                </button>
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
                  Login
                </button>
              </>
            )}
          </div>
        </div>

        {user && (
          <div className="glass-card rounded-2xl p-6 mb-6">
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
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-border text-sm font-body text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
              >
                <Crown className="w-3.5 h-3.5" />
                {t("profile.billingPlans")}
              </Link>
              <Link
                to="/pricing/tokens"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-border text-sm font-body text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
              >
                <Coins className="w-3.5 h-3.5" />
                {t("profile.billingTokens")}
              </Link>
              {plan === "premium" && (
                <button
                  type="button"
                  onClick={() => void handleBillingPortal()}
                  disabled={portalLoading}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-border text-sm font-body text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all disabled:opacity-50"
                >
                  {portalLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
                  {t("profile.billingManage")}
                </button>
              )}
            </div>
          </div>
        )}

        <div id="streaming-services" className="glass-card rounded-2xl p-6 mb-6 scroll-mt-24">
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
                    <p className="text-[10px] text-muted-foreground font-body">
                      {isPremium ? t("profile.premiumFull") : t("profile.freePreview")}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-body mt-1 max-w-[220px]">{t("profile.libraryHint")}</p>
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

        <div className="glass-card rounded-2xl p-6 mb-6">
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
                  <p className="text-xs text-[hsl(350,80%,55%)] font-body flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    {t("profile.appleConnected")}
                  </p>
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
                {t("profile.connect")}
              </button>
            ) : null}
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6 mb-6">
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
            <button
              type="button"
              onClick={() => void setSyncFavoritesEchoesPlaylist(!syncFavoritesEchoesPlaylist)}
              className={`relative shrink-0 w-11 h-6 rounded-full transition-colors ${syncFavoritesEchoesPlaylist ? "bg-primary" : "bg-muted"}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-primary-foreground transition-transform ${syncFavoritesEchoesPlaylist ? "translate-x-5" : "translate-x-0"}`}
              />
            </button>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6 mb-6">
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

        <div className="glass-card rounded-2xl p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Globe className="w-5 h-5 text-primary" />
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

        <div className="glass-card rounded-2xl p-6 mb-6">
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
              onChange={(e) => setTheme(e.target.value)}
              disabled={!mounted}
              className="text-sm font-body px-3 py-1.5 rounded-lg bg-muted text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary w-full sm:w-auto"
            >
              <option value="light">{t("profile.themeLight")}</option>
              <option value="dark">{t("profile.themeDark")}</option>
              <option value="system">{t("profile.themeSystem")}</option>
            </select>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-body text-sm font-medium text-foreground">{t("profile.privacyTitle")}</h3>
                <p className="text-xs text-muted-foreground font-body max-w-xs">{t("profile.privacyHint")}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggle}
              disabled={loadingSettings}
              className={`relative w-11 h-6 rounded-full transition-colors ${allowData ? "bg-primary" : "bg-muted"}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-primary-foreground transition-transform ${allowData ? "translate-x-5" : "translate-x-0"}`} />
            </button>
          </div>
        </div>

        <button type="button" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-destructive font-body transition-colors mt-4">
          <LogOut className="w-4 h-4" />
          {t("profile.signOut")}
        </button>
      </div>
    </AppLayout>
  );
};

export default Profile;
