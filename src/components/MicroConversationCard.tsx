import { ArrowRight, Music2, Search } from "lucide-react";
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
        "group relative overflow-hidden rounded-[1.35rem] border border-border/50 transition-all duration-500",
        "bg-gradient-to-br from-card/95 via-card/88 to-background/80 backdrop-blur-xl shadow-elevated",
        "hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-glow motion-reduce:hover:translate-y-0",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 gradient-artwork opacity-90" aria-hidden />
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" aria-hidden />
      <div className="relative grid gap-5 p-5 md:grid-cols-[minmax(0,0.9fr)_auto_minmax(0,1.25fr)] md:items-center md:p-6">
        <div className="space-y-3">
          <span className="inline-flex items-center gap-2 text-[0.68rem] uppercase tracking-[0.2em] text-primary/80 font-body">
            <Search className="h-3.5 w-3.5" aria-hidden />
            {t("landing.promptLabel")}
          </span>
          <p className="font-display text-lg leading-snug text-foreground md:text-xl">
            &ldquo;{displayPrompt}&rdquo;
          </p>
        </div>

        <div
          className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary md:h-9 md:w-9"
          aria-hidden
        >
          <ArrowRight className="h-4 w-4" />
        </div>

        <div className="space-y-3">
          <span className="inline-flex items-center gap-2 text-[0.68rem] uppercase tracking-[0.2em] text-primary/80 font-body">
            <Music2 className="h-3.5 w-3.5" aria-hidden />
            {t("landing.selectedTrackLabel")}
          </span>
          <div className="flex items-center gap-4">
            <img
              src={selectedSong.artwork}
              alt={`${selectedSong.title} by ${selectedSong.artist}`}
              className="h-20 w-20 rounded-2xl object-cover shrink-0 ring-1 ring-border/40 shadow-lg shadow-background/40 md:h-24 md:w-24"
              loading="lazy"
              width={96}
              height={96}
            />
            <div className="flex-1 min-w-0">
              <div className="mb-2 flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-xl font-semibold leading-tight text-foreground">
                    {selectedSong.title}
                  </p>
                  <p className="truncate text-sm text-muted-foreground font-body">{selectedSong.artist}</p>
                </div>
                <span className="text-xs font-body text-primary shrink-0 px-2.5 py-1 rounded-full bg-primary/15 border border-primary/20">
                  {selectedSong.relevanceScore}%
                </span>
              </div>
              <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground font-body">
                {selectedSong.explanation}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MicroConversationCard;
