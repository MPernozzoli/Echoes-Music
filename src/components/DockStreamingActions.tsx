import { useCallback, useEffect, useState } from "react";
import { Plus, Disc, Loader2, ChevronLeft } from "lucide-react";
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
  "w-[min(100vw-1.5rem,18rem)] border-zinc-700 bg-zinc-950 p-2 text-zinc-100 shadow-2xl";

interface DockStreamingActionsProps {
  spotifyTrackId?: string;
  appleMusicTrackId?: string;
}

type StreamSvc = "spotify" | "apple";

export function DockStreamingActions({ spotifyTrackId, appleMusicTrackId }: DockStreamingActionsProps) {
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

  const needLibPicker = showApple && showSpotify;
  const needPlPicker = showApple && showSpotify;

  const onAppleLibrary = useCallback(async () => {
    if (!appleMusicTrackId) return;
    const mk = getMusicKitInstance();
    const token = mk?.musicUserToken;
    if (!token) {
      toast.error("Sessione Apple Music non disponibile");
      return;
    }
    setAppleBusy(true);
    const r = await addAppleMusicSongToLibrary(appleMusicTrackId, token);
    setAppleBusy(false);
    if ("error" in r) toast.error("Apple Music: non aggiunto alla libreria");
    else toast.success("Aggiunto alla libreria Apple Music");
    setLibOpen(false);
  }, [appleMusicTrackId]);

  const onSpotifySave = useCallback(async () => {
    if (!spotifyTrackId) return;
    setSpotifySaveBusy(true);
    const r = await spotifySaveTracks([spotifyTrackId]);
    setSpotifySaveBusy(false);
    if ("error" in r) {
      if (r.error.includes("403") || r.error.toLowerCase().includes("scope")) {
        toast.error("Spotify: scollega e ricollega l’account da Profilo");
      } else toast.error("Spotify: brano non salvato");
    } else toast.success("Salvato nei brani Spotify");
    setLibOpen(false);
  }, [spotifyTrackId]);

  const loadPlaylists = useCallback(
    async (svc: StreamSvc) => {
      setPlaylistsLoading(true);
      setPlaylists([]);
      if (svc === "spotify") {
        const r = await spotifyListPlaylists();
        setPlaylistsLoading(false);
        if ("error" in r) {
          toast.error("Impossibile caricare le playlist Spotify");
          return;
        }
        setPlaylists(r.playlists);
        return;
      }
      const mk = getMusicKitInstance();
      const token = mk?.musicUserToken;
      if (!token) {
        setPlaylistsLoading(false);
        toast.error("Sessione Apple Music non disponibile");
        return;
      }
      const r = await listAppleMusicPlaylists(token);
      setPlaylistsLoading(false);
      if ("error" in r) {
        toast.error("Impossibile caricare le playlist Apple Music");
        return;
      }
      setPlaylists(r.playlists);
    },
    [],
  );

  useEffect(() => {
    if (!plOpen) {
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
            toast.error("Spotify: scollega e ricollega l’account da Profilo");
          } else toast.error("Non aggiunto alla playlist");
        } else {
          toast.success("Aggiunto alla playlist");
          setPlOpen(false);
        }
        return;
      }
      if (!appleMusicTrackId) return;
      const mk = getMusicKitInstance();
      const token = mk?.musicUserToken;
      if (!token) {
        toast.error("Sessione Apple Music non disponibile");
        return;
      }
      setAddingTo(playlistId);
      const r = await addAppleMusicSongToPlaylist(playlistId, appleMusicTrackId, token);
      setAddingTo(null);
      if ("error" in r) toast.error("Apple Music: non aggiunto alla playlist");
      else {
        toast.success("Aggiunto alla playlist");
        setPlOpen(false);
      }
    },
    [plService, needPlPicker, showSpotify, spotifyTrackId, appleMusicTrackId],
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
              title="Aggiungi alla libreria"
              disabled={libBusy}
            >
              {libBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" align="end" sideOffset={8} className={popClass}>
            <p className="text-[11px] text-zinc-500 font-body px-1 pb-2">Aggiungi alla libreria</p>
            <div className="flex flex-col gap-1">
              <button
                type="button"
                disabled={appleBusy}
                className="text-left text-xs font-body rounded-md px-2 py-2 hover:bg-zinc-900 text-zinc-200"
                onClick={() => void onAppleLibrary()}
              >
                Apple Music
              </button>
              <button
                type="button"
                disabled={spotifySaveBusy}
                className="text-left text-xs font-body rounded-md px-2 py-2 hover:bg-zinc-900 text-zinc-200"
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
          title="Aggiungi alla libreria"
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
          <button type="button" className={DOCK_ICON_BTN} title="Aggiungi a una playlist">
            <Disc className="w-4 h-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent side="top" align="end" sideOffset={8} className={cn(popClass, "p-0")}>
          {plStep === "pick" && needPlPicker ? (
            <div className="p-2">
              <p className="text-[11px] text-zinc-500 font-body px-1 pb-2">Scegli il servizio</p>
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  className="text-left text-xs font-body rounded-md px-2 py-2 hover:bg-zinc-900 text-zinc-200"
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
                  className="text-left text-xs font-body rounded-md px-2 py-2 hover:bg-zinc-900 text-zinc-200"
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
                  className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 font-body mb-2 px-1"
                  onClick={() => {
                    setPlStep("pick");
                    setPlService(null);
                    setPlaylists([]);
                  }}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Altro servizio
                </button>
              )}
              <p className="text-[11px] text-zinc-500 font-body px-1 pb-2">Le tue playlist</p>
              <div className="max-h-52 overflow-y-auto space-y-0.5">
                {playlistsLoading ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
                  </div>
                ) : playlists.length === 0 ? (
                  <p className="text-xs font-body text-zinc-500 px-2 py-3">Nessuna playlist</p>
                ) : (
                  playlists.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      disabled={addingTo === p.id}
                      className="w-full text-left text-xs font-body rounded-md px-2 py-2 hover:bg-zinc-900 text-zinc-200 truncate disabled:opacity-50"
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
