import type { Song } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { StreamingLibraryActions } from "@/components/StreamingLibraryActions";
import { ListPlus, Play, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { artworkTintFromId } from "@/lib/artworkTint";

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
  /** Indice traccia attualmente in riproduzione nella coda globale, se noto */
  activeIndex?: number | null;
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
  activeIndex = null,
}: SearchResultTrackListProps) => {
  const { t } = useTranslation();

  return (
    <div className={cn("space-y-2", className)} role="list">
      {songs.map((song, index) => {
        const isActive = activeIndex === index;
        const tint = artworkTintFromId(song.id);
        return (
          <div
            key={song.id}
            role="listitem"
            style={tint}
            className={cn(
              "group relative overflow-hidden rounded-2xl border transition-all duration-300",
              isActive
                ? "border-primary/40 bg-primary/[0.07] shadow-glow ring-1 ring-primary/15"
                : "border-border/60 bg-card/40 hover:border-primary/25 hover:bg-card/70",
            )}
          >
            <div className="pointer-events-none absolute inset-0 gradient-artwork opacity-40 rounded-2xl" aria-hidden />
            <div className="relative flex flex-col sm:flex-row sm:items-stretch gap-0 sm:gap-0">
              {/* Col index + artwork — stile “riga album” */}
              <div className="flex items-center gap-3 p-3 sm:p-4 sm:min-w-[200px] sm:border-r sm:border-border/40">
                <span
                  className={cn(
                    "w-7 text-center text-xs font-mono tabular-nums shrink-0",
                    isActive ? "text-primary font-semibold" : "text-muted-foreground",
                  )}
                >
                  {isActive ? (
                    <span className="inline-flex items-end justify-center gap-0.5 h-4" aria-label={t("searchResultTrackList.nowPlaying")}>
                      <span className="w-0.5 h-2 rounded-full bg-primary animate-wave-bars [animation-delay:0ms]" />
                      <span className="w-0.5 h-3 rounded-full bg-primary animate-wave-bars [animation-delay:120ms]" />
                      <span className="w-0.5 h-2 rounded-full bg-primary animate-wave-bars [animation-delay:240ms]" />
                    </span>
                  ) : (
                    index + 1
                  )}
                </span>
                <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-muted shrink-0 ring-1 ring-border/50 shadow-sm">
                  <img
                    src={song.artwork}
                    alt=""
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:group-hover:scale-100"
                    width={64}
                    height={64}
                  />
                </div>
                <div className="min-w-0 flex-1 sm:hidden">
                  <p className="font-display text-sm font-semibold text-foreground leading-tight line-clamp-2">{song.title}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{song.artist}</p>
                </div>
              </div>

              <div className="flex-1 min-w-0 px-3 pb-3 sm:px-4 sm:py-4 space-y-2 sm:space-y-3 border-t border-border/30 sm:border-t-0">
                <div className="hidden sm:block">
                  <p className="font-display text-base font-semibold text-foreground leading-tight line-clamp-2">{song.title}</p>
                  <p className="text-sm text-muted-foreground font-body truncate mt-0.5">{song.artist}</p>
                  <MetaLine song={song} />
                </div>
                <p className="text-sm text-muted-foreground font-body leading-relaxed line-clamp-3 sm:line-clamp-2">
                  {song.explanation}
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button type="button" size="sm" variant="hero" className="gap-1.5 font-body h-9 rounded-full px-4" onClick={() => onPlayNow(song, index)}>
                    <Play className="w-3.5 h-3.5 shrink-0" />
                    {t("searchResultTrackList.playNow")}
                  </Button>
                  <Button type="button" size="sm" variant="outline" className="gap-1.5 font-body h-9 rounded-full" onClick={() => onAddToQueue(song)}>
                    <ListPlus className="w-3.5 h-3.5 shrink-0" />
                    {t("searchResultTrackList.addToQueue")}
                  </Button>
                  <Button type="button" size="sm" variant="soft" className="gap-1.5 font-body h-9 rounded-full" onClick={() => onPlayNext(song)}>
                    <SkipForward className="w-3.5 h-3.5 shrink-0" />
                    {t("searchResultTrackList.playNext")}
                  </Button>
                  <StreamingLibraryActions
                    spotifyTrackId={spotifyTrackIdFromSong(song)}
                    appleMusicTrackId={song.appleMusicId}
                    compact
                    className="w-full sm:w-auto"
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SearchResultTrackList;
