/* @refresh skip */
import {
  createContext,
  useCallback,
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
  /** Sposta il brano da `from` a `to` (indici nella coda risultante) */
  reorderQueue: (from: number, to: number) => void;
  /** Rimuove il brano all’indice indicato e aggiorna l’indice in riproduzione */
  removeFromQueue: (index: number) => void;
}

export const PlaybackQueueContext = createContext<PlaybackQueueState | null>(null);

export const PlaybackQueueProvider = ({ children }: { children: ReactNode }) => {
  const [queue, setQueue] = useState<Song[]>([]);
  const [queueSources, setQueueSources] = useState<(QueueListenSource | null)[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isGloballyPlaying, setIsGloballyPlaying] = useState(false);
  const [pendingAutoplay, setPendingAutoplay] = useState(false);
  const indexRef = useRef(0);
  const queueRef = useRef<Song[]>([]);
  const queueSourcesRef = useRef<(QueueListenSource | null)[]>([]);
  useEffect(() => {
    indexRef.current = currentIndex;
  }, [currentIndex]);
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);
  useEffect(() => {
    queueSourcesRef.current = queueSources;
  }, [queueSources]);

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

  const reorderQueue = useCallback((from: number, to: number) => {
    const q = queueRef.current;
    const s = queueSourcesRef.current;
    const ci = indexRef.current;
    if (from === to || from < 0 || to < 0 || from >= q.length || to >= q.length) return;
    const newQ = [...q];
    const newS = [...s];
    const [song] = newQ.splice(from, 1);
    const [src] = newS.splice(from, 1);
    newQ.splice(to, 0, song);
    newS.splice(to, 0, src);
    let newCi = ci;
    if (ci === from) newCi = to;
    else if (from < ci && to >= ci) newCi = ci - 1;
    else if (from > ci && to <= ci) newCi = ci + 1;
    setQueue(newQ);
    setQueueSources(newS);
    setCurrentIndex(newCi);
  }, []);

  const removeFromQueue = useCallback((index: number) => {
    const q = queueRef.current;
    const src = queueSourcesRef.current;
    const ci = indexRef.current;
    if (index < 0 || index >= q.length) return;
    const newQ = q.filter((_, i) => i !== index);
    const newS = src.filter((_, i) => i !== index);
    let newCi = ci;
    if (newQ.length === 0) {
      newCi = 0;
      setPendingAutoplay(false);
      setIsGloballyPlaying(false);
    } else if (index < ci) newCi = ci - 1;
    else if (index === ci) newCi = Math.min(ci, newQ.length - 1);
    setQueue(newQ);
    setQueueSources(newS);
    setCurrentIndex(newCi);
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
      reorderQueue,
      removeFromQueue,
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
      reorderQueue,
      removeFromQueue,
    ]
  );

  return (
    <PlaybackQueueContext.Provider value={value}>{children}</PlaybackQueueContext.Provider>
  );
};

