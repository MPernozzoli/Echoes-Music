import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Song } from "@/data/mockData";

/** Provenienza del brano in coda (chat + turno assistente) */
export interface QueueListenSource {
  conversationId: string;
  searchResultId: string;
  prompt: string;
}

interface PlaybackQueueState {
  queue: Song[];
  /** Allineato a `queue[i]` — null se sconosciuto */
  queueSources: (QueueListenSource | null)[];
  currentIndex: number;
  /** True mentre l’audio del player è in riproduzione (preview HTML5 / percezione “in ascolto”) */
  isGloballyPlaying: boolean;
  /** Consumato da FullPlayer per un tentativo autoplay una tantum */
  pendingAutoplay: boolean;
  setCurrentIndex: (i: number) => void;
  setGlobalPlaying: (playing: boolean) => void;
  /** Sostituisce la coda e opzionalmente richiede autoplay sul brano `startAt` */
  playNowReplace: (
    songs: Song[],
    startAt?: number,
    autoplay?: boolean,
    source?: QueueListenSource | null
  ) => void;
  setPendingAutoplay: (v: boolean) => void;
  appendToQueue: (songs: Song[], source?: QueueListenSource | null) => void;
  insertAfterCurrent: (songs: Song[], source?: QueueListenSource | null) => void;
  /** Coda = tutti i brani del risultato, riproduzione da `songIndex` */
  playTrackFromResult: (allSongs: Song[], songIndex: number, source: QueueListenSource) => void;
  clearQueue: () => void;
}

const PlaybackQueueContext = createContext<PlaybackQueueState | null>(null);

export const PlaybackQueueProvider = ({ children }: { children: ReactNode }) => {
  const [queue, setQueue] = useState<Song[]>([]);
  const [queueSources, setQueueSources] = useState<(QueueListenSource | null)[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isGloballyPlaying, setIsGloballyPlaying] = useState(false);
  const [pendingAutoplay, setPendingAutoplay] = useState(false);
  const indexRef = useRef(0);
  useEffect(() => {
    indexRef.current = currentIndex;
  }, [currentIndex]);

  const setGlobalPlaying = useCallback((playing: boolean) => {
    setIsGloballyPlaying(playing);
  }, []);

  const playNowReplace = useCallback(
    (songs: Song[], startAt = 0, autoplay = false, source: QueueListenSource | null = null) => {
      if (!songs.length) return;
      const i = Math.min(Math.max(0, startAt), songs.length - 1);
      setQueue(songs);
      setQueueSources(Array.from({ length: songs.length }, () => source));
      setCurrentIndex(i);
      setPendingAutoplay(autoplay);
    },
    []
  );

  const appendToQueue = useCallback((songs: Song[], source: QueueListenSource | null = null) => {
    if (!songs.length) return;
    const added = Array.from({ length: songs.length }, () => source);
    setQueue((q) => (q.length === 0 ? [...songs] : [...q, ...songs]));
    setQueueSources((s) => (s.length === 0 ? added : [...s, ...added]));
  }, []);

  const insertAfterCurrent = useCallback((songs: Song[], source: QueueListenSource | null = null) => {
    if (!songs.length) return;
    const added = Array.from({ length: songs.length }, () => source);
    setQueue((q) => {
      if (q.length === 0) return [...songs];
      const idx = Math.min(indexRef.current, q.length - 1);
      const next = [...q];
      next.splice(idx + 1, 0, ...songs);
      return next;
    });
    setQueueSources((s) => {
      if (s.length === 0) return added;
      const idx = Math.min(indexRef.current, s.length - 1);
      const next = [...s];
      next.splice(idx + 1, 0, ...added);
      return next;
    });
  }, []);

  const playTrackFromResult = useCallback(
    (allSongs: Song[], songIndex: number, source: QueueListenSource) => {
      playNowReplace(allSongs, songIndex, true, source);
    },
    [playNowReplace]
  );

  const clearQueue = useCallback(() => {
    setQueue([]);
    setQueueSources([]);
    setCurrentIndex(0);
    setPendingAutoplay(false);
    setIsGloballyPlaying(false);
  }, []);

  const value = useMemo(
    () => ({
      queue,
      queueSources,
      currentIndex,
      isGloballyPlaying,
      pendingAutoplay,
      setCurrentIndex,
      setGlobalPlaying,
      playNowReplace,
      setPendingAutoplay,
      appendToQueue,
      insertAfterCurrent,
      playTrackFromResult,
      clearQueue,
    }),
    [
      queue,
      queueSources,
      currentIndex,
      isGloballyPlaying,
      pendingAutoplay,
      setGlobalPlaying,
      playNowReplace,
      appendToQueue,
      insertAfterCurrent,
      playTrackFromResult,
      clearQueue,
    ]
  );

  return (
    <PlaybackQueueContext.Provider value={value}>{children}</PlaybackQueueContext.Provider>
  );
};

export const usePlaybackQueue = () => {
  const ctx = useContext(PlaybackQueueContext);
  if (!ctx) throw new Error("usePlaybackQueue must be used within PlaybackQueueProvider");
  return ctx;
};
