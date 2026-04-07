import { useState, useEffect, useCallback, useRef } from "react";
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
};

function getMK(): MKInstance | undefined {
  return (window as unknown as { MusicKit?: { getInstance: () => MKInstance } }).MusicKit?.getInstance();
}

interface AppleMusicKitPlayerProps {
  trackId: string;
  trackKey?: string;
  /** Titolo mostrato nel layout “full” */
  title?: string;
  artist?: string;
  compact?: boolean;
  onPlaybackStateChange?: (playing: boolean) => void;
  onTrackEnded?: () => void;
  /** Incrementato dal parent per far partire il brano dopo avanzamento coda (>0). */
  queueAutoplayNonce?: number;
  onQueueAutoplayConsumed?: () => void;
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Riproduzione tramite MusicKit: usa developer token + sessione autorizzata in app (nessun re-login).
 */
export function AppleMusicKitPlayer({
  trackId,
  trackKey,
  title,
  artist,
  compact,
  onPlaybackStateChange,
  onTrackEnded,
  queueAutoplayNonce = 0,
  onQueueAutoplayConsumed,
}: AppleMusicKitPlayerProps) {
  const { isAuthorized, isAvailable } = useAppleMusic();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const wasPlayingRef = useRef(false);
  const onEndedRef = useRef(onTrackEnded);
  onEndedRef.current = onTrackEnded;

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
      setCurrentTime(m.currentPlaybackTime);
      setDuration(m.currentPlaybackDuration || 0);
      const ps = (m as unknown as { playbackState?: number }).playbackState;
      if (ps === 2) {
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
    };

    mk.addEventListener("playbackStateDidChange", sync);
    mk.addEventListener("playbackTimeDidChange", sync);
    return () => {
      mk.removeEventListener?.("playbackStateDidChange", sync);
      mk.removeEventListener?.("playbackTimeDidChange", sync);
    };
  }, []);

  useEffect(() => {
    if (queueAutoplayNonce < 1 || !isAuthorized || !isAvailable) return;
    const mk = getMK();
    if (!mk) {
      onQueueAutoplayConsumed?.();
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        await mk.setQueue({ songs: [trackId] });
        await mk.play();
        if (!cancelled) {
          setIsPlaying(true);
          wasPlayingRef.current = true;
        }
      } catch (err) {
        console.error("MusicKit queue autoplay:", err);
      } finally {
        if (!cancelled) onQueueAutoplayConsumed?.();
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

  const handleSeek = useCallback(
    (val: number[]) => {
      const mk = getMK();
      if (!mk?.seekToTime) return;
      mk.seekToTime(val[0]);
      setCurrentTime(val[0]);
    },
    []
  );

  if (!isAvailable || !isAuthorized) return null;

  const canSeek = typeof getMK()?.seekToTime === "function";

  if (compact) {
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
          {isPlaying ? "Pausa" : "Play"} · account Apple Music (nessun nuovo accesso)
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
