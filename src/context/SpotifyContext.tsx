/* @refresh skip */
import { createContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useAuth } from "@/context/useAuth";
import { getSpotifyConnection, getSpotifyToken } from "@/services/spotify";

interface SpotifyState {
  isConnected: boolean;
  isPremium: boolean;
  displayName: string | null;
  accessToken: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
  setConnected: (info: { displayName: string; product: string }) => void;
  setDisconnected: () => void;
}

export const SpotifyContext = createContext<SpotifyState | null>(null);

export const SpotifyProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const conn = await getSpotifyConnection();
    if (conn) {
      setIsConnected(true);
      setDisplayName(conn.display_name);
      setIsPremium(conn.product === "premium");

      // Il record DB di `product` può essere stantio (utente che ha fatto upgrade a Premium
      // dopo il primo collegamento). Interroghiamo Spotify /me lato client con l'access token
      // per avere il valore live ed evitare di cadere su preview 30s a un account Premium.
      const token = await getSpotifyToken();
      if (token) {
        setAccessToken(token.access_token);
        try {
          const me = await fetch("https://api.spotify.com/v1/me", {
            headers: { Authorization: `Bearer ${token.access_token}` },
          });
          if (me.ok) {
            const profile = (await me.json()) as { product?: string };
            if (profile.product) setIsPremium(profile.product === "premium");
          }
        } catch {
          /* fallback al valore DB già impostato sopra */
        }
      }
    } else {
      setIsConnected(false);
      setDisplayName(null);
      setIsPremium(false);
      setAccessToken(null);
    }
    setLoading(false);
  }, []);

  const setConnected = useCallback((info: { displayName: string; product: string }) => {
    setIsConnected(true);
    setDisplayName(info.displayName);
    setIsPremium(info.product === "premium");
  }, []);

  const setDisconnected = useCallback(() => {
    setIsConnected(false);
    setDisplayName(null);
    setIsPremium(false);
    setAccessToken(null);
  }, []);

  useEffect(() => { void refresh(); }, [user?.id, refresh]);

  return (
    <SpotifyContext.Provider value={{ isConnected, isPremium, displayName, accessToken, loading, refresh, setConnected, setDisconnected }}>
      {children}
    </SpotifyContext.Provider>
  );
};

