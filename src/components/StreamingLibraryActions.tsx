import { useCallback, useMemo, useRef, useState } from "react";
import { Library, ListMusic, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useAppleMusic } from "@/context/useAppleMusic";
import { useSpotify } from "@/context/useSpotify";
import { addAppleMusicSongToLibrary } from "@/services/appleMusicLibrary";
import { getAppleMusicUserToken } from "@/services/appleMusicSession";
import { spotifyAddTrackToPlaylist, spotifyListPlaylists, spotifySaveTracks } from "@/services/spotify";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface StreamingLibraryActionsProps {
  spotifyTrackId?: string;
  appleMusicTrackId?: string;
  className?: string;
  /** layout compatto per liste */
  compact?: boolean;
}

export function StreamingLibraryActions({
  spotifyTrackId,
  appleMusicTrackId,
  className,
  compact,
}: StreamingLibraryActionsProps) {
  const { isAuthorized: appleOk, isAvailable: appleAvail } = useAppleMusic();
  const { isConnected: spotifyOk, loading: spotifyLoading } = useSpotify();

  const [appleBusy, setAppleBusy] = useState(false);
  const [spotifySaveBusy, setSpotifySaveBusy] = useState(false);
  const [playlistsOpen, setPlaylistsOpen] = useState(false);
  const [playlistsLoading, setPlaylistsLoading] = useState(false);
  const [playlists, setPlaylists] = useState<{ id: string; name: string }[]>([]);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [plSearch, setPlSearch] = useState("");
  const plSearchRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();

  const filteredPlaylists = useMemo(() => {
    if (!plSearch.trim()) return playlists;
    const q = plSearch.toLowerCase();
    return playlists.filter((p) => p.name.toLowerCase().includes(q));
  }, [playlists, plSearch]);

  const showApple = Boolean(appleAvail && appleOk && appleMusicTrackId);
  const showSpotify = Boolean(spotifyOk && spotifyTrackId && !spotifyLoading);

  const onAppleLibrary = useCallback(async () => {
    if (!appleMusicTrackId) return;
    const token = await getAppleMusicUserToken();
    if (!token) {
      toast.error("Sessione Apple Music non disponibile");
      return;
    }
    setAppleBusy(true);
    const r = await addAppleMusicSongToLibrary(appleMusicTrackId, token);
    setAppleBusy(false);
    if ("error" in r) toast.error("Apple Music: non aggiunto (controlla abbonamento o riprova)");
    else toast.success("Aggiunto alla libreria Apple Music");
  }, [appleMusicTrackId]);

  const onSpotifySave = useCallback(async () => {
    if (!spotifyTrackId) return;
    setSpotifySaveBusy(true);
    const r = await spotifySaveTracks([spotifyTrackId]);
    setSpotifySaveBusy(false);
    if ("error" in r) {
      if (r.error.includes("403") || r.error.toLowerCase().includes("scope")) {
        toast.error("Spotify: scollega e ricollega l’account da Profilo per abilitare libreria e playlist");
      } else toast.error("Spotify: brano non salvato");
    } else toast.success("Salvato nei brani di Spotify");
  }, [spotifyTrackId]);

  const loadPlaylists = useCallback(async () => {
    setPlaylistsLoading(true);
    const r = await spotifyListPlaylists();
    setPlaylistsLoading(false);
    if ("error" in r) {
      toast.error("Impossibile caricare le playlist");
      setPlaylists([]);
      return;
    }
    setPlaylists(r.playlists);
  }, []);

  const onOpenPlaylists = useCallback(
    (open: boolean) => {
      setPlaylistsOpen(open);
      if (open && playlists.length === 0) void loadPlaylists();
      if (!open) setPlSearch("");
    },
    [loadPlaylists, playlists.length],
  );

  const onPickPlaylist = useCallback(
    async (playlistId: string) => {
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
        setPlaylistsOpen(false);
      }
    },
    [spotifyTrackId],
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
          Apple Library
        </Button>
      )}
      {showSpotify && (
        <>
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
            Spotify salvati
          </Button>
          <Popover open={playlistsOpen} onOpenChange={onOpenPlaylists}>
            <PopoverTrigger asChild>
              <Button type="button" variant="secondary" size="sm" className={btnClass}>
                <ListMusic className="w-3.5 h-3.5" />
                Playlist
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-2" align="start">
              <p className="text-xs font-body text-muted-foreground px-2 py-1">{t("streaming.yourPlaylists")}</p>
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
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : playlists.length === 0 ? (
                  <p className="text-xs font-body text-muted-foreground px-2 py-2">{t("streaming.noPlaylists")}</p>
                ) : filteredPlaylists.length === 0 ? (
                  <p className="text-xs font-body text-muted-foreground px-2 py-2">{t("streaming.noPlaylistsMatch")}</p>
                ) : (
                  filteredPlaylists.map((p) => (
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
            </PopoverContent>
          </Popover>
        </>
      )}
    </div>
  );
}
