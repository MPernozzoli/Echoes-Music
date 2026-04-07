import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { User, Music, Palette, LogOut, ExternalLink, Shield, Check, Loader2, X, Globe } from "lucide-react";
import { getUserSettings, setAllowAnonymizedData } from "@/services/tracking";
import { getSpotifyAuthUrl, disconnectSpotify } from "@/services/spotify";
import { useSpotify } from "@/context/SpotifyContext";
import { useAppleMusic } from "@/context/AppleMusicContext";
import { useApp } from "@/context/AppContext";

const LANGUAGES = [
  { value: "auto", label: "Auto (detect from prompt)" },
  { value: "it", label: "Italiano" },
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
  { value: "pt", label: "Português" },
  { value: "ja", label: "日本語" },
  { value: "ko", label: "한국어" },
];

const Profile = () => {
  const [allowData, setAllowData] = useState(true);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [connectingSpotify, setConnectingSpotify] = useState(false);
  const { descriptionLanguage, setDescriptionLanguage } = useApp();
  const { isConnected: spotifyConnected, displayName: spotifyName, isPremium, loading: spotifyLoading, setDisconnected } = useSpotify();
  const { isAvailable: appleMusicAvailable, isAuthorized: appleMusicAuthorized, loading: appleMusicLoading, authorize: authorizeApple, unauthorize: unauthorizeApple } = useAppleMusic();

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

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-8 pb-20 md:pb-8">
        <h1 className="font-display text-3xl font-bold mb-8">Settings</h1>

        {/* User info */}
        <div className="glass-card rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold">Demo User</h2>
              <p className="text-sm text-muted-foreground font-body">demo@echoes.app</p>
            </div>
          </div>
        </div>

        {/* Spotify */}
        <div className="glass-card rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[hsl(141,73%,42%)]/10 flex items-center justify-center">
                <Music className="w-5 h-5 text-[hsl(141,73%,42%)]" />
              </div>
              <div>
                <h3 className="font-body text-sm font-medium text-foreground">Spotify</h3>
                {spotifyLoading ? (
                  <p className="text-xs text-muted-foreground font-body">Checking…</p>
                ) : spotifyConnected ? (
                  <div>
                    <p className="text-xs text-primary font-body flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      {spotifyName}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-body">
                      {isPremium ? "Premium — Full playback enabled" : "Free — Preview only"}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-body mt-1 max-w-[220px]">
                      Libreria e playlist: se non funzionano, disconnetti e ricollega per aggiornare i permessi.
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground font-body">Connect for playback</p>
                )}
              </div>
            </div>
            {spotifyConnected ? (
              <button
                onClick={handleDisconnectSpotify}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-destructive/30 text-sm font-body text-destructive/70 hover:text-destructive hover:border-destructive/50 transition-all"
              >
                <X className="w-3 h-3" />
                Disconnect
              </button>
            ) : (
              <button
                onClick={handleConnectSpotify}
                disabled={connectingSpotify}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border text-sm font-body text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all disabled:opacity-50"
              >
                {connectingSpotify ? <Loader2 className="w-3 h-3 animate-spin" /> : <ExternalLink className="w-3 h-3" />}
                Connect
              </button>
            )}
          </div>
        </div>

        {/* Apple Music */}
        <div className="glass-card rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[hsl(350,80%,55%)]/10 flex items-center justify-center">
                <Music className="w-5 h-5 text-[hsl(350,80%,55%)]" />
              </div>
              <div>
                <h3 className="font-body text-sm font-medium text-foreground">Apple Music</h3>
                {appleMusicLoading ? (
                  <p className="text-xs text-muted-foreground font-body">Loading MusicKit…</p>
                ) : !appleMusicAvailable ? (
                  <p className="text-xs text-muted-foreground font-body">MusicKit not available</p>
                ) : appleMusicAuthorized ? (
                  <p className="text-xs text-[hsl(350,80%,55%)] font-body flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Connected — Full playback enabled
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground font-body">Connect for full playback</p>
                )}
              </div>
            </div>
            {appleMusicAuthorized ? (
              <button
                onClick={unauthorizeApple}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-destructive/30 text-sm font-body text-destructive/70 hover:text-destructive hover:border-destructive/50 transition-all"
              >
                <X className="w-3 h-3" />
                Disconnect
              </button>
            ) : appleMusicAvailable ? (
              <button
                onClick={authorizeApple}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border text-sm font-body text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
              >
                <ExternalLink className="w-3 h-3" />
                Connect
              </button>
            ) : null}
          </div>
        </div>

        {/* Language */}
        <div className="glass-card rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Globe className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-body text-sm font-medium text-foreground">Description Language</h3>
                <p className="text-xs text-muted-foreground font-body">Language for song descriptions</p>
              </div>
            </div>
            <select
              value={descriptionLanguage}
              onChange={(e) => setDescriptionLanguage(e.target.value)}
              className="text-sm font-body px-3 py-1.5 rounded-lg bg-muted text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Theme */}
        <div className="glass-card rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Palette className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-body text-sm font-medium text-foreground">Theme</h3>
                <p className="text-xs text-muted-foreground font-body">Visual appearance</p>
              </div>
            </div>
            <span className="text-sm text-muted-foreground font-body px-3 py-1 rounded-lg bg-muted">Dark</span>
          </div>
        </div>

        {/* Privacy / Data */}
        <div className="glass-card rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-body text-sm font-medium text-foreground">Improvement Data</h3>
                <p className="text-xs text-muted-foreground font-body max-w-xs">
                  Allow anonymized data to help improve recommendations
                </p>
              </div>
            </div>
            <button
              onClick={handleToggle}
              disabled={loadingSettings}
              className={`relative w-11 h-6 rounded-full transition-colors ${allowData ? "bg-primary" : "bg-muted"}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-primary-foreground transition-transform ${allowData ? "translate-x-5" : "translate-x-0"}`} />
            </button>
          </div>
        </div>

        {/* Sign out */}
        <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-destructive font-body transition-colors mt-4">
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </AppLayout>
  );
};

export default Profile;
