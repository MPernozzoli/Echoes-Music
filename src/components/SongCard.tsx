import { Heart, Play } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import ResultFeedback from "./ResultFeedback";
import MusicPlayer from "./MusicPlayer";
import { trackInteraction } from "@/services/tracking";
import { artworkTintFromId } from "@/lib/artworkTint";
import { cn } from "@/lib/utils";

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
  searchResultId?: string;
  searchId?: string;
  onTagClick?: (tag: string) => void;
  showPlayer?: boolean;
  spotifyUri?: string;
  appleMusicId?: string;
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
  searchResultId,
  searchId,
  onTagClick,
  showPlayer = true,
  spotifyUri,
  appleMusicId,
}: SongCardProps) => {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const impressionTracked = useRef(false);
  const tintStyle = artworkTintFromId(id);

  useEffect(() => {
    if (!searchResultId || !searchId || impressionTracked.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !impressionTracked.current) {
          impressionTracked.current = true;
          trackInteraction({ searchResultId, searchId, interactionType: "impression" });
        }
      },
      { threshold: 0.5 },
    );
    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [searchResultId, searchId]);

  const handleClick = () => {
    if (searchResultId && searchId) {
      trackInteraction({ searchResultId, searchId, interactionType: "click" });
    }
  };

  const handleExpand = () => {
    setExpanded(!expanded);
    if (!expanded && searchResultId && searchId) {
      trackInteraction({ searchResultId, searchId, interactionType: "expand_explanation" });
    }
  };

  const handleFavorite = () => {
    onToggleFavorite?.(id);
    if (searchResultId && searchId) {
      trackInteraction({
        searchResultId,
        searchId,
        interactionType: isFavorite ? "unfavorite" : "favorite",
      });
    }
  };

  return (
    <div
      ref={cardRef}
      onClick={handleClick}
      style={{ ...tintStyle, animationDelay: `${index * 100}ms`, animationFillMode: "backwards" }}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border/50 transition-all duration-500 animate-fade-up",
        "bg-gradient-to-br from-card/95 via-card/90 to-background/80 backdrop-blur-xl shadow-elevated",
        "hover:border-primary/35 hover:shadow-glow"
      )}
    >
      <div className="pointer-events-none absolute inset-0 gradient-artwork opacity-90" aria-hidden />
      <div className="relative p-5 md:p-6">
        <div className="flex flex-col sm:flex-row gap-5">
          {/* Artwork + hover play */}
          <div className="relative shrink-0 mx-auto sm:mx-0 w-32 h-32 md:w-36 md:h-36 rounded-2xl overflow-hidden bg-muted shadow-lg ring-1 ring-border/40">
            {!imgLoaded && <div className="absolute inset-0 animate-pulse-soft bg-muted" />}
            <img
              src={artwork}
              alt={`${title} by ${artist}`}
              className={cn(
                "w-full h-full object-cover transition-all duration-500",
                imgLoaded ? "opacity-100" : "opacity-0",
                "group-hover:scale-105 motion-reduce:group-hover:scale-100",
              )}
              onLoad={() => setImgLoaded(true)}
              loading="lazy"
              width={144}
              height={144}
            />
            <div
              className={cn(
                "absolute inset-0 flex items-center justify-center bg-background/50 opacity-0 transition-opacity duration-300",
                "group-hover:opacity-100 motion-reduce:group-hover:opacity-0",
              )}
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow">
                <Play className="h-7 w-7 ml-0.5" fill="currentColor" />
              </span>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-xl font-semibold text-foreground leading-tight">{title}</h3>
                <p className="text-muted-foreground text-sm mt-1 font-body">{artist}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-body text-primary font-medium px-2.5 py-1 rounded-full bg-primary/15 border border-primary/20">
                  {relevanceScore}%
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFavorite();
                  }}
                  className="p-2 rounded-full hover:bg-muted/80 transition-colors"
                  aria-label={isFavorite ? "Remove favorite" : "Add favorite"}
                >
                  <Heart
                    className={cn(
                      "w-4 h-4 transition-colors",
                      isFavorite ? "fill-primary text-primary" : "text-muted-foreground",
                    )}
                  />
                </button>
              </div>
            </div>

            <button type="button" onClick={(e) => { e.stopPropagation(); handleExpand(); }} className="text-left w-full">
              <p
                className={cn(
                  "text-sm text-muted-foreground mt-3 leading-relaxed font-body",
                  expanded ? "" : "line-clamp-2",
                )}
              >
                {explanation}
              </p>
            </button>

            <div className="flex flex-wrap gap-2 mt-4">
              {emotionalTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTagClick?.(tag);
                  }}
                  className="text-xs px-3 py-1 rounded-full bg-emotional-tag/20 text-emotional-tag-foreground/90 font-body border border-emotional-tag/25 cursor-pointer hover:bg-emotional-tag/30 transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>

            {showPlayer && (
              <MusicPlayer
                songId={id}
                trackTitle={title}
                artistName={artist}
                spotifyTrackId={spotifyUri?.replace("spotify:track:", "")}
                appleMusicTrackId={appleMusicId}
              />
            )}

            {searchResultId && searchId && (
              <div className="mt-4 pt-3 border-t border-border/40">
                <ResultFeedback searchResultId={searchResultId} searchId={searchId} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SongCard;
