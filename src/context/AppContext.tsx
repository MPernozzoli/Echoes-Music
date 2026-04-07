/* @refresh skip */
import { createContext, useState, useEffect, useCallback, type ReactNode } from "react";
import type { Song, SearchResult, ListenHistoryEntry } from "@/data/mockData";
import { getUserSettings, setSyncFavoritesEchoesPlaylist as persistSyncFavoritesEchoesPlaylist } from "@/services/tracking";
import i18n, {
  UI_LANG_KEY,
  resolveUiLanguage,
  type SupportedUiLang,
} from "@/i18n/config";

interface AppState {
  favorites: Song[];
  history: SearchResult[];
  listenHistory: ListenHistoryEntry[];
  descriptionLanguage: string;
  uiLanguage: SupportedUiLang;
  syncFavoritesEchoesPlaylist: boolean;
  setSyncFavoritesEchoesPlaylist: (enabled: boolean) => Promise<void>;
  toggleFavorite: (song: Song) => void;
  isFavorite: (songId: string) => boolean;
  addToHistory: (result: SearchResult) => void;
  clearHistory: () => void;
  recordListen: (entry: Omit<ListenHistoryEntry, "id" | "listenedAt">) => void;
  clearListenHistory: () => void;
  setDescriptionLanguage: (lang: string) => void;
  setUiLanguage: (lang: SupportedUiLang) => void;
}

export const AppContext = createContext<AppState | null>(null);

const FAVORITES_KEY = "echoes_favorites";
const HISTORY_KEY = "echoes_history";
const LISTEN_HISTORY_KEY = "echoes_listen_history";
const LANGUAGE_KEY = "echoes_description_language";
const LISTEN_DEDUPE_MS = 90_000;

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function parseListenHistory(raw: unknown): ListenHistoryEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (e): e is ListenHistoryEntry =>
        e != null &&
        typeof e === "object" &&
        typeof (e as ListenHistoryEntry).id === "string" &&
        typeof (e as ListenHistoryEntry).listenedAt === "string" &&
        typeof (e as ListenHistoryEntry).conversationId === "string" &&
        typeof (e as ListenHistoryEntry).searchResultId === "string" &&
        typeof (e as ListenHistoryEntry).prompt === "string" &&
        typeof (e as ListenHistoryEntry).song === "object" &&
        (e as ListenHistoryEntry).song != null &&
        typeof (e as ListenHistoryEntry).song.id === "string"
    )
    .map((e) => ({
      ...e,
      song: { ...(e as ListenHistoryEntry).song },
    }));
}

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [favorites, setFavorites] = useState<Song[]>(() => loadJSON(FAVORITES_KEY, []));
  const [history, setHistory] = useState<SearchResult[]>(() => loadJSON(HISTORY_KEY, []));
  const [listenHistory, setListenHistory] = useState<ListenHistoryEntry[]>(() =>
    parseListenHistory(loadJSON(LISTEN_HISTORY_KEY, []))
  );
  const [descriptionLanguage, setDescriptionLanguage] = useState<string>(() => localStorage.getItem(LANGUAGE_KEY) || "auto");
  const [uiLanguage, setUiLanguageState] = useState<SupportedUiLang>(() => resolveUiLanguage(localStorage.getItem(UI_LANG_KEY)));
  const [syncFavoritesEchoesPlaylist, setSyncFavoritesEchoesPlaylistState] = useState(false);

  useEffect(() => {
    void getUserSettings().then((s) => {
      if (s && typeof s.sync_favorites_echoes_playlist === "boolean") {
        setSyncFavoritesEchoesPlaylistState(s.sync_favorites_echoes_playlist);
      }
    });
  }, []);

  useEffect(() => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem(LISTEN_HISTORY_KEY, JSON.stringify(listenHistory));
  }, [listenHistory]);

  useEffect(() => {
    localStorage.setItem(LANGUAGE_KEY, descriptionLanguage);
  }, [descriptionLanguage]);

  useEffect(() => {
    try {
      localStorage.setItem(UI_LANG_KEY, uiLanguage);
    } catch {
      /* ignore */
    }
    void i18n.changeLanguage(uiLanguage);
    document.documentElement.lang = uiLanguage;
  }, [uiLanguage]);

  const setUiLanguage = useCallback((lang: SupportedUiLang) => {
    setUiLanguageState(lang);
  }, []);

  const setSyncFavoritesEchoesPlaylist = useCallback(async (enabled: boolean) => {
    setSyncFavoritesEchoesPlaylistState(enabled);
    await persistSyncFavoritesEchoesPlaylist(enabled);
  }, []);

  const toggleFavorite = useCallback((song: Song) => {
    setFavorites((prev) => {
      const exists = prev.some((s) => s.id === song.id);
      return exists ? prev.filter((s) => s.id !== song.id) : [...prev, song];
    });
  }, []);

  const isFavorite = useCallback(
    (songId: string) => favorites.some((s) => s.id === songId),
    [favorites]
  );

  const addToHistory = useCallback((result: SearchResult) => {
    setHistory((prev) => [result, ...prev.filter((r) => r.id !== result.id)].slice(0, 50));
  }, []);

  const clearHistory = useCallback(() => setHistory([]), []);

  const recordListen = useCallback((entry: Omit<ListenHistoryEntry, "id" | "listenedAt">) => {
    const now = new Date().toISOString();
    setListenHistory((prev) => {
      const [head, ...tail] = prev;
      if (
        head &&
        head.conversationId === entry.conversationId &&
        head.searchResultId === entry.searchResultId &&
        head.song.id === entry.song.id &&
        Date.now() - new Date(head.listenedAt).getTime() < LISTEN_DEDUPE_MS
      ) {
        return [{ ...head, listenedAt: now }, ...tail];
      }
      const id = `lh-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      return [{ ...entry, id, listenedAt: now }, ...prev].slice(0, 150);
    });
  }, []);

  const clearListenHistory = useCallback(() => setListenHistory([]), []);

  return (
    <AppContext.Provider
      value={{
        favorites,
        history,
        listenHistory,
        descriptionLanguage,
        uiLanguage,
        syncFavoritesEchoesPlaylist,
        setSyncFavoritesEchoesPlaylist,
        toggleFavorite,
        isFavorite,
        addToHistory,
        clearHistory,
        recordListen,
        clearListenHistory,
        setDescriptionLanguage,
        setUiLanguage,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

