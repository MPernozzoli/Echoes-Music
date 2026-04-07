import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider } from "@/context/AppContext";
import { ConversationProvider } from "@/context/ConversationContext";
import { SpotifyProvider } from "@/context/SpotifyContext";
import { AppleMusicProvider } from "@/context/AppleMusicContext";
import { PlaybackQueueProvider } from "@/context/PlaybackQueueContext";
import Landing from "./pages/Landing";
import Chat from "./pages/Chat";

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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem storageKey="echoes-theme">
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppProvider>
          <ConversationProvider>
          <SpotifyProvider>
            <AppleMusicProvider>
            <PlaybackQueueProvider>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="/discover" element={<DiscoverRedirect />} />
                <Route path="/history" element={<History />} />
                <Route path="/favorites" element={<Favorites />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/insights" element={<Insights />} />
                <Route path="/spotify-callback" element={<SpotifyCallback />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </PlaybackQueueProvider>
            </AppleMusicProvider>
          </SpotifyProvider>
          </ConversationProvider>
        </AppProvider>
      </BrowserRouter>
    </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
