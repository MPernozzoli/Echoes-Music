/* @refresh skip */
import { createContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { useAuth } from "@/context/useAuth";
import { getAppleMusicDeveloperToken } from "@/services/appleMusic";
import {
  deleteAppleMusicConnection,
  getAppleMusicConnection,
  upsertAppleMusicConnection,
} from "@/services/appleMusicConnection";
import {
  clearCachedAppleMusicUserToken,
  getCachedAppleMusicUserToken,
  setCachedAppleMusicUserToken,
} from "@/services/appleMusicSession";

interface AppleMusicState {
  isAvailable: boolean;
  isAuthorized: boolean;
  isLinkedAccount: boolean;
  developerToken: string | null;
  loading: boolean;
  authorize: () => Promise<void>;
  unauthorize: () => void;
  refresh: () => Promise<void>;
  /** Aggiorna developer token + stato MusicKit senza distruggere il provider (tab lunga / JWT vicino alla scadenza). */
  resyncMusicKit: () => Promise<void>;
  /** Dopo errori di play: pulisce cache user token locale e ri-allinea MusicKit (spesso equivale a un nuovo login AM). */
  repairMusicKitSession: () => Promise<void>;
}

type MKInstance = {
  isAuthorized: boolean;
  musicUserToken?: string | null;
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
  const [isLinkedAccount, setIsLinkedAccount] = useState(false);
  const [developerToken, setDeveloperToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const cancelledRef = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);
  /** Evita di azzerare `isAuthorized` mentre la tab è in background: MusicKit spesso svuota temporaneamente il token. */
  const heldAppleSessionRef = useRef(false);
  /** Ultimo developer JWT passato a `MusicKit.configure` — evita `configure` ripetuto che su Web spesso resetta la sessione utente. */
  const developerTokenRef = useRef<string | null>(null);
  const isLinkedAccountRef = useRef(false);

  useEffect(() => {
    developerTokenRef.current = developerToken;
  }, [developerToken]);

  useEffect(() => {
    isLinkedAccountRef.current = isLinkedAccount;
  }, [isLinkedAccount]);

  const clearRuntimeListeners = useCallback(() => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    cancelledRef.current = true;
  }, []);

  /** Legge MusicKit e aggiorna `isAuthorized` senza chiamare `configure` (configure ripetuto = spesso nuovo login Apple). */
  const reconcileAuthorizedFromMusicKit = useCallback(() => {
    if (cancelledRef.current) return;
    const mk = getMKGlobal();
    if (!mk) return;
    const inst = mk.getInstance();
    const liveToken = inst.musicUserToken?.trim();
    if (liveToken) setCachedAppleMusicUserToken(liveToken, user?.id);

    let next = Boolean(inst.isAuthorized || liveToken);
    // Dopo il wake della tab MusicKit può tardare: se l’account è collegato e abbiamo ancora cache user token, non mostrare “disconnesso”.
    if (!next && isLinkedAccountRef.current) {
      const cached = getCachedAppleMusicUserToken(user?.id)?.trim();
      if (cached && heldAppleSessionRef.current && document.visibilityState === "visible") {
        next = true;
      }
    }
    if (next) heldAppleSessionRef.current = true;
    else if (document.visibilityState === "hidden" && heldAppleSessionRef.current) return;
    setIsAuthorized(next);
    if (!next) heldAppleSessionRef.current = false;
  }, [user?.id]);

  const refresh = useCallback(async () => {
    clearRuntimeListeners();
    cancelledRef.current = false;
    let instance: MKInstance | null = null;
    let syncAuth: (() => void) | null = null;
    let removeVisibility: (() => void) | null = null;
    let removeFocus: (() => void) | null = null;
    let removePageShow: (() => void) | null = null;
    let pollId: number | null = null;
    const delayedTimers: number[] = [];
    setLoading(true);

    try {
      setIsLinkedAccount(false);
      isLinkedAccountRef.current = false;
      if (user?.id) {
        const linked = await getAppleMusicConnection(user.id);
        if (!cancelledRef.current) {
          const ok = !!linked;
          setIsLinkedAccount(ok);
          isLinkedAccountRef.current = ok;
        }
      }

      const token = await getAppleMusicDeveloperToken();
      if (cancelledRef.current) return;
      if (!token) {
        setDeveloperToken(null);
        setIsAvailable(false);
        setIsAuthorized(false);
        setLoading(false);
        return;
      }
      setDeveloperToken(token);
      developerTokenRef.current = token;

      const ready = await waitForMusicKit(20_000);
      if (cancelledRef.current) return;
      if (!ready) {
        console.warn("MusicKit: script non caricato in tempo");
        setIsAvailable(false);
        setIsAuthorized(false);
        setLoading(false);
        return;
      }

      const mk = getMKGlobal();
      if (!mk || cancelledRef.current) {
        setIsAvailable(false);
        setIsAuthorized(false);
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
        if (cancelledRef.current) return;
        reconcileAuthorizedFromMusicKit();
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

      const onFocus = () => syncAuth?.();
      window.addEventListener("focus", onFocus);
      removeFocus = () => window.removeEventListener("focus", onFocus);

      const onPageShow = () => syncAuth?.();
      window.addEventListener("pageshow", onPageShow);
      removePageShow = () => window.removeEventListener("pageshow", onPageShow);

      // Background tabs can restore MusicKit state lazily; keep a light re-sync alive.
      pollId = window.setInterval(() => {
        syncAuth?.();
      }, 30_000);
    } catch (err) {
      console.error("MusicKit init error:", err);
    }
    if (!cancelledRef.current) setLoading(false);

    cleanupRef.current = () => {
      cancelledRef.current = true;
      for (const id of delayedTimers) window.clearTimeout(id);
      if (pollId != null) window.clearInterval(pollId);
      if (instance && syncAuth) {
        instance.removeEventListener("authorizationStatusDidChange", syncAuth);
      }
      removeVisibility?.();
      removeFocus?.();
      removePageShow?.();
    };
  }, [clearRuntimeListeners, reconcileAuthorizedFromMusicKit, user?.id]);

  const resyncMusicKit = useCallback(async () => {
    const mk = getMKGlobal();
    if (!mk) return;
    const token = await getAppleMusicDeveloperToken();
    if (!token) return;

    const sameJwt = Boolean(developerTokenRef.current && token === developerTokenRef.current);
    if (!sameJwt) {
      try {
        await mk.configure({
          developerToken: token,
          app: { name: "Echoes", build: "1.0.0" },
          persist: true,
        });
        setDeveloperToken(token);
        developerTokenRef.current = token;
      } catch (e) {
        console.warn("MusicKit resync configure:", e);
        return;
      }
    }

    reconcileAuthorizedFromMusicKit();
  }, [reconcileAuthorizedFromMusicKit]);

  const repairMusicKitSession = useCallback(async () => {
    clearCachedAppleMusicUserToken(user?.id);
    heldAppleSessionRef.current = false;
    await resyncMusicKit();
  }, [user?.id, resyncMusicKit]);

  useEffect(() => {
    void refresh();
    return () => {
      clearRuntimeListeners();
    };
  }, [clearRuntimeListeners, refresh]);

  /** Al ritorno sulla tab: solo riconciliazione stato — niente `configure`, che su Safari/WebKit spesso forza di nuovo il login Apple. */
  useEffect(() => {
    if (!isAvailable) return;
    const timers: number[] = [];
    const clearTimers = () => {
      for (const id of timers) window.clearTimeout(id);
      timers.length = 0;
    };
    const onVis = () => {
      if (document.visibilityState !== "visible") return;
      clearTimers();
      timers.push(
        window.setTimeout(() => reconcileAuthorizedFromMusicKit(), 0),
        window.setTimeout(() => reconcileAuthorizedFromMusicKit(), 400),
        window.setTimeout(() => reconcileAuthorizedFromMusicKit(), 1400),
      );
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      clearTimers();
    };
  }, [isAvailable, reconcileAuthorizedFromMusicKit]);

  /** JWT developer: MusicKit resta configurato col token iniziale; lo riallineiamo periodicamente. */
  useEffect(() => {
    if (!isAvailable) return;
    const id = window.setInterval(() => void resyncMusicKit(), 45 * 60 * 1000);
    return () => window.clearInterval(id);
  }, [isAvailable, resyncMusicKit]);

  const authorize = useCallback(async () => {
    if (!user) {
      window.location.assign("/auth");
      return;
    }
    try {
      const mk = getMKGlobal()?.getInstance();
      if (mk) {
        const authResult = await mk.authorize();
        const token =
          (typeof authResult === "string" && authResult.trim()) ||
          mk.musicUserToken?.trim() ||
          null;
        if (token) {
          setCachedAppleMusicUserToken(token, user.id);
        }
        setIsAuthorized(Boolean(mk.isAuthorized || token));
        if (mk.isAuthorized || token) {
          heldAppleSessionRef.current = true;
          await upsertAppleMusicConnection(user.id);
          setIsLinkedAccount(true);
          isLinkedAccountRef.current = true;
        }
      }
    } catch (err) {
      console.error("MusicKit authorize error:", err);
    }
  }, [user]);

  const unauthorize = useCallback(() => {
    void (async () => {
      try {
        if (user?.id) {
          await deleteAppleMusicConnection(user.id);
          setIsLinkedAccount(false);
          isLinkedAccountRef.current = false;
        }
      } catch (err) {
        console.error("Apple Music disconnect error:", err);
      }
      clearCachedAppleMusicUserToken(user?.id);
      heldAppleSessionRef.current = false;
      const mk = getMKGlobal()?.getInstance();
      if (mk) {
        void mk.unauthorize();
      }
      setIsAuthorized(false);
    })();
  }, [user?.id]);

  return (
    <AppleMusicContext.Provider
      value={{
        isAvailable,
        isAuthorized,
        isLinkedAccount,
        developerToken,
        loading,
        authorize,
        unauthorize,
        refresh,
        resyncMusicKit,
        repairMusicKitSession,
      }}
    >
      {children}
    </AppleMusicContext.Provider>
  );
};
