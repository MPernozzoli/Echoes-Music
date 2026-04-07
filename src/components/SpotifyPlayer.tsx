import { useState } from "react";
import { Play, Pause, Volume2 } from "lucide-react";
import { useSpotify } from "@/context/SpotifyContext";

interface SpotifyPlayerProps {
  trackTitle: string;
  artistName: string;
  spotifyUrl?: string;
}

// Mock Spotify track IDs for demo purposes
const MOCK_TRACK_IDS: Record<string, string> = {
  "The Night We Met": "2QBBhjJEpUzUo7GWQsMiF6",
  "Skinny Love": "3VEx2YOqLj90LcSYMqrHfD",
  "Midnight City": "6GyFP1nfCDB8lbD2bG0Hq9",
  "Holocene": "28SayANFjWJBIMiHQp5Kyd",
  "Retrograde": "1KGi9sZVMeszgZOWivFpxs",
  "Re: Stacks": "3zVU0dsPwluOTMKbLRmsFo",
};

const SpotifyPlayer = ({ trackTitle, artistName, spotifyUrl }: SpotifyPlayerProps) => {
  const { isConnected, isPremium } = useSpotify();
  const [isPlaying, setIsPlaying] = useState(false);

  const trackId = MOCK_TRACK_IDS[trackTitle];

  if (!trackId) return null;

  // Embed player (30s preview, works for everyone)
  return (
    <div className="mt-3" onClick={(e) => e.stopPropagation()}>
      {/* Compact Spotify embed for preview */}
      <iframe
        src={`https://open.spotify.com/embed/track/${trackId}?utm_source=generator&theme=0`}
        width="100%"
        height="80"
        frameBorder="0"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
        className="rounded-xl opacity-90 hover:opacity-100 transition-opacity"
        title={`${trackTitle} by ${artistName}`}
      />

      {/* Premium indicator */}
      {isConnected && isPremium && (
        <p className="text-[10px] text-primary/50 font-body mt-1 flex items-center gap-1">
          <Volume2 className="w-3 h-3" />
          Full playback available
        </p>
      )}
    </div>
  );
};

export default SpotifyPlayer;
