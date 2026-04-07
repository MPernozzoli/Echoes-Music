import type { Song } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { StreamingLibraryActions } from "@/components/StreamingLibraryActions";
import { ListPlus, Play, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";

function spotifyTrackIdFromSong(song: Song): string | undefined {
  const u = song.spotifyUri;
  if (!u) return undefined;
  return u.replace(/^spotify:track:/i, "");
}

interface SearchResultTrackListProps {
  songs: Song[];
  onPlayNow: (song: Song, index: number) => void;
  onAddToQueue: (song: Song) => void;
  onPlayNext: (song: Song) => void;
  className?: string;
}

function MetaLine({ song }: { song: Song }) {
  const year = song.releaseYear != null ? ` · ${song.releaseYear}` : "";
  return (
    <p className="text-xs text-muted-foreground font-body truncate">
      {song.album}
      {year}
    </p>
  );
}

const SearchResultTrackList = ({
  songs,
  onPlayNow,
  onAddToQueue,
  onPlayNext,
  className,
}: SearchResultTrackListProps) => {
  return (
    <div className={cn("space-y-4", className)}>
      {songs.map((song, index) => (
        <div
          key={song.id}
          className="flex gap-3 sm:gap-4 rounded-xl border border-border/70 bg-card/50 p-3 sm:p-4"
        >
          <img
            src={song.artwork}
            alt=""
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg object-cover shrink-0 bg-muted"
            width={64}
            height={64}
          />
          <div className="flex-1 min-w-0 space-y-2">
            <div>
              <p className="font-display text-sm font-semibold text-foreground leading-tight line-clamp-2">
                {song.title}
              </p>
              <p className="text-xs text-muted-foreground font-body truncate mt-0.5">{song.artist}</p>
              <MetaLine song={song} />
            </div>
            <p className="text-sm text-secondary-foreground/90 font-body leading-relaxed line-clamp-4">
              {song.explanation}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                type="button"
                size="sm"
                className="gap-1.5 font-body h-8"
                onClick={() => onPlayNow(song, index)}
              >
                <Play className="w-3.5 h-3.5" />
                Riproduci adesso
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-1.5 font-body h-8"
                onClick={() => onAddToQueue(song)}
              >
                <ListPlus className="w-3.5 h-3.5" />
                Aggiungi in coda
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="gap-1.5 font-body h-8"
                onClick={() => onPlayNext(song)}
              >
                <SkipForward className="w-3.5 h-3.5" />
                Come successivo
              </Button>
              <StreamingLibraryActions
                spotifyTrackId={spotifyTrackIdFromSong(song)}
                appleMusicTrackId={song.appleMusicId}
                compact
                className="w-full"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SearchResultTrackList;
