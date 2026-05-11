import {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams, useNavigate, useLocation, Link } from "react-router-dom";
import PromptInput, { type PromptSubmitPayload } from "@/components/PromptInput";
import MusicSearchThinking from "@/components/MusicSearchThinking";
import SearchFeedback from "@/components/SearchFeedback";
import { pickDiscoverPromptSuggestions } from "@/lib/discoverPromptSuggestions";
import type { SearchResult, Song } from "@/data/mockData";
import { useApp } from "@/context/useApp";
import { useAuth } from "@/context/useAuth";
import { usePlaybackQueue } from "@/context/usePlaybackQueue";
import { useConversations } from "@/context/useConversations";
import { callMusicSearch } from "@/services/musicSearchApi";
import {
  getRecentFeedbackLearningSummary,
  trackSearch,
  trackResults,
  trackInteraction,
  maybeCreateTrainingEvent,
} from "@/services/tracking";
import { emotionalProfileToAxes } from "@/types/conversation";
import { buildThreadSummaryFromChatText, normalizeStandardAxes } from "@/lib/memoryMerge";
import { dedupeSongVersions, filterSongsByMinRelevance } from "@/lib/dedupeSongs";
import { buildEmptySearchResult } from "@/lib/emptySearchResult";
import { AssistantSongNarrative } from "@/components/AssistantSongNarrative";
import { fallbackNarrativeForResult } from "@/lib/assistantNarrative";
import { useIsMobile } from "@/hooks/use-mobile";
import { useStreamingPlaybackMode } from "@/hooks/useStreamingPlaybackMode";
import { isLuckyPrompt } from "@/constants/luckyPrompt";
import type { MusicSearchMode } from "@/services/musicSearchApi";
import type { ChatMessage, Conversation } from "@/types/conversation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Menu,
  Plus,
  Send,
  SkipBack,
  SkipForward,
  Play,
  Pause,
  Shuffle,
  Repeat,
  X,
  Trash2,
  ChevronRight,
  Zap,
  User,
  Music,
  ListMusic,
  Loader2,
  Lightbulb,
  RefreshCw,
} from "lucide-react";
import { AppLogo } from "@/components/AppLogo";
import TokenBadge from "@/components/TokenBadge";

// ─── Types ───────────────────────────────────────────────────────────────────

type PendingMusicSearch = {
  conversationId: string;
  prompt: string;
  displayText: string;
  mode: Extract<MusicSearchMode, "search" | "creator_trends">;
  media?: { imageBase64: string; imageMimeType: string };
  imagePreviewUrl?: string;
  authRequired?: boolean;
  createdAt: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CHAT_PATH = "/chat";
const PENDING_SEARCH_KEY = "echoes_pending_music_search";

function readPendingSearch(): PendingMusicSearch | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PENDING_SEARCH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingMusicSearch>;
    if (
      !parsed ||
      typeof parsed.conversationId !== "string" ||
      typeof parsed.prompt !== "string" ||
      typeof parsed.displayText !== "string"
    ) {
      window.localStorage.removeItem(PENDING_SEARCH_KEY);
      return null;
    }
    return {
      conversationId: parsed.conversationId,
      prompt: parsed.prompt,
      displayText: parsed.displayText,
      mode: parsed.mode === "creator_trends" ? "creator_trends" : "search",
      ...(parsed.media?.imageBase64 && parsed.media?.imageMimeType
        ? { media: { imageBase64: parsed.media.imageBase64, imageMimeType: parsed.media.imageMimeType } }
        : {}),
      ...(typeof parsed.imagePreviewUrl === "string" ? { imagePreviewUrl: parsed.imagePreviewUrl } : {}),
      ...(parsed.authRequired === true ? { authRequired: true } : {}),
      createdAt: typeof parsed.createdAt === "string" ? parsed.createdAt : new Date().toISOString(),
    };
  } catch {
    window.localStorage.removeItem(PENDING_SEARCH_KEY);
    return null;
  }
}

function writePendingSearch(pending: PendingMusicSearch) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PENDING_SEARCH_KEY, JSON.stringify(pending));
  } catch (err) {
    console.warn("Unable to persist pending music search:", err);
  }
}

function clearPendingSearch(conversationId?: string) {
  if (typeof window === "undefined") return;
  if (!conversationId) {
    window.localStorage.removeItem(PENDING_SEARCH_KEY);
    return;
  }
  const pending = readPendingSearch();
  if (pending?.conversationId === conversationId) {
    window.localStorage.removeItem(PENDING_SEARCH_KEY);
  }
}

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

// Deterministic pseudo-wave bars for a track
function waveBars(seed: number, count = 48): number[] {
  const arr: number[] = [];
  let x = seed;
  for (let i = 0; i < count; i++) {
    x = (x * 9301 + 49297) % 233280;
    const r = x / 233280;
    const env = Math.sin((i / count) * Math.PI) * 0.7 + 0.3;
    arr.push(0.15 + r * 0.85 * env);
  }
  return arr;
}

function seedFromSong(song: Song | null): number {
  if (!song) return 42;
  return song.id.charCodeAt(0) + song.title.length * 7;
}

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
};

// ─── Now Playing Rail ─────────────────────────────────────────────────────────

interface NowPlayingRailProps {
  song: Song | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  queue: Song[];
  currentIndex: number;
  onPickFromQueue: (i: number) => void;
  onRemoveFromQueue: (i: number) => void;
  moodTags: string[];
}

function NowPlayingRail({
  song,
  isPlaying,
  onTogglePlay,
  onPrev,
  onNext,
  queue,
  currentIndex,
  onPickFromQueue,
  onRemoveFromQueue,
  moodTags,
}: NowPlayingRailProps) {
  const wave = useMemo(() => waveBars(seedFromSong(song)), [song?.id]);

  return (
    <aside className="pf-rail">
      <div className="pf-rail-eyebrow">
        <span className="pf-pulse" />
        <span>Now playing</span>
        <span className="pf-rail-line" />
      </div>

      <div className="pf-art-stack">
        {song?.artwork ? (
          <img
            src={song.artwork}
            alt={song.title}
            className="pf-art-img"
          />
        ) : (
          <div className="pf-art-placeholder">
            <Music className="w-16 h-16 text-white/40" />
          </div>
        )}
      </div>

      <div className="pf-track-meta">
        <h3 className="pf-track-title">{song?.title ?? "—"}</h3>
        <p className="pf-track-artist">{song?.artist ?? ""}</p>
        <p className="pf-track-album">{song?.album ?? ""}</p>
      </div>

      {/* Waveform — decorative */}
      <div className="pf-scrubber">
        <div className="pf-wave">
          {wave.map((h, i) => (
            <span
              key={i}
              className={cn("pf-bar", i / wave.length < 0.28 ? "played" : "")}
              style={{ height: `${h * 100}%` }}
            />
          ))}
        </div>
      </div>

      {/* Transport */}
      <div className="pf-transport">
        <button className="pf-t-btn" aria-label="Shuffle" title="Shuffle">
          <Shuffle className="w-3.5 h-3.5" />
        </button>
        <div className="pf-transport-main">
          <button className="pf-t-btn" onClick={onPrev} aria-label="Previous">
            <SkipBack className="w-4 h-4" />
          </button>
          <button className="pf-t-play" onClick={onTogglePlay} aria-label={isPlaying ? "Pause" : "Play"}>
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>
          <button className="pf-t-btn" onClick={onNext} aria-label="Next">
            <SkipForward className="w-4 h-4" />
          </button>
        </div>
        <button className="pf-t-btn" aria-label="Repeat" title="Repeat">
          <Repeat className="w-3.5 h-3.5" />
        </button>
      </div>

      {moodTags.length > 0 && (
        <>
          <p className="pf-section-title">Mood</p>
          <div className="pf-mood-tags">
            {moodTags.map((t) => (
              <span key={t} className="pf-mood-tag">{t}</span>
            ))}
          </div>
        </>
      )}

      {/* Queue */}
      {queue.length > 0 && (
        <div className="pf-queue">
          <div className="pf-queue-header">
            <p className="pf-section-title" style={{ margin: 0 }}>In coda</p>
            <span className="pf-queue-count">{queue.length}</span>
          </div>
          <div className="pf-queue-list">
            {queue.map((t, i) => (
              <div
                key={t.id + i}
                className={cn("pf-queue-item", i === currentIndex ? "active" : "")}
                onClick={() => onPickFromQueue(i)}
              >
                <span className="pf-queue-num">
                  {i === currentIndex ? "▸" : String(i + 1).padStart(2, "0")}
                </span>
                <div className="pf-queue-info">
                  <div className="pf-queue-title">{t.title}</div>
                  <div className="pf-queue-artist">{t.artist}</div>
                </div>
                <button
                  className="pf-queue-remove"
                  aria-label="Rimuovi"
                  onClick={(e) => { e.stopPropagation(); onRemoveFromQueue(i); }}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}

// ─── Conversations Drawer ────────────────────────────────────────────────────

interface ConvDrawerProps {
  open: boolean;
  onClose: () => void;
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  tokenBalance: number | null;
  plan: string;
  user: { email?: string; name?: string } | null;
}

function ConvDrawer({
  open,
  onClose,
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  tokenBalance,
  plan,
  user,
}: ConvDrawerProps) {
  return (
    <>
      <div
        className={cn("pf-drawer-backdrop", open ? "open" : "")}
        onClick={onClose}
      />
      <aside className={cn("pf-drawer", open ? "open" : "")} aria-hidden={!open}>
        <div className="pf-drawer-header">
          <h3 className="pf-drawer-title">Conversazioni</h3>
          <button className="pf-icon-btn" onClick={onClose} aria-label="Chiudi">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="pf-drawer-list">
          {conversations.map((c) => {
            const art = conversationPreviewArtwork(c);
            return (
              <div
                key={c.id}
                className={cn("pf-conv-row", c.id === activeId ? "active" : "")}
                onClick={() => onSelect(c.id)}
              >
                <div className="pf-conv-cover">
                  {art ? (
                    <img src={art} alt="" className="pf-conv-art" />
                  ) : (
                    <Music className="w-4 h-4 text-white/60" />
                  )}
                </div>
                <div className="pf-conv-info">
                  <div className="pf-conv-title">{c.title}</div>
                  <div className="pf-conv-meta">
                    {fmtDate(c.updatedAt)} · {c.messages.length} msg
                  </div>
                </div>
                <button
                  className="pf-conv-delete"
                  onClick={(e) => { e.stopPropagation(); onDelete(c.id); }}
                  aria-label="Elimina"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
        <button className="pf-drawer-new" onClick={onNew}>
          <Plus className="w-4 h-4" />
          <span>Nuova conversazione</span>
        </button>
        <div className="pf-drawer-foot">
          {tokenBalance !== null && (
            <Link
              to="/pricing/tokens"
              className="pf-tokens-btn"
              onClick={onClose}
            >
              <div className="pf-tokens-row">
                <span className="pf-tokens-icon"><Zap className="w-3.5 h-3.5" /></span>
                <div className="pf-tokens-meta">
                  <div className="pf-tokens-num">
                    {plan === "premium" ? "∞" : tokenBalance.toLocaleString("it-IT")}
                    <span>token</span>
                  </div>
                  <div className="pf-tokens-sub">rimanenti questo mese</div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-white/40" />
              </div>
              <div className="pf-tokens-bar">
                <span
                  style={{
                    width: plan === "premium"
                      ? "100%"
                      : Math.min(100, ((tokenBalance ?? 0) / 5000) * 100) + "%",
                  }}
                />
              </div>
              <div className="pf-tokens-cta">Acquista token o passa a Studio →</div>
            </Link>
          )}
          <Link
            to="/profile"
            className="pf-profile-btn"
            onClick={onClose}
          >
            <div className="pf-profile-avatar">
              <User className="w-4 h-4" />
            </div>
            <div className="pf-profile-meta">
              <div className="pf-profile-name">{user?.name ?? user?.email ?? "Profilo"}</div>
              <div className="pf-profile-plan">{plan} · {user?.email ?? ""}</div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-white/40" />
          </Link>
        </div>
      </aside>
    </>
  );
}

// ─── Empty Hero ───────────────────────────────────────────────────────────────

function EmptyHero({ suggestions, onSelect }: { suggestions: string[]; onSelect: (s: string) => void }) {
  return (
    <div className="pf-empty-hero">
      <div className="pf-empty-mark">
        <div className="pf-empty-disc" />
        <h1 className="pf-empty-title">
          Cosa ti sta <em>suonando dentro</em>, in questo momento?
        </h1>
        <p className="pf-empty-subtitle">
          Raccontami un umore, un ricordo, un'immagine. Echoes ti rispiega in musica.
        </p>
      </div>
      <div className="pf-empty-suggestions">
        {suggestions.map((s, i) => (
          <button key={i} className="pf-sugg" onClick={() => onSelect(s)}>
            <span className="pf-sugg-icon">
              <Lightbulb className="w-3.5 h-3.5" />
            </span>
            <span>{s}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const ChatPlayerFirst = () => {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [isLoading, setIsLoading] = useState(false);
  const [dbSearchId, setDbSearchId] = useState<string | null>(null);
  const [resultIdMap, setResultIdMap] = useState<Record<string, string>>({});
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [composerValue, setComposerValue] = useState("");

  const isMobile = useIsMobile();
  const { refreshTokenBalance, user, tokenBalance, plan } = useAuth();
  const {
    queue,
    currentIndex,
    setCurrentIndex,
    isGloballyPlaying,
    setGlobalPlaying,
    playNowReplace,
    playTrackFromResult,
    appendToQueue,
    insertAfterCurrent,
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
    refreshConversations,
  } = useConversations();

  useEffect(() => {
    if (!user?.id) return;
    void refreshConversations();
  }, [user?.id, refreshConversations]);

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
      }).map((s) => s.text),
    [userTasteProfile, completedSearchCount, descriptionLanguage, activeConversationId]
  );

  const qProcessed = useRef(false);
  const landingFromHomeProcessed = useRef(false);
  const luckyProcessed = useRef(false);
  const pendingResumeKey = useRef<string | null>(null);

  const activeConversation = getConversation(activeConversationId) ?? null;
  const assistantTurns = activeConversation?.messages.filter(
    (m): m is Extract<ChatMessage, { role: "assistant" }> => m.role === "assistant"
  );
  const latestAssistant = assistantTurns?.[assistantTurns.length - 1];
  const currentResult = latestAssistant?.searchResult ?? null;

  const playbackMode = useStreamingPlaybackMode();
  const currentSong = queue[currentIndex] ?? null;
  const hasAnyMessage = (activeConversation?.messages.length ?? 0) > 0;

  const buildLocalThreadSummary = useCallback(
    (conversationId: string, prompt: string) =>
      buildThreadSummaryFromChatText(getConversation(conversationId)?.messages ?? [], prompt),
    [getConversation]
  );

  const streamingProviderPreference = useMemo(() => {
    // simplified — always "auto"
    return "auto" as const;
  }, []);

  // Scroll ref for thread
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [activeConversation?.messages.length, isLoading]);

  // ── Search logic ─────────────────────────────────────────────────────────

  const runSearch = useCallback(
    async (
      conversationId: string,
      prompt: string,
      media?: { imageBase64: string; imageMimeType: string },
      mode: Extract<MusicSearchMode, "search" | "creator_trends"> = "search"
    ) => {
      const conv = getConversation(conversationId);
      const displayPrompt = prompt.trim() || (media ? t("chat.imageSearchLabel") : prompt);

      writePendingSearch({
        conversationId,
        prompt,
        displayText: displayPrompt,
        mode,
        ...(media ? { media } : {}),
        ...(media ? { imagePreviewUrl: `data:${media.imageMimeType};base64,${media.imageBase64}` } : {}),
        createdAt: new Date().toISOString(),
      });

      setIsLoading(true);
      setDbSearchId(null);
      setResultIdMap({});

      try {
        const cleanConversationMemory = conv?.conversationMemory
          ? {
              ...conv.conversationMemory,
              threadSummary: buildThreadSummaryFromChatText(conv.messages),
            }
          : null;
        const feedbackLearningSummary = await getRecentFeedbackLearningSummary();
        const data = await callMusicSearch({
          ...(prompt.trim() ? { prompt: prompt.trim() } : {}),
          ...(media ? { imageBase64: media.imageBase64, imageMimeType: media.imageMimeType } : {}),
          ...(mode !== "search" ? { mode } : {}),
          descriptionLanguage,
          streamingProviderPreference,
          conversationMemory: cleanConversationMemory,
          userTasteProfile,
          feedbackLearningSummary,
          conversationId,
        });

        if (data.error) {
          if (data.code?.startsWith("anon_")) {
            toast.error(data.error || t("chat.anonQuotaLogin"));
            writePendingSearch({
              conversationId,
              prompt,
              displayText: displayPrompt,
              mode,
              ...(media ? { media } : {}),
              ...(media ? { imagePreviewUrl: `data:${media.imageMimeType};base64,${media.imageBase64}` } : {}),
              authRequired: true,
              createdAt: new Date().toISOString(),
            });
            setIsLoading(false);
            navigate("/auth", { replace: true });
            return;
          }
          if (data.code?.startsWith("byo_")) {
            appendAssistantResult(
              conversationId,
              buildEmptySearchResult({
                prompt: displayPrompt,
                narrative: data.error || t("chat.toastSearchFailed"),
                searchMode: mode,
              })
            );
            toast.error(data.error || t("chat.toastSearchFailed"));
            clearPendingSearch(conversationId);
            setIsLoading(false);
            void refreshTokenBalance();
            return;
          }
          const narrative = data.code === "request_timeout" ? t("chat.toastSearchError") : data.error || t("chat.toastSearchFailed");
          toast.error(narrative);
          appendAssistantResult(
            conversationId,
            buildEmptySearchResult({ prompt: displayPrompt, narrative, searchMode: mode })
          );
          clearPendingSearch(conversationId);
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
          const localThreadSummary = buildLocalThreadSummary(conversationId, displayPrompt);
          if (data.conversationMemoryUpdate?.standardAxes) {
            mergeConversationMemoryFromUpdate(conversationId, {
              threadSummary: localThreadSummary,
              standardAxes: normalizeStandardAxes(
                data.conversationMemoryUpdate.standardAxes as Record<string, unknown>
              ),
            });
          } else if (data.emotionalProfile) {
            mergeConversationMemoryFromUpdate(conversationId, {
              threadSummary: localThreadSummary,
              standardAxes: emotionalProfileToAxes(data.emotionalProfile),
            });
          }
          if (data.userTasteProfileUpdate) mergeUserTasteFromUpdate(data.userTasteProfileUpdate);
          clearPendingSearch(conversationId);
          setIsLoading(false);
          void refreshTokenBalance();
          const searchId = await trackSearch({ rawPrompt: displayPrompt, profile: emptyResult.emotionalProfile });
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
            selectionIntent: "autoplay",
          });
        }

        const localThreadSummary = buildLocalThreadSummary(conversationId, displayPrompt);
        if (data.conversationMemoryUpdate?.standardAxes) {
          mergeConversationMemoryFromUpdate(conversationId, {
            threadSummary: localThreadSummary,
            standardAxes: normalizeStandardAxes(data.conversationMemoryUpdate.standardAxes as Record<string, unknown>),
          });
        } else {
          mergeConversationMemoryFromUpdate(conversationId, {
            threadSummary: localThreadSummary,
            standardAxes: emotionalProfileToAxes(data.emotionalProfile),
          });
        }

        if (data.userTasteProfileUpdate) mergeUserTasteFromUpdate(data.userTasteProfileUpdate);

        clearPendingSearch(conversationId);
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
        const narrative = t("chat.toastSearchError");
        toast.error(narrative);
        appendAssistantResult(
          conversationId,
          buildEmptySearchResult({ prompt: displayPrompt, narrative, searchMode: mode })
        );
        clearPendingSearch(conversationId);
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
      buildLocalThreadSummary,
      mergeConversationMemoryFromUpdate,
      mergeUserTasteFromUpdate,
      isGloballyPlaying,
      playNowReplace,
      navigate,
    ]
  );

  // Resume pending searches after auth
  useEffect(() => {
    if (isLoading) return;
    const pending = readPendingSearch();
    if (!pending) { pendingResumeKey.current = null; return; }
    if (pending.authRequired && !user) return;

    const conversation = conversations.find((c) => c.id === pending.conversationId);
    if (!conversation) return;

    let lastUserIndex = -1;
    let lastAssistantIndex = -1;
    for (let i = conversation.messages.length - 1; i >= 0; i -= 1) {
      const role = conversation.messages[i]?.role;
      if (lastUserIndex === -1 && role === "user") lastUserIndex = i;
      if (lastAssistantIndex === -1 && role === "assistant") lastAssistantIndex = i;
      if (lastUserIndex !== -1 && lastAssistantIndex !== -1) break;
    }
    const needsAssistantTurn = lastUserIndex === -1 || lastUserIndex > lastAssistantIndex;
    if (!needsAssistantTurn) {
      clearPendingSearch(pending.conversationId);
      pendingResumeKey.current = null;
      return;
    }

    const resumeKey = `${pending.conversationId}:${pending.createdAt}`;
    if (pendingResumeKey.current === resumeKey) return;
    pendingResumeKey.current = resumeKey;

    if (activeConversationId !== pending.conversationId) {
      selectConversation(pending.conversationId);
      navigate(`${CHAT_PATH}?conversation=${encodeURIComponent(pending.conversationId)}`, { replace: true });
    }

    if (lastUserIndex === -1) {
      appendUserMessage(
        pending.conversationId,
        pending.displayText,
        pending.imagePreviewUrl ? { imagePreviewUrl: pending.imagePreviewUrl } : undefined
      );
    }

    window.setTimeout(() => {
      void runSearch(pending.conversationId, pending.prompt, pending.media, pending.mode);
    }, 0);
  }, [
    activeConversationId,
    appendUserMessage,
    conversations,
    isLoading,
    navigate,
    runSearch,
    selectConversation,
    user,
  ]);

  const handleComposerSubmit = useCallback(
    (payload: PromptSubmitPayload) => {
      const text = payload.text.trim();
      const hasImg = Boolean(payload.imageBase64 && payload.imageMimeType);
      const mode = payload.mode === "creator_trends" ? "creator_trends" : "search";
      if (!text && !hasImg) return;
      let id = activeConversationId;
      const createdNew = !id;
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
      if (createdNew) {
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
    appendUserMessage(activeConversationId, interp);
    void runSearch(
      activeConversationId,
      interp,
      undefined,
      currentResult?.searchMode === "creator_trends" ? "creator_trends" : "search"
    );
  };

  const handleNewChat = () => {
    const id = createConversation();
    navigate(`${CHAT_PATH}?conversation=${id}`, { replace: true });
    setDrawerOpen(false);
  };

  const handleSelectConv = (id: string) => {
    selectConversation(id);
    navigate(`${CHAT_PATH}?conversation=${id}`, { replace: true });
    setDrawerOpen(false);
  };

  const handleDeleteConv = (id: string) => {
    deleteConversation(id);
    if (id === activeConversationId) {
      const next = conversations.find((c) => c.id !== id);
      if (next) handleSelectConv(next.id);
      else {
        const nid = createConversation();
        navigate(`${CHAT_PATH}?conversation=${nid}`, { replace: true });
      }
    }
  };

  // Sync URL param → active conversation
  useEffect(() => {
    const cid = searchParams.get("conversation");
    if (cid && conversations.some((c) => c.id === cid)) {
      selectConversation(cid);
    }
  }, [searchParams, conversations, selectConversation]);

  // Initialise active conversation from URL / first in list
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

  // Landing page search transfer
  useEffect(() => {
    const landingSt = location.state as { landingSearch?: PromptSubmitPayload } | undefined;
    const ls = landingSt?.landingSearch;
    if (!ls) { landingFromHomeProcessed.current = false; return; }
    if (landingFromHomeProcessed.current) return;
    const text = (ls.text || "").trim();
    const hasImg = Boolean(ls.imageBase64 && ls.imageMimeType);
    if (!text && !hasImg) return;
    landingFromHomeProcessed.current = true;
    const id = createConversation();
    if (!id) { landingFromHomeProcessed.current = false; return; }
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
  }, [location.state, t, activeConversationId, conversations, createConversation, navigate, appendUserMessage, runSearch]);

  // ?q= param direct search
  useEffect(() => {
    if (qProcessed.current) return;
    const q = searchParams.get("q");
    if (!q) return;
    qProcessed.current = true;
    const id = createConversation();
    if (!id) { qProcessed.current = false; return; }
    navigate(`${CHAT_PATH}?conversation=${encodeURIComponent(id)}`, { replace: true });
    appendUserMessage(id, q);
    setTimeout(() => void runSearch(id, q), 0);
  }, [searchParams, createConversation, navigate, appendUserMessage, runSearch]);

  // Lucky payload
  useEffect(() => {
    if (luckyProcessed.current) return;
    const st = location.state as { luckyPayload?: import("@/services/musicSearchApi").MusicSearchResponse } | undefined;
    if (!st?.luckyPayload?.emotionalProfile || !st.luckyPayload.songs?.length) return;
    const data = st.luckyPayload;
    const luckySongs = filterSongsByMinRelevance(dedupeSongVersions(data.songs!));
    if (!luckySongs.length) return;
    const cid = searchParams.get("conversation") || activeConversationId || conversations[0]?.id;
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
        selectionIntent: "autoplay",
      });
    }
    if (data.conversationMemoryUpdate?.standardAxes) {
      mergeConversationMemoryFromUpdate(id, {
        threadSummary: buildLocalThreadSummary(id, surpriseLabel),
        standardAxes: normalizeStandardAxes(data.conversationMemoryUpdate.standardAxes as Record<string, unknown>),
      });
    } else {
      mergeConversationMemoryFromUpdate(id, {
        threadSummary: buildLocalThreadSummary(id, surpriseLabel),
        standardAxes: emotionalProfileToAxes(data.emotionalProfile!),
      });
    }
    if (data.userTasteProfileUpdate) mergeUserTasteFromUpdate(data.userTasteProfileUpdate);
    navigate(`${CHAT_PATH}?conversation=${id}`, { replace: true, state: {} });
  }, [
    t,
    location.state,
    searchParams,
    activeConversationId,
    conversations,
    appendUserMessage,
    appendAssistantResult,
    patchSearchResultTracking,
    buildLocalThreadSummary,
    mergeConversationMemoryFromUpdate,
    mergeUserTasteFromUpdate,
    navigate,
    isGloballyPlaying,
    playNowReplace,
  ]);

  // Training event cleanup
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

  const moodTags = useMemo(
    () => currentResult?.emotionalProfile.themes ?? [],
    [currentResult]
  );

  const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email;

  const composerProps = useMemo(
    () => ({
      onSubmit: handleComposerSubmit,
      isLoading,
      size: (!hasAnyMessage && !isLoading ? "hero" : "compact") as "hero" | "compact",
      placeholder: t("chat.composerPlaceholder"),
      creatorPlaceholder: t("chat.creatorComposerPlaceholder"),
      allowImageAttachment: true as const,
      allowModeSwitch: true as const,
    }),
    [handleComposerSubmit, isLoading, hasAnyMessage, t]
  );

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <>
      {/* Full-screen player-first shell */}
      <div className="pf-app">
        {/* Now Playing Rail */}
        {!isMobile && (
          <NowPlayingRail
            song={currentSong}
            isPlaying={isGloballyPlaying}
            onTogglePlay={() => setGlobalPlaying(!isGloballyPlaying)}
            onPrev={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            onNext={() => setCurrentIndex(Math.min(queue.length - 1, currentIndex + 1))}
            queue={queue}
            currentIndex={currentIndex}
            onPickFromQueue={(i) => setCurrentIndex(i)}
            onRemoveFromQueue={(i) => removeFromQueue(i)}
            moodTags={moodTags}
          />
        )}

        {/* Thread Pane */}
        <section className="pf-thread-pane">
          {/* Topbar */}
          <div className="pf-topbar">
            <div className="pf-topbar-left">
              <button
                className="pf-icon-btn"
                onClick={() => setDrawerOpen(true)}
                aria-label="Conversazioni"
              >
                <Menu className="w-4 h-4" />
              </button>
              <span className="pf-wordmark">
                <AppLogo size={20} className="rounded-md" />
                <span>Echoes</span>
              </span>
            </div>
            <div className="pf-topbar-right">
              <TokenBadge />
              <button
                className="pf-icon-btn"
                onClick={handleNewChat}
                title="Nuova conversazione"
                aria-label="Nuova conversazione"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="pf-thread-scroll" ref={scrollRef}>
            {!hasAnyMessage && !isLoading ? (
              <EmptyHero
                suggestions={discoverSuggestions}
                onSelect={handleSuggestionSelect}
              />
            ) : (
              <div className="pf-messages">
                {activeConversation?.messages.map((m, mi) => {
                  if (m.role === "user") {
                    return (
                      <div key={m.id} className="pf-msg-user">
                        <div className="pf-you-eyebrow">
                          <span className="pf-you-dot" /> Tu
                        </div>
                        <div className="pf-query-card">
                          {m.imagePreviewUrl && (
                            <img
                              src={m.imagePreviewUrl}
                              alt=""
                              className="rounded-lg max-h-48 w-full object-cover mb-3 ring-1 ring-white/10"
                            />
                          )}
                          {m.text && (
                            <p className="pf-query-text">{m.text}</p>
                          )}
                          <span className="pf-query-time">
                            {new Date(m.timestamp).toLocaleTimeString("it-IT", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                    );
                  }
                  const isLatest = m.id === latestAssistant?.id;
                  const r = m.searchResult;
                  return (
                    <div key={m.id} className="pf-msg-assistant">
                      <div className="pf-echoes-eyebrow">
                        <span className="pf-echoes-mark">Echoes</span>
                        <span className="pf-wave-mini">
                          <i /><i /><i /><i /><i />
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
                            dbSearchId: r.tracking?.searchId,
                            resultIdsBySongId: r.tracking?.resultIdsBySongId,
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
                        <p className="pf-narrative">
                          {r.narrativeReply?.trim() || t("chat.noResultsNarrative")}
                        </p>
                      ) : null}

                      {r.adjacentInterpretations.length > 0 && isLatest && (
                        <div className="pf-adjacent">
                          <div className="pf-adjacent-label">prosegui da qui</div>
                          {r.adjacentInterpretations.map((a) => (
                            <button
                              key={a}
                              className="pf-adj-chip"
                              onClick={() => handleRefineSearch(a)}
                            >
                              {a}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {isLoading && (
                  <div className="pf-thinking">
                    <span>Sto ascoltando con attenzione</span>
                    <span className="pf-dots">
                      <i /><i /><i />
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Feedback */}
          {dbSearchId && (
            <div className="pf-feedback-row">
              <SearchFeedback searchId={dbSearchId} />
            </div>
          )}

          {/* Composer */}
          <div className="pf-composer-wrap">
            <PromptInput {...composerProps} />
          </div>
        </section>
      </div>

      {/* Conversations Drawer */}
      <ConvDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        conversations={conversations}
        activeId={activeConversationId}
        onSelect={handleSelectConv}
        onNew={handleNewChat}
        onDelete={handleDeleteConv}
        tokenBalance={tokenBalance}
        plan={plan ?? "free"}
        user={user ? { email: user.email, name: userName } : null}
      />
    </>
  );
};

export default ChatPlayerFirst;
