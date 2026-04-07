import { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from "react";
import { useTranslation } from "react-i18next";
import { Play, Pause } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { useAppleMusic } from "@/context/AppleMusicContext";

type MKInstance = {
  pause: () => Promise<void>;
  play: () => Promise<void>;
  setQueue: (q: { songs: string[] }) => Promise<void>;
  addEventListener: (ev: string, fn: (...args: unknown[]) => void) => void;
  removeEventListener?: (ev: string, fn: (...args: unknown[]) => void) => void;
  currentPlaybackTime: number;
  currentPlaybackDuration: number;
  seekToTime?: (t: number) => void;
  volume?: number;
};

function getMK(): MKInstance | undefined {
  return (window as unknown as { MusicKit?: { getInstance: () => MKInstance } }).MusicKit?.getInstance();
}

export interface AppleMusicKitTelemetry {
  current: number;
  duration: number;
  isPlaying: boolean;
}

export interface AppleMusicKitPlayerHandle {
  togglePlay: () => Promise<void>;
  seek: (seconds: number) => void;
  setVolume: (n01: number) => void;
}

interface AppleMusicKitPlayerProps {
  trackId: string;
  trackKey?: string;
  title?: string;
  artist?: string;
  compact?: boolean;
  /** default | compact da `compact` | none = solo motore (dock) */
  chromeMode?: "default" | "compact" | "none";
  onPlaybackStateChange?: (playing: boolean) => void;
  onTrackEnded?: () => void;
  queueAutoplayNonce?: number;
  onQueueAutoplayConsumed?: () => void;
  /** Throttled (~120ms) per UI esterna (barra dock) */
  onTelemetry?: (t: AppleMusicKitTelemetry) => void;
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export const AppleMusicKitPlayer = forwardRef<AppleMusicKitPlayerHandle, AppleMusicKitPlayerProps>(
  function AppleMusicKitPlayer(
    {
      trackId,
      trackKey,
      title,
      artist,
      compact,
      chromeMode: chromeModeProp,
      onPlaybackStateChange,
      onTrackEnded,
      queueAutoplayNonce = 0,
      onQueueAutoplayConsumed,
      onTelemetry,
    },
    ref
  ) {
    const { t } = useTranslation();
    const { isAuthorized, isAvailable } = useAppleMusic();
    const resolvedMode = chromeModeProp ?? (compact ? "compact" : "default");
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const wasPlayingRef = useRef(false);
    const onEndedRef = useRef(onTrackEnded);
    onEndedRef.current = onTrackEnded;
    const isPlayingRef = useRef(isPlaying);
    isPlayingRef.current = isPlaying;
    const lastTelemetry = useRef(0);
    const onTelemetryRef = useRef(onTelemetry);
    onTelemetryRef.current = onTelemetry;
    /** Ultimo brano applicato a MusicKit (evita doppio play quando il parent azzera solo il nonce) */
    const lastSyncedItemKeyRef = useRef<string | null>(null);

    useImperativeHandle(
      ref,
      () => ({
        togglePlay: async () => {
          const mk = getMK();
          if (!mk) return;
          try {
            if (isPlayingRef.current) {
              await mk.pause();
              setIsPlaying(false);
            } else {
              await mk.setQueue({ songs: [trackId] });
              await mk.play();
              setIsPlaying(true);
              setDuration(mk.currentPlaybackDuration || 0);
            }
          } catch (err) {
            console.error("MusicKit togglePlay:", err);
          }
        },
        seek: (seconds: number) => {
          const mk = getMK();
          if (!mk?.seekToTime) return;
          mk.seekToTime(seconds);
          setCurrentTime(seconds);
        },
        setVolume: (n01: number) => {
          const mk = getMK();
          if (mk && typeof mk.volume === "number") {
            mk.volume = Math.min(1, Math.max(0, n01));
          }
        },
      }),
      [trackId]
    );

    useEffect(() => {
      onPlaybackStateChange?.(isPlaying);
    }, [isPlaying, onPlaybackStateChange]);

    useEffect(() => {
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      wasPlayingRef.current = false;
    }, [trackKey, trackId]);

    useEffect(() => {
      const mk = getMK();
      if (!mk) return;

      const sync = () => {
        const m = getMK();
        if (!m) return;
        const cur = m.currentPlaybackTime;
        const dur = m.currentPlaybackDuration || 0;
        setCurrentTime(cur);
        setDuration(dur);
        const ps = (m as unknown as { playbackState?: number }).playbackState;
        let playing = false;
        if (ps === 2) {
          playing = true;
          setIsPlaying(true);
          wasPlayingRef.current = true;
        } else if (ps === 0 || ps === 3) {
          setIsPlaying(false);
        } else if (ps === 10) {
          setIsPlaying(false);
          if (wasPlayingRef.current) {
            wasPlayingRef.current = false;
            onEndedRef.current?.();
          }
        }

        if (resolvedMode === "none" && onTelemetryRef.current) {
          const now = Date.now();
          if (now - lastTelemetry.current >= 120) {
            lastTelemetry.current = now;
            onTelemetryRef.current({
              current: cur,
              duration: dur,
              isPlaying: ps === 2,
            });
          }
        }
      };

      mk.addEventListener("playbackStateDidChange", sync);
      mk.addEventListener("playbackTimeDidChange", sync);
      return () => {
        mk.removeEventListener?.("playbackStateDidChange", sync);
        mk.removeEventListener?.("playbackTimeDidChange", sync);
      };
    }, [resolvedMode]);

    // Allinea sempre la coda MusicKit al brano selezionato (coda UI, next/prev, ecc.), non solo quando sale il nonce.
    useEffect(() => {
      if (!isAuthorized || !isAvailable) return;
      const mk = getMK();
      if (!mk) {
        if (queueAutoplayNonce >= 1) onQueueAutoplayConsumed?.();
        return;
      }

      const itemKey = `${trackId}\0${trackKey ?? ""}`;
      const forcePlay = queueAutoplayNonce >= 1;
      const identityChanged = lastSyncedItemKeyRef.current !== itemKey;
      if (!identityChanged && !forcePlay) return;

      let cancelled = false;
      void (async () => {
        try {
          if (identityChanged) {
            const ps = (mk as unknown as { playbackState?: number }).playbackState;
            const mkWasPlaying = ps === 2;
            await mk.setQueue({ songs: [trackId] });
            if (cancelled) return;
            lastSyncedItemKeyRef.current = itemKey;
            if (forcePlay || mkWasPlaying) {
              await mk.play();
              if (!cancelled) {
                setIsPlaying(true);
                wasPlayingRef.current = true;
                setDuration(mk.currentPlaybackDuration || 0);
              }
            }
          } else if (forcePlay) {
            await mk.setQueue({ songs: [trackId] });
            if (cancelled) return;
            await mk.play();
            if (!cancelled) {
              setIsPlaying(true);
              wasPlayingRef.current = true;
              setDuration(mk.currentPlaybackDuration || 0);
            }
          }
        } catch (err) {
          console.error("MusicKit sync queue:", err);
        } finally {
          if (!cancelled && forcePlay) onQueueAutoplayConsumed?.();
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [trackId, trackKey, queueAutoplayNonce, isAuthorized, isAvailable, onQueueAutoplayConsumed]);

    const togglePlay = useCallback(async () => {
      const mk = getMK();
      if (!mk) return;

      try {
        if (isPlaying) {
          await mk.pause();
          setIsPlaying(false);
        } else {
          await mk.setQueue({ songs: [trackId] });
          await mk.play();
          setIsPlaying(true);
          setDuration(mk.currentPlaybackDuration || 0);
        }
      } catch (err) {
        console.error("MusicKit play error:", err);
      }
    }, [isPlaying, trackId]);

    const handleSeek = useCallback((val: number[]) => {
      const mk = getMK();
      if (!mk?.seekToTime) return;
      mk.seekToTime(val[0]);
      setCurrentTime(val[0]);
    }, []);

    if (!isAvailable || !isAuthorized) return null;

    if (resolvedMode === "none") {
      return null;
    }

    const canSeek = typeof getMK()?.seekToTime === "function";

    if (resolvedMode === "compact") {
      return (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            void togglePlay();
          }}
          className="flex items-center gap-2 w-full rounded-xl bg-[hsl(350,80%,55%)]/10 hover:bg-[hsl(350,80%,55%)]/15 transition-colors px-3 py-2"
        >
          {isPlaying ? (
            <Pause className="w-3.5 h-3.5 text-[hsl(350,80%,55%)] shrink-0" />
          ) : (
            <Play className="w-3.5 h-3.5 text-[hsl(350,80%,55%)] shrink-0" />
          )}
          <span className="text-xs font-body text-foreground text-left min-w-0 truncate">
            {t("appleMusic.compactLine", {
              action: isPlaying ? t("player.pause") : t("player.play"),
            })}
          </span>
        </button>
      );
    }

    return (
      <div className="w-full space-y-3" onClick={(e) => e.stopPropagation()}>
        {(title || artist) && (
          <div className="text-center min-w-0 px-1">
            {title && <p className="font-body text-sm font-medium text-foreground truncate">{title}</p>}
            {artist && <p className="text-xs text-muted-foreground truncate">{artist}</p>}
          </div>
        )}
        <div className="px-1">
          <Slider
            value={[currentTime]}
            min={0}
            max={duration > 0 ? duration : 1}
            step={0.5}
            onValueChange={handleSeek}
            disabled={!duration || !canSeek}
            className="w-full"
          />
          <div className="flex justify-between mt-1">
            <span className="text-[10px] font-body text-muted-foreground tabular-nums">{formatTime(currentTime)}</span>
            <span className="text-[10px] font-body text-muted-foreground tabular-nums">{formatTime(duration)}</span>
          </div>
        </div>
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => void togglePlay()}
            className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
          >
            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
          </button>
        </div>
      </div>
    );
  }
);

AppleMusicKitPlayer.displayName = "AppleMusicKitPlayer";
