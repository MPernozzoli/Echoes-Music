import { Volume2 } from "lucide-react";
import { useSpotify } from "@/context/SpotifyContext";
import { useAppleMusic } from "@/context/AppleMusicContext";
import { useStreamingPlaybackMode } from "@/hooks/useStreamingPlaybackMode";
import { AppleMusicEmbed } from "@/components/AppleMusicEmbed";

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
    return (
      <div className="mt-3" onClick={(e) => e.stopPropagation()}>
        <AppleMusicEmbed trackId={appleMusicTrackId!} trackTitle={trackTitle} height={175} />
        {appleMusic.isAuthorized && (
          <p className="text-[10px] text-[hsl(350,80%,55%)]/50 font-body mt-1 flex items-center gap-1">
            <Volume2 className="w-3 h-3" />
            Player Apple Music (account connesso)
          </p>
        )}
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
      </div>
    );
  }

  if (appleOnlyFallback) {
    return (
      <div className="mt-3" onClick={(e) => e.stopPropagation()}>
        <AppleMusicEmbed trackId={appleMusicTrackId!} trackTitle={trackTitle} height={175} />
      </div>
    );
  }

  return null;
};

export default MusicPlayer;
