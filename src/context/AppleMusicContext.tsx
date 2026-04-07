/* @refresh skip */
import { createContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useAuth } from "@/context/useAuth";
import { getAppleMusicDeveloperToken } from "@/services/appleMusic";

interface AppleMusicState {
  isAvailable: boolean;
  isAuthorized: boolean;
  developerToken: string | null;
  loading: boolean;
  authorize: () => Promise<void>;
  unauthorize: () => void;
}

export const AppleMusicContext = createContext<AppleMusicState | null>(null);

export const AppleMusicProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [isAvailable, setIsAvailable] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [developerToken, setDeveloperToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initMusicKit();
  }, []);

  const initMusicKit = async () => {
    setLoading(true);
    try {
      const token = await getAppleMusicDeveloperToken();
      if (!token) {
        setLoading(false);
        return;
      }
      setDeveloperToken(token);

      // Wait for MusicKit JS to be available
      if (!(window as any).MusicKit) {
        await new Promise<void>((resolve) => {
          document.addEventListener("musickitloaded", () => resolve(), { once: true });
          // Timeout after 5s
          setTimeout(resolve, 5000);
        });
      }

      if ((window as any).MusicKit) {
        const mk = (window as any).MusicKit;
        await mk.configure({
          developerToken: token,
          app: { name: "Echoes", build: "1.0.0" },
          persist: true,
        });
        setIsAvailable(true);

        // Check if already authorized
        const instance = mk.getInstance();
        if (instance.isAuthorized) {
          setIsAuthorized(true);
        }
      }
    } catch (err) {
      console.error("MusicKit init error:", err);
    }
    setLoading(false);
  };

  const authorize = useCallback(async () => {
    if (!user) {
      window.location.assign("/auth");
      return;
    }
    try {
      const mk = (window as any).MusicKit?.getInstance();
      if (mk) {
        await mk.authorize();
        setIsAuthorized(true);
      }
    } catch (err) {
      console.error("MusicKit authorize error:", err);
    }
  }, [user]);

  const unauthorize = useCallback(() => {
    try {
      const mk = (window as any).MusicKit?.getInstance();
      if (mk) {
        mk.unauthorize();
        setIsAuthorized(false);
      }
    } catch (err) {
      console.error("MusicKit unauthorize error:", err);
    }
  }, []);

  return (
    <AppleMusicContext.Provider value={{ isAvailable, isAuthorized, developerToken, loading, authorize, unauthorize }}>
      {children}
    </AppleMusicContext.Provider>
  );
};

