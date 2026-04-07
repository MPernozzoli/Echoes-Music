import { useState } from "react";
import { Heart, ChevronDown, ChevronUp } from "lucide-react";
import MusicPlayer from "./MusicPlayer";
import type { Song } from "@/data/mockData";

interface NowPlayingProps {
  song: Song;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
}

const NowPlaying = ({ song, isFavorite, onToggleFavorite }: NowPlayingProps) => {
  const [showFullExplanation, setShowFullExplanation] = useState(false);

  return (
    <div className="flex flex-col items-center text-center animate-fade-up">
      {/* Large artwork */}
      <div className="relative w-64 h-64 md:w-80 md:h-80 rounded-2xl overflow-hidden shadow-2xl glow-warm mb-8">
        <img
          src={song.artwork}
          alt={`${song.title} by ${song.artist}`}
          className="w-full h-full object-cover"
          width={320}
          height={320}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
      </div>

      {/* Title & Artist */}
      <div className="flex items-center gap-3 mb-2">
        <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground leading-tight">
          {song.title}
        </h2>
        <button
          onClick={() => onToggleFavorite(song.id)}
          className="p-2 rounded-full hover:bg-muted transition-colors"
        >
          <Heart
            className={`w-5 h-5 transition-colors ${
              isFavorite ? "fill-primary text-primary" : "text-muted-foreground"
            }`}
          />
        </button>
      </div>
      <p className="text-muted-foreground font-body text-lg mb-1">{song.artist}</p>
      <p className="text-muted-foreground/50 font-body text-sm mb-4">{song.album}</p>

      {/* Relevance */}
      <span className="text-xs font-body text-primary font-medium px-3 py-1 rounded-full bg-primary/10 mb-4">
        {song.relevanceScore}% match
      </span>

      {/* Emotional tags */}
      <div className="flex flex-wrap justify-center gap-2 mb-4">
        {song.emotionalTags.map((tag) => (
          <span
            key={tag}
            className="text-xs px-3 py-1 rounded-full bg-emotional-tag/15 text-emotional-tag-foreground/80 font-body"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Explanation */}
      <button
        onClick={() => setShowFullExplanation(!showFullExplanation)}
        className="flex items-center gap-1 text-sm text-secondary-foreground/60 hover:text-secondary-foreground/80 transition-colors font-body mb-6 max-w-md"
      >
        <span className={showFullExplanation ? "" : "line-clamp-2"}>
          {song.explanation}
        </span>
        {showFullExplanation ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
      </button>

      {/* Player */}
      <div className="w-full max-w-md">
        <MusicPlayer
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
