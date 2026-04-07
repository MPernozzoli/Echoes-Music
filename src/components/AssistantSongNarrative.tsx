import { useState, type ReactNode } from "react";
import type { EmotionalProfile, Song } from "@/data/mockData";
import type { QueueListenSource } from "@/context/PlaybackQueueContext";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { StreamingLibraryActions } from "@/components/StreamingLibraryActions";
import { Heart, ListPlus, Pause, Play, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";
import { requestPlaybackToggle } from "@/lib/playbackToggleBridge";
import { trackResultFeedback } from "@/services/tracking";

function spotifyTrackIdFromSong(song: Song): string | undefined {
  const u = song.spotifyUri;
  if (!u) return undefined;
  return u.replace(/^spotify:track:/i, "");
}

/** Quando manca narrativeReply dal modello (messaggi vecchi o errore). */
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
      `Ho messo insieme ${opts.songCount} brani come piccola “radiografia” del tuo gusto: un punto di partenza più centrale e qualche scoperta nello stesso quartiere emotivo.`,
      themeHint ? ` Temi che ricorrono: ${themeHint}.` : "",
      ` Il filo: ${moodClip(mood, 240)}`,
      ` I titoli sono qui sotto: apri ognuno per la scheda con la spiegazione sul singolo brano e i comandi per ascoltare o mettere in coda.`,
    ].join("");
  }

  return [
    `Ho cercato di tradurre «${prompt}» in un arco musicale coerente.`,
    ` L’impasto emotivo: ${moodClip(mood, 260)}`,
    themeHint ? ` Temi: ${themeHint}.` : "",
    ` Scorri i brani qui sotto — in ogni titolo trovi perché quel pezzo c’entra e cosa puoi farci.`,
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
  triggerVariant?: "link" | "chip";
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
  triggerVariant = "link",
}: SongLinkPopoverProps) {
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

  const triggerClass =
    triggerVariant === "chip"
      ? cn(
          "rounded-full border border-primary/30 bg-primary/8 px-2.5 py-1 text-xs font-body font-medium text-primary",
          "hover:bg-primary/15 hover:border-primary/45 transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        )
      : cn(
          "inline font-medium text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-sm"
        );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className={triggerClass}>
          {triggerVariant === "chip" ? (
            <span className="max-w-[14rem] truncate inline-block align-bottom">{song.title}</span>
          ) : (
            <>«{song.title}»</>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(100vw-2rem,20rem)] p-3" align="start" side="top">
        <div className="space-y-3">
          <div>
            <p className="font-display text-sm font-semibold text-foreground leading-tight">{song.title}</p>
            <p className="text-xs text-muted-foreground font-body truncate">{song.artist}</p>
            <p className="text-[11px] text-muted-foreground font-body mt-1.5 leading-relaxed">{song.explanation}</p>
            <div className="flex flex-wrap gap-1 mt-2">
              {song.emotionalTags.slice(0, 5).map((t) => (
                <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-body">
                  {t}
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              className="gap-1.5 font-body h-8"
              onClick={() => {
                if (playingHere) requestPlaybackToggle();
                else playTrackFromResult(allSongs, songIndex, source);
              }}
            >
              {playingHere ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {playingHere ? "Pausa" : "Play"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1.5 font-body h-8"
              onClick={() => appendToQueue([song], source)}
            >
              <ListPlus className="w-3.5 h-3.5" />
              In coda
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="gap-1.5 font-body h-8"
              onClick={() => insertAfterCurrent([song], source)}
            >
              <SkipForward className="w-3.5 h-3.5" />
              Successivo
            </Button>
            <Button
              type="button"
              size="sm"
              variant={fav ? "default" : "outline"}
              className="gap-1.5 font-body h-8 px-2.5"
              onClick={onHeart}
              aria-pressed={fav}
            >
              <Heart className={cn("w-3.5 h-3.5", fav && "fill-current")} />
            </Button>
          </div>
          <StreamingLibraryActions
            spotifyTrackId={spotifyTrackIdFromSong(song)}
            appleMusicTrackId={song.appleMusicId}
            compact
            className="w-full border-t border-border/50 pt-2"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

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
  const chips: ReactNode[] = [];
  songs.forEach((song, index) => {
    if (index > 0) chips.push(<span key={`sep-${song.id}`} className="text-muted-foreground text-xs px-0.5 select-none" aria-hidden>·</span>);
    chips.push(
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
        triggerVariant="chip"
      />
    );
  });

  return (
    <div className={cn("space-y-3", className)}>
      <p className="text-sm font-body text-foreground/95 leading-relaxed whitespace-pre-line">{narrative}</p>
      {songs.length > 0 && (
        <div className="pt-2 border-t border-border/35">
          <p className="text-[10px] font-body uppercase tracking-wider text-muted-foreground mb-2">Brani</p>
          <div className="flex flex-wrap gap-y-2 gap-x-0.5 items-center">{chips}</div>
        </div>
      )}
    </div>
  );
}
