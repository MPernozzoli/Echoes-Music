import { useState, useRef, useEffect, useCallback, type ReactNode } from "react";
import { unstable_batchedUpdates } from "react-dom";
import { useTranslation } from "react-i18next";
import { setPlaybackToggleHandler } from "@/lib/playbackToggleBridge";
import { toast } from "sonner";
import { Play, Pause, SkipBack, SkipForward, Heart, Volume2, VolumeX, Info, Youtube } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import type { Song } from "@/data/mockData";
import { useAppleMusic } from "@/context/useAppleMusic";
import { useApp } from "@/context/useApp";
import { useStreamingPlaybackMode } from "@/hooks/useStreamingPlaybackMode";
import { useAppleEnrichedSong } from "@/hooks/useAppleMusicResolution";
import { usePrefetchAppleMusicCatalogIds } from "@/hooks/usePrefetchAppleMusicCatalogIds";
import { isAppleMusicResolutionComplete } from "@/services/appleMusicEnrichment";
import { AppleMusicEmbed } from "@/components/AppleMusicEmbed";
import { AppleMusicKitPlayer, type AppleMusicKitPlayerHandle } from "@/components/AppleMusicKitPlayer";
import { StreamingLibraryActions } from "@/components/StreamingLibraryActions";
import { DockStreamingActions } from "@/components/DockStreamingActions";
import { PlayerDockChrome, type DockRepeatMode } from "@/components/PlayerDockChrome";
import { canUseWebKitAirPlayPicker, isAppleUserAgent, showWebKitAirPlayPicker } from "@/lib/airPlay";
import { artworkTintFromId } from "@/lib/artworkTint";
import { isAppleMusicSessionOrTokenError } from "@/lib/appleMusicKitErrors";
import { cn } from "@/lib/utils";

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
  /** Barra dock: apre il pannello coda */
  onOpenQueue?: () => void;
  /** Barra dock: sostituisce mic/coda con azioni custom (es. Popover) */
  dockPanelActions?: ReactNode;
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
  onOpenQueue,
  dockPanelActions,
}: FullPlayerProps) => {
  const { t } = useTranslation();
  const rawSong = songs[currentIndex];
  const enrichedSong = useAppleEnrichedSong(rawSong);
  const song = enrichedSong ?? rawSong;
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
  const { descriptionLanguage } = useApp();
  const appleMusic = useAppleMusic();
  const applePreferred = appleMusic.isAuthorized || appleMusic.isLinkedAccount;

  const [kitUnavailableSongIds, setKitUnavailableSongIds] = useState<Set<string>>(() => new Set());
  const kitFailedForCurrent = song ? kitUnavailableSongIds.has(song.id) : false;

  // Determine playback source
  const spotifyTrackId = song?.spotifyUri?.replace("spotify:track:", "");
  const appleMusicId = song?.appleMusicId;
  const youtubeMusicUrl =
    song?.youtubeMusicUrl ||
    (song?.youtubeMusicVideoId ? `https://music.youtube.com/watch?v=${encodeURIComponent(song.youtubeMusicVideoId)}` : undefined);
  const appleResolutionComplete = song?.id ? isAppleMusicResolutionComplete(song.id) : false;
  /** Con Apple preferito ma ID ancora in risoluzione: non usare previewUrl (spesso è Spotify) finché non c’è match Apple. */
  const suppressNonApplePreview =
    applePreferred && !appleMusicId && !appleResolutionComplete;
  const previewUrl = suppressNonApplePreview ? undefined : song?.previewUrl;
  const useApplePlayback = applePreferred && !!appleMusicId;
  const appleResolutionPending = applePreferred && !appleMusicId && !appleResolutionComplete;
  const useAppleKitPlayer =
    useApplePlayback &&
    appleMusic.isAuthorized &&
    appleMusic.isAvailable &&
    !kitFailedForCurrent;

  const kitPlayerRef = useRef<AppleMusicKitPlayerHandle>(null);
  const [kitTelemetry, setKitTelemetry] = useState({ current: 0, duration: 0, isPlaying: false });
  const [dockShuffle, setDockShuffle] = useState(false);
  const [dockRepeat, setDockRepeat] = useState<DockRepeatMode>("all");
  const dockRepeatRef = useRef<DockRepeatMode>(dockRepeat);
  dockRepeatRef.current = dockRepeat;

  useEffect(() => {
    setKitTelemetry({ current: 0, duration: 0, isPlaying: false });
  }, [song?.id]);

  useEffect(() => {
    if (!useAppleKitPlayer) setKitAutoplayNonce(0);
  }, [useAppleKitPlayer]);

  usePrefetchAppleMusicCatalogIds(
    songs,
    applePreferred && playbackMode === "apple" && songs.length > 0,
    descriptionLanguage,
  );

  const seekBarAppleResolving = appleResolutionPending && !useAppleKitPlayer;

  /** Autoplay iniziale su MusicKit: bumpa il nonce una sola volta per brano quando autoplay è richiesto */
  const kitAutoplayTriedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!autoplay || !useAppleKitPlayer || !song?.id) return;
    if (kitAutoplayTriedRef.current === song.id) return;
    kitAutoplayTriedRef.current = song.id;
    setKitAutoplayNonce((n) => n + 1);
    onAutoplayConsumed?.();
  }, [autoplay, useAppleKitPlayer, song?.id, onAutoplayConsumed]);

  useEffect(() => {
    if (!isDock || !useAppleKitPlayer) return;
    kitPlayerRef.current?.setVolume(isMuted ? 0 : volume / 100);
  }, [volume, isMuted, isDock, useAppleKitPlayer, song?.id]);

  const handleKitTrackEnded = useCallback(() => {
    const i = indexRef.current;
    const len = songsLenRef.current;
    const repeat = dockRepeatRef.current;
    if (repeat === "one") {
      // Replay same track
      setKitAutoplayNonce((n) => n + 1);
      return;
    }
    if (i < len - 1) {
      unstable_batchedUpdates(() => {
        setKitAutoplayNonce((n) => n + 1);
        onChangeIndexRef.current(i + 1);
      });
    } else if (repeat === "all" && len > 0) {
      unstable_batchedUpdates(() => {
        setKitAutoplayNonce((n) => n + 1);
        onChangeIndexRef.current(0);
      });
    } else {
      playbackCbRef.current?.(false);
    }
  }, []);

  const onKitQueueAutoplayConsumed = useCallback(() => {
    setKitAutoplayNonce(0);
  }, []);

  const handleKitPlaybackError = useCallback(
    async (err: unknown) => {
      if (isAppleMusicSessionOrTokenError(err)) {
        await appleMusic.repairMusicKitSession();
        toast.info(t("player.appleSessionRepaired"), {
          description: err instanceof Error ? err.message : undefined,
        });
        return;
      }
      const sid = songs[indexRef.current]?.id ?? rawSong?.id;
      if (!sid) return;
      setKitUnavailableSongIds((prev) => {
        if (prev.has(sid)) return prev;
        const next = new Set(prev);
        next.add(sid);
        return next;
      });
      toast.info(t("player.appleFallbackToPreview"), {
        description: err instanceof Error ? err.message : undefined,
      });
    },
    [appleMusic, songs, rawSong?.id, t],
  );

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

    // Quando MusicKit gestisce direttamente il brano, niente HTML5: è il Kit Player a suonare.
    if (useAppleKitPlayer) {
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
        const repeat = dockRepeatRef.current;
        if (repeat === "one") {
          // Replay same track from the start
          if (audio) {
            audio.currentTime = 0;
            audio.play().catch(() => {});
          }
          return;
        }
        if (i < len - 1) {
          queueContinueAfterLoad.current = true;
          onChangeIndexRef.current(i + 1);
        } else if (repeat === "all" && len > 0) {
          queueContinueAfterLoad.current = true;
          onChangeIndexRef.current(0);
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
      if (!suppressNonApplePreview) {
        setUseEmbed(true);
      }
    }
  }, [song?.id, previewUrl, useAppleKitPlayer, suppressNonApplePreview]);

  useEffect(() => {
    if (useAppleKitPlayer || useEmbed || !audioReady || !audioRef.current) return;

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
  }, [autoplay, audioReady, useAppleKitPlayer, useEmbed, song?.id, onAutoplayConsumed]);

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
    if (currentIndex < songs.length - 1) {
      queueContinueAfterLoad.current = true;
      setKitAutoplayNonce((n) => n + 1);
      onChangeIndex(currentIndex + 1);
    } else if (dockRepeat === "all" && songs.length > 0) {
      queueContinueAfterLoad.current = true;
      setKitAutoplayNonce((n) => n + 1);
      onChangeIndex(0);
    }
  }, [currentIndex, songs.length, onChangeIndex, dockRepeat]);

  const onDockPlayPause = useCallback(() => {
    const s = song ?? songs[currentIndex];
    if (!s) return;
    const sp = s.spotifyUri?.replace("spotify:track:", "");
    const am = s.appleMusicId;
    const hasInlineAudio = useAppleKitPlayer || (!!s.previewUrl && !useEmbed);
    if (isDock && !hasInlineAudio) {
      // Fallback: niente audio inline nel dock → apri lo streaming esterno (priorità al provider preferito)
      if (useApplePlayback && am) {
        window.open(`https://music.apple.com/us/song/${am}`, "_blank", "noopener,noreferrer");
      } else if (sp) {
        window.open(`https://open.spotify.com/track/${sp}`, "_blank", "noopener,noreferrer");
      } else if (am) {
        window.open(`https://music.apple.com/us/song/${am}`, "_blank", "noopener,noreferrer");
      } else if (s.youtubeMusicUrl || s.youtubeMusicVideoId) {
        const ym =
          s.youtubeMusicUrl ||
          `https://music.youtube.com/watch?v=${encodeURIComponent(s.youtubeMusicVideoId!)}`;
        window.open(ym, "_blank", "noopener,noreferrer");
      }
      return;
    }
    if (useAppleKitPlayer) void kitPlayerRef.current?.togglePlay();
    else void togglePlay();
  }, [
    song,
    songs,
    currentIndex,
    isDock,
    useApplePlayback,
    useEmbed,
    useAppleKitPlayer,
    togglePlay,
  ]);

  const toggleGlobalPlayback = useCallback(() => {
    if (isDock) onDockPlayPause();
    else {
      if (useAppleKitPlayer) void kitPlayerRef.current?.togglePlay();
      else void togglePlay();
    }
  }, [isDock, onDockPlayPause, useAppleKitPlayer, togglePlay]);

  useEffect(() => {
    const s = songs[currentIndex];
    if (!s) {
      setPlaybackToggleHandler(null);
      return;
    }
    setPlaybackToggleHandler(toggleGlobalPlayback);
    return () => setPlaybackToggleHandler(null);
  }, [songs, currentIndex, toggleGlobalPlayback]);

  const dockAirPlayUi = isAppleUserAgent() && canUseWebKitAirPlayPicker();
  const handleDockAirPlay = useCallback(() => {
    const el = audioRef.current;
    if (showWebKitAirPlayPicker(el)) return;
    toast.info(t("player.airPlayHint"));
  }, [t]);

  if (!song) return null;

  const fav = isFavorite(song.id);
  const yearSuffix = song.releaseYear != null ? ` · ${song.releaseYear}` : "";

  const hasInlineAudio = useAppleKitPlayer || (!!previewUrl && !useEmbed);
  const embedOnlyDock = isDock && !hasInlineAudio;

  const openExternalStream = () => {
    if (useApplePlayback && appleMusicId) {
      window.open(`https://music.apple.com/us/song/${appleMusicId}`, "_blank", "noopener,noreferrer");
    } else if (spotifyTrackId) {
      window.open(`https://open.spotify.com/track/${spotifyTrackId}`, "_blank", "noopener,noreferrer");
    } else if (appleMusicId) {
      window.open(`https://music.apple.com/us/song/${appleMusicId}`, "_blank", "noopener,noreferrer");
    } else if (youtubeMusicUrl) {
      window.open(youtubeMusicUrl, "_blank", "noopener,noreferrer");
    }
  };

  const cycleDockRepeat = () => {
    setDockRepeat((r) => (r === "off" ? "all" : r === "all" ? "one" : "off"));
  };

  const onDockSeek = (seconds: number) => {
    if (useAppleKitPlayer) kitPlayerRef.current?.seek(seconds);
    else if (audioRef.current && audioReady) {
      audioRef.current.currentTime = seconds;
      setCurrentTime(seconds);
    }
  };

  const dockSeekDisabled =
    embedOnlyDock ||
    (useAppleKitPlayer ? kitTelemetry.duration <= 0 : !audioReady || duration <= 0);

  const dockPlayDisabled = !embedOnlyDock && !useAppleKitPlayer && !audioReady;

  if (isDock) {
    return (
      <>
        {useAppleKitPlayer && (
          <AppleMusicKitPlayer
            ref={kitPlayerRef}
            chromeMode="none"
            trackId={appleMusicId!}
            trackKey={song.id}
            onTelemetry={setKitTelemetry}
            onPlaybackStateChange={onPlaybackStateChange}
            onTrackEnded={handleKitTrackEnded}
            queueAutoplayNonce={kitAutoplayNonce}
            onQueueAutoplayConsumed={onKitQueueAutoplayConsumed}
            onPlaybackError={handleKitPlaybackError}
          />
        )}
        <div className="w-full">
          <PlayerDockChrome
            artworkUrl={song.artwork}
            title={song.title}
            subtitle={`${song.artist} · ${song.album}${yearSuffix}`}
            artworkOverlapClassName="w-16 h-16 sm:w-[4.75rem] sm:h-[4.75rem] md:w-[5.5rem] md:h-[5.5rem] -translate-y-6 sm:-translate-y-7 md:-translate-y-8"
            isFavorite={fav}
            onToggleFavorite={() => onToggleFavorite(song.id)}
            trackExtraActions={
              <DockStreamingActions spotifyTrackId={spotifyTrackId} appleMusicTrackId={appleMusicId} />
            }
            shuffleOn={dockShuffle}
            onShuffleToggle={() => setDockShuffle((s) => !s)}
            repeatMode={dockRepeat}
            onRepeatCycle={cycleDockRepeat}
            onPrev={handlePrev}
            onNext={handleNext}
            prevDisabled={currentIndex === 0}
            nextDisabled={currentIndex === songs.length - 1 && dockRepeat !== "all"}
            isPlaying={useAppleKitPlayer ? kitTelemetry.isPlaying : isPlaying}
            onPlayPause={onDockPlayPause}
            playDisabled={dockPlayDisabled}
            currentTime={useAppleKitPlayer ? kitTelemetry.current : currentTime}
            duration={useAppleKitPlayer ? kitTelemetry.duration : duration}
            onSeek={onDockSeek}
            seekDisabled={dockSeekDisabled}
            volume={volume}
            isMuted={isMuted}
            onVolumeChange={(v) => {
              setVolume(v);
              setIsMuted(false);
              if (useAppleKitPlayer) kitPlayerRef.current?.setVolume(v / 100);
            }}
            onMuteToggle={() => {
              setIsMuted((m) => {
                const next = !m;
                if (useAppleKitPlayer) kitPlayerRef.current?.setVolume(next ? 0 : volume / 100);
                return next;
              });
            }}
            dockPanelActions={dockPanelActions}
            onDetails={dockPanelActions ? undefined : onShowDetails}
            onOpenQueue={dockPanelActions ? undefined : onOpenQueue}
            airPlayOnClick={dockAirPlayUi ? handleDockAirPlay : undefined}
            seekBarLoading={seekBarAppleResolving}
          />
        </div>
      </>
    );
  }

  return (
    <div style={artworkTintFromId(song.id)} className="relative flex flex-col items-center w-full max-w-lg mx-auto animate-fade-up px-2 pb-6">
      <div className="pointer-events-none absolute inset-x-4 top-0 h-72 rounded-[2rem] gradient-artwork opacity-70 blur-3xl -z-10" aria-hidden />
      <div className="relative w-64 h-64 md:w-72 md:h-72 rounded-3xl overflow-hidden shadow-elevated ring-1 ring-border/45 mb-6 group">
        <img
          src={song.artwork}
          alt={t("player.artworkAlt", { title: song.title, artist: song.artist })}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:group-hover:scale-100"
          width={288}
          height={288}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
      </div>

      <div className="w-full flex items-center justify-between px-2 mb-1">
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-xl md:text-2xl font-bold text-foreground truncate">{song.title}</h2>
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
              title={t("player.songDetails")}
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

      <p className="text-sm text-muted-foreground font-body line-clamp-2 px-2 mb-4 w-full">{song.explanation}</p>

      {useAppleKitPlayer && (
        <AppleMusicKitPlayer
          chromeMode="default"
          trackId={appleMusicId!}
          trackKey={song.id}
          title={song.title}
          artist={song.artist}
          onPlaybackStateChange={onPlaybackStateChange}
          onTrackEnded={handleKitTrackEnded}
          queueAutoplayNonce={kitAutoplayNonce}
          onQueueAutoplayConsumed={onKitQueueAutoplayConsumed}
          onPlaybackError={handleKitPlaybackError}
        />
      )}

      {/* HTML5 preview (in Apple mode usa la preview Apple, altrimenti quella Spotify) */}
      {!useAppleKitPlayer && !useEmbed && (
        <>
          <div className="w-full px-2 mb-2 relative">
            {seekBarAppleResolving ? (
              <div
                className="pointer-events-none absolute left-2 right-2 top-1/2 -translate-y-1/2 h-2 rounded-full bg-secondary overflow-hidden z-[1]"
                aria-hidden
              >
                <div className="absolute inset-y-0 left-0 w-[32%] rounded-full bg-gradient-to-r from-primary/25 via-primary to-primary/25 opacity-90 animate-seek-track-load" />
              </div>
            ) : null}
            <Slider
              value={[currentTime]}
              min={0}
              max={duration || 1}
              step={0.5}
              onValueChange={handleSeek}
              className={cn("w-full relative z-[2]", seekBarAppleResolving && "opacity-40")}
              disabled={!audioReady}
            />
            <div className="flex justify-between mt-1.5">
              <span className="text-xs font-body text-muted-foreground tabular-nums">{formatTime(currentTime)}</span>
              <span className="text-xs font-body text-muted-foreground tabular-nums">{formatTime(duration)}</span>
            </div>
          </div>

          <div className="flex items-center gap-6 mb-4">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="p-2 rounded-full text-foreground hover:bg-muted transition-colors disabled:opacity-30"
            >
              <SkipBack className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={togglePlay}
              disabled={!audioReady}
              className={cn(
                "w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center",
                "shadow-glow hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 disabled:hover:scale-100",
              )}
            >
              {isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-0.5" />}
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={currentIndex === songs.length - 1}
              className="p-2 rounded-full text-foreground hover:bg-muted transition-colors disabled:opacity-30"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>

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

          {useApplePlayback && appleMusicId && (
            <p className="text-[11px] text-muted-foreground/80 font-body mt-1 px-2 text-center">
              {t("player.appleConnectHint")}
            </p>
          )}
        </>
      )}

      {/* Fallback iframe: nessun audio inline. Prima Apple (se preferito / disponibile), poi Spotify. */}
      {!useAppleKitPlayer && useEmbed && appleMusicId && (useApplePlayback || !spotifyTrackId) && (
        <div className="w-full px-2 mt-2 space-y-3">
          <AppleMusicEmbed trackId={appleMusicId} trackTitle={song.title} height={152} />
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

      {!appleResolutionPending && !useAppleKitPlayer && useEmbed && spotifyTrackId && !(appleMusicId && (useApplePlayback || !spotifyTrackId)) && (
        <div className="w-full px-2 mt-2">
          <iframe
            src={`https://open.spotify.com/embed/track/${spotifyTrackId}?utm_source=generator&theme=0`}
            width="100%"
            height="152"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            className="rounded-2xl ring-1 ring-border/40 shadow-soft"
            title={t("player.artworkAlt", { title: song.title, artist: song.artist })}
          />
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

      {appleResolutionPending && (
        <div className="w-full px-2 mt-2">
          <div className="rounded-2xl ring-1 ring-border/40 shadow-soft min-h-[152px] flex items-center justify-center bg-card/60">
            <p className="text-xs text-muted-foreground font-body">{t("profile.loadingMusickit")}</p>
          </div>
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

      {!useAppleKitPlayer && useEmbed && !appleMusicId && !spotifyTrackId && youtubeMusicUrl && (
        <div className="w-full px-2 mt-2 text-center">
          <button
            type="button"
            onClick={openExternalStream}
            className="mx-auto inline-flex items-center justify-center gap-2 rounded-xl border border-borderSubtle/70 bg-muted/40 px-4 py-3 text-sm font-body font-medium text-foreground transition-colors hover:bg-muted/70"
          >
            <Youtube className="h-4 w-4 text-primary" />
            YouTube Music
          </button>
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

      {!useAppleKitPlayer && useEmbed && !appleMusicId && !spotifyTrackId && !youtubeMusicUrl && (
        <div className="w-full px-2 mt-2 text-center">
          <p className="text-xs text-muted-foreground font-body py-4">{t("player.previewUnavailable")}</p>
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

      <StreamingLibraryActions spotifyTrackId={spotifyTrackId} appleMusicTrackId={appleMusicId} className="w-full px-2 mt-2" />
    </div>
  );
};

export default FullPlayer;
