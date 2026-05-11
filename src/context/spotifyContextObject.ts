import { createContext } from "react";

export interface SpotifyState {
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
