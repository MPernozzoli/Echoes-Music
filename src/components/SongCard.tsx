import { Heart } from "lucide-react";
import { useState } from "react";

interface SongCardProps {
  id: string;
  title: string;
  artist: string;
  album: string;
  artwork: string;
  emotionalTags: string[];
  explanation: string;
  relevanceScore: number;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
  index?: number;
}

const SongCard = ({
  id,
  title,
  artist,
  artwork,
  emotionalTags,
  explanation,
  relevanceScore,
  isFavorite = false,
  onToggleFavorite,
  index = 0,
}: SongCardProps) => {
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <div
      className="group glass-card rounded-2xl p-5 hover:border-primary/20 transition-all duration-500 animate-fade-up"
      style={{ animationDelay: `${index * 100}ms`, animationFillMode: "backwards" }}
    >
      <div className="flex gap-5">
        {/* Artwork */}
        <div className="relative shrink-0 w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden bg-muted">
          {!imgLoaded && <div className="absolute inset-0 animate-pulse-soft bg-muted" />}
          <img
            src={artwork}
            alt={`${title} by ${artist}`}
            className={`w-full h-full object-cover transition-opacity duration-500 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
            onLoad={() => setImgLoaded(true)}
            loading="lazy"
            width={96}
            height={96}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-lg font-semibold text-foreground leading-tight">{title}</h3>
              <p className="text-muted-foreground text-sm mt-0.5">{artist}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-body text-primary font-medium px-2 py-1 rounded-full bg-primary/10">
                {relevanceScore}%
              </span>
              <button
                onClick={() => onToggleFavorite?.(id)}
                className="p-1.5 rounded-full hover:bg-muted transition-colors"
              >
                <Heart
                  className={`w-4 h-4 transition-colors ${
                    isFavorite ? "fill-primary text-primary" : "text-muted-foreground"
                  }`}
                />
              </button>
            </div>
          </div>

          <p className="text-sm text-secondary-foreground/70 mt-2 leading-relaxed line-clamp-2">
            {explanation}
          </p>

          <div className="flex flex-wrap gap-1.5 mt-3">
            {emotionalTags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-2.5 py-0.5 rounded-full bg-emotional-tag/15 text-emotional-tag-foreground/80 font-body cursor-pointer hover:bg-emotional-tag/25 transition-colors"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SongCard;
