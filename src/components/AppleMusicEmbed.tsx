import { useMemo } from "react";
import { appleMusicEmbedSongUrl } from "@/lib/appleMusicEmbed";

interface AppleMusicEmbedProps {
  trackId: string;
  trackTitle: string;
  height?: number;
  className?: string;
}

export function AppleMusicEmbed({ trackId, trackTitle, height = 175, className }: AppleMusicEmbedProps) {
  const src = useMemo(() => appleMusicEmbedSongUrl(trackId, trackTitle), [trackId, trackTitle]);

  return (
    <iframe
      src={src}
      width="100%"
      height={height}
      frameBorder={0}
      allow="autoplay *; encrypted-media *; fullscreen *; clipboard-write"
      loading="lazy"
      className={className ?? "rounded-xl opacity-90 hover:opacity-100 transition-opacity"}
      title={`${trackTitle} su Apple Music`}
    />
  );
}
