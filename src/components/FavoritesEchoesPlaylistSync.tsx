/* @refresh skip */
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useApp } from "@/context/useApp";
import { useAppleMusic } from "@/context/useAppleMusic";
import { useSpotify } from "@/context/useSpotify";
import { runEchoesFavoritesPlaylistSync } from "@/services/favoritesEchoesPlaylistSync";

function getMusicKitInstance(): { musicUserToken?: string | null } | undefined {
  return (window as unknown as { MusicKit?: { getInstance: () => { musicUserToken?: string | null } } }).MusicKit?.getInstance();
}

export function FavoritesEchoesPlaylistSync() {
  const { t } = useTranslation();
  const { favorites, syncFavoritesEchoesPlaylist } = useApp();
  const { isConnected: spotifyConnected, loading: spotifyLoading } = useSpotify();
  const { isAuthorized: appleAuthorized, isAvailable: appleAvailable, loading: appleLoading } = useAppleMusic();
  const runId = useRef(0);

  useEffect(() => {
    if (!syncFavoritesEchoesPlaylist) return;
    if (!spotifyConnected && !(appleAvailable && appleAuthorized)) return;
    if (spotifyLoading || appleLoading) return;

    const delayMs = 650;
    const tid = window.setTimeout(() => {
      const id = ++runId.current;
      void (async () => {
        try {
          await runEchoesFavoritesPlaylistSync({
            favorites,
            spotifyConnected,
            spotifyLoading,
            appleAuthorized,
            appleAvailable,
            appleLoading,
            getAppleToken: () => getMusicKitInstance()?.musicUserToken ?? null,
          });
        } catch (e) {
          if (runId.current !== id) return;
          const msg = e instanceof Error ? e.message : String(e);
          if (msg.startsWith("apple:no_token")) {
            toast.error(t("streaming.appleSessionUnavailable"));
            return;
          }
          toast.error(t("streaming.echoesPlaylistSyncFailed"));
        }
      })();
    }, delayMs);

    return () => window.clearTimeout(tid);
  }, [
    favorites,
    syncFavoritesEchoesPlaylist,
    spotifyConnected,
    spotifyLoading,
    appleAuthorized,
    appleAvailable,
    appleLoading,
    t,
  ]);

  return null;
}
