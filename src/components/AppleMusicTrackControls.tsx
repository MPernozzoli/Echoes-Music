import { useState, useEffect, useCallback } from "react";
import { Play, Pause } from "lucide-react";
import { useAppleMusic } from "@/context/AppleMusicContext";

interface AppleMusicTrackControlsProps {
  trackId: string;
  /** Chiave esterna (es. song id) per resettare lo stato quando cambia il brano */
  trackKey?: string;
  compact?: boolean;
}

export function AppleMusicTrackControls({ trackId, trackKey, compact }: AppleMusicTrackControlsProps) {
  const appleMusic = useAppleMusic();
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    setIsPlaying(false);
  }, [trackKey, trackId]);

  useEffect(() => {
    type MK = {
      addEventListener: (ev: string, fn: (e: { state: number }) => void) => void;
      removeEventListener?: (ev: string, fn: (e: { state: number }) => void) => void;
    };
    const mk = (window as unknown as { MusicKit?: { getInstance: () => MK } }).MusicKit?.getInstance();
    if (!mk) return;

    const onPlaybackState = (e: { state: number }) => {
      if (e.state === 0 || e.state === 10) setIsPlaying(false);
    };
    mk.addEventListener("playbackStateDidChange", onPlaybackState);
    return () => mk.removeEventListener?.("playbackStateDidChange", onPlaybackState);
  }, []);

  const handlePlayToggle = useCallback(async () => {
    try {
      const mk = (window as unknown as { MusicKit?: { getInstance: () => { pause: () => Promise<void>; setQueue: (q: { songs: string[] }) => Promise<void>; play: () => Promise<void> } } }).MusicKit?.getInstance();
      if (!mk) return;

      if (isPlaying) {
        await mk.pause();
        setIsPlaying(false);
      } else {
        await mk.setQueue({ songs: [trackId] });
        await mk.play();
        setIsPlaying(true);
      }
    } catch (err) {
      console.error("Apple Music play error:", err);
    }
  }, [isPlaying, trackId]);

  if (!appleMusic.isAvailable) return null;

  if (!appleMusic.isAuthorized) {
    return (
      <div className={`flex items-center gap-2 rounded-xl bg-muted/50 ${compact ? "px-3 py-2" : "px-4 py-3"}`}>
        <Play className={`text-muted-foreground shrink-0 ${compact ? "w-3.5 h-3.5" : "w-4 h-4"}`} />
        <span className={`font-body text-muted-foreground ${compact ? "text-[10px]" : "text-xs"}`}>
          Connetti Apple Music dalle impostazioni per l’ascolto
        </span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        void handlePlayToggle();
      }}
      className={`flex items-center gap-2 w-full rounded-xl bg-[hsl(350,80%,55%)]/10 hover:bg-[hsl(350,80%,55%)]/15 transition-colors ${compact ? "px-3 py-2" : "px-4 py-3"}`}
    >
      {isPlaying ? (
        <Pause className={`text-[hsl(350,80%,55%)] shrink-0 ${compact ? "w-3.5 h-3.5" : "w-4 h-4"}`} />
      ) : (
        <Play className={`text-[hsl(350,80%,55%)] shrink-0 ${compact ? "w-3.5 h-3.5" : "w-4 h-4"}`} />
      )}
      <span className={`font-body text-foreground ${compact ? "text-xs" : "text-sm"}`}>
        {isPlaying ? "Pausa" : "Play"} su Apple Music
      </span>
    </button>
  );
}
