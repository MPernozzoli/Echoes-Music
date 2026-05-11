import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";

declare global {
  interface Window {
    Spotify?: {
      Player: new (options: {
        name: string;
        getOAuthToken: (cb: (token: string) => void) => void;
        volume?: number;
      }) => SpotifySdkPlayer;
    };
    onSpotifyWebPlaybackSDKReady?: () => void;
  }
}

type SpotifyPlaybackState = {
  paused: boolean;
  position: number;
  duration: number;
  track_window: {
    current_track: {
      uri: string;
    } | null;
  };
};

type SpotifySdkPlayer = {
  addListener: (event: string, cb: (payload: unknown) => void) => boolean;
  connect: () => Promise<boolean>;
  disconnect: () => void;
  getCurrentState: () => Promise<SpotifyPlaybackState | null>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  seek: (positionMs: number) => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
};

export interface SpotifyWebPlaybackHandle {
  togglePlay: (trackUri: string) => Promise<void>;
  seek: (seconds: number) => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  reconnect: () => Promise<void>;
}

interface SpotifyWebPlaybackPlayerProps {
  accessToken: string | null;
  getAccessToken?: () => Promise<string | null>;
  volume: number;
  onReadyChange?: (ready: boolean) => void;
  onTelemetry?: (state: { current: number; duration: number; isPlaying: boolean; uri?: string }) => void;
  onPlaybackStateChange?: (playing: boolean) => void;
  onPlaybackError?: (error: string) => void;
}

let sdkReadyPromise: Promise<void> | null = null;

function loadSpotifySdk(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("Spotify SDK unavailable"));
  if (window.Spotify?.Player) return Promise.resolve();
  if (sdkReadyPromise) return sdkReadyPromise;

  sdkReadyPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://sdk.scdn.co/spotify-player.js"]');
    window.onSpotifyWebPlaybackSDKReady = () => resolve();
    if (existing) return;

    const script = document.createElement("script");
    script.src = "https://sdk.scdn.co/spotify-player.js";
    script.async = true;
    script.onerror = () => reject(new Error("Spotify SDK load failed"));
    document.body.appendChild(script);
  });

  return sdkReadyPromise;
}

async function spotifyApi(
  accessToken: string,
  path: string,
  init: RequestInit = {},
  getAccessToken?: () => Promise<string | null>,
) {
  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (res.status === 401 && getAccessToken) {
    const refreshedToken = await getAccessToken();
    if (refreshedToken && refreshedToken !== accessToken) {
      return spotifyApi(refreshedToken, path, init);
    }
  }
  if (!res.ok && res.status !== 204) {
    throw new Error(`Spotify ${res.status}`);
  }
  return res;
}

export const SpotifyWebPlaybackPlayer = forwardRef<SpotifyWebPlaybackHandle, SpotifyWebPlaybackPlayerProps>(
  ({ accessToken, getAccessToken, volume, onReadyChange, onTelemetry, onPlaybackStateChange, onPlaybackError }, ref) => {
    const playerRef = useRef<SpotifySdkPlayer | null>(null);
    const deviceIdRef = useRef<string | null>(null);
    const tokenRef = useRef(accessToken);
    const getAccessTokenRef = useRef(getAccessToken);
    const volumeRef = useRef(volume);
    const onTelemetryRef = useRef(onTelemetry);
    const onPlaybackStateChangeRef = useRef(onPlaybackStateChange);
    const onPlaybackErrorRef = useRef(onPlaybackError);
    const activeUriRef = useRef<string | null>(null);
    const reconnectTimerRef = useRef<number | null>(null);
    const [ready, setReady] = useState(false);
    const hasAccessToken = !!accessToken;

    tokenRef.current = accessToken;
    getAccessTokenRef.current = getAccessToken;
    volumeRef.current = volume;
    onTelemetryRef.current = onTelemetry;
    onPlaybackStateChangeRef.current = onPlaybackStateChange;
    onPlaybackErrorRef.current = onPlaybackError;

    const reportReady = useCallback(
      (next: boolean) => {
        setReady(next);
        onReadyChange?.(next);
      },
      [onReadyChange],
    );

    const reportPlaybackState = useCallback((state: SpotifyPlaybackState | null) => {
      if (!state) return;
      const uri = state.track_window.current_track?.uri;
      if (uri) activeUriRef.current = uri;
      onTelemetryRef.current?.({
        current: state.position / 1000,
        duration: state.duration / 1000,
        isPlaying: !state.paused,
        uri: uri ?? undefined,
      });
      onPlaybackStateChangeRef.current?.(!state.paused);
    }, []);

    const reconnectPlayer = useCallback(async () => {
      const player = playerRef.current;
      if (!player) return;
      try {
        await player.connect();
      } catch {
        /* the SDK also reports connection failures through its listeners */
      }
    }, []);

    useEffect(() => {
      if (!hasAccessToken) {
        reportReady(false);
        return undefined;
      }

      let cancelled = false;
      let player: SpotifySdkPlayer | null = null;

      loadSpotifySdk()
        .then(() => {
          if (cancelled || !window.Spotify?.Player) return;
          player = new window.Spotify.Player({
            name: "Echoes Player",
            getOAuthToken: (cb) => {
              const token = tokenRef.current;
              const refreshToken = getAccessTokenRef.current;
              if (!refreshToken) {
                if (token) cb(token);
                return;
              }
              void refreshToken().then((refreshedToken) => {
                if (refreshedToken) {
                  tokenRef.current = refreshedToken;
                  cb(refreshedToken);
                } else if (token) {
                  cb(token);
                }
              });
            },
            volume: volumeRef.current,
          });

          player.addListener("ready", (payload) => {
            const { device_id } = payload as { device_id?: string };
            if (!device_id) return;
            deviceIdRef.current = device_id;
            reportReady(true);
          });
          player.addListener("not_ready", () => {
            deviceIdRef.current = null;
            reportReady(false);
            if (reconnectTimerRef.current != null) window.clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = window.setTimeout(() => {
              reconnectTimerRef.current = null;
              void reconnectPlayer();
            }, 1200);
          });
          player.addListener("initialization_error", (payload) => {
            onPlaybackErrorRef.current?.((payload as { message?: string }).message ?? "Spotify initialization error");
          });
          player.addListener("authentication_error", (payload) => {
            onPlaybackErrorRef.current?.((payload as { message?: string }).message ?? "Spotify authentication error");
          });
          player.addListener("account_error", (payload) => {
            onPlaybackErrorRef.current?.((payload as { message?: string }).message ?? "Spotify Premium required");
          });
          player.addListener("playback_error", (payload) => {
            onPlaybackErrorRef.current?.((payload as { message?: string }).message ?? "Spotify playback error");
          });
          player.addListener("player_state_changed", (state) => {
            reportPlaybackState(state as SpotifyPlaybackState | null);
          });

          playerRef.current = player;
          void player.connect();
        })
        .catch((err) => onPlaybackErrorRef.current?.(err instanceof Error ? err.message : "Spotify SDK unavailable"));

      return () => {
        cancelled = true;
        if (reconnectTimerRef.current != null) {
          window.clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = null;
        }
        reportReady(false);
        deviceIdRef.current = null;
        playerRef.current = null;
        player?.disconnect();
      };
    }, [hasAccessToken, reconnectPlayer, reportPlaybackState, reportReady]);

    useEffect(() => {
      if (!ready) return undefined;
      const interval = window.setInterval(() => {
        void playerRef.current?.getCurrentState().then(reportPlaybackState);
      }, 500);
      return () => window.clearInterval(interval);
    }, [ready, reportPlaybackState]);

    useEffect(() => {
      if (!ready) return;
      void playerRef.current?.setVolume(volume);
    }, [ready, volume]);

    useImperativeHandle(
      ref,
      () => ({
        async togglePlay(trackUri: string) {
          const token = tokenRef.current ?? await getAccessTokenRef.current?.();
          const player = playerRef.current;
          if (!deviceIdRef.current && player) {
            await reconnectPlayer();
            await new Promise((resolve) => window.setTimeout(resolve, 350));
          }
          const deviceId = deviceIdRef.current;
          if (!token || !deviceId || !player) throw new Error("Spotify player not ready");

          const state = await player.getCurrentState();
          const currentUri = state?.track_window.current_track?.uri ?? activeUriRef.current;
          if (state && currentUri === trackUri && !state.paused) {
            await player.pause();
            return;
          }

          if (state && currentUri === trackUri && state.paused) {
            await player.resume();
            return;
          }

          await spotifyApi(token, "/me/player", {
            method: "PUT",
            body: JSON.stringify({ device_ids: [deviceId], play: false }),
          }, getAccessTokenRef.current);
          await spotifyApi(token, `/me/player/play?device_id=${encodeURIComponent(deviceId)}`, {
            method: "PUT",
            body: JSON.stringify({ uris: [trackUri] }),
          }, getAccessTokenRef.current);
          activeUriRef.current = trackUri;
        },
        async seek(seconds: number) {
          await playerRef.current?.seek(Math.max(0, seconds) * 1000);
        },
        async setVolume(nextVolume: number) {
          await playerRef.current?.setVolume(nextVolume);
        },
        reconnect: reconnectPlayer,
      }),
      [reconnectPlayer],
    );

    return null;
  },
);

SpotifyWebPlaybackPlayer.displayName = "SpotifyWebPlaybackPlayer";
