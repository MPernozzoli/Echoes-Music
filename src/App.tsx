import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
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
import { ThemePreferenceSync } from "@/components/ThemePreferenceSync";
import { ThemeFaviconSync } from "@/components/AppLogo";
import Landing from "./pages/Landing";
import Chat from "./pages/Chat";
import Auth from "./pages/Auth";
import Pricing from "./pages/Pricing";
import SubscribePlan from "./pages/SubscribePlan";
import BuyTokens from "./pages/BuyTokens";
import CheckoutReturnHandler from "./components/CheckoutReturnHandler";
import { ReferralQueryCapture, ReferralClaimOnLogin } from "./components/ReferralProgram";

const DiscoverRedirect = () => {
  const { search } = useLocation();
  return <Navigate to={`/chat${search}`} replace />;
};
import History from "./pages/History";
import Favorites from "./pages/Favorites";
import Profile from "./pages/Profile";
import Insights from "./pages/Insights";
import SpotifyCallback from "./pages/SpotifyCallback";
import NotFound from "./pages/NotFound";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import CookiePolicy from "./pages/CookiePolicy";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem storageKey="echoes-theme">
    <ThemeFaviconSync />
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
        <ReferralQueryCapture />
        <ReferralClaimOnLogin />
        <ThemePreferenceSync />
        <CheckoutReturnHandler />
        <AppProvider>
          <ConversationProvider>
          <SpotifyProvider>
            <AppleMusicProvider>
            <PlaybackQueueProvider>
              <FavoritesEchoesPlaylistSync />
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/auth" element={<Auth />} />
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
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/cookies" element={<CookiePolicy />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
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
