import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Shuffle,
  SkipBack,
  SkipForward,
  Repeat,
  Repeat1,
  Play,
  Pause,
  Mic2,
  ListMusic,
  Maximize2,
  Heart,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { ReactNode } from "react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

/** Glifo tipo AirPlay (fascio verso l’alto + base schermo), allineato allo stile sistema Apple */
function AirPlayIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 4.5 20.25 15H3.75L12 4.5z" />
      <path d="M4.5 16.5h15a1.125 1.125 0 011.125 1.125v1.5A1.125 1.125 0 0119.5 20.25h-15a1.125 1.125 0 01-1.125-1.125v-1.5A1.125 1.125 0 014.5 16.5z" />
    </svg>
  );
}

export type DockRepeatMode = "off" | "all" | "one";

interface PlayerDockChromeProps {
  artworkUrl: string;
  title: string;
  subtitle: string;
  /** Copertina più grande che esce sopra la barra (px oltre il bordo superiore) */
  artworkOverlapClassName?: string;
  onToggleFavorite: () => void;
  isFavorite: boolean;
  libraryButton?: React.ReactNode;
  shuffleOn: boolean;
  onShuffleToggle: () => void;
  repeatMode: DockRepeatMode;
  onRepeatCycle: () => void;
  onPrev: () => void;
  onNext: () => void;
  prevDisabled: boolean;
  nextDisabled: boolean;
  isPlaying: boolean;
  onPlayPause: () => void;
  playDisabled?: boolean;
  currentTime: number;
  duration: number;
  onSeek: (seconds: number) => void;
  seekDisabled?: boolean;
  volume: number;
  isMuted: boolean;
  onVolumeChange: (v: number) => void;
  onMuteToggle: () => void;
  onDetails?: () => void;
  onOpenQueue?: () => void;
  /** Se impostato, sostituisce mic + coda (es. Popover profilo / cronologia / coda) */
  dockPanelActions?: ReactNode;
  /** Safari WebKit: apre il selettore AirPlay (accanto al volume) */
  airPlayOnClick?: () => void;
  /** Mostra mute + slider volume (default true) */
  showVolumeControl?: boolean;
  /** + libreria / playlist prima del cuore */
  trackExtraActions?: ReactNode;
}

function formatDockTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Controlli secondari dock — token tema */
export const DOCK_ICON_BTN =
  "p-2 rounded-full text-muted-foreground hover:text-foreground transition-colors disabled:opacity-25 disabled:pointer-events-none data-[state=open]:text-foreground";

const dockBtn = DOCK_ICON_BTN;

export function PlayerDockChrome({
  artworkUrl,
  title,
  subtitle,
  artworkOverlapClassName = "w-[5.5rem] h-[5.5rem] md:w-24 md:h-24 -translate-y-7",
  onToggleFavorite,
  isFavorite,
  libraryButton,
  shuffleOn,
  onShuffleToggle,
  repeatMode,
  onRepeatCycle,
  onPrev,
  onNext,
  prevDisabled,
  nextDisabled,
  isPlaying,
  onPlayPause,
  playDisabled,
  currentTime,
  duration,
  onSeek,
  seekDisabled,
  volume,
  isMuted,
  onVolumeChange,
  onMuteToggle,
  onDetails,
  onOpenQueue,
  dockPanelActions,
  airPlayOnClick,
  showVolumeControl = true,
  trackExtraActions,
}: PlayerDockChromeProps) {
  const { t } = useTranslation();
  const [volOpen, setVolOpen] = useState(false);
  const maxT = duration > 0 ? duration : 1;

  return (
    <div className="relative w-full rounded-[1.7rem] surface-player text-foreground">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-primary/[0.06] to-transparent rounded-t-[1.7rem]" aria-hidden />
      <div className="relative w-full">
        {/* Spazio per la copertina che esce dalla barra */}
        <div className="h-4 sm:h-5 md:h-6 shrink-0" aria-hidden />

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(220px,32%)_1fr_minmax(200px,28%)] gap-x-6 gap-y-3 items-end px-3 sm:px-4 pb-3 pt-1">
          {/* Sinistra: copertina + testo */}
          <div className="relative flex flex-col justify-end min-w-0 min-h-[3.5rem] pl-[4.25rem] sm:pl-[5rem] md:pl-[7rem] overflow-visible">
            <div
              className={cn(
                "peer absolute left-0 bottom-0 z-10 rounded-xl overflow-hidden shadow-elevated ring-1 ring-border/50 bg-muted",
                "origin-bottom-left cursor-default",
                "transition-[transform,box-shadow] duration-300 ease-out",
                "hover:z-30 hover:scale-[1.08] hover:shadow-glow hover:ring-primary/20",
                "motion-reduce:transition-none motion-reduce:hover:scale-100",
                artworkOverlapClassName,
              )}
              title={title}
            >
              <img src={artworkUrl} alt="" className="w-full h-full object-cover" width={96} height={96} />
            </div>
            <div
              className={cn(
                "min-w-0 transition-transform duration-300 ease-out",
                "peer-hover:translate-x-2 sm:peer-hover:translate-x-3 md:peer-hover:translate-x-4",
                "motion-reduce:transition-none motion-reduce:peer-hover:translate-x-0",
              )}
            >
              <div className="pb-0.5">
                <p className="text-[15px] sm:text-base font-semibold truncate hover:underline cursor-default text-foreground leading-snug font-display">
                  {title}
                </p>
                <p className="text-xs text-muted-foreground truncate mt-0.5 font-body">{subtitle}</p>
              </div>
              <div className="flex items-center gap-1 mt-1.5 -ml-0.5">
                {trackExtraActions}
                {libraryButton ?? (
                  <button
                    type="button"
                    onClick={onToggleFavorite}
                    className={cn(
                      "p-1.5 rounded-full border border-border/70 text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors",
                      isFavorite && "text-primary border-primary/40 bg-primary/5",
                    )}
                    title={isFavorite ? t("player.removeFromFavorites") : t("player.addToFavorites")}
                  >
                    <Heart className={cn("w-3.5 h-3.5", isFavorite && "fill-primary text-primary")} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Centro: controlli + seek */}
          <div className="flex flex-col items-center gap-1.5 justify-end min-w-0 order-first lg:order-none">
            <div className="flex items-center justify-center gap-2 sm:gap-3">
              <button
                type="button"
                className={cn(dockBtn, shuffleOn && "text-primary")}
                onClick={onShuffleToggle}
                title={t("player.shuffle")}
              >
                <Shuffle className="w-4 h-4" />
              </button>
              <button type="button" className={dockBtn} onClick={onPrev} disabled={prevDisabled} title={t("player.previous")}>
                <SkipBack className="w-5 h-5 fill-current" />
              </button>
              <button
                type="button"
                onClick={onPlayPause}
                disabled={playDisabled}
                className="mx-0.5 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:scale-105 active:scale-95 transition-transform disabled:opacity-40 disabled:hover:scale-100 shadow-glow"
                title={isPlaying ? t("player.pause") : t("player.play")}
              >
                {isPlaying ? <Pause className="w-5 h-5" fill="currentColor" /> : <Play className="w-5 h-5 ml-0.5" fill="currentColor" />}
              </button>
              <button type="button" className={dockBtn} onClick={onNext} disabled={nextDisabled} title={t("player.next")}>
                <SkipForward className="w-5 h-5 fill-current" />
              </button>
              <button
                type="button"
                className={cn(dockBtn, repeatMode !== "off" && "text-primary")}
                onClick={onRepeatCycle}
                title={t("player.repeat")}
              >
                {repeatMode === "one" ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex items-center gap-2 w-full max-w-xl px-1 group/seek">
              <span className="text-[11px] text-muted-foreground tabular-nums w-9 text-right shrink-0">{formatDockTime(currentTime)}</span>
              <input
                type="range"
                min={0}
                max={maxT}
                step={0.25}
                value={Math.min(Math.max(0, currentTime), maxT)}
                onChange={(e) => onSeek(Number(e.target.value))}
                disabled={seekDisabled}
                className={cn(
                  "flex-1 h-1 rounded-full appearance-none cursor-pointer accent-primary",
                  "bg-muted-foreground/25",
                  "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-sm",
                  "[&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-150",
                  "group-hover/seek:[&::-webkit-slider-thumb]:scale-110",
                  "[&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0",
                  seekDisabled && "opacity-40 cursor-not-allowed",
                )}
              />
              <span className="text-[11px] text-muted-foreground tabular-nums w-9 shrink-0">{formatDockTime(duration)}</span>
            </div>
          </div>

          {/* Destra */}
          <div className="flex items-center justify-end gap-1 sm:gap-1.5 min-w-0 pb-1">
            {dockPanelActions ?? (
              <>
                {onDetails && (
                  <button type="button" className={dockBtn} onClick={onDetails} title={t("player.detailsLyrics")}>
                    <Mic2 className="w-4 h-4" />
                  </button>
                )}
                {onOpenQueue && (
                  <button type="button" className={dockBtn} onClick={onOpenQueue} title={t("player.queue")}>
                    <ListMusic className="w-4 h-4" />
                  </button>
                )}
              </>
            )}
            {airPlayOnClick ? (
              <button type="button" className={cn(dockBtn, "inline-flex shrink-0")} onClick={airPlayOnClick} title={t("player.airPlay")}>
                <AirPlayIcon className="w-[18px] h-[18px]" />
              </button>
            ) : null}
            {showVolumeControl ? (
              <div
                className="flex items-center gap-1 max-w-[110px] sm:max-w-[140px] shrink min-w-0 group/vol"
                onMouseEnter={() => setVolOpen(true)}
                onMouseLeave={() => setVolOpen(false)}
              >
                <button type="button" className={dockBtn} onClick={onMuteToggle} title={t("player.volume")}>
                  {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <div className={cn("min-w-0 overflow-hidden transition-all w-16 sm:w-0 sm:group-hover/vol:w-24", volOpen && "sm:w-24")}>
                  <Slider
                    value={[isMuted ? 0 : volume]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={(v) => onVolumeChange(v[0])}
                    className="[&_[role=slider]]:h-2.5 [&_[role=slider]]:w-2.5 [&_[role=slider]]:bg-primary [&_[role=slider]]:border-0"
                  />
                </div>
              </div>
            ) : null}
            <button type="button" className={cn(dockBtn, "hidden md:inline-flex")} title={t("player.fullscreenSoon")} disabled>
              <Maximize2 className="w-4 h-4 opacity-40" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
