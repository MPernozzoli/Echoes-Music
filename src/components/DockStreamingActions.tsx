import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Disc, Loader2, ChevronLeft, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DOCK_ICON_BTN } from "@/components/PlayerDockChrome";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAppleMusic } from "@/context/useAppleMusic";
import { useSpotify } from "@/context/useSpotify";
import {
  addAppleMusicSongToLibrary,
  addAppleMusicSongToPlaylist,
  listAppleMusicPlaylists,
} from "@/services/appleMusicLibrary";
import { spotifyAddTrackToPlaylist, spotifyListPlaylists, spotifySaveTracks } from "@/services/spotify";

function getMusicKitInstance(): { musicUserToken?: string | null } | undefined {
  return (window as unknown as { MusicKit?: { getInstance: () => { musicUserToken?: string | null } } }).MusicKit?.getInstance();
}

const popClass =
  "w-[min(100vw-1.5rem,18rem)] border border-border bg-popover p-2 text-popover-foreground shadow-2xl";

interface DockStreamingActionsProps {
  spotifyTrackId?: string;
  appleMusicTrackId?: string;
}

type StreamSvc = "spotify" | "apple";

export function DockStreamingActions({ spotifyTrackId, appleMusicTrackId }: DockStreamingActionsProps) {
  const { t } = useTranslation();
  const { isAuthorized: appleOk, isAvailable: appleAvail } = useAppleMusic();
  const { isConnected: spotifyOk, loading: spotifyLoading } = useSpotify();

  const showApple = Boolean(appleAvail && appleOk && appleMusicTrackId);
  const showSpotify = Boolean(spotifyOk && spotifyTrackId && !spotifyLoading);

  const [appleBusy, setAppleBusy] = useState(false);
  const [spotifySaveBusy, setSpotifySaveBusy] = useState(false);
  const [libOpen, setLibOpen] = useState(false);
  const [plOpen, setPlOpen] = useState(false);
  const [plStep, setPlStep] = useState<"pick" | "list">("list");
  const [plService, setPlService] = useState<StreamSvc | null>(null);
  const [playlistsLoading, setPlaylistsLoading] = useState(false);
  const [playlists, setPlaylists] = useState<{ id: string; name: string }[]>([]);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [plSearch, setPlSearch] = useState("");
  const plSearchRef = useRef<HTMLInputElement>(null);

  const needLibPicker = showApple && showSpotify;
  const needPlPicker = showApple && showSpotify;

  const filteredPlaylists = useMemo(() => {
    if (!plSearch.trim()) return playlists;
    const q = plSearch.toLowerCase();
    return playlists.filter((p) => p.name.toLowerCase().includes(q));
  }, [playlists, plSearch]);

  const onAppleLibrary = useCallback(async () => {
    if (!appleMusicTrackId) return;
    const mk = getMusicKitInstance();
    const token = mk?.musicUserToken;
    if (!token) {
      toast.error(t("streaming.appleSessionUnavailable"));
      return;
    }
    setAppleBusy(true);
    const r = await addAppleMusicSongToLibrary(appleMusicTrackId, token);
    setAppleBusy(false);
    if ("error" in r) toast.error(t("streaming.appleAddLibraryFailed"));
    else toast.success(t("streaming.appleAddedLibrary"));
    setLibOpen(false);
  }, [appleMusicTrackId, t]);

  const onSpotifySave = useCallback(async () => {
    if (!spotifyTrackId) return;
    setSpotifySaveBusy(true);
    const r = await spotifySaveTracks([spotifyTrackId]);
    setSpotifySaveBusy(false);
    if ("error" in r) {
      if (r.error.includes("403") || r.error.toLowerCase().includes("scope")) {
        toast.error(t("streaming.spotifyReconnectShort"));
      } else toast.error(t("streaming.spotifyTrackNotSaved"));
    } else toast.success(t("streaming.spotifySavedTracks"));
    setLibOpen(false);
  }, [spotifyTrackId, t]);

  const loadPlaylists = useCallback(
    async (svc: StreamSvc) => {
      setPlaylistsLoading(true);
      setPlaylists([]);
      if (svc === "spotify") {
        const r = await spotifyListPlaylists();
        setPlaylistsLoading(false);
        if ("error" in r) {
          toast.error(t("streaming.spotifyPlaylistLoadFailed"));
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
    if (!plOpen) {
      setPlStep(needPlPicker ? "pick" : "list");
      setPlService(null);
      setPlaylists([]);
      setPlSearch("");
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
  }, [plOpen, needPlPicker, showSpotify, loadPlaylists]);

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
          setPlOpen(false);
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
      const r = await addAppleMusicSongToPlaylist(playlistId, appleMusicTrackId, token);
      setAddingTo(null);
      if ("error" in r) toast.error(t("streaming.applePlaylistAddFailed"));
      else {
        toast.success(t("streaming.addedToPlaylist"));
        setPlOpen(false);
      }
    },
    [plService, needPlPicker, showSpotify, spotifyTrackId, appleMusicTrackId, t],
  );

  const onLibraryClick = () => {
    if (needLibPicker) {
      setLibOpen(true);
      return;
    }
    if (showApple) void onAppleLibrary();
    else void onSpotifySave();
  };

  const libBusy = appleBusy || spotifySaveBusy;

  if (!showApple && !showSpotify) return null;

  return (
    <>
      {needLibPicker ? (
        <Popover open={libOpen} onOpenChange={setLibOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={DOCK_ICON_BTN}
              title={t("streaming.addToLibrary")}
              disabled={libBusy}
            >
              {libBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" align="end" sideOffset={8} className={popClass}>
            <p className="text-[11px] text-muted-foreground font-body px-1 pb-2">{t("streaming.addToLibrary")}</p>
            <div className="flex flex-col gap-1">
              <button
                type="button"
                disabled={appleBusy}
                className="text-left text-xs font-body rounded-md px-2 py-2 hover:bg-muted text-foreground"
                onClick={() => void onAppleLibrary()}
              >
                Apple Music
              </button>
              <button
                type="button"
                disabled={spotifySaveBusy}
                className="text-left text-xs font-body rounded-md px-2 py-2 hover:bg-muted text-foreground"
                onClick={() => void onSpotifySave()}
              >
                Spotify
              </button>
            </div>
          </PopoverContent>
        </Popover>
      ) : (
        <button
          type="button"
          className={DOCK_ICON_BTN}
          title={t("streaming.addToLibrary")}
          disabled={libBusy}
          onClick={onLibraryClick}
        >
          {libBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        </button>
      )}

      <Popover
        open={plOpen}
        onOpenChange={(o) => {
          setPlOpen(o);
          if (!o) {
            setPlStep(needPlPicker ? "pick" : "list");
            setPlService(null);
          }
        }}
      >
        <PopoverTrigger asChild>
          <button type="button" className={DOCK_ICON_BTN} title={t("streaming.addToPlaylist")}>
            <Disc className="w-4 h-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent side="top" align="end" sideOffset={8} className={cn(popClass, "p-0")}>
          {plStep === "pick" && needPlPicker ? (
            <div className="p-2">
              <p className="text-[11px] text-muted-foreground font-body px-1 pb-2">{t("streaming.chooseService")}</p>
              <div className="flex flex-col gap-1">
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
              <p className="text-[11px] text-muted-foreground font-body px-1 pb-2">{t("streaming.yourPlaylists")}</p>
              {!playlistsLoading && playlists.length > 0 && (
                <div className="relative px-1 pb-2">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                  <input
                    ref={plSearchRef}
                    type="text"
                    value={plSearch}
                    onChange={(e) => setPlSearch(e.target.value)}
                    placeholder={t("streaming.searchPlaylists")}
                    className="w-full h-7 pl-6 pr-2 text-xs font-body rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              )}
              <div className="max-h-52 overflow-y-auto space-y-0.5">
                {playlistsLoading ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : playlists.length === 0 ? (
                  <p className="text-xs font-body text-muted-foreground px-2 py-3">{t("streaming.noPlaylists")}</p>
                ) : filteredPlaylists.length === 0 ? (
                  <p className="text-xs font-body text-muted-foreground px-2 py-3">{t("streaming.noPlaylistsMatch")}</p>
                ) : (
                  filteredPlaylists.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      disabled={addingTo === p.id}
                      className="w-full text-left text-xs font-body rounded-md px-2 py-2 hover:bg-muted text-foreground truncate disabled:opacity-50"
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
    </>
  );
}
