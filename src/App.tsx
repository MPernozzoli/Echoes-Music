import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useEffect } from "react";
import { BrowserRouter, Route, Routes, Navigate, useLocation, useParams } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider } from "@/context/AppContext";
import { AuthProvider } from "@/context/AuthContext";
import { ConversationProvider } from "@/context/ConversationContext";
import { SpotifyProvider } from "@/context/SpotifyContext";
import { AppleMusicProvider } from "@/context/AppleMusicContext";
import { PlaybackQueueProvider } from "@/context/PlaybackQueueContext";
import { FavoritesEchoesPlaylistSync } from "@/components/FavoritesEchoesPlaylistSync";
import { GlobalPlaybackDock } from "@/components/GlobalPlaybackDock";
import { ThemePreferenceSync } from "@/components/ThemePreferenceSync";
import { ThemeFaviconSync } from "@/components/AppLogo";
import { SeoHead } from "@/components/SeoHead";
import { isSupported, type SupportedUiLang } from "@/i18n/config";
import { useApp } from "@/context/useApp";
import Landing from "./pages/Landing";
import Chat from "./pages/Chat";
import Auth from "./pages/Auth";
import Invite from "./pages/Invite";
import Pricing from "./pages/Pricing";
import SubscribePlan from "./pages/SubscribePlan";
import BuyTokens from "./pages/BuyTokens";
import CheckoutReturnHandler from "./components/CheckoutReturnHandler";
import { ReferralQueryCapture, ReferralClaimOnLogin } from "./components/ReferralProgram";
import { UserTutorial } from "./components/UserTutorial";

const DiscoverRedirect = () => {
  const { search } = useLocation();
  return <Navigate to={`/chat${search}`} replace />;
};

const LocalizedLanding = () => {
  const { locale } = useParams();
  const { setUiLanguage } = useApp();

  useEffect(() => {
    if (locale && isSupported(locale)) {
      setUiLanguage(locale as SupportedUiLang);
    }
  }, [locale, setUiLanguage]);

  if (!locale || !isSupported(locale)) return <NotFound />;
  return <Landing />;
};
import History from "./pages/History";
import Favorites from "./pages/Favorites";
import Profile from "./pages/Profile";
import Insights from "./pages/Insights";
import SpotifyCallback from "./pages/SpotifyCallback";
import AuthCallback from "./pages/AuthCallback";
import NotFound from "./pages/NotFound";
import Admin from "./pages/Admin";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import CookiePolicy from "./pages/CookiePolicy";
import TermsOfService from "./pages/TermsOfService";
import MusicForEmotions from "./pages/MusicForEmotions";
import MusikFuerEmotionen from "./pages/MusikFuerEmotionen";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem storageKey="echoes-theme">
    <ThemeFaviconSync />
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SeoHead />
        <ReferralQueryCapture />
        <AuthProvider>
        <ReferralClaimOnLogin />
        <ThemePreferenceSync />
        <CheckoutReturnHandler />
        <AppProvider>
          <ConversationProvider>
          <SpotifyProvider>
            <AppleMusicProvider>
            <PlaybackQueueProvider>
              <FavoritesEchoesPlaylistSync />
              <UserTutorial />
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/:locale" element={<LocalizedLanding />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/invite/:code" element={<Invite />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/pricing/plan" element={<SubscribePlan />} />
                <Route path="/pricing/tokens" element={<BuyTokens />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="/discover" element={<DiscoverRedirect />} />
                <Route path="/history" element={<History />} />
                <Route path="/favorites" element={<Favorites />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/insights" element={<Insights />} />
                <Route path="/spotify-callback" element={<SpotifyCallback />} />
                <Route path="/terms" element={<TermsOfService />} />
                <Route path="/user-agreement" element={<TermsOfService />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/cookies" element={<CookiePolicy />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/music-for-emotions" element={<MusicForEmotions />} />
                <Route path="/musik-fuer-emotionen" element={<MusikFuerEmotionen />} />
                <Route path="/musik-f%C3%BCr-emotionen" element={<MusikFuerEmotionen />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              <GlobalPlaybackDock />
            </PlaybackQueueProvider>
            </AppleMusicProvider>
          </SpotifyProvider>
          </ConversationProvider>
        </AppProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
