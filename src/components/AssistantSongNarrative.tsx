import { useCallback, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { EmotionalProfile, Song } from "@/data/mockData";
import type { QueueListenSource } from "@/context/PlaybackQueueContext";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { StreamingLibraryActions } from "@/components/StreamingLibraryActions";
import { useAppleMusic } from "@/context/AppleMusicContext";
import { useSpotify } from "@/context/SpotifyContext";
import { addAppleMusicSongToLibrary } from "@/services/appleMusicLibrary";
import { spotifySaveTracks } from "@/services/spotify";
import {
  Heart,
  Library,
  ListMusic,
  ListPlus,
  Loader2,
  Pause,
  Play,
  Plus,
  SkipForward,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { requestPlaybackToggle } from "@/lib/playbackToggleBridge";
import { trackResultFeedback } from "@/services/tracking";
import { toast } from "sonner";

function spotifyTrackIdFromSong(song: Song): string | undefined {
  const u = song.spotifyUri;
  if (!u) return undefined;
  return u.replace(/^spotify:track:/i, "");
}

function getMusicKitInstance(): { musicUserToken?: string | null } | undefined {
  return (window as unknown as { MusicKit?: { getInstance: () => { musicUserToken?: string | null } } }).MusicKit?.getInstance();
}

export function fallbackNarrativeForResult(
  prompt: string,
  profile: EmotionalProfile,
  opts: { lucky?: boolean; songCount: number }
): string {
  const mood = profile.mood.trim();
  const themeHint = profile.themes.length ? profile.themes.slice(0, 3).join(", ") : "";
  const moodClip = (s: string, n: number) => (s.length <= n ? s : `${s.slice(0, n)}…`);

  if (opts.lucky) {
    return [
      `Ho messo insieme ${opts.songCount} brani come piccola "radiografia" del tuo gusto: un punto di partenza più centrale e qualche scoperta nello stesso quartiere emotivo.`,
      themeHint ? ` Temi che ricorrono: ${themeHint}.` : "",
      ` Il filo: ${moodClip(mood, 240)}`,
      ` I titoli sono qui sotto: apri ognuno per la scheda con la spiegazione sul singolo brano e i comandi per ascoltare o mettere in coda.`,
    ].join("");
  }

  return [
    `Ho cercato di tradurre «${prompt}» in un arco musicale coerente.`,
    ` L'impasto emotivo: ${moodClip(mood, 260)}`,
    themeHint ? ` Temi: ${themeHint}.` : "",
    ` Scorri i brani qui sotto — in ogni titolo trovi perché quel pezzo c'entra e cosa puoi farci.`,
  ].join("");
}

interface SongLinkPopoverProps {
  song: Song;
  songIndex: number;
  allSongs: Song[];
  source: QueueListenSource;
  queue: Song[];
  currentIndex: number;
  isGloballyPlaying: boolean;
  playTrackFromResult: (allSongs: Song[], songIndex: number, source: QueueListenSource) => void;
  appendToQueue: (songs: Song[], source?: QueueListenSource | null) => void;
  insertAfterCurrent: (songs: Song[], source?: QueueListenSource | null) => void;
  isFavorite: (id: string) => boolean;
  toggleFavorite: (song: Song) => void;
  tracking?: { searchId: string; resultIdsBySongId: Record<string, string> };
}

function SongLinkPopover({
  song,
  songIndex,
  allSongs,
  source,
  queue,
  currentIndex,
  isGloballyPlaying,
  playTrackFromResult,
  appendToQueue,
  insertAfterCurrent,
  isFavorite,
  toggleFavorite,
  tracking,
}: SongLinkPopoverProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const isCurrent = queue[currentIndex]?.id === song.id;
  const playingHere = isCurrent && isGloballyPlaying;
  const fav = isFavorite(song.id);

  const onHeart = () => {
    const was = isFavorite(song.id);
    toggleFavorite(song);
    if (!was && tracking?.searchId && tracking.resultIdsBySongId[song.id]) {
      void trackResultFeedback({
        searchId: tracking.searchId,
        searchResultId: tracking.resultIdsBySongId[song.id],
        label: "positive_pick",
      });
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "group inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-body font-medium transition-all duration-200",
            "border-border/50 bg-card/60 text-foreground/85 shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
            "hover:border-primary/40 hover:bg-primary/[0.06] hover:text-foreground hover:shadow-sm",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
            playingHere && "border-primary/50 bg-primary/10 text-primary ring-1 ring-primary/20"
          )}
        >
          {song.artwork ? (
            <img src={song.artwork} alt="" className="w-5 h-5 rounded-md object-cover shrink-0" />
          ) : (
            <div className="w-5 h-5 rounded-md bg-primary/10 shrink-0" />
          )}
          <span className="max-w-[12rem] truncate">{song.title}</span>
          {playingHere && (
            <span className="flex gap-0.5 items-end h-3 shrink-0" aria-label={t("player.nowPlayingAria")}>
              <span className="w-0.5 h-2 bg-primary rounded-full animate-pulse" />
              <span className="w-0.5 h-3 bg-primary rounded-full animate-pulse [animation-delay:150ms]" />
              <span className="w-0.5 h-1.5 bg-primary rounded-full animate-pulse [animation-delay:300ms]" />
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[min(100vw-1.5rem,22rem)] p-0 overflow-hidden rounded-2xl border border-border/60 shadow-xl"
        align="start"
        side="top"
        sideOffset={8}
      >
        {/* Header: artwork + info */}
        <div className="flex items-start gap-3 p-3.5 pb-3 bg-gradient-to-br from-card via-card to-primary/[0.03]">
          {song.artwork ? (
            <img src={song.artwork} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0 shadow-sm ring-1 ring-border/40" />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-primary/10 shrink-0" />
          )}
          <div className="flex-1 min-w-0 pt-0.5">
            <p className="font-display text-sm font-semibold text-foreground leading-tight truncate">{song.title}</p>
            <p className="text-xs text-muted-foreground font-body truncate mt-0.5">{song.artist}</p>
            <div className="flex flex-wrap gap-1 mt-2">
              {song.emotionalTags.slice(0, 4).map((tag) => (
                <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-md bg-primary/8 text-primary/80 font-body font-medium">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Explanation */}
        {song.explanation && (
          <p className="px-3.5 py-2.5 text-[11px] text-muted-foreground font-body leading-relaxed border-t border-border/30 bg-card/50">
            {song.explanation}
          </p>
        )}

        {/* Playback actions */}
        <div className="flex flex-wrap gap-1.5 px-3.5 py-2.5 border-t border-border/30">
          <Button
            type="button"
            size="sm"
            className="gap-1.5 font-body h-7 text-xs rounded-lg"
            onClick={() => {
              if (playingHere) requestPlaybackToggle();
              else playTrackFromResult(allSongs, songIndex, source);
            }}
          >
            {playingHere ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            {playingHere ? t("player.pause") : "Play"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5 font-body h-7 text-xs rounded-lg"
            onClick={() => appendToQueue([song], source)}
          >
            <ListPlus className="w-3 h-3" />
            {t("player.addQueue")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="gap-1.5 font-body h-7 text-xs rounded-lg"
            onClick={() => insertAfterCurrent([song], source)}
          >
            <SkipForward className="w-3 h-3" />
            {t("player.next")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className={cn("gap-1 font-body h-7 text-xs rounded-lg px-2", fav && "text-primary")}
            onClick={onHeart}
            aria-pressed={fav}
          >
            <Heart className={cn("w-3 h-3", fav && "fill-current")} />
          </Button>
        </div>

        {/* Streaming: libreria + playlist */}
        <StreamingLibraryActions
          spotifyTrackId={spotifyTrackIdFromSong(song)}
          appleMusicTrackId={song.appleMusicId}
          compact
          className="w-full border-t border-border/30 px-3.5 py-2.5"
        />
      </PopoverContent>
    </Popover>
  );
}

/* ------------------------------------------------------------------ */
/*  Azione collettiva: salva tutti i brani nella libreria             */
/* ------------------------------------------------------------------ */
function SaveAllToLibrary({ songs }: { songs: Song[] }) {
  const { t } = useTranslation();
  const { isAuthorized: appleOk, isAvailable: appleAvail } = useAppleMusic();
  const { isConnected: spotifyOk, loading: spotifyLoading } = useSpotify();
  const [busy, setBusy] = useState(false);

  const showApple = Boolean(appleAvail && appleOk);
  const showSpotify = Boolean(spotifyOk && !spotifyLoading);

  const spotifyIds = songs.map(spotifyTrackIdFromSong).filter(Boolean) as string[];
  const appleIds = songs.map((s) => s.appleMusicId).filter(Boolean) as string[];
  const hasSpotifyTracks = showSpotify && spotifyIds.length > 0;
  const hasAppleTracks = showApple && appleIds.length > 0;

  const onSaveSpotify = useCallback(async () => {
    if (!spotifyIds.length) return;
    setBusy(true);
    const r = await spotifySaveTracks(spotifyIds);
    setBusy(false);
    if ("error" in r) {
      toast.error(t("streaming.spotifyTrackNotSaved"));
    } else {
      toast.success(t("streaming.spotifySavedAllTracks", { count: spotifyIds.length }));
    }
  }, [spotifyIds, t]);

  const onSaveApple = useCallback(async () => {
    setBusy(true);
    let ok = 0;
    for (const id of appleIds) {
      const mk = getMusicKitInstance();
      const token = mk?.musicUserToken;
      if (!token) break;
      const r = await addAppleMusicSongToLibrary(String(id), token);
      if (!("error" in r)) ok++;
    }
    setBusy(false);
    if (ok > 0) toast.success(t("streaming.appleAddedAllLibrary", { count: ok }));
    else toast.error(t("streaming.appleAddFailed"));
  }, [appleIds, t]);

  if (!hasSpotifyTracks && !hasAppleTracks) return null;

  const bothActive = hasSpotifyTracks && hasAppleTracks;

  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-3">
      {hasSpotifyTracks && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 font-body h-7 text-[11px] rounded-lg"
          disabled={busy}
          onClick={() => void onSaveSpotify()}
        >
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Library className="w-3 h-3" />}
          {bothActive ? "Spotify" : t("streaming.saveAllToLibrary")}
        </Button>
      )}
      {hasAppleTracks && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 font-body h-7 text-[11px] rounded-lg"
          disabled={busy}
          onClick={() => void onSaveApple()}
        >
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
          {bothActive ? "Apple Music" : t("streaming.saveAllToLibrary")}
        </Button>
      )}
      {bothActive && (
        <span className="text-[10px] text-muted-foreground/50 font-body">{t("streaming.saveAllHint")}</span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Componente principale                                             */
/* ------------------------------------------------------------------ */

export interface AssistantSongNarrativeProps {
  narrative: string;
  songs: Song[];
  source: QueueListenSource;
  queue: Song[];
  currentIndex: number;
  isGloballyPlaying: boolean;
  playTrackFromResult: (allSongs: Song[], songIndex: number, source: QueueListenSource) => void;
  appendToQueue: (songs: Song[], source?: QueueListenSource | null) => void;
  insertAfterCurrent: (songs: Song[], source?: QueueListenSource | null) => void;
  isFavorite: (id: string) => boolean;
  toggleFavorite: (song: Song) => void;
  tracking?: { searchId: string; resultIdsBySongId: Record<string, string> };
  className?: string;
}

export function AssistantSongNarrative({
  narrative,
  songs,
  source,
  queue,
  currentIndex,
  isGloballyPlaying,
  playTrackFromResult,
  appendToQueue,
  insertAfterCurrent,
  isFavorite,
  toggleFavorite,
  tracking,
  className,
}: AssistantSongNarrativeProps) {
  const { t } = useTranslation();

  const chips: ReactNode[] = songs.map((song, index) => (
    <SongLinkPopover
      key={song.id}
      song={song}
      songIndex={index}
      allSongs={songs}
      source={source}
      queue={queue}
      currentIndex={currentIndex}
      isGloballyPlaying={isGloballyPlaying}
      playTrackFromResult={playTrackFromResult}
      appendToQueue={appendToQueue}
      insertAfterCurrent={insertAfterCurrent}
      isFavorite={isFavorite}
      toggleFavorite={toggleFavorite}
      tracking={tracking}
    />
  ));

  const onPlayAll = () => {
    if (songs.length > 0) playTrackFromResult(songs, 0, source);
  };

  const onQueueAll = () => {
    if (songs.length > 0) appendToQueue(songs, source);
  };

  return (
    <div className={cn("space-y-3.5", className)}>
      <p className="text-[13px] font-body text-foreground/90 leading-[1.7] whitespace-pre-line">{narrative}</p>
      {songs.length > 0 && (
        <div className="pt-3 border-t border-border/25">
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-[10px] font-body uppercase tracking-[0.12em] text-muted-foreground/60 font-medium">
              {t("narrative.selectedTracks")}
            </p>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onPlayAll}
                className="inline-flex items-center gap-1 text-[10px] font-body font-medium text-primary/70 hover:text-primary transition-colors px-1.5 py-0.5 rounded-md hover:bg-primary/[0.06]"
              >
                <Play className="w-3 h-3" />
                {t("narrative.playAll")}
              </button>
              <button
                type="button"
                onClick={onQueueAll}
                className="inline-flex items-center gap-1 text-[10px] font-body font-medium text-muted-foreground/60 hover:text-foreground transition-colors px-1.5 py-0.5 rounded-md hover:bg-muted/60"
              >
                <ListMusic className="w-3 h-3" />
                {t("narrative.queueAll")}
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">{chips}</div>
          <SaveAllToLibrary songs={songs} />
        </div>
      )}
    </div>
  );
}
