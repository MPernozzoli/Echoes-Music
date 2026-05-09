import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { artworkTintFromId } from "@/lib/artworkTint";
import type { MicroConversation } from "@/services/recentSearchGallery";

interface Props extends MicroConversation {
  className?: string;
}

const MicroConversationCard = ({ displayPrompt, songs, className }: Props) => {
  const { t } = useTranslation();
  const selectedSong = songs[0];
  const tintStyle = songs[0] ? artworkTintFromId(songs[0].id) : undefined;

  if (!selectedSong) return null;

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
      <div className="relative grid gap-5 p-5 md:grid-cols-[1fr_auto_1.35fr] md:items-center md:p-6">
        <div className="space-y-2">
          <span className="text-[0.65rem] uppercase tracking-[0.22em] text-primary/80 font-body">
            {t("landing.promptLabel")}
          </span>
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 border border-primary/20">
              <Search className="w-3 h-3 text-primary" />
            </span>
            <p className="text-sm font-body text-foreground/85 leading-snug italic">
              &ldquo;{displayPrompt}&rdquo;
            </p>
          </div>
        </div>

        <div className="hidden h-px w-full bg-border/50 md:block md:h-16 md:w-px" aria-hidden />

        <div className="space-y-2">
          <span className="text-[0.65rem] uppercase tracking-[0.22em] text-primary/80 font-body">
            {t("landing.selectedTrackLabel")}
          </span>
          <div className="flex items-center gap-3">
            <img
              src={selectedSong.artwork}
              alt={`${selectedSong.title} by ${selectedSong.artist}`}
              className="h-14 w-14 rounded-xl object-cover shrink-0 ring-1 ring-border/40"
              loading="lazy"
              width={56}
              height={56}
            />
            <div className="flex-1 min-w-0">
              <p className="text-base font-display font-semibold truncate leading-tight">{selectedSong.title}</p>
              <p className="text-sm text-muted-foreground font-body truncate">{selectedSong.artist}</p>
            </div>
            <span className="text-xs font-body text-primary shrink-0 px-2.5 py-1 rounded-full bg-primary/15 border border-primary/20">
              {selectedSong.relevanceScore}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MicroConversationCard;
