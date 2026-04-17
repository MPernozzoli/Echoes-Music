import { Volume2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSpotify } from "@/context/useSpotify";
import { useAppleMusic } from "@/context/useAppleMusic";
import { useStreamingPlaybackMode } from "@/hooks/useStreamingPlaybackMode";
import { AppleMusicEmbed } from "@/components/AppleMusicEmbed";
import { AppleMusicKitPlayer } from "@/components/AppleMusicKitPlayer";
import { StreamingLibraryActions } from "@/components/StreamingLibraryActions";
import { cn } from "@/lib/utils";

interface MusicPlayerProps {
  trackTitle: string;
  artistName: string;
  spotifyTrackId?: string;
  appleMusicTrackId?: string;
}

const MusicPlayer = ({ trackTitle, artistName, spotifyTrackId, appleMusicTrackId }: MusicPlayerProps) => {
  const { t } = useTranslation();
  const spotify = useSpotify();
  const appleMusic = useAppleMusic();
  const playbackMode = useStreamingPlaybackMode();

  const preferApple = playbackMode === "apple" && !!appleMusicTrackId;
  const preferSpotifyEmbed =
    !!spotifyTrackId && (playbackMode === "spotify" || playbackMode === "guest");
  const appleOnlyFallback = !spotifyTrackId && !!appleMusicTrackId;

  const chrome = "surface-player rounded-2xl border border-borderSubtle/50 p-2 md:p-3 shadow-soft mt-3";

  if (preferApple) {
    const useKit = appleMusic.isAuthorized && appleMusic.isAvailable;
    return (
      <div className={cn(chrome, "overflow-hidden")} onClick={(e) => e.stopPropagation()}>
        {useKit ? (
          <AppleMusicKitPlayer
            trackId={appleMusicTrackId!}
            trackKey={`${trackTitle}-${appleMusicTrackId}`}
            compact
          />
        ) : (
          <AppleMusicEmbed trackId={appleMusicTrackId!} trackTitle={trackTitle} height={175} />
        )}
        <StreamingLibraryActions
          spotifyTrackId={spotifyTrackId}
          appleMusicTrackId={appleMusicTrackId}
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
          appleMusicTrackId={appleMusicTrackId}
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
            trackId={appleMusicTrackId!}
            trackKey={`${trackTitle}-${appleMusicTrackId}`}
            compact
          />
        ) : (
          <AppleMusicEmbed trackId={appleMusicTrackId!} trackTitle={trackTitle} height={175} />
        )}
        <StreamingLibraryActions
          spotifyTrackId={spotifyTrackId}
          appleMusicTrackId={appleMusicTrackId}
          className="mt-2"
        />
      </div>
    );
  }

  return null;
};

export default MusicPlayer;
