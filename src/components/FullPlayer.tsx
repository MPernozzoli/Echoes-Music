import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, SkipBack, SkipForward, Heart, Volume2, VolumeX, Info } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import type { Song } from "@/data/mockData";
import { useAppleMusic } from "@/context/AppleMusicContext";
import { useStreamingPlaybackMode } from "@/hooks/useStreamingPlaybackMode";
import { AppleMusicTrackControls } from "@/components/AppleMusicTrackControls";

interface FullPlayerProps {
  songs: Song[];
  currentIndex: number;
  onChangeIndex: (index: number) => void;
  isFavorite: (id: string) => boolean;
  onToggleFavorite: (id: string) => void;
  onShowDetails?: () => void;
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
}: FullPlayerProps) => {
  const song = songs[currentIndex];
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [useEmbed, setUseEmbed] = useState(false);
  const appleMusic = useAppleMusic();
  const playbackMode = useStreamingPlaybackMode();

  // Determine playback source
  const previewUrl = song?.previewUrl;
  const spotifyTrackId = song?.spotifyUri?.replace("spotify:track:", "");
  const appleMusicId = song?.appleMusicId;
  const useApplePlayback =
    playbackMode === "apple" && !!appleMusicId && appleMusic.isAvailable;

  // Reset state when song changes
  useEffect(() => {
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
      return;
    }

    if (previewUrl) {
      const audio = new Audio(previewUrl);
      audioRef.current = audio;
      audio.volume = isMuted ? 0 : volume / 100;

      audio.addEventListener("loadedmetadata", () => {
        setDuration(audio.duration);
        setAudioReady(true);
      });
      audio.addEventListener("timeupdate", () => setCurrentTime(audio.currentTime));
      audio.addEventListener("ended", () => handleNext());
      audio.addEventListener("error", () => {
        // Fallback to embed
        setUseEmbed(true);
        setAudioReady(false);
      });

      return () => {
        audio.pause();
        audio.src = "";
      };
    } else {
      // No preview URL, use embed
      setUseEmbed(true);
    }
  }, [song?.id, previewUrl, useApplePlayback]);

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
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
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
    if (currentIndex < songs.length - 1) onChangeIndex(currentIndex + 1);
  }, [currentIndex, songs.length, onChangeIndex]);

  if (!song) return null;

  const fav = isFavorite(song.id);

  return (
    <div className="flex flex-col items-center w-full max-w-lg mx-auto animate-fade-up">
      {/* Artwork */}
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

      {/* Title, artist, favorite */}
      <div className="w-full flex items-center justify-between px-2 mb-1">
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-xl md:text-2xl font-bold text-foreground truncate">
            {song.title}
          </h2>
          <p className="text-muted-foreground font-body text-sm truncate">{song.artist} · {song.album}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {onShowDetails && (
            <button
              onClick={onShowDetails}
              className="p-2 rounded-full hover:bg-muted transition-colors"
              title="Song details"
            >
              <Info className="w-5 h-5 text-muted-foreground" />
            </button>
          )}
          <button
            onClick={() => onToggleFavorite(song.id)}
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            <Heart className={`w-5 h-5 transition-colors ${fav ? "fill-primary text-primary" : "text-muted-foreground"}`} />
          </button>
        </div>
      </div>

      {/* Description (2 lines) */}
      <p className="text-sm text-muted-foreground font-body line-clamp-2 px-2 mb-4 w-full">
        {song.explanation}
      </p>

      {/* Apple Music (utente con MusicKit autorizzato) */}
      {useApplePlayback && appleMusicId && (
        <div className="w-full px-2 mb-4 space-y-3">
          <AppleMusicTrackControls trackId={appleMusicId} trackKey={song.id} />
          <div className="flex items-center justify-center gap-6">
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
          {/* Progress bar */}
          <div className="w-full px-2 mb-2">
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

          {/* Transport controls */}
          <div className="flex items-center gap-6 mb-4">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="p-2 rounded-full text-foreground hover:bg-muted transition-colors disabled:opacity-30"
            >
              <SkipBack className="w-5 h-5" />
            </button>

            <button
              onClick={togglePlay}
              disabled={!audioReady}
              className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:scale-105 active:scale-95 transition-transform disabled:opacity-50"
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
            </button>

            <button
              onClick={handleNext}
              disabled={currentIndex === songs.length - 1}
              className="p-2 rounded-full text-foreground hover:bg-muted transition-colors disabled:opacity-30"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>

          {/* Volume */}
          <div className="flex items-center gap-2 w-32">
            <button
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
              onValueChange={(v) => { setVolume(v[0]); setIsMuted(false); }}
              className="flex-1"
            />
          </div>
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
    </div>
  );
};

export default FullPlayer;
