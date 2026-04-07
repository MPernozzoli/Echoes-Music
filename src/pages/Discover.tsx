import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import PromptInput from "@/components/PromptInput";
import PromptSuggestions from "@/components/PromptSuggestions";
import FullPlayer from "@/components/FullPlayer";
import {
  DiscoverDockPanelActions,
  type DockPopoverId,
} from "@/components/DiscoverDockPanelActions";
import TrackQueue from "@/components/TrackQueue";
import EmotionalProfileCard from "@/components/EmotionalProfile";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import SearchFeedback from "@/components/SearchFeedback";
import { pickDiscoverPromptSuggestions } from "@/lib/discoverPromptSuggestions";
import type { SearchResult } from "@/data/mockData";
import { useApp } from "@/context/AppContext";
import { usePlaybackQueue } from "@/context/PlaybackQueueContext";
import {
  useConversations,
  memoryOrFromProfile,
} from "@/context/ConversationContext";
import { callMusicSearch } from "@/services/musicSearchApi";
import {
  trackSearch,
  trackResults,
  trackInteraction,
  trackResultFeedback,
  maybeCreateTrainingEvent,
} from "@/services/tracking";
import { emotionalProfileToAxes } from "@/types/conversation";
import { normalizeStandardAxes } from "@/lib/memoryMerge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
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
import SearchResultTrackList from "@/components/SearchResultTrackList";
import { useIsMobile } from "@/hooks/use-mobile";

function buildSearchResult(
  prompt: string,
  data: {
    emotionalProfile: SearchResult["emotionalProfile"];
    songs: SearchResult["songs"];
    adjacentInterpretations: string[];
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
    ...(playbackPresentation ? { playbackPresentation } : {}),
  };
}

const CHAT_PATH = "/chat";

const Chat = () => {
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
  const currentSong = queue[currentIndex] ?? currentResult?.songs[0] ?? null;
  const hasAnyMessage = (activeConversation?.messages.length ?? 0) > 0;
  const showDockPlayer = queue.length > 0 && !isMobile;
  const showMobilePlayer = queue.length > 0 && isMobile;

  const runSearch = useCallback(
    async (conversationId: string, prompt: string) => {
      const conv = getConversation(conversationId);
      if (!conv) return;

      setIsLoading(true);
      setShowQueue(false);
      setShowEmotionalProfile(false);
      setDockPopover(null);
      setDbSearchId(null);
      setResultIdMap({});

      const memoryPayload = memoryOrFromProfile(conv.conversationMemory, conv.conversationProfile);

      try {
        const data = await callMusicSearch({
          prompt,
          descriptionLanguage,
          conversationMemory: memoryPayload,
          userTasteProfile,
        });

        if (data.error) {
          if (data.error.includes("Rate") || data.error.includes("429")) toast.error("Troppi richieste. Riprova tra poco.");
          else if (data.error.includes("credits") || data.error.includes("402")) toast.error("Crediti AI esauriti.");
          else toast.error(data.error || "Ricerca fallita");
          setIsLoading(false);
          return;
        }

        if (!data.emotionalProfile || !data.songs?.length) {
          toast.error("Nessun risultato");
          setIsLoading(false);
          return;
        }

        const songs = dedupeSongVersions(data.songs);
        if (!songs.length) {
          toast.error("Nessun risultato");
          setIsLoading(false);
          return;
        }

        const presentation: SearchResult["playbackPresentation"] = isGloballyPlaying ? "pick" : "inline";
        const result = buildSearchResult(
          prompt,
          {
            emotionalProfile: data.emotionalProfile,
            songs,
            adjacentInterpretations: data.adjacentInterpretations || [],
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

        const searchId = await trackSearch({ rawPrompt: prompt, profile: result.emotionalProfile });
        setDbSearchId(searchId);
        if (searchId) {
          const map = await trackResults(searchId, result.songs);
          setResultIdMap(map);
        }
      } catch (err) {
        console.error("Search error:", err);
        toast.error("Errore durante la ricerca");
        setIsLoading(false);
      }
    },
    [
      getConversation,
      descriptionLanguage,
      userTasteProfile,
      appendAssistantResult,
      mergeConversationMemoryFromUpdate,
      mergeUserTasteFromUpdate,
      isGloballyPlaying,
      playNowReplace,
    ]
  );

  const handleSearch = useCallback(
    (prompt: string) => {
      let id = activeConversationId;
      if (!id) {
        id = createConversation();
        navigate(`${CHAT_PATH}?conversation=${id}`, { replace: true });
      }
      appendUserMessage(id, prompt);
      void runSearch(id, prompt);
    },
    [activeConversationId, createConversation, navigate, appendUserMessage, runSearch]
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
    navigate(`${CHAT_PATH}?conversation=${id}`, { replace: true });
    appendUserMessage(id, q);
    const next = new URLSearchParams(searchParams);
    next.delete("q");
    setSearchParams(next, { replace: true });
    void runSearch(id, q);
  }, [searchParams, createConversation, navigate, appendUserMessage, setSearchParams, runSearch]);

  useEffect(() => {
    if (luckyProcessed.current) return;
    const st = location.state as { luckyPayload?: import("@/services/musicSearchApi").MusicSearchResponse } | undefined;
    if (!st?.luckyPayload?.emotionalProfile || !st.luckyPayload.songs?.length) return;
    luckyProcessed.current = true;
    const id = createConversation();
    appendUserMessage(id, "Sorprendimi");
    const data = st.luckyPayload;
    const luckySongs = dedupeSongVersions(data.songs!);
    const presentation: SearchResult["playbackPresentation"] = isGloballyPlaying ? "pick" : "inline";
    const result = buildSearchResult(
      "Sorprendimi",
      {
        emotionalProfile: data.emotionalProfile!,
        songs: luckySongs,
        adjacentInterpretations: data.adjacentInterpretations || [],
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
      const searchId = await trackSearch({ rawPrompt: "Sorprendimi", profile: result.emotionalProfile });
      setDbSearchId(searchId);
      if (searchId) {
        const map = await trackResults(searchId, result.songs);
        setResultIdMap(map);
      }
    })();
  }, [
    location.state,
    createConversation,
    appendUserMessage,
    appendAssistantResult,
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
    if (!song) return;
    const adding = !isFavorite(songId);
    toggleFavorite(song);
    if (!adding || !dbSearchId) return;
    const searchResultId = resultIdMap[songId];
    if (!searchResultId) return;
    void trackInteraction({
      searchResultId,
      searchId: dbSearchId,
      interactionType: "favorite_positive",
      metadata: { trackId: songId },
    });
    void trackResultFeedback({
      searchResultId,
      searchId: dbSearchId,
      label: "positive_favorite",
    });
  };

  const sidebar = (
    <div className="flex flex-col h-full min-h-0">
      <Button variant="outline" className="mb-3 w-full justify-start gap-2" onClick={handleNewChat}>
        <MessageSquarePlus className="w-4 h-4" />
        Nuova chat
      </Button>
      <p className="text-xs text-muted-foreground font-body uppercase tracking-wider mb-2">Conversazioni</p>
      <div className="flex-1 overflow-y-auto space-y-1 pr-1">
        {conversations.map((c) => (
          <div
            key={c.id}
            className={cn(
              "group flex items-start gap-1 rounded-xl border border-transparent",
              c.id === activeConversationId && "border-primary/30 bg-primary/5"
            )}
          >
            <button
              type="button"
              onClick={() => handleSelectChat(c.id)}
              className="flex-1 text-left px-3 py-2 rounded-xl text-sm font-body hover:bg-muted/80 transition-colors min-w-0"
            >
              <span className="line-clamp-2 font-medium text-foreground">{c.title}</span>
              <span className="text-[10px] text-muted-foreground block mt-0.5">
                {new Date(c.updatedAt).toLocaleDateString()}
              </span>
            </button>
            <button
              type="button"
              className="p-2 opacity-60 hover:opacity-100 text-muted-foreground hover:text-destructive shrink-0"
              aria-label="Elimina chat"
              onClick={(e) => {
                e.stopPropagation();
                deleteConversation(c.id);
                if (c.id === activeConversationId) {
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
        ))}
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

  const composerProps = {
    onSubmit: handleSearch,
    isLoading,
    size: "compact" as const,
    placeholder: "Sentimento, ricordo, momento…",
  };

  return (
    <>
    <AppLayout>
      <div
        className={cn(
          "relative flex flex-col md:flex-row w-full max-w-[1600px] mx-auto min-h-[calc(100vh-3.5rem)]",
          "pb-24 md:pb-6",
          showDockPlayer && "md:pb-[11rem]"
        )}
      >
        <aside
          className={cn(
            "hidden md:flex shrink-0 flex-col border-r border-border/50 bg-muted/5 transition-[width] duration-300 ease-out overflow-hidden",
            conversationsPanelOpen ? "w-[240px]" : "w-0 border-transparent"
          )}
          aria-hidden={!conversationsPanelOpen}
        >
          <div className="w-[240px] h-full min-h-[calc(100vh-3.5rem)] max-h-[calc(100vh-3.5rem)] flex flex-col p-4 box-border">
            {sidebar}
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <header className="shrink-0 flex items-center justify-between gap-3 px-4 md:px-5 py-3 border-b border-border/50 bg-background/90 backdrop-blur-md">
            <div className="flex items-center gap-2 min-w-0">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="hidden md:inline-flex shrink-0 h-9 w-9 rounded-xl"
                onClick={() => setConversationsPanelOpen((o) => !o)}
                aria-expanded={conversationsPanelOpen}
                aria-label={conversationsPanelOpen ? "Chiudi elenco conversazioni" : "Apri elenco conversazioni"}
              >
                {conversationsPanelOpen ? (
                  <PanelLeftClose className="w-4 h-4" />
                ) : (
                  <PanelLeftOpen className="w-4 h-4" />
                )}
              </Button>
              <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="md:hidden gap-2 rounded-xl h-9 shrink-0">
                    <PanelLeft className="w-4 h-4" />
                    Chat
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[min(100%,300px)] pt-12 border-border/60">
                  {sidebar}
                </SheetContent>
              </Sheet>
              <div className="min-w-0">
                <h1 className="font-display text-base md:text-lg font-semibold tracking-tight truncate">
                  Chat musicale
                </h1>
                <p className="text-[11px] text-muted-foreground font-body truncate hidden sm:block">
                  Un mood, una frase — brani in risposta
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleNewChat} className="gap-1.5 shrink-0 rounded-xl h-9">
              <MessageSquarePlus className="w-4 h-4" />
              <span className="hidden sm:inline">Nuova</span>
            </Button>
          </header>

          <div className="flex-1 flex flex-col lg:flex-row min-h-0 gap-0">
            <div className="flex-1 flex flex-col min-h-0 min-w-0">
              <div
                className={cn(
                  "flex-1 overflow-y-auto overscroll-contain px-4 md:px-5 py-4 space-y-5",
                  "pb-28 md:pb-4"
                )}
              >
              {!hasAnyMessage && !isLoading && (
                <>
                  <div className="max-w-2xl mx-auto w-full">
                    <p className="text-xs text-muted-foreground font-body mb-3 uppercase tracking-wider text-center md:text-left">
                      Prova qualcosa come
                    </p>
                    <PromptSuggestions suggestions={discoverSuggestions} onSelect={handleSearch} />
                  </div>
                  <div className="text-center py-10 max-w-md mx-auto rounded-3xl border border-border/50 bg-gradient-to-b from-card/40 to-card/20 px-6 py-10">
                    <div className="w-14 h-14 rounded-2xl bg-primary/12 flex items-center justify-center mx-auto mb-5 ring-1 ring-primary/15">
                      <Lightbulb className="w-7 h-7 text-primary" />
                    </div>
                    <h2 className="font-display text-xl md:text-2xl font-semibold mb-2">Cosa provi?</h2>
                    <p className="text-muted-foreground font-body text-sm leading-relaxed">
                      Descrivi un sentimento, un ricordo o un momento. Echoes trova i brani che risuonano con le tue parole.
                    </p>
                  </div>
                </>
              )}

              {hasAnyMessage && (
                <div className="max-w-3xl mx-auto w-full space-y-5">
                  {activeConversation?.messages.map((m) => {
                    if (m.role === "user") {
                      return (
                        <div key={m.id} className="flex justify-end">
                          <div className="max-w-[88%] rounded-2xl rounded-br-md bg-primary/12 border border-primary/15 px-4 py-2.5 text-sm font-body text-foreground shadow-sm">
                            {m.text}
                          </div>
                        </div>
                      );
                    }
                    const isLatest = m.id === latestAssistant?.id;
                    const r = m.searchResult;
                    const isPick = isLatest && r.playbackPresentation === "pick";
                    const isInlineLatest = isLatest && r.playbackPresentation === "inline";
                    const showLegacySnippet =
                      isLatest && !isPick && !isInlineLatest && r.songs.length > 0;
                    return (
                      <div
                        key={m.id}
                        className={cn(
                          "rounded-2xl border border-border/50 p-4 md:p-5 bg-card/50 backdrop-blur-sm shadow-sm",
                          isLatest && "ring-1 ring-primary/25 shadow-md shadow-primary/5"
                        )}
                      >
                        <p className="text-xs text-muted-foreground font-body uppercase tracking-wider mb-1">Risultati per</p>
                        <p className="font-display text-sm font-semibold mb-3">&quot;{r.prompt}&quot;</p>
                        {isPick && r.songs.length > 0 && activeConversationId && (
                          <SearchResultTrackList
                            className="mt-2"
                            songs={r.songs}
                            onPlayNow={(_song, idx) =>
                              playTrackFromResult(r.songs, idx, {
                                conversationId: activeConversationId,
                                searchResultId: r.id,
                                prompt: r.prompt,
                              })
                            }
                            onAddToQueue={(song) =>
                              appendToQueue([song], {
                                conversationId: activeConversationId,
                                searchResultId: r.id,
                                prompt: r.prompt,
                              })
                            }
                            onPlayNext={(song) =>
                              insertAfterCurrent([song], {
                                conversationId: activeConversationId,
                                searchResultId: r.id,
                                prompt: r.prompt,
                              })
                            }
                          />
                        )}
                        {isInlineLatest && (
                          <>
                            <p className="text-xs text-muted-foreground font-body hidden md:block">
                              Riproduzione avviata nel player in basso. Puoi cambiare chat: la coda resta attiva.
                            </p>
                            <p className="text-xs text-muted-foreground font-body md:hidden">
                              Usa il player qui sotto per ascoltare i brani di questo turno.
                            </p>
                          </>
                        )}
                        {showLegacySnippet && (
                          <ul className="text-xs text-muted-foreground space-y-1 font-body">
                            {r.songs.slice(0, 4).map((s) => (
                              <li key={s.id}>
                                {s.title} — {s.artist}
                              </li>
                            ))}
                            {r.songs.length > 4 && <li>…</li>}
                          </ul>
                        )}
                        {!isLatest && (
                          <p className="text-xs text-muted-foreground font-body mb-2">
                            {r.songs.length} brani
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {isLoading && (
                <div className="max-w-3xl mx-auto w-full">
                  <p className="text-sm text-muted-foreground font-body mb-4 animate-pulse-soft">
                    Interpreto quello che senti…
                  </p>
                  <LoadingSkeleton />
                </div>
              )}

              {currentResult && !isLoading && (
                <div className="max-w-3xl mx-auto w-full border-t border-border/40 pt-6 space-y-6">
                  {!showDockPlayer && (
                    <>
                      {showEmotionalProfile && tagSong && currentResult && (
                        <div className="w-full max-w-lg mx-auto animate-fade-in relative">
                          <button
                            type="button"
                            onClick={() => setShowEmotionalProfile(false)}
                            className="absolute top-3 right-3 p-1 rounded-full hover:bg-muted transition-colors z-10"
                          >
                            <X className="w-4 h-4 text-muted-foreground" />
                          </button>
                          <EmotionalProfileCard profile={currentResult.emotionalProfile} />
                          <div className="glass-card rounded-2xl p-4 mt-3">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-body text-primary font-medium px-3 py-1 rounded-full bg-primary/10">
                                {tagSong.relevanceScore}% match
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {tagSong.emotionalTags.map((tag) => (
                                <span
                                  key={tag}
                                  className="text-xs px-2.5 py-0.5 rounded-full bg-emotional-tag/15 text-emotional-tag-foreground/80 font-body"
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
                            className="flex items-center gap-2 mx-auto px-4 py-2 rounded-xl border border-border text-sm font-body text-muted-foreground hover:text-foreground hover:border-primary/20 transition-all"
                          >
                            <ListMusic className="w-4 h-4" />
                            <span>
                              {showQueue ? "Nascondi" : "Mostra"} coda ({queue.length} brani)
                            </span>
                            {showQueue ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                          {showQueue && (
                            <div className="mt-4 glass-card rounded-2xl p-4 animate-fade-in">
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

                  {dbSearchId && (
                    <div className="w-full max-w-lg mx-auto pt-4 border-t border-border/40">
                      <SearchFeedback searchId={dbSearchId} />
                    </div>
                  )}

                  {currentResult.adjacentInterpretations.length > 0 && (
                    <div className="w-full max-w-lg mx-auto">
                      <div className="flex items-center gap-2 mb-4">
                        <RefreshCw className="w-4 h-4 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground font-body">Forse intendevi…</p>
                      </div>
                      <div className="space-y-2">
                        {currentResult.adjacentInterpretations.map((interp) => (
                          <button
                            key={interp}
                            type="button"
                            onClick={() => handleRefineSearch(interp)}
                            className="block w-full text-left text-sm px-4 py-3 rounded-xl border border-border text-secondary-foreground/70 hover:text-foreground hover:border-primary/20 hover:bg-primary/5 transition-all font-body"
                          >
                            {interp}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {showMobilePlayer && (
                <div className="md:hidden pt-4 border-t border-border/40 max-w-3xl mx-auto w-full">
                  <FullPlayer
                    songs={queue}
                    currentIndex={currentIndex}
                    onChangeIndex={setCurrentIndex}
                    isFavorite={isFavorite}
                    onToggleFavorite={handleToggleFavorite}
                    onShowDetails={() => setShowEmotionalProfile(!showEmotionalProfile)}
                    autoplay={pendingAutoplay}
                    onAutoplayConsumed={() => setPendingAutoplay(false)}
                    onPlaybackStateChange={handlePlayerPlaybackChange}
                  />
                </div>
              )}
              </div>

              <div className="hidden md:block shrink-0 border-t border-border/50 bg-background/95 backdrop-blur-xl px-5 py-3">
                <div className="max-w-3xl w-full mx-auto">
                  <PromptInput {...composerProps} />
                </div>
              </div>

              <div className="md:hidden fixed inset-x-0 bottom-14 z-[45] px-4 pb-2 pointer-events-none">
                <div className="pointer-events-auto max-w-lg mx-auto">
                  <PromptInput {...composerProps} />
                </div>
              </div>
            </div>

            {activeConversation && (memorySummary || standardAxes || activeConversation.conversationProfile) && (
              <aside className="lg:w-72 shrink-0 space-y-3 lg:border-l lg:border-border/40 lg:pl-5 lg:py-4 lg:overflow-y-auto lg:max-h-[calc(100dvh-3.5rem-3.25rem)]">
                <p className="text-xs text-muted-foreground font-body uppercase tracking-wider lg:pt-1">Profilo del thread</p>
                {memorySummary && (
                  <div className="glass-card rounded-2xl p-4 text-sm font-body text-secondary-foreground/90 leading-relaxed">
                    {memorySummary}
                  </div>
                )}
                {standardAxes && (
                  <div className="glass-card rounded-2xl p-4 text-xs font-body space-y-2 text-muted-foreground">
                    <div>
                      <span className="uppercase tracking-wider text-[10px]">Assi</span>
                      <p className="text-foreground mt-1">
                        Energia: {standardAxes.energy} · Intimità: {standardAxes.intimacy}/5 · Tensione:{" "}
                        {standardAxes.emotionalTension} · Catarsi: {standardAxes.catharsis}
                      </p>
                      {standardAxes.moodLabel && (
                        <p className="text-foreground/80 mt-2">{standardAxes.moodLabel}</p>
                      )}
                      {standardAxes.dominantThemes.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {standardAxes.dominantThemes.map((t) => (
                            <span key={t} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
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

    {showDockPlayer && (
      <div className="hidden md:flex fixed bottom-0 left-0 right-0 z-40 flex-col border-t border-zinc-800/90 bg-[#121212]/98 backdrop-blur-xl shadow-[0_-12px_40px_-12px_rgba(0,0,0,0.45)]">
        <div className="max-w-6xl w-full mx-auto px-3 md:px-6 pt-2 pb-2">
          <FullPlayer
            variant="dock"
            songs={queue}
            currentIndex={currentIndex}
            onChangeIndex={setCurrentIndex}
            isFavorite={isFavorite}
            onToggleFavorite={handleToggleFavorite}
            autoplay={pendingAutoplay}
            onAutoplayConsumed={() => setPendingAutoplay(false)}
            onPlaybackStateChange={handlePlayerPlaybackChange}
            dockPanelActions={
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
              />
            }
          />
        </div>
      </div>
    )}
    </>
  );
};

export default Chat;
