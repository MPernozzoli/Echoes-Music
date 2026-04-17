import { useState } from "react";
import { Heart, ChevronDown, ChevronUp } from "lucide-react";
import MusicPlayer from "./MusicPlayer";
import type { Song } from "@/data/mockData";
import { artworkTintFromId } from "@/lib/artworkTint";
import { cn } from "@/lib/utils";

interface NowPlayingProps {
  song: Song;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
}

const NowPlaying = ({ song, isFavorite, onToggleFavorite }: NowPlayingProps) => {
  const [showFullExplanation, setShowFullExplanation] = useState(false);
  const tint = artworkTintFromId(song.id);

  return (
    <div style={tint} className="relative flex flex-col items-center text-center animate-fade-up w-full max-w-lg mx-auto px-2">
      <div className="pointer-events-none absolute inset-x-0 -top-8 bottom-1/2 rounded-[2rem] gradient-artwork opacity-80 blur-2xl" aria-hidden />

      <div className="relative w-64 h-64 md:w-80 md:h-80 rounded-3xl overflow-hidden shadow-elevated ring-1 ring-border/40 mb-8 animate-artwork-float motion-reduce:animate-none">
        <img
          src={song.artwork}
          alt={`${song.title} by ${song.artist}`}
          className="w-full h-full object-cover"
          width={320}
          height={320}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/75 via-background/10 to-transparent" />
      </div>

      <div className="relative flex items-center gap-3 mb-2">
        <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground leading-tight">{song.title}</h2>
        <button
          type="button"
          onClick={() => onToggleFavorite(song.id)}
          className="p-2 rounded-full hover:bg-muted/80 transition-colors border border-transparent hover:border-border/60"
          aria-label={isFavorite ? "Remove favorite" : "Add favorite"}
        >
          <Heart
            className={cn(
              "w-5 h-5 transition-colors",
              isFavorite ? "fill-primary text-primary" : "text-muted-foreground",
            )}
          />
        </button>
      </div>
      <p className="relative text-muted-foreground font-body text-lg mb-1">{song.artist}</p>
      <p className="relative text-muted-foreground/60 font-body text-sm mb-4">{song.album}</p>

      <span className="relative text-xs font-body text-primary font-medium px-3 py-1.5 rounded-full bg-primary/12 border border-primary/20 mb-4">
        {song.relevanceScore}% match
      </span>

      <div className="relative flex flex-wrap justify-center gap-2 mb-4">
        {song.emotionalTags.map((tag) => (
          <span
            key={tag}
            className="text-xs px-3 py-1 rounded-full bg-emotional-tag/20 text-emotional-tag-foreground/90 font-body border border-emotional-tag/25"
          >
            {tag}
          </span>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setShowFullExplanation(!showFullExplanation)}
        className="relative flex items-start gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-body mb-6 max-w-md text-left rounded-xl p-2 -m-2 hover:bg-muted/30"
      >
        <span className={cn("flex-1", showFullExplanation ? "" : "line-clamp-2")}>{song.explanation}</span>
        {showFullExplanation ? (
          <ChevronUp className="w-4 h-4 shrink-0 mt-0.5" />
        ) : (
          <ChevronDown className="w-4 h-4 shrink-0 mt-0.5" />
        )}
      </button>

      <div className="relative w-full max-w-md">
        <MusicPlayer
          songId={song.id}
          trackTitle={song.title}
          artistName={song.artist}
          spotifyTrackId={song.spotifyUri?.replace("spotify:track:", "")}
          appleMusicTrackId={song.appleMusicId}
        />
      </div>
    </div>
  );
};

export default NowPlaying;
