import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import type { Song, SearchResult } from "@/data/mockData";

interface AppState {
  favorites: Song[];
  history: SearchResult[];
  descriptionLanguage: string;
  toggleFavorite: (song: Song) => void;
  isFavorite: (songId: string) => boolean;
  addToHistory: (result: SearchResult) => void;
  clearHistory: () => void;
  setDescriptionLanguage: (lang: string) => void;
}

const AppContext = createContext<AppState | null>(null);

const FAVORITES_KEY = "echoes_favorites";
const HISTORY_KEY = "echoes_history";
const LANGUAGE_KEY = "echoes_description_language";

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [favorites, setFavorites] = useState<Song[]>(() => loadJSON(FAVORITES_KEY, []));
  const [history, setHistory] = useState<SearchResult[]>(() => loadJSON(HISTORY_KEY, []));
  const [descriptionLanguage, setDescriptionLanguage] = useState<string>(() => localStorage.getItem(LANGUAGE_KEY) || "auto");

  useEffect(() => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem(LANGUAGE_KEY, descriptionLanguage);
  }, [descriptionLanguage]);

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

  return (
    <AppContext.Provider value={{ favorites, history, descriptionLanguage, toggleFavorite, isFavorite, addToHistory, clearHistory, setDescriptionLanguage }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
};
