import { Volume2 } from "lucide-react";
import { useSpotify } from "@/context/useSpotify";
import { useAppleMusic } from "@/context/useAppleMusic";
import { useStreamingPlaybackMode } from "@/hooks/useStreamingPlaybackMode";
import { AppleMusicEmbed } from "@/components/AppleMusicEmbed";
import { AppleMusicKitPlayer } from "@/components/AppleMusicKitPlayer";
import { StreamingLibraryActions } from "@/components/StreamingLibraryActions";

interface MusicPlayerProps {
  trackTitle: string;
  artistName: string;
  spotifyTrackId?: string;
  appleMusicTrackId?: string;
}

const MusicPlayer = ({ trackTitle, artistName, spotifyTrackId, appleMusicTrackId }: MusicPlayerProps) => {
  const spotify = useSpotify();
  const appleMusic = useAppleMusic();
  const playbackMode = useStreamingPlaybackMode();

  const preferApple = playbackMode === "apple" && !!appleMusicTrackId;
  const preferSpotifyEmbed =
    !!spotifyTrackId && (playbackMode === "spotify" || playbackMode === "guest");
  const appleOnlyFallback = !spotifyTrackId && !!appleMusicTrackId;

  if (preferApple) {
    const useKit = appleMusic.isAuthorized && appleMusic.isAvailable;
    return (
      <div className="mt-3" onClick={(e) => e.stopPropagation()}>
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
      <div className="mt-3" onClick={(e) => e.stopPropagation()}>
        <iframe
          src={`https://open.spotify.com/embed/track/${spotifyTrackId}?utm_source=generator&theme=0`}
          width="100%"
          height="80"
          frameBorder="0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          className="rounded-xl opacity-90 hover:opacity-100 transition-opacity"
          title={`${trackTitle} by ${artistName}`}
        />
        {spotify.isConnected && spotify.isPremium && (
          <p className="text-[10px] text-[hsl(141,73%,42%)]/50 font-body mt-1 flex items-center gap-1">
            <Volume2 className="w-3 h-3" />
            Riproduzione completa disponibile
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
      <div className="mt-3" onClick={(e) => e.stopPropagation()}>
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
