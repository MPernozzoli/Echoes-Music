import { useSpotify } from "@/context/SpotifyContext";
import { useAppleMusic } from "@/context/AppleMusicContext";

/** Servizio da usare per la riproduzione in base al login. */
export type StreamingPlaybackMode = "apple" | "spotify" | "guest";

/**
 * Apple Music se l’utente ha autorizzato MusicKit; altrimenti Spotify se connesso; altrimenti ospite (es. embed Spotify free).
 */
export function useStreamingPlaybackMode(): StreamingPlaybackMode {
  const { isAuthorized } = useAppleMusic();
  const { isConnected } = useSpotify();
  if (isAuthorized) return "apple";
  if (isConnected) return "spotify";
  return "guest";
}
