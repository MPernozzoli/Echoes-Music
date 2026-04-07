/* @refresh skip */
import { createContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
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

type MKInstance = {
  isAuthorized: boolean;
  authorize: () => Promise<unknown>;
  unauthorize: () => Promise<unknown> | void;
  addEventListener: (ev: string, fn: () => void) => void;
  removeEventListener: (ev: string, fn: () => void) => void;
};

type MusicKitGlobal = {
  configure: (opts: unknown) => Promise<unknown>;
  getInstance: () => MKInstance;
};

function getMKGlobal(): MusicKitGlobal | undefined {
  return (window as unknown as { MusicKit?: MusicKitGlobal }).MusicKit;
}

/** Attende MusicKit: evento + polling (l’evento può essere già scattato prima del listener). */
function waitForMusicKit(maxMs: number): Promise<boolean> {
  if (getMKGlobal()) return Promise.resolve(true);
  return new Promise((resolve) => {
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      clearInterval(poll);
      document.removeEventListener("musickitloaded", onLoaded);
      resolve(ok);
    };
    const onLoaded = () => finish(!!getMKGlobal());
    document.addEventListener("musickitloaded", onLoaded, { once: true });
    const t0 = Date.now();
    const poll = window.setInterval(() => {
      if (getMKGlobal()) finish(true);
      else if (Date.now() - t0 > maxMs) finish(false);
    }, 50);
  });
}

export const AppleMusicContext = createContext<AppleMusicState | null>(null);

export const AppleMusicProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [isAvailable, setIsAvailable] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [developerToken, setDeveloperToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    let instance: MKInstance | null = null;
    let syncAuth: (() => void) | null = null;
    let removeVisibility: (() => void) | null = null;
    const delayedTimers: number[] = [];

    (async () => {
      setLoading(true);
      try {
        const token = await getAppleMusicDeveloperToken();
        if (cancelledRef.current) return;
        if (!token) {
          setLoading(false);
          return;
        }
        setDeveloperToken(token);

        const ready = await waitForMusicKit(20_000);
        if (cancelledRef.current) return;
        if (!ready) {
          console.warn("MusicKit: script non caricato in tempo");
          setLoading(false);
          return;
        }

        const mk = getMKGlobal();
        if (!mk || cancelledRef.current) {
          setLoading(false);
          return;
        }

        await mk.configure({
          developerToken: token,
          app: { name: "Echoes", build: "1.0.0" },
          persist: true,
        });
        if (cancelledRef.current) return;

        setIsAvailable(true);
        instance = mk.getInstance();

        syncAuth = () => {
          if (cancelledRef.current || !instance) return;
          setIsAuthorized(!!instance.isAuthorized);
        };

        syncAuth();
        instance.addEventListener("authorizationStatusDidChange", syncAuth);

        // Ripristino persistito a volte arriva dopo il primo read
        delayedTimers.push(
          window.setTimeout(syncAuth, 0),
          window.setTimeout(syncAuth, 250),
          window.setTimeout(syncAuth, 1500),
        );

        const onVis = () => {
          if (document.visibilityState === "visible") syncAuth?.();
        };
        document.addEventListener("visibilitychange", onVis);
        removeVisibility = () => document.removeEventListener("visibilitychange", onVis);
      } catch (err) {
        console.error("MusicKit init error:", err);
      }
      if (!cancelledRef.current) setLoading(false);
    })();

    return () => {
      cancelledRef.current = true;
      for (const id of delayedTimers) window.clearTimeout(id);
      if (instance && syncAuth) {
        instance.removeEventListener("authorizationStatusDidChange", syncAuth);
      }
      removeVisibility?.();
    };
  }, []);

  const authorize = useCallback(async () => {
    if (!user) {
      window.location.assign("/auth");
      return;
    }
    try {
      const mk = getMKGlobal()?.getInstance();
      if (mk) {
        await mk.authorize();
        setIsAuthorized(!!mk.isAuthorized);
      }
    } catch (err) {
      console.error("MusicKit authorize error:", err);
    }
  }, [user]);

  const unauthorize = useCallback(() => {
    try {
      const mk = getMKGlobal()?.getInstance();
      if (mk) {
        void mk.unauthorize();
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
