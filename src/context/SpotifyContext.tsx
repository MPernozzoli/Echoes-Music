/* @refresh skip */
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
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

const SpotifyContext = createContext<SpotifyState | null>(null);

export const SpotifyProvider = ({ children }: { children: ReactNode }) => {
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

      const token = await getSpotifyToken();
      if (token) setAccessToken(token.access_token);
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

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <SpotifyContext.Provider value={{ isConnected, isPremium, displayName, accessToken, loading, refresh, setConnected, setDisconnected }}>
      {children}
    </SpotifyContext.Provider>
  );
};

export const useSpotify = () => {
  const ctx = useContext(SpotifyContext);
  if (!ctx) throw new Error("useSpotify must be used within SpotifyProvider");
  return ctx;
};
