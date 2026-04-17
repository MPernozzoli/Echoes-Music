/* @refresh skip */
import { useState, type ReactNode } from "react";
import type { Song, SongVersion } from "@/data/mockData";
import type { QueueListenSource } from "@/context/PlaybackQueueContext";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { StreamingLibraryActions } from "@/components/StreamingLibraryActions";
import { ChevronDown, Heart, ListPlus, Pause, Play, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";
import { requestPlaybackToggle } from "@/lib/playbackToggleBridge";
import { trackResultFeedback } from "@/services/tracking";

function versionToSong(version: SongVersion, parent: Song): Song {
  return {
    ...parent,
    id: version.id,
    title: version.title,
    artist: version.artist,
    album: version.album,
    releaseYear: version.releaseYear,
    provider: version.provider ?? parent.provider,
    spotifyUri: version.spotifyUri,
    appleMusicId: version.appleMusicId,
    previewUrl: version.previewUrl,
    alternateVersions: undefined,
  };
}

function spotifyTrackIdFromSong(song: Song): string | undefined {
  const u = song.spotifyUri;
  if (!u) return undefined;
  return u.replace(/^spotify:track:/i, "");
}

function versionMeta(song: Pick<Song, "album" | "releaseYear">): string {
  const year = song.releaseYear != null ? `${song.releaseYear}` : "";
  if (song.album && year) return `${song.album} · ${year}`;
  return song.album || year;
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
  const [versionsOpen, setVersionsOpen] = useState(false);
  const isCurrent = queue[currentIndex]?.id === song.id;
  const playingHere = isCurrent && isGloballyPlaying;
  const fav = isFavorite(song.id);
  const versionsCount = song.alternateVersions?.length ?? 0;

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
            <img
              src={song.artwork}
              alt=""
              className="w-5 h-5 rounded-md object-cover shrink-0"
            />
          ) : (
            <div className="w-5 h-5 rounded-md bg-primary/10 shrink-0" />
          )}
          <span className="max-w-[12rem] truncate">{song.title}</span>
          {playingHere && (
            <span className="flex gap-0.5 items-end h-3 shrink-0" aria-label="In riproduzione">
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
        <div className="flex items-start gap-3 p-3.5 pb-3 bg-gradient-to-br from-card via-card to-primary/[0.03]">
          {song.artwork ? (
            <img
              src={song.artwork}
              alt=""
              className="w-14 h-14 rounded-xl object-cover shrink-0 shadow-sm ring-1 ring-border/40"
            />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-primary/10 shrink-0" />
          )}
          <div className="flex-1 min-w-0 pt-0.5">
            <p className="font-display text-sm font-semibold text-foreground leading-tight truncate">{song.title}</p>
            <p className="text-xs text-muted-foreground font-body truncate mt-0.5">{song.artist}</p>
            <div className="flex flex-wrap gap-1 mt-2">
              {song.emotionalTags.slice(0, 4).map((t) => (
                <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-md bg-primary/8 text-primary/80 font-body font-medium">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
        {song.explanation && (
          <p className="px-3.5 py-2.5 text-[11px] text-muted-foreground font-body leading-relaxed border-t border-border/30 bg-card/50">
            {song.explanation}
          </p>
        )}
        {versionsCount > 1 && song.alternateVersions ? (
          <div className="border-t border-border/30 bg-card/40">
            <button
              type="button"
              onClick={() => setVersionsOpen((v) => !v)}
              aria-expanded={versionsOpen}
              className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-left hover:bg-primary/[0.04] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 rounded-none"
            >
              <span className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/70 font-body font-medium">
                  Versioni
                </span>
                <span className="text-[10px] font-body font-medium text-muted-foreground/80 bg-muted/60 rounded-full px-1.5 py-[1px] leading-none">
                  {versionsCount}
                </span>
              </span>
              <ChevronDown
                className={cn(
                  "w-3.5 h-3.5 text-muted-foreground transition-transform duration-200",
                  versionsOpen && "rotate-180",
                )}
              />
            </button>
            {versionsOpen && (
              <div className="px-3.5 pb-3 pt-0.5">
                <p className="text-[11px] text-muted-foreground font-body leading-relaxed">
                  Selezionata di default la versione principale; qui sotto trovi anche le altre cut trovate.
                </p>
                <div className="mt-2 space-y-1.5">
                  {song.alternateVersions.map((version) => {
                    const versionSong = versionToSong(version, song);
                    return (
                      <div
                        key={version.id}
                        className="rounded-xl border border-border/40 bg-background/40 px-2.5 py-2"
                      >
                        <div className="flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-medium text-foreground leading-tight truncate">
                              {version.title}
                            </p>
                            <p className="mt-0.5 text-[11px] text-muted-foreground font-body truncate">
                              {versionMeta(version)}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 rounded-lg hover:bg-primary/10 hover:text-primary"
                              onClick={() => playTrackFromResult([versionSong], 0, source)}
                              title="Riproduci"
                              aria-label={`Riproduci ${version.title}`}
                            >
                              <Play className="w-3 h-3" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 rounded-lg hover:bg-primary/10 hover:text-primary"
                              onClick={() => appendToQueue([versionSong], source)}
                              title="Aggiungi in coda"
                              aria-label={`Aggiungi ${version.title} in coda`}
                            >
                              <ListPlus className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : null}
        <div className="flex flex-wrap gap-1.5 px-3.5 py-3 border-t border-border/30">
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
            {playingHere ? "Pausa" : "Play"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5 font-body h-7 text-xs rounded-lg"
            onClick={() => appendToQueue([song], source)}
          >
            <ListPlus className="w-3 h-3" />
            In coda
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="gap-1.5 font-body h-7 text-xs rounded-lg"
            onClick={() => insertAfterCurrent([song], source)}
          >
            <SkipForward className="w-3 h-3" />
            Dopo
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
        <StreamingLibraryActions
          spotifyTrackId={spotifyTrackIdFromSong(song)}
          appleMusicTrackId={song.appleMusicId}
          compact
          className="w-full border-t border-border/30 px-3.5 py-2"
        />
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

  return (
    <div className={cn("space-y-3.5", className)}>
      <p className="text-[13px] font-body text-foreground/90 leading-[1.7] whitespace-pre-line">{narrative}</p>
      {songs.length > 0 && (
        <div className="pt-3 border-t border-border/25">
          <p className="text-[10px] font-body uppercase tracking-[0.12em] text-muted-foreground/60 mb-2.5 font-medium">
            Brani selezionati
          </p>
          <div className="flex flex-wrap gap-1.5">{chips}</div>
        </div>
      )}
    </div>
  );
}
