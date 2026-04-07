import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import PromptInput, { type PromptSubmitPayload } from "@/components/PromptInput";
import PromptSuggestions from "@/components/PromptSuggestions";
import FullPlayer from "@/components/FullPlayer";
import {
  DiscoverDockPanelActions,
  type DockPopoverId,
} from "@/components/DiscoverDockPanelActions";
import TrackQueue from "@/components/TrackQueue";
import EmotionalProfileCard from "@/components/EmotionalProfile";
import MusicSearchThinking from "@/components/MusicSearchThinking";
import SearchFeedback from "@/components/SearchFeedback";
import { pickDiscoverPromptSuggestions } from "@/lib/discoverPromptSuggestions";
import type { ListenHistoryEntry, SearchResult } from "@/data/mockData";
import { useApp } from "@/context/useApp";
import { usePlaybackQueue } from "@/context/usePlaybackQueue";
import { useConversations } from "@/context/useConversations";
import { memoryOrFromProfile } from "@/lib/conversationMemory";
import { callMusicSearch } from "@/services/musicSearchApi";
import { trackSearch, trackResults, trackInteraction, maybeCreateTrainingEvent } from "@/services/tracking";
import { emotionalProfileToAxes } from "@/types/conversation";
import { normalizeStandardAxes } from "@/lib/memoryMerge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Bot,
  Lightbulb,
  RefreshCw,
  ListMusic,
  ChevronDown,
  ChevronUp,
  X,
  MessageSquarePlus,
  PanelLeft,
  PanelLeftClose,
  PanelLeftOpen,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import type { ChatMessage } from "@/types/conversation";
import { cn } from "@/lib/utils";
import { dedupeSongVersions } from "@/lib/dedupeSongs";
import { AssistantSongNarrative } from "@/components/AssistantSongNarrative";
import { fallbackNarrativeForResult } from "@/lib/assistantNarrative";
import { useIsMobile } from "@/hooks/use-mobile";
import { isLuckyPrompt } from "@/constants/luckyPrompt";

function buildSearchResult(
  prompt: string,
  data: {
    emotionalProfile: SearchResult["emotionalProfile"];
    songs: SearchResult["songs"];
    adjacentInterpretations: string[];
    narrativeReply?: string;
  },
  playbackPresentation?: SearchResult["playbackPresentation"]
): SearchResult {
  return {
    id: `sr-${Date.now()}`,
    prompt,
    timestamp: new Date().toISOString(),
    emotionalProfile: data.emotionalProfile,
    songs: data.songs,
    adjacentInterpretations: data.adjacentInterpretations || [],
    ...(data.narrativeReply?.trim() ? { narrativeReply: data.narrativeReply.trim() } : {}),
    ...(playbackPresentation ? { playbackPresentation } : {}),
  };
}

const CHAT_PATH = "/chat";

const Chat = () => {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [dbSearchId, setDbSearchId] = useState<string | null>(null);
  const [resultIdMap, setResultIdMap] = useState<Record<string, string>>({});
  const [showQueue, setShowQueue] = useState(false);
  const [showEmotionalProfile, setShowEmotionalProfile] = useState(false);
  const [dockPopover, setDockPopover] = useState<DockPopoverId | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [conversationsPanelOpen, setConversationsPanelOpen] = useState(true);
  const chatDockRef = useRef<HTMLDivElement>(null);
  const [chatDockInset, setChatDockInset] = useState(0);

  const isMobile = useIsMobile();
  const {
    queue,
    queueSources,
    currentIndex,
    setCurrentIndex,
    isGloballyPlaying,
    pendingAutoplay,
    setPendingAutoplay,
    setGlobalPlaying,
    playNowReplace,
    playTrackFromResult,
    appendToQueue,
    insertAfterCurrent,
    reorderQueue,
    removeFromQueue,
  } = usePlaybackQueue();

  const { toggleFavorite, isFavorite, descriptionLanguage, recordListen, listenHistory } = useApp();
  const {
    conversations,
    activeConversationId,
    userTasteProfile,
    createConversation,
    selectConversation,
    deleteConversation,
    appendUserMessage,
    appendAssistantResult,
    mergeConversationMemoryFromUpdate,
    mergeUserTasteFromUpdate,
    getConversation,
    patchSearchResultTracking,
  } = useConversations();

  const completedSearchCount = useMemo(
    () =>
      conversations.reduce(
        (acc, c) => acc + c.messages.filter((m) => m.role === "assistant").length,
        0
      ),
    [conversations]
  );

  const discoverSuggestions = useMemo(
    () =>
      pickDiscoverPromptSuggestions({
        userTasteProfile,
        completedSearchCount,
        descriptionLanguage,
        count: 6,
        sessionKey: activeConversationId ?? "",
      }),
    [userTasteProfile, completedSearchCount, descriptionLanguage, activeConversationId]
  );

  const qProcessed = useRef(false);
  const luckyProcessed = useRef(false);

  const activeConversation = getConversation(activeConversationId) ?? null;
  const assistantTurns = activeConversation?.messages.filter(
    (m): m is Extract<ChatMessage, { role: "assistant" }> => m.role === "assistant"
  );
  const latestAssistant = assistantTurns?.[assistantTurns.length - 1];
  const currentResult = latestAssistant?.searchResult ?? null;

  const totalInlineAssistantTurns = useMemo(
    () =>
      conversations.reduce(
        (n, c) =>
          n +
          c.messages.filter(
            (m) =>
              m.role === "assistant" &&
              m.searchResult?.playbackPresentation === "inline"
          ).length,
        0
      ),
    [conversations]
  );
  const currentSong = queue[currentIndex] ?? currentResult?.songs[0] ?? null;
  const hasAnyMessage = (activeConversation?.messages.length ?? 0) > 0;
  /** Su desktop con coda, profilo/coda duplicati sono nel dock — non nel thread */
  const hideInlineDockExtras = queue.length > 0 && !isMobile;
  useLayoutEffect(() => {
    const node = chatDockRef.current;
    if (!node) {
      setChatDockInset(0);
      return;
    }
    const ro = new ResizeObserver(() => setChatDockInset(node.getBoundingClientRect().height));
    ro.observe(node);
    setChatDockInset(node.getBoundingClientRect().height);
    return () => ro.disconnect();
  }, [queue.length, dbSearchId, isLoading, isMobile]);

  const scrollPadBottom = Math.max(chatDockInset + 20, isMobile ? 96 : 72);

  const runSearch = useCallback(
    async (
      conversationId: string,
      prompt: string,
      media?: { imageBase64: string; imageMimeType: string }
    ) => {
      const conv = getConversation(conversationId);
      if (!conv) return;

      const displayPrompt =
        prompt.trim() ||
        (media ? t("chat.imageSearchLabel") : prompt);

      setIsLoading(true);
      setShowQueue(false);
      setShowEmotionalProfile(false);
      setDockPopover(null);
      setDbSearchId(null);
      setResultIdMap({});

      const memoryPayload = memoryOrFromProfile(conv.conversationMemory, conv.conversationProfile);

      try {
        const data = await callMusicSearch({
          ...(prompt.trim() ? { prompt: prompt.trim() } : {}),
          ...(media
            ? { imageBase64: media.imageBase64, imageMimeType: media.imageMimeType }
            : {}),
          descriptionLanguage,
          conversationMemory: memoryPayload,
          userTasteProfile,
        });

        if (data.error) {
          if (data.error.includes("Rate") || data.error.includes("429")) toast.error(t("chat.toastRate"));
          else if (data.error.includes("credits") || data.error.includes("402")) toast.error(t("chat.toastCredits"));
          else toast.error(data.error || t("chat.toastSearchFailed"));
          setIsLoading(false);
          return;
        }

        if (!data.emotionalProfile || !data.songs?.length) {
          toast.error(t("chat.toastNoResults"));
          setIsLoading(false);
          return;
        }

        const songs = dedupeSongVersions(data.songs);
        if (!songs.length) {
          toast.error(t("chat.toastNoResults"));
          setIsLoading(false);
          return;
        }

        const presentation: SearchResult["playbackPresentation"] = isGloballyPlaying ? "pick" : "inline";
        const result = buildSearchResult(
          displayPrompt,
          {
            emotionalProfile: data.emotionalProfile,
            songs,
            adjacentInterpretations: data.adjacentInterpretations || [],
            narrativeReply: data.narrativeReply,
          },
          presentation
        );

        appendAssistantResult(conversationId, result);

        if (!isGloballyPlaying) {
          playNowReplace(songs, 0, true, {
            conversationId,
            searchResultId: result.id,
            prompt: result.prompt,
          });
        }

        if (data.conversationMemoryUpdate?.standardAxes) {
          mergeConversationMemoryFromUpdate(conversationId, {
            threadSummary: data.conversationMemoryUpdate.threadSummary ?? "",
            standardAxes: normalizeStandardAxes(data.conversationMemoryUpdate.standardAxes as Record<string, unknown>),
          });
        } else {
          mergeConversationMemoryFromUpdate(conversationId, {
            threadSummary: data.emotionalProfile.mood.slice(0, 400),
            standardAxes: emotionalProfileToAxes(data.emotionalProfile),
          });
        }

        if (data.userTasteProfileUpdate) {
          mergeUserTasteFromUpdate(data.userTasteProfileUpdate);
        }

        setIsLoading(false);

        const searchId = await trackSearch({ rawPrompt: displayPrompt, profile: result.emotionalProfile });
        setDbSearchId(searchId);
        if (searchId) {
          const map = await trackResults(searchId, result.songs);
          setResultIdMap(map);
          if (Object.keys(map).length > 0) {
            patchSearchResultTracking(conversationId, result.id, {
              searchId,
              resultIdsBySongId: map,
            });
          }
        }
      } catch (err) {
        console.error("Search error:", err);
        toast.error(t("chat.toastSearchError"));
        setIsLoading(false);
      }
    },
    [
      t,
      getConversation,
      descriptionLanguage,
      userTasteProfile,
      appendAssistantResult,
      patchSearchResultTracking,
      mergeConversationMemoryFromUpdate,
      mergeUserTasteFromUpdate,
      isGloballyPlaying,
      playNowReplace,
    ]
  );

  const handleComposerSubmit = useCallback(
    (payload: PromptSubmitPayload) => {
      const text = payload.text.trim();
      const hasImg = Boolean(payload.imageBase64 && payload.imageMimeType);
      if (!text && !hasImg) return;
      let id = activeConversationId;
      const createdNewConversation = !id;
      if (!id) {
        id = createConversation();
        navigate(`${CHAT_PATH}?conversation=${id}`, { replace: true });
      }
      const displayText = text || t("chat.imageSearchLabel");
      const previewUrl =
        hasImg && payload.imageMimeType && payload.imageBase64
          ? `data:${payload.imageMimeType};base64,${payload.imageBase64}`
          : undefined;
      appendUserMessage(id, displayText, previewUrl ? { imagePreviewUrl: previewUrl } : undefined);
      const media =
        hasImg && payload.imageBase64 && payload.imageMimeType
          ? { imageBase64: payload.imageBase64, imageMimeType: payload.imageMimeType }
          : undefined;
      if (createdNewConversation) {
        setTimeout(() => void runSearch(id, text, media), 0);
      } else {
        void runSearch(id, text, media);
      }
    },
    [t, activeConversationId, createConversation, navigate, appendUserMessage, runSearch]
  );

  const handleSuggestionSelect = useCallback(
    (prompt: string) => handleComposerSubmit({ text: prompt }),
    [handleComposerSubmit]
  );

  const handleRefineSearch = (interp: string) => {
    if (!activeConversationId) return;
    if (dbSearchId && currentResult) {
      const firstTrackId = currentResult.songs[0]?.id;
      if (firstTrackId && resultIdMap[firstTrackId]) {
        trackInteraction({
          searchResultId: resultIdMap[firstTrackId],
          searchId: dbSearchId,
          interactionType: "refine_from_result",
          metadata: { refinedTo: interp },
        });
      }
    }
    appendUserMessage(activeConversationId, interp);
    void runSearch(activeConversationId, interp);
  };

  const handleNewChat = () => {
    const id = createConversation();
    navigate(`${CHAT_PATH}?conversation=${id}`, { replace: true });
    setSidebarOpen(false);
  };

  const handleSelectChat = (id: string) => {
    selectConversation(id);
    navigate(`${CHAT_PATH}?conversation=${id}`, { replace: true });
    setSidebarOpen(false);
  };

  useEffect(() => {
    const cid = searchParams.get("conversation");
    if (cid && conversations.some((c) => c.id === cid)) {
      selectConversation(cid);
    }
  }, [searchParams, conversations, selectConversation]);

  useEffect(() => {
    if (searchParams.get("q")) return;
    if (!activeConversationId) {
      if (conversations.length > 0) {
        selectConversation(conversations[0].id);
        setSearchParams({ conversation: conversations[0].id }, { replace: true });
      } else {
        const id = createConversation();
        setSearchParams({ conversation: id }, { replace: true });
      }
      return;
    }
    if (!searchParams.get("conversation")) {
      setSearchParams({ conversation: activeConversationId }, { replace: true });
    }
  }, [
    activeConversationId,
    conversations,
    createConversation,
    selectConversation,
    searchParams,
    setSearchParams,
  ]);

  useEffect(() => {
    if (qProcessed.current) return;
    const q = searchParams.get("q");
    if (!q) return;
    qProcessed.current = true;
    const id = createConversation();
    navigate(`${CHAT_PATH}?conversation=${encodeURIComponent(id)}`, { replace: true });
    appendUserMessage(id, q);
    setTimeout(() => void runSearch(id, q), 0);
  }, [searchParams, createConversation, navigate, appendUserMessage, runSearch]);

  useEffect(() => {
    if (luckyProcessed.current) return;
    const st = location.state as { luckyPayload?: import("@/services/musicSearchApi").MusicSearchResponse } | undefined;
    if (!st?.luckyPayload?.emotionalProfile || !st.luckyPayload.songs?.length) return;
    luckyProcessed.current = true;
    const id = createConversation();
    const surpriseLabel = t("chat.surpriseMe");
    appendUserMessage(id, surpriseLabel);
    const data = st.luckyPayload;
    const luckySongs = dedupeSongVersions(data.songs!);
    const presentation: SearchResult["playbackPresentation"] = isGloballyPlaying ? "pick" : "inline";
    const result = buildSearchResult(
      surpriseLabel,
      {
        emotionalProfile: data.emotionalProfile!,
        songs: luckySongs,
        adjacentInterpretations: data.adjacentInterpretations || [],
        narrativeReply: data.narrativeReply,
      },
      presentation
    );
    appendAssistantResult(id, result);
    if (!isGloballyPlaying) {
      playNowReplace(luckySongs, 0, true, {
        conversationId: id,
        searchResultId: result.id,
        prompt: result.prompt,
      });
    }
    if (data.conversationMemoryUpdate?.standardAxes) {
      mergeConversationMemoryFromUpdate(id, {
        threadSummary: data.conversationMemoryUpdate.threadSummary ?? "",
        standardAxes: normalizeStandardAxes(data.conversationMemoryUpdate.standardAxes as Record<string, unknown>),
      });
    } else {
      mergeConversationMemoryFromUpdate(id, {
        threadSummary: data.emotionalProfile!.mood.slice(0, 400),
        standardAxes: emotionalProfileToAxes(data.emotionalProfile!),
      });
    }
    if (data.userTasteProfileUpdate) mergeUserTasteFromUpdate(data.userTasteProfileUpdate);
    navigate(`${CHAT_PATH}?conversation=${id}`, { replace: true, state: {} });
    void (async () => {
      const searchId = await trackSearch({ rawPrompt: surpriseLabel, profile: result.emotionalProfile });
      setDbSearchId(searchId);
      if (searchId) {
        const map = await trackResults(searchId, result.songs);
        setResultIdMap(map);
        if (Object.keys(map).length > 0) {
          patchSearchResultTracking(id, result.id, { searchId, resultIdsBySongId: map });
        }
      }
    })();
  }, [
    t,
    location.state,
    createConversation,
    appendUserMessage,
    appendAssistantResult,
    patchSearchResultTracking,
    mergeConversationMemoryFromUpdate,
    mergeUserTasteFromUpdate,
    navigate,
    isGloballyPlaying,
    playNowReplace,
  ]);

  useEffect(() => {
    return () => {
      if (dbSearchId && currentResult) {
        maybeCreateTrainingEvent({
          searchId: dbSearchId,
          rawPrompt: currentResult.prompt,
          interpretationSummary: currentResult.emotionalProfile.mood,
          displayedResults: currentResult.songs.map((s) => ({
            trackId: s.id,
            title: s.title,
            artist: s.artist,
            relevanceScore: s.relevanceScore,
          })),
          interactionSummary: [],
          feedbackSummary: [],
        });
      }
    };
  }, [dbSearchId, currentResult]);

  const handleToggleFavorite = (songId: string) => {
    const song =
      queue.find((s) => s.id === songId) ?? currentResult?.songs.find((s) => s.id === songId);
    if (song) toggleFavorite(song);
  };

  const sidebar = (
    <div className="flex flex-col h-full min-h-0">
      <Button
        variant="outline"
        className="mb-4 w-full justify-start gap-2 rounded-xl h-10 font-body text-sm border-border/60 hover:border-primary/30 hover:bg-primary/[0.05] transition-all"
        onClick={handleNewChat}
      >
        <MessageSquarePlus className="w-4 h-4 text-primary/70" />
        {t("chat.newChat")}
      </Button>
      <p className="text-[10px] text-muted-foreground/60 font-body uppercase tracking-[0.14em] font-medium mb-2 px-1">
        {t("chat.conversations")}
      </p>
      <div className="flex-1 overflow-y-auto space-y-0.5 -mx-1 px-1">
        {conversations.map((c) => {
          const isActive = c.id === activeConversationId;
          return (
            <div
              key={c.id}
              className={cn(
                "group flex items-start gap-0.5 rounded-xl transition-all duration-200",
                isActive
                  ? "bg-primary/8 ring-1 ring-primary/15"
                  : "hover:bg-muted/60"
              )}
            >
              <button
                type="button"
                onClick={() => handleSelectChat(c.id)}
                className="flex-1 text-left px-3 py-2.5 rounded-xl min-w-0"
              >
                <span className={cn(
                  "line-clamp-2 text-[13px] font-body leading-snug",
                  isActive ? "font-semibold text-foreground" : "font-medium text-foreground/80"
                )}>
                  {c.title}
                </span>
                <span className="text-[10px] text-muted-foreground/50 block mt-1 font-body">
                  {new Date(c.updatedAt).toLocaleDateString(i18n.language)}
                </span>
              </button>
              <button
                type="button"
                className="p-2 mt-1 opacity-0 group-hover:opacity-60 hover:!opacity-100 text-muted-foreground hover:text-destructive shrink-0 transition-opacity"
                aria-label={t("chat.deleteChatAria")}
                onClick={(e) => {
                  e.stopPropagation();
                  deleteConversation(c.id);
                  if (isActive) {
                    const next = conversations.find((x) => x.id !== c.id);
                    if (next) handleSelectChat(next.id);
                    else {
                      const nid = createConversation();
                      navigate(`${CHAT_PATH}?conversation=${nid}`, { replace: true });
                    }
                  }
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );

  const memorySummary = activeConversation?.conversationMemory?.threadSummary;
  const standardAxes = activeConversation?.conversationMemory?.standardAxes;

  const tagSong = currentSong ?? currentResult?.songs[0];

  const handlePlayerPlaybackChange = useCallback(
    (playing: boolean) => {
      setGlobalPlaying(playing);
      if (!playing || !queue.length) return;
      const song = queue[currentIndex];
      if (!song) return;
      const tagged = queueSources[currentIndex];
      const fallback =
        activeConversationId && currentResult?.songs.some((s) => s.id === song.id)
          ? {
              conversationId: activeConversationId,
              searchResultId: currentResult.id,
              prompt: currentResult.prompt,
            }
          : null;
      const src = tagged ?? fallback;
      if (!src) return;
      const conv = getConversation(src.conversationId);
      recordListen({
        conversationId: src.conversationId,
        searchResultId: src.searchResultId,
        prompt: src.prompt,
        chatTitle: conv?.title,
        song,
      });
    },
    [
      setGlobalPlaying,
      queue,
      queueSources,
      currentIndex,
      activeConversationId,
      currentResult,
      getConversation,
      recordListen,
    ]
  );

  const historyChatExists = useCallback(
    (id: string) => conversations.some((c) => c.id === id),
    [conversations]
  );

  const handleReplayHistoryEntry = useCallback(
    (entry: ListenHistoryEntry) => {
      playNowReplace(
        [entry.song],
        0,
        true,
        {
          conversationId: entry.conversationId,
          searchResultId: entry.searchResultId,
          prompt: entry.prompt,
        }
      );
      setDockPopover(null);
    },
    [playNowReplace]
  );

  const handleOpenHistoryChat = useCallback(
    (entry: ListenHistoryEntry) => {
      if (!conversations.some((c) => c.id === entry.conversationId)) return;
      selectConversation(entry.conversationId);
      navigate(`${CHAT_PATH}?conversation=${encodeURIComponent(entry.conversationId)}`);
      setDockPopover(null);
    },
    [conversations, selectConversation, navigate]
  );

  const composerProps = useMemo(
    () => ({
      onSubmit: handleComposerSubmit,
      isLoading,
      size: "compact" as const,
      placeholder: t("chat.composerPlaceholder"),
      allowImageAttachment: true as const,
    }),
    [handleComposerSubmit, isLoading, t]
  );

  return (
    <>
    <AppLayout>
      <div
        className="relative flex flex-col md:flex-row w-full max-w-[1600px] mx-auto min-h-[calc(100vh-3.5rem)]"
      >
        <aside
          className={cn(
            "hidden md:flex shrink-0 flex-col border-r border-border/30 bg-gradient-to-b from-card/50 to-card/20 transition-[width] duration-300 ease-out overflow-hidden",
            conversationsPanelOpen ? "w-[250px]" : "w-0 border-transparent"
          )}
          aria-hidden={!conversationsPanelOpen}
        >
          <div className="w-[250px] h-full min-h-[calc(100vh-3.5rem)] max-h-[calc(100vh-3.5rem)] flex flex-col p-4 box-border">
            {sidebar}
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <header className="shrink-0 flex items-center justify-between gap-3 px-4 md:px-6 py-2.5 border-b border-border/30 bg-background/80 backdrop-blur-xl">
            <div className="flex items-center gap-2.5 min-w-0">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="hidden md:inline-flex shrink-0 h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
                onClick={() => setConversationsPanelOpen((o) => !o)}
                aria-expanded={conversationsPanelOpen}
                aria-label={conversationsPanelOpen ? t("chat.panelClose") : t("chat.panelOpen")}
              >
                {conversationsPanelOpen ? (
                  <PanelLeftClose className="w-4 h-4" />
                ) : (
                  <PanelLeftOpen className="w-4 h-4" />
                )}
              </Button>
              <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="md:hidden gap-1.5 rounded-lg h-8 shrink-0 text-muted-foreground">
                    <PanelLeft className="w-4 h-4" />
                    {t("nav.chat")}
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[min(100%,300px)] pt-12 border-border/40">
                  {sidebar}
                </SheetContent>
              </Sheet>
              <div className="min-w-0">
                <h1 className="font-body text-sm md:text-[15px] font-semibold text-foreground tracking-tight truncate">
                  {t("chat.musicChat")}
                </h1>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNewChat}
              className="gap-1.5 shrink-0 rounded-lg h-8 text-muted-foreground hover:text-foreground"
            >
              <MessageSquarePlus className="w-4 h-4" />
              <span className="hidden sm:inline text-xs font-body">{t("chat.newShort")}</span>
            </Button>
          </header>

          <div className="flex-1 flex flex-col lg:flex-row min-h-0 gap-0">
            <div className="flex-1 flex flex-col min-h-0 min-w-0">
              <div
                className="flex-1 overflow-y-auto overscroll-contain px-4 md:px-6 py-5 space-y-5"
                style={{ paddingBottom: scrollPadBottom }}
              >
              {!hasAnyMessage && !isLoading && (
                <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 animate-fade-in">
                  <div className="text-center max-w-md mx-auto px-4">
                    <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center mx-auto mb-6 ring-1 ring-primary/10 shadow-lg shadow-primary/[0.04]">
                      <Lightbulb className="w-8 h-8 text-primary/80" />
                    </div>
                    <h2 className="font-display text-2xl md:text-3xl font-semibold mb-3 text-foreground/95">{t("chat.emptyTitle")}</h2>
                    <p className="text-muted-foreground/70 font-body text-sm leading-relaxed max-w-sm mx-auto">
                      {t("chat.emptyBody")}
                    </p>
                  </div>
                  <div className="max-w-xl mx-auto w-full">
                    <p className="text-[10px] text-muted-foreground/50 font-body uppercase tracking-[0.12em] font-medium mb-3 text-center">
                      {t("chat.tryLike")}
                    </p>
                    <PromptSuggestions suggestions={discoverSuggestions} onSelect={handleSuggestionSelect} />
                  </div>
                </div>
              )}

              {hasAnyMessage && (
                <div className="max-w-3xl mx-auto w-full space-y-4">
                  {activeConversation?.messages.map((m, mi) => {
                    if (m.role === "user") {
                      return (
                        <div
                          key={m.id}
                          className="flex justify-end animate-fade-slide-up"
                          style={{ animationDelay: `${mi * 30}ms` }}
                        >
                          <div className="max-w-[min(85%,480px)]">
                            <div className="rounded-2xl rounded-br-sm bg-gradient-to-br from-primary/15 to-primary/6 border border-primary/15 px-4 py-3 text-[13px] font-body text-foreground leading-relaxed shadow-sm space-y-2">
                              {m.imagePreviewUrl ? (
                                <img
                                  src={m.imagePreviewUrl}
                                  alt=""
                                  className="rounded-lg max-h-48 w-full object-cover ring-1 ring-primary/10"
                                />
                              ) : null}
                              {m.text ? <p className="whitespace-pre-wrap">{m.text}</p> : null}
                            </div>
                          </div>
                        </div>
                      );
                    }
                    const isLatest = m.id === latestAssistant?.id;
                    const r = m.searchResult;
                    const isInlineLatest = isLatest && r.playbackPresentation === "inline";
                    return (
                      <div
                        key={m.id}
                        className={cn(
                          "mr-auto max-w-[min(100%,42rem)] rounded-2xl border p-4 md:p-5 backdrop-blur-md transition-shadow duration-300 animate-fade-slide-up",
                          isLatest
                            ? "border-primary/20 bg-gradient-to-br from-card/80 via-card/60 to-primary/[0.02] shadow-lg shadow-primary/[0.06] ring-1 ring-primary/10"
                            : "border-border/30 bg-card/50 shadow-sm"
                        )}
                        style={{ animationDelay: `${mi * 30}ms` }}
                      >
                        <div className="flex items-center gap-2.5 mb-3.5">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-primary/8 ring-1 ring-primary/10">
                            <Bot className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <span className="text-xs font-body font-semibold text-foreground/80 tracking-wide">{t("chat.echoes")}</span>
                        </div>
                        {r.songs.length > 0 && activeConversationId ? (
                          <AssistantSongNarrative
                            narrative={
                              r.narrativeReply?.trim() ||
                              fallbackNarrativeForResult(r.prompt, r.emotionalProfile, {
                                lucky: isLuckyPrompt(r.prompt),
                                songCount: r.songs.length,
                              })
                            }
                            songs={r.songs}
                            source={{
                              conversationId: activeConversationId,
                              searchResultId: r.id,
                              prompt: r.prompt,
                            }}
                            queue={queue}
                            currentIndex={currentIndex}
                            isGloballyPlaying={isGloballyPlaying}
                            playTrackFromResult={playTrackFromResult}
                            appendToQueue={appendToQueue}
                            insertAfterCurrent={insertAfterCurrent}
                            isFavorite={isFavorite}
                            toggleFavorite={toggleFavorite}
                            tracking={r.tracking}
                          />
                        ) : null}
                        {isInlineLatest &&
                          r.playbackPresentation === "inline" &&
                          totalInlineAssistantTurns === 1 && (
                          <p className="text-[11px] text-muted-foreground/60 font-body mt-3 leading-relaxed">
                            {isMobile ? t("chat.playbackHintMobile") : t("chat.playbackHintDesktop")}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {isLoading && (
                <div className="max-w-3xl mx-auto w-full">
                  <MusicSearchThinking active />
                </div>
              )}

              {currentResult && !isLoading && (
                <div className="max-w-3xl mx-auto w-full space-y-5 pt-2">
                  {!hideInlineDockExtras && (
                    <>
                      {showEmotionalProfile && tagSong && currentResult && (
                        <div className="w-full max-w-lg mx-auto animate-fade-slide-up relative">
                          <button
                            type="button"
                            onClick={() => setShowEmotionalProfile(false)}
                            className="absolute top-3 right-3 p-1.5 rounded-lg bg-card/80 hover:bg-muted transition-colors z-10 border border-border/30"
                          >
                            <X className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                          <EmotionalProfileCard profile={currentResult.emotionalProfile} />
                          <div className="rounded-xl border border-border/30 bg-card/50 p-3.5 mt-3">
                            <span className="text-[11px] font-body text-primary font-medium px-2.5 py-1 rounded-lg bg-primary/8">
                              {t("chat.matchLabel", { score: tagSong.relevanceScore })}
                            </span>
                            <div className="flex flex-wrap gap-1 mt-2.5">
                              {tagSong.emotionalTags.map((tag) => (
                                <span
                                  key={tag}
                                  className="text-[10px] px-2 py-0.5 rounded-md bg-primary/6 text-primary/70 font-body font-medium"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {queue.length > 1 && (
                        <div className="w-full max-w-lg mx-auto">
                          <button
                            type="button"
                            onClick={() => setShowQueue(!showQueue)}
                            className="flex items-center gap-2 mx-auto px-4 py-2 rounded-xl border border-border/40 text-xs font-body font-medium text-muted-foreground hover:text-foreground hover:border-primary/25 hover:bg-primary/[0.04] transition-all"
                          >
                            <ListMusic className="w-3.5 h-3.5" />
                            <span>
                              {showQueue ? t("chat.queueHide") : t("chat.queueShow")}{" "}
                              {t("chat.queueTracks", { count: queue.length })}
                            </span>
                            {showQueue ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                          {showQueue && (
                            <div className="mt-3 rounded-2xl border border-border/30 bg-card/50 p-4 animate-fade-slide-up">
                              <TrackQueue
                                songs={queue}
                                currentIndex={currentIndex}
                                onSelect={setCurrentIndex}
                                isFavorite={isFavorite}
                                onToggleFavorite={handleToggleFavorite}
                                onReorder={reorderQueue}
                                onRemove={removeFromQueue}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {currentResult.adjacentInterpretations.length > 0 && (
                    <div className="w-full max-w-lg mx-auto">
                      <div className="flex items-center gap-2 mb-3">
                        <RefreshCw className="w-3.5 h-3.5 text-muted-foreground/50" />
                        <p className="text-xs text-muted-foreground/60 font-body font-medium">{t("chat.maybeMeant")}</p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {currentResult.adjacentInterpretations.map((interp, ii) => (
                          <button
                            key={interp}
                            type="button"
                            onClick={() => handleRefineSearch(interp)}
                            className="text-xs px-3.5 py-2 rounded-xl border border-border/40 bg-card/40 text-foreground/70 hover:text-foreground hover:border-primary/30 hover:bg-primary/[0.05] transition-all font-body animate-fade-slide-up"
                            style={{ animationDelay: `${ii * 60}ms` }}
                          >
                            {interp}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              </div>
            </div>

            {activeConversation && (memorySummary || standardAxes || activeConversation.conversationProfile) && (
              <aside className="hidden lg:flex lg:w-64 shrink-0 flex-col gap-3 lg:border-l lg:border-border/20 lg:pl-5 lg:py-5 lg:overflow-y-auto lg:max-h-[calc(100dvh-3.5rem-3rem)]">
                <p className="text-[10px] text-muted-foreground/50 font-body uppercase tracking-[0.14em] font-medium">{t("chat.threadProfile")}</p>
                {memorySummary && (
                  <div className="rounded-xl border border-border/20 bg-card/40 p-3.5 text-[12px] font-body text-secondary-foreground/80 leading-relaxed">
                    {memorySummary}
                  </div>
                )}
                {standardAxes && (
                  <div className="rounded-xl border border-border/20 bg-card/40 p-3.5 text-[11px] font-body space-y-2 text-muted-foreground/70">
                    <span className="uppercase tracking-[0.12em] text-[9px] font-medium text-muted-foreground/50">{t("chat.axes")}</span>
                    <p className="text-foreground/70 leading-relaxed">
                      {t("chat.axisEnergy")}: {standardAxes.energy} · {t("chat.axisIntimacy")}: {standardAxes.intimacy}/5 ·{" "}
                      {t("chat.axisTension")}: {standardAxes.emotionalTension} · {t("chat.axisCatharsis")}:{" "}
                      {standardAxes.catharsis}
                    </p>
                    {standardAxes.moodLabel && (
                      <p className="text-foreground/60 text-[11px]">{standardAxes.moodLabel}</p>
                    )}
                    {standardAxes.dominantThemes.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {standardAxes.dominantThemes.map((t) => (
                          <span key={t} className="px-1.5 py-0.5 rounded-md bg-primary/6 text-primary/70 text-[10px] font-medium">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {activeConversation.conversationProfile && (
                  <div className="hidden xl:block">
                    <EmotionalProfileCard profile={activeConversation.conversationProfile} />
                  </div>
                )}
              </aside>
            )}
          </div>
        </div>
      </div>
    </AppLayout>

    <div
      ref={chatDockRef}
      className={cn(
        "fixed inset-x-0 z-[42] flex flex-col bg-background/95 backdrop-blur-2xl border-t border-border/20 shadow-[0_-4px_24px_-4px_rgba(0,0,0,0.15)]",
        isMobile ? "bottom-14" : "bottom-0"
      )}
    >
      <div className="px-4 md:px-6 py-2.5">
        <div className="max-w-[1600px] w-full mx-auto">
          <div className="max-w-3xl w-full mx-auto space-y-1.5">
            {dbSearchId && <SearchFeedback searchId={dbSearchId} />}
            <PromptInput {...composerProps} />
          </div>
        </div>
      </div>
      {queue.length > 0 ? (
        <div className="border-t border-border/15 bg-card/80 backdrop-blur-2xl">
          <div className="max-w-[1600px] w-full mx-auto px-2 md:px-6 pt-1.5 pb-1.5">
            <FullPlayer
              variant={isMobile ? "default" : "dock"}
              songs={queue}
              currentIndex={currentIndex}
              onChangeIndex={setCurrentIndex}
              isFavorite={isFavorite}
              onToggleFavorite={handleToggleFavorite}
              onShowDetails={
                isMobile ? () => setShowEmotionalProfile(!showEmotionalProfile) : undefined
              }
              autoplay={pendingAutoplay}
              onAutoplayConsumed={() => setPendingAutoplay(false)}
              onPlaybackStateChange={handlePlayerPlaybackChange}
              dockPanelActions={
                !isMobile ? (
                  <DiscoverDockPanelActions
                    dockPopover={dockPopover}
                    setDockPopover={setDockPopover}
                    currentResult={currentResult}
                    tagSong={tagSong}
                    queue={queue}
                    currentIndex={currentIndex}
                    setCurrentIndex={setCurrentIndex}
                    reorderQueue={reorderQueue}
                    removeFromQueue={removeFromQueue}
                    isFavorite={isFavorite}
                    onToggleFavorite={handleToggleFavorite}
                    listenHistory={listenHistory}
                    historyChatExists={historyChatExists}
                    onReplayHistoryEntry={handleReplayHistoryEntry}
                    onOpenHistoryChat={handleOpenHistoryChat}
                  />
                ) : undefined
              }
            />
          </div>
        </div>
      ) : null}
    </div>
    </>
  );
};

export default Chat;
