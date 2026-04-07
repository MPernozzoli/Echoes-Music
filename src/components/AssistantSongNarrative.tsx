import { useMemo, useState, type ReactNode } from "react";
import type { Song } from "@/data/mockData";
import type { QueueListenSource } from "@/context/PlaybackQueueContext";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { StreamingLibraryActions } from "@/components/StreamingLibraryActions";
import { Heart, ListPlus, Pause, Play, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";
import { requestPlaybackToggle } from "@/lib/playbackToggleBridge";
import { trackResultFeedback } from "@/services/tracking";

function normTitle(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function spotifyTrackIdFromSong(song: Song): string | undefined {
  const u = song.spotifyUri;
  if (!u) return undefined;
  return u.replace(/^spotify:track:/i, "");
}

export function fallbackNarrativeForResult(prompt: string, songs: Song[]): string {
  if (!songs.length) return "";
  const head = `Per «${prompt}» ho pensato a questi brani: `;
  const tail = songs.map((s) => `«${s.title}» (${s.artist}) — ${s.explanation}`).join(" ");
  return head + tail;
}

type Segment = { type: "text"; text: string } | { type: "song"; song: Song; index: number };

function parseNarrative(narrative: string, songs: Song[]): Segment[] {
  const used = new Set<number>();
  const segments: Segment[] = [];
  const re = /«([^»]+)»/gu;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(narrative)) !== null) {
    if (m.index > last) segments.push({ type: "text", text: narrative.slice(last, m.index) });
    const raw = m[1].trim();
    const n = normTitle(raw);
    let idx = songs.findIndex((s, i) => !used.has(i) && normTitle(s.title) === n);
    if (idx < 0) {
      idx = songs.findIndex(
        (s, i) =>
          !used.has(i) &&
          (n.includes(normTitle(s.title)) || normTitle(s.title).includes(n))
      );
    }
    if (idx >= 0) {
      used.add(idx);
      segments.push({ type: "song", song: songs[idx], index: idx });
    } else {
      segments.push({ type: "text", text: m[0] });
    }
    last = m.index + m[0].length;
  }
  if (last < narrative.length) segments.push({ type: "text", text: narrative.slice(last) });
  return segments;
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
            "inline font-medium text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-sm"
          )}
        >
          «{song.title}»
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
  const segments = useMemo(() => parseNarrative(narrative, songs), [narrative, songs]);

  const body: ReactNode[] = [];
  segments.forEach((seg, i) => {
    if (seg.type === "text") {
      if (seg.text) body.push(<span key={`t-${i}`}>{seg.text}</span>);
    } else {
      body.push(
        <SongLinkPopover
          key={`s-${seg.song.id}-${i}`}
          song={seg.song}
          songIndex={seg.index}
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
      );
    }
  });

  return (
    <div className={cn("text-sm font-body text-foreground/95 leading-relaxed whitespace-pre-line", className)}>
      {body}
    </div>
  );
}
