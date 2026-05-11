import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FullPlayer from "@/components/FullPlayer";
import TrackQueue from "@/components/TrackQueue";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useApp } from "@/context/useApp";
import { useConversations } from "@/context/useConversations";
import { usePlaybackQueue } from "@/context/usePlaybackQueue";
import { useIsMobile } from "@/hooks/use-mobile";
import { trackInteraction, trackResultFeedback } from "@/services/tracking";
import type { ChatMessage } from "@/types/conversation";
import type { Song } from "@/data/mockData";
import type { QueueListenSource } from "@/context/PlaybackQueueContext";
import type { PlaybackTelemetryEvent } from "@/components/FullPlayer";

const PLAYER_HEIGHT_VAR = "--global-player-height";
const PLAYER_OFFSET_VAR = "--global-player-offset";

export function GlobalPlaybackDock() {
  const isMobile = useIsMobile();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const lastTrackedEventRef = useRef<Map<string, number>>(new Map());
  const implicitPreferenceRef = useRef<Set<string>>(new Set());
  const playCountsRef = useRef<Map<string, number>>(new Map());
  const [queueOpen, setQueueOpen] = useState(false);
  const {
    queue,
    queueSources,
    currentIndex,
    setCurrentIndex,
    setPendingAutoplay,
    pendingAutoplay,
    setGlobalPlaying,
    reorderQueue,
    removeFromQueue,
  } = usePlaybackQueue();
  const { toggleFavorite, isFavorite, recordListen } = useApp();
  const { activeConversationId, getConversation } = useConversations();

  const activeConversation = getConversation(activeConversationId) ?? null;
  const latestAssistant = useMemo(
    () =>
      activeConversation?.messages
        .filter((message): message is Extract<ChatMessage, { role: "assistant" }> => message.role === "assistant")
        .at(-1) ?? null,
    [activeConversation]
  );
  const currentResult = latestAssistant?.searchResult ?? null;

  const handleToggleFavorite = useCallback(
    (songId: string) => {
      const song = queue.find((item) => item.id === songId) ?? currentResult?.songs.find((item) => item.id === songId);
      if (song) toggleFavorite(song);
    },
    [queue, currentResult, toggleFavorite]
  );

  const handlePlaybackStateChange = useCallback(
    (playing: boolean) => {
      setGlobalPlaying(playing);
      if (!playing || !queue.length) return;
      const song = queue[currentIndex];
      if (!song) return;
      const tagged = queueSources[currentIndex];
      const fallback =
        activeConversationId && currentResult?.songs.some((item) => item.id === song.id)
          ? {
              conversationId: activeConversationId,
              searchResultId: currentResult.id,
              prompt: currentResult.prompt,
            }
          : null;
      const source = tagged ?? fallback;
      if (!source) return;
      const conversation = getConversation(source.conversationId);
      recordListen({
        conversationId: source.conversationId,
        searchResultId: source.searchResultId,
        prompt: source.prompt,
        chatTitle: conversation?.title,
        song,
      });
    },
    [
      setGlobalPlaying,
      queue,
      currentIndex,
      queueSources,
      activeConversationId,
      currentResult,
      getConversation,
      recordListen,
    ]
  );

  const resolvePlaybackTracking = useCallback(
    (source: QueueListenSource | null | undefined, song: Song) => {
      if (!source) return null;
      const conversation = getConversation(source.conversationId);
      const result =
        conversation?.messages
          .filter((message): message is Extract<ChatMessage, { role: "assistant" }> => message.role === "assistant")
          .map((message) => message.searchResult)
          .find((item) => item.id === source.searchResultId) ?? null;
      const dbSearchId = source.dbSearchId ?? result?.tracking?.searchId;
      const dbResultId = source.resultIdsBySongId?.[song.id] ?? result?.tracking?.resultIdsBySongId[song.id];
      const resultPosition =
        source.resultPosition ??
        (result ? result.songs.findIndex((item) => item.id === song.id) + 1 : undefined);
      if (!dbSearchId || !dbResultId) return null;
      return {
        dbSearchId,
        dbResultId,
        prompt: source.prompt || result?.prompt,
        resultPosition: resultPosition && resultPosition > 0 ? resultPosition : undefined,
        selectedResultPosition: source.selectedResultPosition,
        selectedTrackId: source.selectedTrackId,
        selectionIntent: source.selectionIntent,
      };
    },
    [getConversation],
  );

  const shouldTrackEvent = useCallback((key: string, windowMs = 1500) => {
    const now = Date.now();
    const prev = lastTrackedEventRef.current.get(key) ?? 0;
    if (now - prev < windowMs) return false;
    lastTrackedEventRef.current.set(key, now);
    return true;
  }, []);

  const handlePlaybackEvent = useCallback(
    (event: PlaybackTelemetryEvent) => {
      if (!queue.length) return;
      const song = queue[currentIndex];
      if (!song) return;
      const source = queueSources[currentIndex];
      const tracking = resolvePlaybackTracking(source, song);
      if (!tracking) return;

      const duration = event.duration && Number.isFinite(event.duration) ? event.duration : undefined;
      const currentTime = event.currentTime && Number.isFinite(event.currentTime) ? event.currentTime : 0;
      const completionRatio = duration && duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : undefined;
      const baseMetadata = {
        provider: event.provider,
        reason: event.reason,
        prompt: tracking.prompt,
        trackId: song.id,
        title: song.title,
        artist: song.artist,
        resultPosition: tracking.resultPosition,
        selectedResultPosition: tracking.selectedResultPosition,
        selectedTrackId: tracking.selectedTrackId,
        selectionIntent: tracking.selectionIntent,
        currentTime,
        duration,
        completionRatio,
      };

      const resultKey = `${tracking.dbSearchId}:${tracking.dbResultId}`;
      if (event.type === "play_start") {
        const count = (playCountsRef.current.get(resultKey) ?? 0) + 1;
        playCountsRef.current.set(resultKey, count);
        if (shouldTrackEvent(`${resultKey}:play_start`, 2500)) {
          void trackInteraction({
            searchId: tracking.dbSearchId,
            searchResultId: tracking.dbResultId,
            interactionType: "playback_started",
            metadata: { ...baseMetadata, playCount: count },
          });
        }
        const selectedNonFirst =
          tracking.selectionIntent === "play_now" &&
          tracking.selectedTrackId === song.id &&
          (tracking.selectedResultPosition ?? 1) > 1;
        if (selectedNonFirst && !implicitPreferenceRef.current.has(resultKey)) {
          implicitPreferenceRef.current.add(resultKey);
          const metadata = {
            ...baseMetadata,
            inferredPreference: "selected_non_first_result_for_immediate_playback",
          };
          void trackInteraction({
            searchId: tracking.dbSearchId,
            searchResultId: tracking.dbResultId,
            interactionType: "implicit_preferred_non_first",
            metadata,
          });
          void trackResultFeedback({
            searchId: tracking.dbSearchId,
            searchResultId: tracking.dbResultId,
            label: "implicit_play_choice",
          });
        }
        return;
      }

      const interactionType =
        event.type === "complete"
          ? "playback_completed"
          : event.type === "replay"
            ? "playback_replayed"
            : event.type === "external_open"
              ? "external_stream_opened"
              : event.type === "skip_next" || event.type === "skip_previous"
                ? "playback_skipped"
                : event.type === "pause"
                  ? "playback_paused"
                  : null;
      if (!interactionType) return;
      if (interactionType === "playback_paused" && (completionRatio == null || completionRatio > 0.9)) return;
      if (interactionType === "playback_skipped" && completionRatio != null && completionRatio > 0.92) return;
      if (!shouldTrackEvent(`${resultKey}:${interactionType}:${Math.floor(currentTime)}`, 1000)) return;
      void trackInteraction({
        searchId: tracking.dbSearchId,
        searchResultId: tracking.dbResultId,
        interactionType,
        metadata: baseMetadata,
      });
    },
    [currentIndex, queue, queueSources, resolvePlaybackTracking, shouldTrackEvent],
  );

  useEffect(() => {
    const updateVars = () => {
      const rect = queue.length > 0 && rootRef.current ? rootRef.current.getBoundingClientRect() : null;
      const height = rect ? rect.height : 0;
      const mobileNavOffset = isMobile && queue.length > 0 ? 56 : 0;
      const floatingMargin = queue.length > 0 ? (isMobile ? 8 : 16) : 0;
      document.documentElement.style.setProperty(PLAYER_HEIGHT_VAR, `${height}px`);
      document.documentElement.style.setProperty(
        PLAYER_OFFSET_VAR,
        `${height + mobileNavOffset + floatingMargin}px`,
      );
    };

    updateVars();
    if (!rootRef.current || queue.length === 0) return updateVars;

    const observer = new ResizeObserver(updateVars);
    observer.observe(rootRef.current);
    return () => observer.disconnect();
  }, [isMobile, queue.length]);

  useEffect(() => {
    return () => {
      document.documentElement.style.setProperty(PLAYER_HEIGHT_VAR, "0px");
      document.documentElement.style.setProperty(PLAYER_OFFSET_VAR, "0px");
    };
  }, []);

  if (queue.length === 0) return null;

  return (
    <>
      <div
        className="fixed inset-x-0 z-[43] pointer-events-none"
        style={{ bottom: `calc(${isMobile ? 56 : 0}px + ${isMobile ? 8 : 16}px)` }}
      >
        <div ref={rootRef} className="mx-auto w-full max-w-[1180px] px-3 md:px-5 pointer-events-auto">
          <div className="relative rounded-[1.75rem] border border-borderSubtle/60 bg-background/90 backdrop-blur-2xl shadow-[0_28px_70px_-20px_rgba(0,0,0,0.55)] ring-1 ring-black/[0.04] dark:ring-white/[0.05] overflow-visible">
            <FullPlayer
              variant="dock"
              songs={queue}
              currentIndex={currentIndex}
              onChangeIndex={setCurrentIndex}
              isFavorite={isFavorite}
              onToggleFavorite={handleToggleFavorite}
              autoplay={pendingAutoplay}
              onAutoplayConsumed={() => setPendingAutoplay(false)}
              onPlaybackStateChange={handlePlaybackStateChange}
              onPlaybackEvent={handlePlaybackEvent}
              onOpenQueue={() => setQueueOpen(true)}
            />
          </div>
        </div>
      </div>

      <Sheet open={queueOpen} onOpenChange={setQueueOpen}>
        <SheetContent side={isMobile ? "bottom" : "right"} className="w-full md:max-w-xl p-0">
          <div className="p-4 md:p-5">
            <TrackQueue
              songs={queue}
              currentIndex={currentIndex}
              onSelect={(index) => {
                setCurrentIndex(index);
                setQueueOpen(false);
              }}
              isFavorite={isFavorite}
              onToggleFavorite={handleToggleFavorite}
              onReorder={reorderQueue}
              onRemove={removeFromQueue}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
