import { createContext } from "react";

export interface AppleMusicState {
  isAvailable: boolean;
  isAuthorized: boolean;
  isLinkedAccount: boolean;
  developerToken: string | null;
  loading: boolean;
  authorize: () => Promise<void>;
  unauthorize: () => void;
  refresh: () => Promise<void>;
  resyncMusicKit: () => Promise<void>;
  repairMusicKitSession: () => Promise<void>;
}

export const AppleMusicContext = createContext<AppleMusicState | null>(null);
