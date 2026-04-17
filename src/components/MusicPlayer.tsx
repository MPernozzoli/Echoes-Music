import { useEffect, useReducer, useRef } from "react";
import { Volume2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSpotify } from "@/context/useSpotify";
import { useAppleMusic } from "@/context/useAppleMusic";
import { useApp } from "@/context/useApp";
import { useStreamingPlaybackMode } from "@/hooks/useStreamingPlaybackMode";
import { AppleMusicEmbed } from "@/components/AppleMusicEmbed";
import { AppleMusicKitPlayer } from "@/components/AppleMusicKitPlayer";
import { StreamingLibraryActions } from "@/components/StreamingLibraryActions";
import {
  getResolvedAppleMusic,
  resolveAppleMusicSong,
  subscribeAppleMusicResolution,
} from "@/services/appleMusicEnrichment";
import { cn } from "@/lib/utils";

interface MusicPlayerProps {
  trackTitle: string;
  artistName: string;
  spotifyTrackId?: string;
  appleMusicTrackId?: string;
  /** Usato come chiave per cachare la risoluzione Apple Music (se assente ripiega su title|artist) */
  songId?: string;
}

const MusicPlayer = ({
  trackTitle,
  artistName,
  spotifyTrackId,
  appleMusicTrackId,
  songId,
}: MusicPlayerProps) => {
  const { t } = useTranslation();
  const spotify = useSpotify();
  const appleMusic = useAppleMusic();
  const { descriptionLanguage } = useApp();
  const playbackMode = useStreamingPlaybackMode();
  const applePreferred = appleMusic.isAuthorized || appleMusic.isLinkedAccount;
  const resolverKey = songId ?? `${trackTitle}|${artistName}`;
  const [, force] = useReducer((x: number) => x + 1, 0);
  const attemptedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    return subscribeAppleMusicResolution((id) => {
      if (id === resolverKey) force();
    });
  }, [resolverKey, force]);

  useEffect(() => {
    if (!applePreferred || appleMusicTrackId || !appleMusic.developerToken) return;
    if (attemptedRef.current.has(resolverKey)) return;
    attemptedRef.current.add(resolverKey);
    void resolveAppleMusicSong({
      songId: resolverKey,
      title: trackTitle,
      artist: artistName,
      languageHint: descriptionLanguage,
    });
  }, [applePreferred, appleMusicTrackId, appleMusic.developerToken, resolverKey, trackTitle, artistName, descriptionLanguage]);

  const resolvedAppleId = appleMusicTrackId || getResolvedAppleMusic(resolverKey)?.id || undefined;
  const preferApple = applePreferred && !!resolvedAppleId;
  const preferSpotifyEmbed =
    !!spotifyTrackId && !applePreferred && (playbackMode === "spotify" || playbackMode === "guest");
  const appleOnlyFallback = !spotifyTrackId && !!resolvedAppleId;
  const lastResortSpotify = !preferApple && !preferSpotifyEmbed && !appleOnlyFallback && !!spotifyTrackId;

  const chrome = "surface-player rounded-2xl border border-borderSubtle/50 p-2 md:p-3 shadow-soft mt-3";

  if (preferApple) {
    const useKit = appleMusic.isAuthorized && appleMusic.isAvailable;
    return (
      <div className={cn(chrome, "overflow-hidden")} onClick={(e) => e.stopPropagation()}>
        {useKit ? (
          <AppleMusicKitPlayer
            trackId={resolvedAppleId!}
            trackKey={`${trackTitle}-${resolvedAppleId}`}
            compact
          />
        ) : (
          <AppleMusicEmbed trackId={resolvedAppleId!} trackTitle={trackTitle} height={175} />
        )}
        <StreamingLibraryActions
          spotifyTrackId={spotifyTrackId}
          appleMusicTrackId={resolvedAppleId}
          className="mt-2"
        />
      </div>
    );
  }

  if (preferSpotifyEmbed) {
    return (
      <div className={cn(chrome, "overflow-hidden")} onClick={(e) => e.stopPropagation()}>
        <iframe
          src={`https://open.spotify.com/embed/track/${spotifyTrackId}?utm_source=generator&theme=0`}
          width="100%"
          height="80"
          frameBorder="0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          className="rounded-xl opacity-95 hover:opacity-100 transition-opacity"
          title={`${trackTitle} by ${artistName}`}
        />
        {spotify.isConnected && spotify.isPremium && (
          <p className="text-[10px] text-primary/70 font-body mt-2 flex items-center gap-1">
            <Volume2 className="w-3 h-3 shrink-0" />
            {t("musicPlayer.fullPlaybackAvailable")}
          </p>
        )}
        <StreamingLibraryActions
          spotifyTrackId={spotifyTrackId}
          appleMusicTrackId={resolvedAppleId}
          className="mt-2"
        />
      </div>
    );
  }

  if (appleOnlyFallback) {
    const useKit = appleMusic.isAuthorized && appleMusic.isAvailable;
    return (
      <div className={cn(chrome, "overflow-hidden")} onClick={(e) => e.stopPropagation()}>
        {useKit ? (
          <AppleMusicKitPlayer
            trackId={resolvedAppleId!}
            trackKey={`${trackTitle}-${resolvedAppleId}`}
            compact
          />
        ) : (
          <AppleMusicEmbed trackId={resolvedAppleId!} trackTitle={trackTitle} height={175} />
        )}
        <StreamingLibraryActions
          spotifyTrackId={spotifyTrackId}
          appleMusicTrackId={resolvedAppleId}
          className="mt-2"
        />
      </div>
    );
  }

  if (lastResortSpotify) {
    return (
      <div className={cn(chrome, "overflow-hidden")} onClick={(e) => e.stopPropagation()}>
        <iframe
          src={`https://open.spotify.com/embed/track/${spotifyTrackId}?utm_source=generator&theme=0`}
          width="100%"
          height="80"
          frameBorder="0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          className="rounded-xl opacity-95 hover:opacity-100 transition-opacity"
          title={`${trackTitle} by ${artistName}`}
        />
        <StreamingLibraryActions
          spotifyTrackId={spotifyTrackId}
          appleMusicTrackId={resolvedAppleId}
          className="mt-2"
        />
      </div>
    );
  }

  return null;
};

export default MusicPlayer;
