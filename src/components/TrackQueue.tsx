import { useEffect, useRef } from "react";
import { Heart } from "lucide-react";
import type { Song } from "@/data/mockData";

interface TrackQueueProps {
  songs: Song[];
  currentIndex: number;
  onSelect: (index: number) => void;
  isFavorite: (id: string) => boolean;
  onToggleFavorite: (id: string) => void;
}

const TrackQueue = ({ songs, currentIndex, onSelect, isFavorite, onToggleFavorite }: TrackQueueProps) => {
  const activeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [currentIndex]);

  return (
    <div className="max-h-[min(50vh,22rem)] overflow-y-auto overflow-x-hidden pr-1 space-y-1 scroll-smooth">
      {songs.map((song, i) => (
        <button
          key={song.id}
          ref={i === currentIndex ? activeRef : undefined}
          onClick={() => onSelect(i)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left group ${
            i === currentIndex
              ? "bg-primary/10 border border-primary/20"
              : "hover:bg-muted/60 border border-transparent"
          }`}
        >
          {/* Position / Now playing indicator */}
          <span className={`text-xs font-body w-5 text-center shrink-0 ${
            i === currentIndex ? "text-primary font-semibold" : "text-muted-foreground"
          }`}>
            {i === currentIndex ? "▶" : i + 1}
          </span>

          {/* Small artwork */}
          <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted shrink-0">
            <img
              src={song.artwork}
              alt={song.title}
              className="w-full h-full object-cover"
              loading="lazy"
              width={40}
              height={40}
            />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-body font-medium truncate ${
              i === currentIndex ? "text-primary" : "text-foreground"
            }`}>
              {song.title}
            </p>
            <p className="text-xs text-muted-foreground font-body truncate">{song.artist}</p>
          </div>

          {/* Score */}
          <span className="text-[10px] font-body text-muted-foreground shrink-0">
            {song.relevanceScore}%
          </span>

          {/* Favorite */}
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(song.id); }}
            className="p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Heart className={`w-3.5 h-3.5 ${
              isFavorite(song.id) ? "fill-primary text-primary" : "text-muted-foreground"
            }`} />
          </button>
        </button>
      ))}
    </div>
  );
};

export default TrackQueue;
