import { useState } from "react";
import { Play, Pause, Volume2 } from "lucide-react";
import { useSpotify } from "@/context/SpotifyContext";
import { useAppleMusic } from "@/context/AppleMusicContext";

interface MusicPlayerProps {
  trackTitle: string;
  artistName: string;
  spotifyTrackId?: string;
  appleMusicTrackId?: string;
}

const MusicPlayer = ({ trackTitle, artistName, spotifyTrackId, appleMusicTrackId }: MusicPlayerProps) => {
  const spotify = useSpotify();
  const appleMusic = useAppleMusic();
  const [activePlayer, setActivePlayer] = useState<"spotify" | "apple" | null>(null);
  const [isPlayingApple, setIsPlayingApple] = useState(false);

  const hasSpotify = !!spotifyTrackId;
  const hasApple = !!appleMusicTrackId && appleMusic.isAvailable;

  if (!hasSpotify && !hasApple) return null;

  const showBoth = hasSpotify && hasApple;
  const defaultPlayer = activePlayer ?? (hasSpotify ? "spotify" : "apple");

  const handlePlayApple = async () => {
    try {
      const mk = (window as any).MusicKit?.getInstance();
      if (!mk) return;

      if (isPlayingApple) {
        await mk.pause();
        setIsPlayingApple(false);
      } else {
        await mk.setQueue({ songs: [appleMusicTrackId] });
        await mk.play();
        setIsPlayingApple(true);

        mk.addEventListener("playbackStateDidChange", (e: any) => {
          if (e.state === 0 || e.state === 10) setIsPlayingApple(false);
        });
      }
    } catch (err) {
      console.error("Apple Music play error:", err);
    }
  };

  return (
    <div className="mt-3" onClick={(e) => e.stopPropagation()}>
      {showBoth && (
        <div className="flex gap-1 mb-2">
          <button
            onClick={() => setActivePlayer("spotify")}
            className={`text-[10px] px-2 py-0.5 rounded-full font-body transition-colors ${
              defaultPlayer === "spotify"
                ? "bg-[hsl(141,73%,42%)]/15 text-[hsl(141,73%,42%)]"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Spotify
          </button>
          <button
            onClick={() => setActivePlayer("apple")}
            className={`text-[10px] px-2 py-0.5 rounded-full font-body transition-colors ${
              defaultPlayer === "apple"
                ? "bg-[hsl(350,80%,55%)]/15 text-[hsl(350,80%,55%)]"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Apple Music
          </button>
        </div>
      )}

      {/* Spotify embed */}
      {defaultPlayer === "spotify" && spotifyTrackId && (
        <div>
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
              Full playback available
            </p>
          )}
        </div>
      )}

      {/* Apple Music player */}
      {defaultPlayer === "apple" && appleMusicTrackId && (
        <div>
          {appleMusic.isAuthorized ? (
            <button
              onClick={handlePlayApple}
              className="flex items-center gap-2 w-full px-4 py-3 rounded-xl bg-[hsl(350,80%,55%)]/10 hover:bg-[hsl(350,80%,55%)]/15 transition-colors"
            >
              {isPlayingApple ? (
                <Pause className="w-4 h-4 text-[hsl(350,80%,55%)]" />
              ) : (
                <Play className="w-4 h-4 text-[hsl(350,80%,55%)]" />
              )}
              <span className="text-sm font-body text-foreground">
                {isPlayingApple ? "Pause" : "Play"} on Apple Music
              </span>
            </button>
          ) : (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-muted/50">
              <Play className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-body text-muted-foreground">
                Connect Apple Music in Settings for playback
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MusicPlayer;
