import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { artworkTintFromId } from "@/lib/artworkTint";
import type { MicroConversation } from "@/services/recentSearchGallery";

interface Props extends MicroConversation {
  className?: string;
}

const MicroConversationCard = ({ displayPrompt, songs, className }: Props) => {
  const tintStyle = songs[0] ? artworkTintFromId(songs[0].id) : undefined;

  return (
    <div
      style={tintStyle}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border/50 transition-all duration-500",
        "bg-gradient-to-br from-card/95 via-card/90 to-background/80 backdrop-blur-xl shadow-elevated",
        "hover:border-primary/35 hover:shadow-glow",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 gradient-artwork opacity-90" aria-hidden />
      <div className="relative p-5 md:p-6 space-y-4">
        {/* Prompt bubble */}
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 border border-primary/20">
            <Search className="w-3 h-3 text-primary" />
          </span>
          <p className="text-sm font-body text-foreground/85 leading-snug italic">
            &ldquo;{displayPrompt}&rdquo;
          </p>
        </div>

        {/* Songs */}
        <div className="space-y-2.5">
          {songs.map((song) => (
            <div key={song.id} className="flex items-center gap-3">
              <img
                src={song.artwork}
                alt={`${song.title} by ${song.artist}`}
                className="w-10 h-10 rounded-lg object-cover shrink-0 ring-1 ring-border/40"
                loading="lazy"
                width={40}
                height={40}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-display font-semibold truncate leading-tight">{song.title}</p>
                <p className="text-xs text-muted-foreground font-body truncate">{song.artist}</p>
              </div>
              <span className="text-xs font-body text-primary shrink-0 px-2 py-0.5 rounded-full bg-primary/15 border border-primary/20">
                {song.relevanceScore}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MicroConversationCard;
