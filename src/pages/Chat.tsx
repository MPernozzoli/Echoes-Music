import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams, useNavigate, useLocation, Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import PromptInput, { type PromptSubmitPayload } from "@/components/PromptInput";
import PromptSuggestions from "@/components/PromptSuggestions";
import TrackQueue from "@/components/TrackQueue";
import EmotionalProfileCard from "@/components/EmotionalProfile";
import MusicSearchThinking from "@/components/MusicSearchThinking";
import SearchFeedback from "@/components/SearchFeedback";
import { pickDiscoverPromptSuggestions } from "@/lib/discoverPromptSuggestions";
import type { SearchResult, Song } from "@/data/mockData";
import { useApp } from "@/context/useApp";
import { useAuth } from "@/context/useAuth";
import { useSpotify } from "@/context/useSpotify";
import { useAppleMusic } from "@/context/useAppleMusic";
import { usePlaybackQueue } from "@/context/usePlaybackQueue";
import { useConversations } from "@/context/useConversations";
import { memoryOrFromProfile } from "@/lib/conversationMemory";
import { callMusicSearch } from "@/services/musicSearchApi";
import { trackSearch, trackResults, trackInteraction, maybeCreateTrainingEvent } from "@/services/tracking";
import { emotionalProfileToAxes } from "@/types/conversation";
import { normalizeStandardAxes } from "@/lib/memoryMerge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Bot,
  Lightbulb,
  RefreshCw,
  ListMusic,
  Headphones,
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
import type { ChatMessage, Conversation } from "@/types/conversation";
import { cn } from "@/lib/utils";
import { dedupeSongVersions, filterSongsByMinRelevance } from "@/lib/dedupeSongs";
import { buildEmptySearchResult } from "@/lib/emptySearchResult";
import { AssistantSongNarrative } from "@/components/AssistantSongNarrative";
import { fallbackNarrativeForResult } from "@/lib/assistantNarrative";
import { useIsMobile } from "@/hooks/use-mobile";
import { useStreamingPlaybackMode } from "@/hooks/useStreamingPlaybackMode";
import { usePrefetchAppleMusicCatalogIds } from "@/hooks/usePrefetchAppleMusicCatalogIds";
import { animate, stagger } from "animejs";
import { isLuckyPrompt } from "@/constants/luckyPrompt";
import type { MusicSearchMode } from "@/services/musicSearchApi";

function buildSearchResult(
  prompt: string,
  data: {
    emotionalProfile: SearchResult["emotionalProfile"];
    songs: SearchResult["songs"];
    adjacentInterpretations: string[];
    narrativeReply?: string;
  },
  searchMode?: SearchResult["searchMode"],
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
    ...(searchMode ? { searchMode } : {}),
    ...(playbackPresentation ? { playbackPresentation } : {}),
  };
}

const CHAT_PATH = "/chat";

function conversationPreviewArtwork(c: Conversation): string | undefined {
  for (let i = c.messages.length - 1; i >= 0; i--) {
    const m = c.messages[i];
    if (m.role === "assistant") {
      const url = m.searchResult.songs[0]?.artwork;
      if (url) return url;
    }
  }
  return undefined;
}

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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [conversationsPanelOpen, setConversationsPanelOpen] = useState(true);
  const chatDockRef = useRef<HTMLDivElement>(null);
  const chatEmptyRef = useRef<HTMLDivElement | null>(null);
  const [chatDockInset, setChatDockInset] = useState(0);

  const isMobile = useIsMobile();
  const { refreshTokenBalance, user } = useAuth();
  const { isConnected: spotifyConnected, loading: spotifyLoading } = useSpotify();
  const {
    isAvailable: appleMusicAvailable,
    isAuthorized: appleMusicAuthorized,
    isLinkedAccount: appleMusicLinkedAccount,
    loading: appleMusicLoading,
  } = useAppleMusic();
  const {
    queue,
    currentIndex,
    setCurrentIndex,
    isGloballyPlaying,
    playNowReplace,
    playTrackFromResult,
    appendToQueue,
    insertAfterCurrent,
    reorderQueue,
    removeFromQueue,
  } = usePlaybackQueue();

  const { toggleFavorite, isFavorite, descriptionLanguage } = useApp();
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
  const landingFromHomeProcessed = useRef(false);
  const luckyProcessed = useRef(false);

  const activeConversation = getConversation(activeConversationId) ?? null;
  const assistantTurns = activeConversation?.messages.filter(
    (m): m is Extract<ChatMessage, { role: "assistant" }> => m.role === "assistant"
  );
  const latestAssistant = assistantTurns?.[assistantTurns.length - 1];
  const currentResult = latestAssistant?.searchResult ?? null;

  const playbackMode = useStreamingPlaybackMode();
  const prefetchCatalogSongs = useMemo(() => {
    const out: Song[] = [];
    const seen = new Set<string>();
    for (const s of queue) {
      if (!seen.has(s.id)) {
        seen.add(s.id);
        out.push(s);
      }
    }
    if (currentResult?.songs) {
      for (const s of currentResult.songs) {
        if (!seen.has(s.id)) {
          seen.add(s.id);
          out.push(s);
        }
      }
    }
    return out;
  }, [queue, currentResult?.songs, currentResult?.id]);

  usePrefetchAppleMusicCatalogIds(
    prefetchCatalogSongs,
    playbackMode === "apple" && prefetchCatalogSongs.length > 0,
    descriptionLanguage,
  );

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    if (hasAnyMessage || isLoading) return;
    const root = chatEmptyRef.current;
    if (!root) return;

    const icon = root.querySelector<HTMLElement>("[data-anime='empty-icon']");
    const title = root.querySelector<HTMLElement>("[data-anime='empty-title']");
    const body = root.querySelector<HTMLElement>("[data-anime='empty-body']");

    const cleanups: Array<() => void> = [];

    if (icon) {
      icon.style.opacity = "0";
      animate(icon, {
        opacity: [0, 1],
        scale: [0.6, 1],
        rotate: [-6, 0],
        duration: 900,
        ease: "outExpo",
      });
      const breathe = animate(icon, {
        scale: [1, 1.04, 1],
        duration: 3400,
        ease: "inOutSine",
        loop: true,
        delay: 1100,
      });
      cleanups.push(() => breathe.pause?.());
    }

    [title, body].forEach((el, i) => {
      if (!el) return;
      el.style.opacity = "0";
      animate(el, {
        opacity: [0, 1],
        translateY: [14, 0],
        filter: ["blur(5px)", "blur(0px)"],
        duration: 750,
        delay: 280 + i * 120,
        ease: "outQuart",
      });
    });

    return () => {
      cleanups.forEach((fn) => fn());
    };
  }, [hasAnyMessage, isLoading, activeConversationId]);

  const appleMusicLinked =
    appleMusicAuthorized || appleMusicLinkedAccount || (appleMusicAvailable && appleMusicAuthorized);
  const streamingLinked = spotifyConnected || appleMusicLinked;
  const streamingProviderPreference =
    appleMusicLinked && !spotifyConnected
      ? "apple_music"
      : spotifyConnected && !appleMusicLinked
        ? "spotify"
        : "auto";
  const showStreamingConnectBanner =
    Boolean(user) &&
    hasAnyMessage &&
    !spotifyLoading &&
    !appleMusicLoading &&
    !streamingLinked;
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
      media?: { imageBase64: string; imageMimeType: string },
      mode: Extract<MusicSearchMode, "search" | "creator_trends"> = "search"
    ) => {
      const conv = getConversation(conversationId);
      if (!conv) return;

      const displayPrompt =
        prompt.trim() ||
        (media ? t("chat.imageSearchLabel") : prompt);

      setIsLoading(true);
      setShowQueue(false);
      setShowEmotionalProfile(false);
      setDbSearchId(null);
      setResultIdMap({});

      const memoryPayload = memoryOrFromProfile(conv.conversationMemory, conv.conversationProfile);

      try {
        const data = await callMusicSearch({
          ...(prompt.trim() ? { prompt: prompt.trim() } : {}),
          ...(media
            ? { imageBase64: media.imageBase64, imageMimeType: media.imageMimeType }
            : {}),
          ...(mode !== "search" ? { mode } : {}),
          descriptionLanguage,
          streamingProviderPreference,
          conversationMemory: memoryPayload,
          userTasteProfile,
          conversationId,
        });

        if (data.error) {
          if (data.code?.startsWith("anon_")) {
            toast.error(data.error || t("chat.anonQuotaLogin"));
            setIsLoading(false);
            navigate("/auth", { replace: true });
            return;
          }
          if (data.code?.startsWith("byo_")) {
            toast.error(data.error || t("chat.toastSearchFailed"), {
              description: data.byo_fallback_suggested
                ? "You can return to Echoes managed AI under Profile → Advanced AI Settings."
                : undefined,
            });
            setIsLoading(false);
            void refreshTokenBalance();
            return;
          }
          if (data.error.includes("Rate") || data.error.includes("429")) toast.error(t("chat.toastRate"));
          else if (
            data.error.includes("credits") ||
            data.error.includes("402") ||
            data.error.includes("Insufficient")
          ) {
            toast.error(t("chat.toastCredits"));
          } else toast.error(data.error || t("chat.toastSearchFailed"));
          setIsLoading(false);
          void refreshTokenBalance();
          return;
        }

        const rawSongs = Array.isArray(data.songs) ? data.songs : [];
        const songs = filterSongsByMinRelevance(dedupeSongVersions(rawSongs));

        if (!songs.length) {
          const narrative = data.narrativeReply?.trim() || t("chat.noResultsNarrative");
          const emptyResult = buildEmptySearchResult({
            prompt: displayPrompt,
            narrative,
            emotionalProfile: data.emotionalProfile,
            adjacentInterpretations: data.adjacentInterpretations,
            searchMode: mode,
          });
          appendAssistantResult(conversationId, emptyResult);
          if (data.conversationMemoryUpdate?.standardAxes) {
            mergeConversationMemoryFromUpdate(conversationId, {
              threadSummary: data.conversationMemoryUpdate.threadSummary ?? "",
              standardAxes: normalizeStandardAxes(
                data.conversationMemoryUpdate.standardAxes as Record<string, unknown>
              ),
            });
          } else if (data.emotionalProfile) {
            mergeConversationMemoryFromUpdate(conversationId, {
              threadSummary: data.emotionalProfile.mood.slice(0, 400),
              standardAxes: emotionalProfileToAxes(data.emotionalProfile),
            });
          }
          if (data.userTasteProfileUpdate) {
            mergeUserTasteFromUpdate(data.userTasteProfileUpdate);
          }
          setIsLoading(false);
          void refreshTokenBalance();
          const searchId = await trackSearch({
            rawPrompt: displayPrompt,
            profile: emptyResult.emotionalProfile,
          });
          setDbSearchId(searchId);
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
          mode,
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
        void refreshTokenBalance();

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
        void refreshTokenBalance();
      }
    },
    [
      t,
      refreshTokenBalance,
      getConversation,
      descriptionLanguage,
      streamingProviderPreference,
      userTasteProfile,
      appendAssistantResult,
      patchSearchResultTracking,
      mergeConversationMemoryFromUpdate,
      mergeUserTasteFromUpdate,
      isGloballyPlaying,
      playNowReplace,
      navigate,
    ]
  );

  const handleComposerSubmit = useCallback(
    (payload: PromptSubmitPayload) => {
      const text = payload.text.trim();
      const hasImg = Boolean(payload.imageBase64 && payload.imageMimeType);
      const mode = payload.mode === "creator_trends" ? "creator_trends" : "search";
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
        setTimeout(() => void runSearch(id, text, media, mode), 0);
      } else {
        void runSearch(id, text, media, mode);
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
    void runSearch(activeConversationId, interp, undefined, currentResult?.searchMode === "creator_trends" ? "creator_trends" : "search");
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
    const landingSt = location.state as { landingSearch?: PromptSubmitPayload } | undefined;
    const ls = landingSt?.landingSearch;
    if (ls) {
      const t0 = (ls.text || "").trim();
      const hasImg = Boolean(ls.imageBase64 && ls.imageMimeType);
      if (t0 || hasImg) return;
    }
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
    location.state,
  ]);

  useEffect(() => {
    const landingSt = location.state as { landingSearch?: PromptSubmitPayload } | undefined;
    const ls = landingSt?.landingSearch;
    if (!ls) {
      landingFromHomeProcessed.current = false;
      return;
    }
    if (landingFromHomeProcessed.current) return;
    const text = (ls.text || "").trim();
    const hasImg = Boolean(ls.imageBase64 && ls.imageMimeType);
    if (!text && !hasImg) return;
    landingFromHomeProcessed.current = true;
    const id = createConversation();
    if (!id) {
      landingFromHomeProcessed.current = false;
      return;
    }
    navigate(`${CHAT_PATH}?conversation=${encodeURIComponent(id)}`, { replace: true, state: {} });
    const displayText = text || t("chat.imageSearchLabel");
    const previewUrl =
      hasImg && ls.imageMimeType && ls.imageBase64
        ? `data:${ls.imageMimeType};base64,${ls.imageBase64}`
        : undefined;
    appendUserMessage(id, displayText, previewUrl ? { imagePreviewUrl: previewUrl } : undefined);
    const media =
      hasImg && ls.imageBase64 && ls.imageMimeType
        ? { imageBase64: ls.imageBase64, imageMimeType: ls.imageMimeType }
        : undefined;
    setTimeout(() => void runSearch(id, text, media), 0);
  }, [
    location.state,
    t,
    activeConversationId,
    conversations,
    createConversation,
    navigate,
    appendUserMessage,
    runSearch,
  ]);

  useEffect(() => {
    if (qProcessed.current) return;
    const q = searchParams.get("q");
    if (!q) return;
    qProcessed.current = true;
    const id = createConversation();
    if (!id) {
      qProcessed.current = false;
      return;
    }
    navigate(`${CHAT_PATH}?conversation=${encodeURIComponent(id)}`, { replace: true });
    appendUserMessage(id, q);
    setTimeout(() => void runSearch(id, q), 0);
  }, [
    searchParams,
    createConversation,
    navigate,
    appendUserMessage,
    runSearch,
  ]);

  useEffect(() => {
    if (luckyProcessed.current) return;
    const st = location.state as { luckyPayload?: import("@/services/musicSearchApi").MusicSearchResponse } | undefined;
    if (!st?.luckyPayload?.emotionalProfile || !st.luckyPayload.songs?.length) return;
    const data = st.luckyPayload;
    const luckySongs = filterSongsByMinRelevance(dedupeSongVersions(data.songs!));
    if (!luckySongs.length) return;
    const cid =
      searchParams.get("conversation") ||
      activeConversationId ||
      conversations[0]?.id;
    if (!cid) return;
    luckyProcessed.current = true;
    const id = cid;
    const surpriseLabel = t("chat.surpriseMe");
    appendUserMessage(id, surpriseLabel);
    const presentation: SearchResult["playbackPresentation"] = isGloballyPlaying ? "pick" : "inline";
    const result = buildSearchResult(
      surpriseLabel,
      {
        emotionalProfile: data.emotionalProfile!,
        songs: luckySongs,
        adjacentInterpretations: data.adjacentInterpretations || [],
        narrativeReply: data.narrativeReply,
      },
      "lucky",
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
    searchParams,
    activeConversationId,
    conversations,
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
      <div className="flex items-center justify-between mb-4 px-1">
        <p className="text-[11px] text-muted-foreground/75 font-body uppercase tracking-[0.16em] font-semibold">
          {t("chat.conversations")}
        </p>
        <button
          type="button"
          onClick={handleNewChat}
          className="inline-flex items-center justify-center h-8 w-8 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
          aria-label={t("chat.newChat")}
          title={t("chat.newChat")}
        >
          <MessageSquarePlus className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto space-y-0.5 -mx-1 px-1 scrollbar-thin">
        {conversations.map((c) => {
          const isActive = c.id === activeConversationId;
          const previewArt = conversationPreviewArtwork(c);
          return (
            <div
              key={c.id}
              className={cn(
                "group relative flex items-center gap-2.5 rounded-xl px-2 py-2 transition-colors",
                isActive
                  ? "bg-foreground/[0.06] dark:bg-foreground/[0.07]"
                  : "hover:bg-foreground/[0.03] dark:hover:bg-foreground/[0.04]"
              )}
            >
              {isActive && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full bg-primary"
                  aria-hidden
                />
              )}
              <button
                type="button"
                onClick={() => handleSelectChat(c.id)}
                className="flex flex-1 text-left gap-2.5 min-w-0 items-center focus-visible:outline-none"
              >
                <div
                  className={cn(
                    "relative h-9 w-9 shrink-0 rounded-lg overflow-hidden",
                    previewArt ? "bg-muted" : "bg-muted/60"
                  )}
                >
                  {previewArt ? (
                    <img src={previewArt} alt="" className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <MessageSquarePlus className="w-3.5 h-3.5 text-muted-foreground/50" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1 flex flex-col leading-tight">
                  <span
                    className={cn(
                      "truncate text-[13px] font-body",
                      isActive ? "font-semibold text-foreground" : "font-medium text-foreground/80"
                    )}
                  >
                    {c.title}
                  </span>
                  <span className="text-[11px] text-muted-foreground/60 font-body tabular-nums mt-0.5">
                    {new Date(c.updatedAt).toLocaleDateString(i18n.language, {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </div>
              </button>
              <button
                type="button"
                className="p-1.5 opacity-0 group-hover:opacity-50 hover:!opacity-100 text-muted-foreground hover:text-destructive shrink-0 transition-opacity rounded-lg"
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
  const isLuckyLatestTurn = Boolean(currentResult && isLuckyPrompt(currentResult.prompt));
  const isCreatorLatestTurn = currentResult?.searchMode === "creator_trends";

  const tagSong =
    currentResult?.songs.length && currentSong
      ? currentResult.songs.find((s) => s.id === currentSong.id) ?? currentResult.songs[0]
      : currentResult?.songs[0] ?? null;

  const composerProps = useMemo(
    () => ({
      onSubmit: handleComposerSubmit,
      isLoading,
      size: (!hasAnyMessage && !isLoading ? "hero" : "compact") as const,
      placeholder: t("chat.composerPlaceholder"),
      creatorPlaceholder: t("chat.creatorComposerPlaceholder"),
      allowImageAttachment: true as const,
      allowModeSwitch: true as const,
    }),
    [handleComposerSubmit, isLoading, hasAnyMessage, t]
  );

  return (
    <>
    <AppLayout>
      <div className="relative flex flex-col md:flex-row w-full max-w-[1600px] mx-auto min-h-[calc(100vh-3.5rem)] isolate">
        <aside
          className={cn(
            "hidden md:flex shrink-0 flex-col border-r border-borderSubtle/50 bg-background/40 transition-[width] duration-300 ease-out overflow-hidden",
            conversationsPanelOpen ? "w-[260px]" : "w-0 border-transparent"
          )}
          aria-hidden={!conversationsPanelOpen}
        >
          <div className="w-[260px] h-full min-h-[calc(100vh-3.5rem)] max-h-[calc(100vh-3.5rem)] flex flex-col px-3 pt-5 pb-4 box-border">
            {sidebar}
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-w-0 min-h-0 relative">
          <div
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_100%_55%_at_50%_-8%,hsl(var(--primary)/0.14),transparent_52%),radial-gradient(ellipse_70%_45%_at_100%_35%,hsl(var(--primary)/0.06),transparent_45%),radial-gradient(ellipse_55%_40%_at_0%_60%,hsl(var(--muted)/0.35),transparent_50%)] dark:bg-[radial-gradient(ellipse_100%_50%_at_50%_-5%,hsl(var(--primary)/0.18),transparent_50%),radial-gradient(ellipse_60%_50%_at_100%_40%,hsl(var(--primary)/0.08),transparent_48%)]"
            aria-hidden
          />
          <header className="shrink-0 flex items-center justify-between gap-3 px-4 md:px-7 py-3.5 md:py-4 border-b border-borderSubtle/70 bg-background/80 backdrop-blur-2xl supports-[backdrop-filter]:bg-background/65">
            <div className="flex items-center gap-2.5 md:gap-3 min-w-0">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="hidden md:inline-flex shrink-0 h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/70"
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
                  <Button
                    variant="ghost"
                    size="sm"
                    className="md:hidden gap-2 rounded-xl h-9 px-3 shrink-0 text-muted-foreground border border-borderSubtle/50 bg-card/40"
                  >
                    <PanelLeft className="w-4 h-4" />
                    {t("nav.chat")}
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="left"
                  className="w-[min(100%,300px)] pt-14 px-3 border-borderSubtle/50 bg-background"
                >
                  {sidebar}
                </SheetContent>
              </Sheet>
              <div className="min-w-0 flex flex-col gap-0.5">
                <h1 className="font-display text-lg md:text-xl font-semibold text-foreground tracking-tight truncate leading-tight">
                  {t("chat.musicChat")}
                </h1>
                <p className="font-body text-xs md:text-[13px] text-muted-foreground/85 leading-snug truncate max-w-[min(100%,28rem)]">
                  {t("chat.musicChatSubtitle")}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNewChat}
              className="gap-2 shrink-0 rounded-full h-9 px-3.5 border-borderSubtle/80 bg-card/50 hover:bg-primary/[0.08] hover:border-primary/25 text-foreground/90 font-body text-xs shadow-sm"
            >
              <MessageSquarePlus className="w-4 h-4 text-primary" />
              <span className="hidden sm:inline">{t("chat.newShort")}</span>
            </Button>
          </header>

          <div className="flex-1 flex flex-col lg:flex-row min-h-0 gap-0">
            <div className="flex-1 flex flex-col min-h-0 min-w-0">
              <div
                className="flex-1 overflow-y-auto overscroll-contain px-4 md:px-8 py-6 md:py-8 space-y-6 scrollbar-thin"
                style={{ paddingBottom: scrollPadBottom }}
              >
              {!hasAnyMessage && !isLoading && (
                <div ref={chatEmptyRef} className="flex flex-col items-center justify-center min-h-[min(68vh,560px)] gap-12 md:gap-14 px-3 md:px-6">
                  <div className="text-center max-w-lg mx-auto relative w-full">
                    <div
                      className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(100%,28rem)] aspect-square rounded-full bg-gradient-to-br from-primary/20 via-primary/5 to-transparent opacity-70 blur-3xl motion-reduce:opacity-40"
                      aria-hidden
                    />
                    <div
                      className="pointer-events-none absolute inset-0 opacity-[0.04] dark:opacity-[0.07] [background-image:linear-gradient(hsl(var(--foreground)/0.35)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--foreground)/0.35)_1px,transparent_1px)] [background-size:24px_24px] rounded-[2rem]"
                      aria-hidden
                    />
                    <div
                      data-anime="empty-icon"
                      className="relative w-24 h-24 md:w-28 md:h-28 rounded-[1.35rem] bg-gradient-to-br from-primary/30 via-primary/12 to-emotional-tag/10 flex items-center justify-center mx-auto mb-8 md:mb-10 ring-1 ring-primary/25 shadow-glow"
                    >
                      <Lightbulb className="w-11 h-11 md:w-12 md:h-12 text-primary drop-shadow-sm" />
                    </div>
                    <h2
                      data-anime="empty-title"
                      className="font-display text-3xl md:text-4xl font-semibold mb-4 md:mb-5 text-foreground text-balance tracking-tight"
                    >
                      {t("chat.emptyTitle")}
                    </h2>
                    <p
                      data-anime="empty-body"
                      className="text-muted-foreground font-body text-sm md:text-base leading-relaxed max-w-md mx-auto text-balance"
                    >
                      {t("chat.emptyBody")}
                    </p>
                  </div>
                  <div className="max-w-2xl mx-auto w-full space-y-5">
                    <div className="flex items-center gap-3 justify-center">
                      <span className="h-px w-10 md:w-16 bg-gradient-to-r from-transparent to-borderSubtle" aria-hidden />
                      <p className="text-[11px] md:text-xs text-muted-foreground/75 font-body uppercase tracking-[0.12em] font-semibold">
                        {t("chat.tryLike")}
                      </p>
                      <span className="h-px w-10 md:w-16 bg-gradient-to-l from-transparent to-borderSubtle" aria-hidden />
                    </div>
                    <PromptSuggestions suggestions={discoverSuggestions} onSelect={handleSuggestionSelect} />
                  </div>
                </div>
              )}

              {hasAnyMessage && (
                <div className="max-w-3xl mx-auto w-full space-y-5 md:space-y-6">
                  {showStreamingConnectBanner && (
                    <Alert className="border-primary/20 bg-gradient-to-br from-primary/[0.08] to-primary/[0.02] text-foreground shadow-md rounded-2xl pr-3 ring-1 ring-primary/10">
                      <Headphones className="h-4 w-4 text-primary/80" />
                      <AlertTitle className="font-body text-sm font-semibold text-foreground/90">
                        {t("chat.streamingConnectTitle")}
                      </AlertTitle>
                      <AlertDescription className="font-body text-[13px] text-muted-foreground mt-1.5 space-y-2">
                        <p>{t("chat.streamingConnectBody")}</p>
                        <Link
                          to="/profile#streaming-services"
                          className="inline-flex items-center gap-1 font-medium text-primary hover:underline underline-offset-2"
                        >
                          {t("chat.streamingConnectCta")}
                        </Link>
                      </AlertDescription>
                    </Alert>
                  )}
                  {activeConversation?.messages.map((m, mi) => {
                    if (m.role === "user") {
                      return (
                        <div
                          key={m.id}
                          className="flex justify-end animate-fade-slide-up"
                          style={{ animationDelay: `${mi * 30}ms` }}
                        >
                          <div className="max-w-[min(85%,480px)]">
                            <div className="rounded-2xl rounded-br-md bg-gradient-to-br from-primary/22 to-primary/8 border border-primary/25 px-5 py-4 text-sm md:text-[15px] font-body text-foreground leading-relaxed shadow-md ring-1 ring-primary/10 space-y-2">
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
                          "mr-auto max-w-[min(100%,42rem)] rounded-[1.35rem] border p-5 md:p-7 backdrop-blur-xl transition-shadow duration-300 animate-fade-slide-up",
                          isLatest
                            ? "border-primary/20 bg-gradient-to-br from-card/95 via-card/75 to-primary/[0.06] shadow-elevated ring-1 ring-primary/15"
                            : "border-borderSubtle/60 bg-card/70 shadow-soft"
                        )}
                        style={{ animationDelay: `${mi * 30}ms` }}
                      >
                        <div className="flex items-center gap-3 mb-4">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/8 ring-1 ring-primary/15 shadow-sm">
                            <Bot className="h-4 w-4 text-primary" />
                          </div>
                          <span className="text-xs md:text-[13px] font-body font-semibold text-foreground/85 tracking-wide">
                            {t("chat.echoes")}
                          </span>
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
                        ) : r.songs.length === 0 ? (
                          <p className="text-sm md:text-[15px] font-body text-foreground/90 leading-relaxed whitespace-pre-wrap">
                            {r.narrativeReply?.trim() || t("chat.noResultsNarrative")}
                          </p>
                        ) : null}
                        {isInlineLatest &&
                          r.playbackPresentation === "inline" &&
                          totalInlineAssistantTurns === 1 && (
                          <p className="text-xs sm:text-[13px] text-muted-foreground/80 font-body mt-5 leading-relaxed border-t border-borderSubtle/50 pt-4">
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
                          <div className="rounded-xl border border-border/40 bg-card/60 p-4 mt-3 shadow-sm">
                            <span className="text-xs font-body text-primary font-medium px-3 py-1.5 rounded-full bg-primary/10 border border-primary/15">
                              {t("chat.matchLabel", { score: tagSong.relevanceScore })}
                            </span>
                            <div className="flex flex-wrap gap-2 mt-3">
                              {tagSong.emotionalTags.map((tag) => (
                                <span
                                  key={tag}
                                  className="text-xs px-2.5 py-1 rounded-full bg-emotional-tag/15 text-emotional-tag-foreground/90 font-body font-medium border border-emotional-tag/20"
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
                            <div className="mt-3 rounded-2xl border border-border/40 surface-card p-4 animate-fade-slide-up">
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

            {activeConversation &&
              (isLuckyLatestTurn || isCreatorLatestTurn || memorySummary || standardAxes || activeConversation.conversationProfile) && (
              <aside className="hidden lg:flex lg:w-[16rem] xl:w-[18rem] shrink-0 flex-col gap-5 lg:border-l lg:border-borderSubtle/50 lg:pl-5 lg:pr-3 lg:py-7 lg:overflow-y-auto lg:max-h-[calc(100dvh-3.5rem-3rem)] scrollbar-thin">
                {isLuckyLatestTurn ? (
                  <section className="space-y-2.5">
                    <p className="text-[10.5px] text-muted-foreground/65 font-body uppercase tracking-[0.18em] font-semibold">
                      {t("chat.luckySidebarTitle")}
                    </p>
                    <p className="text-sm font-body text-foreground/80 leading-relaxed">
                      {t("chat.luckySidebarBody")}
                    </p>
                  </section>
                ) : isCreatorLatestTurn ? (
                  <section className="space-y-2.5">
                    <p className="text-[10.5px] text-muted-foreground/65 font-body uppercase tracking-[0.18em] font-semibold">
                      {t("chat.creatorSidebarTitle")}
                    </p>
                    <p className="text-sm font-body text-foreground/80 leading-relaxed">
                      {t("chat.creatorSidebarBody")}
                    </p>
                  </section>
                ) : (
                  <>
                    <section className="space-y-2.5">
                      <p className="text-[10.5px] text-muted-foreground/65 font-body uppercase tracking-[0.18em] font-semibold">
                        {t("chat.threadProfile")}
                      </p>
                      {memorySummary ? (
                        <p className="text-sm font-body text-foreground/80 leading-relaxed">
                          {memorySummary}
                        </p>
                      ) : (
                        <p className="text-[13px] font-body text-muted-foreground/60 italic leading-relaxed">
                          {t("chat.threadProfileEmpty")}
                        </p>
                      )}
                    </section>
                    {standardAxes && (
                      <section className="space-y-3 pt-1">
                        <p className="text-[10.5px] text-muted-foreground/65 font-body uppercase tracking-[0.18em] font-semibold">
                          {t("chat.axes")}
                        </p>
                        <dl className="space-y-2">
                          {[
                            { k: t("chat.axisEnergy"), v: standardAxes.energy },
                            { k: t("chat.axisIntimacy"), v: `${standardAxes.intimacy}/5` },
                            { k: t("chat.axisTension"), v: standardAxes.emotionalTension },
                            { k: t("chat.axisCatharsis"), v: standardAxes.catharsis },
                          ].map((row) => (
                            <div
                              key={row.k}
                              className="flex items-center justify-between text-[12.5px] font-body"
                            >
                              <dt className="text-muted-foreground/70">{row.k}</dt>
                              <dd className="text-foreground/85 font-medium tabular-nums">
                                {row.v}
                              </dd>
                            </div>
                          ))}
                        </dl>
                        {standardAxes.moodLabel && (
                          <p className="text-[12.5px] font-body text-foreground/70 leading-relaxed pt-1 border-t border-borderSubtle/40">
                            {standardAxes.moodLabel}
                          </p>
                        )}
                        {standardAxes.dominantThemes.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {standardAxes.dominantThemes.map((tag) => (
                              <span
                                key={tag}
                                className="px-2 py-0.5 rounded-full bg-primary/10 text-primary/85 text-[11px] font-medium font-body"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </section>
                    )}
                    {activeConversation.conversationProfile && (
                      <section className="hidden xl:block pt-1">
                        <EmotionalProfileCard profile={activeConversation.conversationProfile} />
                      </section>
                    )}
                  </>
                )}
              </aside>
            )}
          </div>
        </div>
      </div>
    </AppLayout>

    <div
      aria-hidden
      className="fixed inset-x-0 bottom-0 z-[41] pointer-events-none bg-gradient-to-t from-background via-background/90 to-transparent"
      style={{ height: `calc(var(--global-player-offset, ${isMobile ? "56px" : "0px"}) + 7.5rem)` }}
    />
    <div
      ref={chatDockRef}
      className="fixed inset-x-0 z-[42] pointer-events-none"
      style={{ bottom: `var(--global-player-offset, ${isMobile ? "56px" : "0px"})` }}
    >
      <div className="relative px-3 md:px-8 pt-3 pb-3 md:pb-5">
        <div className="max-w-3xl w-full mx-auto space-y-2 pointer-events-auto">
          {dbSearchId && (
            <div className="flex justify-center">
              <SearchFeedback searchId={dbSearchId} />
            </div>
          )}
          <PromptInput {...composerProps} />
        </div>
      </div>
    </div>
    </>
  );
};

export default Chat;
