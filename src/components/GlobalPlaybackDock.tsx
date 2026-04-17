import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FullPlayer from "@/components/FullPlayer";
import TrackQueue from "@/components/TrackQueue";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useApp } from "@/context/useApp";
import { useConversations } from "@/context/useConversations";
import { usePlaybackQueue } from "@/context/usePlaybackQueue";
import { useIsMobile } from "@/hooks/use-mobile";
import type { ChatMessage } from "@/types/conversation";

const PLAYER_HEIGHT_VAR = "--global-player-height";
const PLAYER_OFFSET_VAR = "--global-player-offset";

export function GlobalPlaybackDock() {
  const isMobile = useIsMobile();
  const rootRef = useRef<HTMLDivElement | null>(null);
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
