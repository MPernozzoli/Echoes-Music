import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Play, Pause, SkipBack, SkipForward, Heart, Volume2, VolumeX, Info } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import type { Song } from "@/data/mockData";
import { useAppleMusic } from "@/context/AppleMusicContext";
import { useStreamingPlaybackMode } from "@/hooks/useStreamingPlaybackMode";
import { AppleMusicEmbed } from "@/components/AppleMusicEmbed";
import { AppleMusicKitPlayer } from "@/components/AppleMusicKitPlayer";
import { StreamingLibraryActions } from "@/components/StreamingLibraryActions";

interface FullPlayerProps {
  songs: Song[];
  currentIndex: number;
  onChangeIndex: (index: number) => void;
  isFavorite: (id: string) => boolean;
  onToggleFavorite: (id: string) => void;
  onShowDetails?: () => void;
  /** Tenta play automatico (es. “Sorprendimi”) su preview HTML5 */
  autoplay?: boolean;
  onAutoplayConsumed?: () => void;
  /** desktop: barra compatta in basso */
  variant?: "default" | "dock";
  onPlaybackStateChange?: (playing: boolean) => void;
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const FullPlayer = ({
  songs,
  currentIndex,
  onChangeIndex,
  isFavorite,
  onToggleFavorite,
  onShowDetails,
  autoplay = false,
  onAutoplayConsumed,
  variant = "default",
  onPlaybackStateChange,
}: FullPlayerProps) => {
  const song = songs[currentIndex];
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const autoplayTried = useRef(false);
  const indexRef = useRef(currentIndex);
  const songsLenRef = useRef(songs.length);
  const onChangeIndexRef = useRef(onChangeIndex);
  indexRef.current = currentIndex;
  songsLenRef.current = songs.length;
  onChangeIndexRef.current = onChangeIndex;
  const isDock = variant === "dock";
  const playbackCbRef = useRef(onPlaybackStateChange);
  playbackCbRef.current = onPlaybackStateChange;
  /** Dopo fine brano / avanti: riprendi subito la preview HTML5 sul nuovo indice */
  const queueContinueAfterLoad = useRef(false);
  const [kitAutoplayNonce, setKitAutoplayNonce] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [useEmbed, setUseEmbed] = useState(false);
  const playbackMode = useStreamingPlaybackMode();
  const appleMusic = useAppleMusic();

  // Determine playback source
  const previewUrl = song?.previewUrl;
  const spotifyTrackId = song?.spotifyUri?.replace("spotify:track:", "");
  const appleMusicId = song?.appleMusicId;
  const useApplePlayback = playbackMode === "apple" && !!appleMusicId;
  const useAppleKitPlayer =
    useApplePlayback && appleMusic.isAuthorized && appleMusic.isAvailable;

  useEffect(() => {
    if (!useAppleKitPlayer) setKitAutoplayNonce(0);
  }, [useAppleKitPlayer]);

  const handleKitTrackEnded = useCallback(() => {
    const i = indexRef.current;
    const len = songsLenRef.current;
    if (i >= len - 1) {
      playbackCbRef.current?.(false);
      return;
    }
    setKitAutoplayNonce((n) => n + 1);
    onChangeIndexRef.current(i + 1);
  }, []);

  const onKitQueueAutoplayConsumed = useCallback(() => {
    setKitAutoplayNonce(0);
  }, []);

  // Reset state when song changes
  useEffect(() => {
    autoplayTried.current = false;
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setAudioReady(false);
    setUseEmbed(false);

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }

    if (useApplePlayback) {
      queueContinueAfterLoad.current = false;
      return;
    }

    if (previewUrl) {
      const audio = new Audio(previewUrl);
      audioRef.current = audio;
      audio.volume = isMuted ? 0 : volume / 100;

      const onPlay = () => playbackCbRef.current?.(true);
      const onPause = () => playbackCbRef.current?.(false);
      const onEnded = () => {
        const i = indexRef.current;
        const len = songsLenRef.current;
        if (i < len - 1) {
          queueContinueAfterLoad.current = true;
          onChangeIndexRef.current(i + 1);
        } else {
          playbackCbRef.current?.(false);
        }
      };

      audio.addEventListener("loadedmetadata", () => {
        setDuration(audio.duration);
        setAudioReady(true);
      });
      audio.addEventListener("timeupdate", () => setCurrentTime(audio.currentTime));
      audio.addEventListener("ended", onEnded);
      audio.addEventListener("play", onPlay);
      audio.addEventListener("pause", onPause);
      audio.addEventListener("error", () => {
        // Fallback to embed
        setUseEmbed(true);
        setAudioReady(false);
      });

      return () => {
        audio.removeEventListener("play", onPlay);
        audio.removeEventListener("pause", onPause);
        audio.removeEventListener("ended", onEnded);
        audio.pause();
        audio.src = "";
      };
    } else {
      queueContinueAfterLoad.current = false;
      setUseEmbed(true);
    }
  }, [song?.id, previewUrl, useApplePlayback]);

  useEffect(() => {
    if (useApplePlayback || useEmbed || !audioReady || !audioRef.current) return;

    if (queueContinueAfterLoad.current) {
      queueContinueAfterLoad.current = false;
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          playbackCbRef.current?.(true);
        })
        .catch(() => {});
      return;
    }

    if (!autoplay || autoplayTried.current) return;
    autoplayTried.current = true;
    audioRef.current
      .play()
      .then(() => {
        setIsPlaying(true);
        playbackCbRef.current?.(true);
        onAutoplayConsumed?.();
      })
      .catch(() => {
        onAutoplayConsumed?.();
      });
  }, [autoplay, audioReady, useApplePlayback, useEmbed, song?.id, onAutoplayConsumed]);

  // Volume sync
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume / 100;
    }
  }, [volume, isMuted]);

  const togglePlay = useCallback(() => {
    if (!audioRef.current || !audioReady) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      playbackCbRef.current?.(false);
    } else {
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          playbackCbRef.current?.(true);
        })
        .catch(() => {});
    }
  }, [isPlaying, audioReady]);

  const handleSeek = useCallback((val: number[]) => {
    if (audioRef.current && audioReady) {
      audioRef.current.currentTime = val[0];
      setCurrentTime(val[0]);
    }
  }, [audioReady]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) onChangeIndex(currentIndex - 1);
  }, [currentIndex, onChangeIndex]);

  const handleNext = useCallback(() => {
    if (currentIndex >= songs.length - 1) return;
    queueContinueAfterLoad.current = true;
    setKitAutoplayNonce((n) => n + 1);
    onChangeIndex(currentIndex + 1);
  }, [currentIndex, songs.length, onChangeIndex]);

  if (!song) return null;

  const fav = isFavorite(song.id);
  const yearSuffix = song.releaseYear != null ? ` · ${song.releaseYear}` : "";

  return (
    <div
      className={cn(
        isDock
          ? "w-full flex flex-col gap-2"
          : "flex flex-col items-center w-full max-w-lg mx-auto animate-fade-up"
      )}
    >
      {!isDock && (
        <div className="relative w-64 h-64 md:w-72 md:h-72 rounded-2xl overflow-hidden shadow-2xl mb-6 group">
          <img
            src={song.artwork}
            alt={`${song.title} by ${song.artist}`}
            className="w-full h-full object-cover"
            width={288}
            height={288}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent" />
        </div>
      )}

      {isDock && (
        <div className="flex items-center gap-3 w-full min-w-0">
          <img
            src={song.artwork}
            alt=""
            className="w-14 h-14 rounded-lg object-cover shrink-0 bg-muted"
            width={56}
            height={56}
          />
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-sm font-bold text-foreground truncate">{song.title}</h2>
            <p className="text-muted-foreground font-body text-xs truncate">
              {song.artist} · {song.album}
              {yearSuffix}
            </p>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            {onShowDetails && (
              <button
                type="button"
                onClick={onShowDetails}
                className="p-2 rounded-full hover:bg-muted transition-colors"
                title="Dettagli"
              >
                <Info className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
            <button
              type="button"
              onClick={() => onToggleFavorite(song.id)}
              className="p-2 rounded-full hover:bg-muted transition-colors"
            >
              <Heart className={`w-4 h-4 transition-colors ${fav ? "fill-primary text-primary" : "text-muted-foreground"}`} />
            </button>
          </div>
        </div>
      )}

      {!isDock && (
        <div className="w-full flex items-center justify-between px-2 mb-1">
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-xl md:text-2xl font-bold text-foreground truncate">
              {song.title}
            </h2>
            <p className="text-muted-foreground font-body text-sm truncate">
              {song.artist} · {song.album}
              {yearSuffix}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {onShowDetails && (
              <button
                type="button"
                onClick={onShowDetails}
                className="p-2 rounded-full hover:bg-muted transition-colors"
                title="Song details"
              >
                <Info className="w-5 h-5 text-muted-foreground" />
              </button>
            )}
            <button
              type="button"
              onClick={() => onToggleFavorite(song.id)}
              className="p-2 rounded-full hover:bg-muted transition-colors"
            >
              <Heart className={`w-5 h-5 transition-colors ${fav ? "fill-primary text-primary" : "text-muted-foreground"}`} />
            </button>
          </div>
        </div>
      )}

      {!isDock && (
        <p className="text-sm text-muted-foreground font-body line-clamp-2 px-2 mb-4 w-full">
          {song.explanation}
        </p>
      )}
      {isDock && (
        <p className="text-xs text-muted-foreground font-body line-clamp-2 w-full -mt-1">
          {song.explanation}
        </p>
      )}

      {/* Apple Music: MusicKit se connesso in app (stessi token), altrimenti embed Apple */}
      {useApplePlayback && appleMusicId && (
        <div className={cn("w-full px-2 mb-4 space-y-3", isDock && "mb-2 px-0")}>
          {appleMusic.isAuthorized && appleMusic.isAvailable ? (
            <AppleMusicKitPlayer
              trackId={appleMusicId}
              trackKey={song.id}
              title={song.title}
              artist={song.artist}
              compact={isDock}
              onPlaybackStateChange={onPlaybackStateChange}
              onTrackEnded={handleKitTrackEnded}
              queueAutoplayNonce={kitAutoplayNonce}
              onQueueAutoplayConsumed={onKitQueueAutoplayConsumed}
            />
          ) : (
            <AppleMusicEmbed trackId={appleMusicId} trackTitle={song.title} height={isDock ? 120 : 152} />
          )}
          <div className={cn("flex items-center justify-center gap-6", isDock && "gap-4")}>
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="p-2 rounded-full text-foreground hover:bg-muted transition-colors disabled:opacity-30"
            >
              <SkipBack className="w-5 h-5" />
            </button>
            <button
              onClick={handleNext}
              disabled={currentIndex === songs.length - 1}
              className="p-2 rounded-full text-foreground hover:bg-muted transition-colors disabled:opacity-30"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Native audio controls */}
      {!useApplePlayback && !useEmbed && (
        <>
          <div className={cn("w-full px-2 mb-2", isDock && "px-0 mb-1")}>
            <Slider
              value={[currentTime]}
              min={0}
              max={duration || 1}
              step={0.5}
              onValueChange={handleSeek}
              className="w-full"
              disabled={!audioReady}
            />
            <div className="flex justify-between mt-1">
              <span className="text-[10px] font-body text-muted-foreground tabular-nums">
                {formatTime(currentTime)}
              </span>
              <span className="text-[10px] font-body text-muted-foreground tabular-nums">
                {formatTime(duration)}
              </span>
            </div>
          </div>

          <div className={cn("flex items-center gap-6 mb-4", isDock && "gap-4 mb-0 justify-center")}>
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="p-2 rounded-full text-foreground hover:bg-muted transition-colors disabled:opacity-30"
            >
              <SkipBack className={cn(isDock ? "w-4 h-4" : "w-5 h-5")} />
            </button>

            <button
              type="button"
              onClick={togglePlay}
              disabled={!audioReady}
              className={cn(
                "rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:scale-105 active:scale-95 transition-transform disabled:opacity-50",
                isDock ? "w-11 h-11" : "w-14 h-14"
              )}
            >
              {isPlaying ? (
                <Pause className={cn(isDock ? "w-5 h-5" : "w-6 h-6")} />
              ) : (
                <Play className={cn(isDock ? "w-5 h-5 ml-0.5" : "w-6 h-6 ml-0.5")} />
              )}
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={currentIndex === songs.length - 1}
              className="p-2 rounded-full text-foreground hover:bg-muted transition-colors disabled:opacity-30"
            >
              <SkipForward className={cn(isDock ? "w-4 h-4" : "w-5 h-5")} />
            </button>
          </div>

          {!isDock && (
            <div className="flex items-center gap-2 w-32">
              <button
                type="button"
                onClick={() => setIsMuted(!isMuted)}
                className="p-1 rounded-full text-muted-foreground hover:text-foreground transition-colors"
              >
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <Slider
                value={[isMuted ? 0 : volume]}
                min={0}
                max={100}
                step={1}
                onValueChange={(v) => {
                  setVolume(v[0]);
                  setIsMuted(false);
                }}
                className="flex-1"
              />
            </div>
          )}
        </>
      )}

      {/* Fallback: Spotify embed (ospite o account Spotify) */}
      {!useApplePlayback && useEmbed && spotifyTrackId && (
        <div className="w-full px-2 mt-2">
          <iframe
            src={`https://open.spotify.com/embed/track/${spotifyTrackId}?utm_source=generator&theme=0`}
            width="100%"
            height="152"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            className="rounded-xl"
            title={`${song.title} by ${song.artist}`}
          />
          {/* Still show prev/next */}
          <div className="flex items-center justify-center gap-6 mt-3">
            <button onClick={handlePrev} disabled={currentIndex === 0} className="p-2 rounded-full text-foreground hover:bg-muted transition-colors disabled:opacity-30">
              <SkipBack className="w-5 h-5" />
            </button>
            <button onClick={handleNext} disabled={currentIndex === songs.length - 1} className="p-2 rounded-full text-foreground hover:bg-muted transition-colors disabled:opacity-30">
              <SkipForward className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Fallback: no preview and no spotify */}
      {!useApplePlayback && useEmbed && !spotifyTrackId && (
        <div className="w-full px-2 mt-2 text-center">
          <p className="text-xs text-muted-foreground font-body py-4">
            Preview not available for this track
          </p>
          <div className="flex items-center justify-center gap-6">
            <button onClick={handlePrev} disabled={currentIndex === 0} className="p-2 rounded-full text-foreground hover:bg-muted transition-colors disabled:opacity-30">
              <SkipBack className="w-5 h-5" />
            </button>
            <button onClick={handleNext} disabled={currentIndex === songs.length - 1} className="p-2 rounded-full text-foreground hover:bg-muted transition-colors disabled:opacity-30">
              <SkipForward className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      <StreamingLibraryActions
        spotifyTrackId={spotifyTrackId}
        appleMusicTrackId={appleMusicId}
        className={cn("w-full px-2 mt-2", isDock && "px-0")}
        compact={isDock}
      />
    </div>
  );
};

export default FullPlayer;
