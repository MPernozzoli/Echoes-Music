import { useState } from "react";
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
  MonitorSpeaker,
  Maximize2,
  Heart,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

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
  dockPanelActions?: React.ReactNode;
}

function formatDockTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Stile icone allineato a Spotify Web Player */
export const DOCK_ICON_BTN =
  "p-2 rounded-full text-zinc-400 hover:text-white transition-colors disabled:opacity-25 disabled:pointer-events-none data-[state=open]:text-white";

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
}: PlayerDockChromeProps) {
  const [volOpen, setVolOpen] = useState(false);
  const maxT = duration > 0 ? duration : 1;

  return (
    <div className="relative w-full text-zinc-100">
      {/* Spazio per la copertina che esce dalla barra */}
      <div className="h-5 md:h-6 shrink-0" aria-hidden />

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(200px,30%)_1fr_minmax(200px,30%)] gap-x-4 gap-y-3 items-end px-2 sm:px-4 pb-3 pt-1">
        {/* Sinistra: copertina + testo + azioni */}
        <div className="relative flex items-end gap-3 min-w-0 min-h-[3.25rem] pl-[4.75rem] sm:pl-[5.25rem] md:pl-28">
          <div
            className={cn(
              "absolute left-0 bottom-0 rounded-md overflow-hidden shadow-2xl ring-1 ring-white/10 bg-zinc-900",
              artworkOverlapClassName
            )}
          >
            <img src={artworkUrl} alt="" className="w-full h-full object-cover" width={96} height={96} />
          </div>
          <div className="min-w-0 flex-1 pb-0.5">
            <p className="text-sm font-semibold truncate hover:underline cursor-default text-white">{title}</p>
            <p className="text-xs text-zinc-400 truncate">{subtitle}</p>
          </div>
          <div className="flex items-center gap-0.5 shrink-0 pb-1">
            {libraryButton ?? (
              <button
                type="button"
                onClick={onToggleFavorite}
                className={cn(
                  "p-2 rounded-full border border-zinc-600 text-zinc-300 hover:border-zinc-400 hover:text-white transition-colors",
                  isFavorite && "text-primary border-primary/50"
                )}
                title={isFavorite ? "Rimuovi dai preferiti" : "Preferiti"}
              >
                <Heart className={cn("w-4 h-4", isFavorite && "fill-primary text-primary")} />
              </button>
            )}
          </div>
        </div>

        {/* Centro: shuffle, prev, play, next, repeat + barra */}
        <div className="flex flex-col items-center gap-2 justify-end min-w-0 order-first lg:order-none">
          <div className="flex items-center justify-center gap-1 sm:gap-2">
            <button
              type="button"
              className={cn(dockBtn, shuffleOn && "text-[hsl(141,73%,48%)]")}
              onClick={onShuffleToggle}
              title="Shuffle"
            >
              <Shuffle className="w-4 h-4" />
            </button>
            <button type="button" className={dockBtn} onClick={onPrev} disabled={prevDisabled} title="Precedente">
              <SkipBack className="w-5 h-5 fill-current" />
            </button>
            <button
              type="button"
              onClick={onPlayPause}
              disabled={playDisabled}
              className="mx-1 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-transform disabled:opacity-40 disabled:hover:scale-100 shadow-lg"
              title={isPlaying ? "Pausa" : "Play"}
            >
              {isPlaying ? <Pause className="w-5 h-5" fill="currentColor" /> : <Play className="w-5 h-5 ml-0.5" fill="currentColor" />}
            </button>
            <button type="button" className={dockBtn} onClick={onNext} disabled={nextDisabled} title="Successivo">
              <SkipForward className="w-5 h-5 fill-current" />
            </button>
            <button
              type="button"
              className={cn(
                dockBtn,
                repeatMode !== "off" && "text-[hsl(141,73%,48%)]"
              )}
              onClick={onRepeatCycle}
              title="Ripeti"
            >
              {repeatMode === "one" ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
            </button>
          </div>
          <div className="flex items-center gap-2 w-full max-w-xl px-1">
            <span className="text-[11px] text-zinc-500 tabular-nums w-9 text-right shrink-0">{formatDockTime(currentTime)}</span>
            <input
              type="range"
              min={0}
              max={maxT}
              step={0.25}
              value={Math.min(Math.max(0, currentTime), maxT)}
              onChange={(e) => onSeek(Number(e.target.value))}
              disabled={seekDisabled}
              className={cn(
                "flex-1 h-1 rounded-full appearance-none cursor-pointer accent-white bg-zinc-700",
                "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white",
                "[&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0",
                seekDisabled && "opacity-40 cursor-not-allowed"
              )}
            />
            <span className="text-[11px] text-zinc-500 tabular-nums w-9 shrink-0">{formatDockTime(duration)}</span>
          </div>
        </div>

        {/* Destra: pannelli (popover) o mic/coda, connect, volume, fullscreen */}
        <div className="flex items-center justify-end gap-0.5 sm:gap-1 min-w-0 pb-1">
          {dockPanelActions ?? (
            <>
              {onDetails && (
                <button type="button" className={dockBtn} onClick={onDetails} title="Dettagli / testo">
                  <Mic2 className="w-4 h-4" />
                </button>
              )}
              {onOpenQueue && (
                <button type="button" className={dockBtn} onClick={onOpenQueue} title="Coda">
                  <ListMusic className="w-4 h-4" />
                </button>
              )}
            </>
          )}
          <button type="button" className={cn(dockBtn, "hidden sm:inline-flex")} title="Dispositivo (in arrivo)" disabled>
            <MonitorSpeaker className="w-4 h-4 opacity-40" />
          </button>
          <div
            className="hidden sm:flex items-center gap-1 max-w-[140px] group/vol"
            onMouseEnter={() => setVolOpen(true)}
            onMouseLeave={() => setVolOpen(false)}
          >
            <button type="button" className={dockBtn} onClick={onMuteToggle} title="Volume">
              {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <div className={cn("w-0 overflow-hidden transition-all group-hover/vol:w-24", volOpen && "w-24")}>
              <Slider
                value={[isMuted ? 0 : volume]}
                min={0}
                max={100}
                step={1}
                onValueChange={(v) => onVolumeChange(v[0])}
                className="[&_[role=slider]]:h-2.5 [&_[role=slider]]:w-2.5 [&_[role=slider]]:bg-white"
              />
            </div>
          </div>
          <button type="button" className={cn(dockBtn, "hidden md:inline-flex")} title="Schermo intero (in arrivo)" disabled>
            <Maximize2 className="w-4 h-4 opacity-40" />
          </button>
        </div>
      </div>
    </div>
  );
}
