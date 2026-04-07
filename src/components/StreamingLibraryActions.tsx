import { useCallback, useState } from "react";
import { Library, ListMusic, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAppleMusic } from "@/context/AppleMusicContext";
import { useSpotify } from "@/context/SpotifyContext";
import { addAppleMusicSongToLibrary } from "@/services/appleMusicLibrary";
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

  const showApple = Boolean(appleAvail && appleOk && appleMusicTrackId);
  const showSpotify = Boolean(spotifyOk && spotifyTrackId && !spotifyLoading);

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
              <p className="text-xs font-body text-muted-foreground px-2 py-1">Le tue playlist</p>
              <div className="max-h-52 overflow-y-auto space-y-0.5">
                {playlistsLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : playlists.length === 0 ? (
                  <p className="text-xs font-body text-muted-foreground px-2 py-2">Nessuna playlist</p>
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
            </PopoverContent>
          </Popover>
        </>
      )}
    </div>
  );
}
