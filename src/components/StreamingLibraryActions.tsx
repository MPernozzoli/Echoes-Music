import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, Library, ListMusic, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAppleMusic } from "@/context/AppleMusicContext";
import { useSpotify } from "@/context/SpotifyContext";
import {
  addAppleMusicSongToLibrary,
  addAppleMusicSongToPlaylist,
  listAppleMusicPlaylists,
} from "@/services/appleMusicLibrary";
import { spotifyAddTrackToPlaylist, spotifyListPlaylists, spotifySaveTracks } from "@/services/spotify";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

function getMusicKitInstance(): { musicUserToken?: string | null } | undefined {
  return (window as unknown as { MusicKit?: { getInstance: () => { musicUserToken?: string | null } } }).MusicKit?.getInstance();
}

interface StreamingLibraryActionsProps {
  spotifyTrackId?: string;
  appleMusicTrackId?: string;
  className?: string;
  /** layout compatto per liste */
  compact?: boolean;
}

type StreamSvc = "spotify" | "apple";

export function StreamingLibraryActions({
  spotifyTrackId,
  appleMusicTrackId,
  className,
  compact,
}: StreamingLibraryActionsProps) {
  const { t } = useTranslation();
  const { isAuthorized: appleOk, isAvailable: appleAvail } = useAppleMusic();
  const { isConnected: spotifyOk, loading: spotifyLoading } = useSpotify();

  const [appleBusy, setAppleBusy] = useState(false);
  const [spotifySaveBusy, setSpotifySaveBusy] = useState(false);
  const [playlistsOpen, setPlaylistsOpen] = useState(false);
  const [playlistsLoading, setPlaylistsLoading] = useState(false);
  const [playlists, setPlaylists] = useState<{ id: string; name: string }[]>([]);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [plStep, setPlStep] = useState<"pick" | "list">("list");
  const [plService, setPlService] = useState<StreamSvc | null>(null);

  const showApple = Boolean(appleAvail && appleOk && appleMusicTrackId);
  const showSpotify = Boolean(spotifyOk && spotifyTrackId && !spotifyLoading);
  const needPlPicker = showApple && showSpotify;

  const onAppleLibrary = useCallback(async () => {
    if (!appleMusicTrackId) return;
    const mk = getMusicKitInstance();
    const token = mk?.musicUserToken;
    if (!token) {
      toast.error(t("streaming.appleSessionUnavailable"));
      return;
    }
    setAppleBusy(true);
    const r = await addAppleMusicSongToLibrary(String(appleMusicTrackId), token);
    setAppleBusy(false);
    if ("error" in r) toast.error(t("streaming.appleAddFailed"));
    else toast.success(t("streaming.appleAddedLibrary"));
  }, [appleMusicTrackId, t]);

  const onSpotifySave = useCallback(async () => {
    if (!spotifyTrackId) return;
    setSpotifySaveBusy(true);
    const r = await spotifySaveTracks([spotifyTrackId]);
    setSpotifySaveBusy(false);
    if ("error" in r) {
      if (r.error.includes("403") || r.error.toLowerCase().includes("scope")) {
        toast.error(t("streaming.spotifyReconnect"));
      } else toast.error(t("streaming.spotifyTrackNotSaved"));
    } else toast.success(t("streaming.spotifySavedTracks"));
  }, [spotifyTrackId, t]);

  const loadPlaylists = useCallback(
    async (svc: StreamSvc) => {
      setPlaylistsLoading(true);
      setPlaylists([]);
      if (svc === "spotify") {
        const r = await spotifyListPlaylists();
        setPlaylistsLoading(false);
        if ("error" in r) {
          toast.error(t("streaming.playlistsLoadFailed"));
          return;
        }
        setPlaylists(r.playlists);
        return;
      }
      const mk = getMusicKitInstance();
      const token = mk?.musicUserToken;
      if (!token) {
        setPlaylistsLoading(false);
        toast.error(t("streaming.appleSessionUnavailable"));
        return;
      }
      const r = await listAppleMusicPlaylists(token);
      setPlaylistsLoading(false);
      if ("error" in r) {
        toast.error(t("streaming.applePlaylistLoadFailed"));
        return;
      }
      setPlaylists(r.playlists);
    },
    [t],
  );

  useEffect(() => {
    if (!playlistsOpen) {
      setPlStep(needPlPicker ? "pick" : "list");
      setPlService(null);
      setPlaylists([]);
      return;
    }
    if (needPlPicker) {
      setPlStep("pick");
      setPlService(null);
      setPlaylists([]);
      return;
    }
    const svc: StreamSvc = showSpotify ? "spotify" : "apple";
    setPlService(svc);
    setPlStep("list");
    void loadPlaylists(svc);
  }, [playlistsOpen, needPlPicker, showSpotify, loadPlaylists]);

  const onPickPlaylist = useCallback(
    async (playlistId: string) => {
      const svc =
        plService ?? (!needPlPicker ? (showSpotify ? "spotify" : "apple") : null);
      if (!svc) return;
      if (svc === "spotify") {
        if (!spotifyTrackId) return;
        setAddingTo(playlistId);
        const r = await spotifyAddTrackToPlaylist(playlistId, spotifyTrackId);
        setAddingTo(null);
        if ("error" in r) {
          if (r.error.includes("403") || r.error.toLowerCase().includes("scope")) {
            toast.error(t("streaming.spotifyReconnectShort"));
          } else toast.error(t("streaming.notAddedToPlaylist"));
        } else {
          toast.success(t("streaming.addedToPlaylist"));
          setPlaylistsOpen(false);
        }
        return;
      }
      if (!appleMusicTrackId) return;
      const mk = getMusicKitInstance();
      const token = mk?.musicUserToken;
      if (!token) {
        toast.error(t("streaming.appleSessionUnavailable"));
        return;
      }
      setAddingTo(playlistId);
      const r = await addAppleMusicSongToPlaylist(playlistId, String(appleMusicTrackId), token);
      setAddingTo(null);
      if ("error" in r) toast.error(t("streaming.applePlaylistAddFailed"));
      else {
        toast.success(t("streaming.addedToPlaylist"));
        setPlaylistsOpen(false);
      }
    },
    [plService, needPlPicker, showSpotify, spotifyTrackId, appleMusicTrackId, t],
  );

  if (!showApple && !showSpotify) return null;

  const btnClass = compact
    ? "h-8 px-2.5 text-xs gap-1 font-body"
    : "h-9 px-3 text-xs gap-1.5 font-body";

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2",
        compact ? "pt-0.5" : "pt-1",
        className,
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {showApple && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={btnClass}
          disabled={appleBusy}
          onClick={() => void onAppleLibrary()}
        >
          {appleBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Library className="w-3.5 h-3.5" />}
          {t("streaming.btnAppleLibrary")}
        </Button>
      )}
      {showSpotify && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={btnClass}
          disabled={spotifySaveBusy}
          onClick={() => void onSpotifySave()}
        >
          {spotifySaveBusy ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Library className="w-3.5 h-3.5" />
          )}
          {t("streaming.btnSpotifySaved")}
        </Button>
      )}

      {/* Playlist — supporta sia Spotify sia Apple Music */}
      {(showSpotify || showApple) && (
        <Popover
          open={playlistsOpen}
          onOpenChange={(o) => {
            setPlaylistsOpen(o);
            if (!o) {
              setPlStep(needPlPicker ? "pick" : "list");
              setPlService(null);
            }
          }}
        >
          <PopoverTrigger asChild>
            <Button type="button" variant="secondary" size="sm" className={btnClass}>
              <ListMusic className="w-3.5 h-3.5" />
              {t("streaming.btnPlaylists")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0" align="start">
            {plStep === "pick" && needPlPicker ? (
              <div className="p-2">
                <p className="text-[11px] text-muted-foreground font-body px-1 pb-2">{t("streaming.chooseService")}</p>
                <div className="flex flex-col gap-1">
                  {showApple && (
                    <button
                      type="button"
                      className="text-left text-xs font-body rounded-md px-2 py-2 hover:bg-muted text-foreground"
                      onClick={() => {
                        setPlService("apple");
                        setPlStep("list");
                        void loadPlaylists("apple");
                      }}
                    >
                      Apple Music
                    </button>
                  )}
                  {showSpotify && (
                    <button
                      type="button"
                      className="text-left text-xs font-body rounded-md px-2 py-2 hover:bg-muted text-foreground"
                      onClick={() => {
                        setPlService("spotify");
                        setPlStep("list");
                        void loadPlaylists("spotify");
                      }}
                    >
                      Spotify
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-2">
                {needPlPicker && plStep === "list" && (
                  <button
                    type="button"
                    className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground font-body mb-2 px-1"
                    onClick={() => {
                      setPlStep("pick");
                      setPlService(null);
                      setPlaylists([]);
                    }}
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    {t("streaming.otherService")}
                  </button>
                )}
                <p className="text-xs font-body text-muted-foreground px-2 py-1">{t("streaming.yourPlaylists")}</p>
                <div className="max-h-52 overflow-y-auto space-y-0.5">
                  {playlistsLoading ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : playlists.length === 0 ? (
                    <p className="text-xs font-body text-muted-foreground px-2 py-2">{t("streaming.noPlaylists")}</p>
                  ) : (
                    playlists.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        disabled={addingTo === p.id}
                        className="w-full text-left text-xs font-body rounded-md px-2 py-2 hover:bg-muted truncate disabled:opacity-50"
                        onClick={() => void onPickPlaylist(p.id)}
                      >
                        {addingTo === p.id ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                            {p.name}
                          </span>
                        ) : (
                          p.name
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
