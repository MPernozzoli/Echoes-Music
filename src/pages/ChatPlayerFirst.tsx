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
import type { SearchResult, Song, SongVersion } from "@/data/mockData";
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
import { fallbackNarrativeForResult } from "@/lib/assistantNarrative";
import { useAppleMusic } from "@/context/useAppleMusic";
import { useSpotify } from "@/context/useSpotify";
import { addAppleMusicSongToLibrary } from "@/services/appleMusicLibrary";
import { getAppleMusicUserToken } from "@/services/appleMusicSession";
import { spotifySaveTracks, spotifyListPlaylists, spotifyAddTrackToPlaylist } from "@/services/spotify";
import { useStreamingPlaybackMode } from "@/hooks/useStreamingPlaybackMode";
import { isLuckyPrompt } from "@/constants/luckyPrompt";
import type { MusicSearchMode } from "@/services/musicSearchApi";
import type { ChatMessage, Conversation } from "@/types/conversation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { requestPlaybackToggle } from "@/lib/playbackToggleBridge";
import { requestSkipPrev, requestSkipNext, requestShuffleToggle, requestRepeatCycle } from "@/lib/playbackControlBridge";
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
  Heart,
  Repeat1,
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

async function extractArtworkColor(url: string): Promise<{h: number; s: number; l: number}> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    const fallback = { h: 35, s: 78, l: 50 };
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 80; canvas.height = 80;
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve(fallback); return; }
        ctx.drawImage(img, 0, 0, 80, 80);
        const d = ctx.getImageData(0, 0, 80, 80).data;
        let r = 0, g = 0, b = 0, n = 0;
        for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i+1]; b += d[i+2]; n++; }
        const rN = r/n/255, gN = g/n/255, bN = b/n/255;
        const max = Math.max(rN,gN,bN), min = Math.min(rN,gN,bN);
        let h = 0, s = 0; const l = (max+min)/2;
        if (max !== min) {
          const diff = max - min;
          s = l > 0.5 ? diff/(2-max-min) : diff/(max+min);
          if (max === rN) h = (gN-bN)/diff + (gN < bN ? 6 : 0);
          else if (max === gN) h = (bN-rN)/diff + 2;
          else h = (rN-gN)/diff + 4;
          h /= 6;
        }
        resolve({ h: Math.round(h*360), s: Math.round(s*100), l: Math.round(Math.max(25, Math.min(62, l*100))) });
      } catch { resolve(fallback); }
    };
    img.onerror = () => resolve(fallback);
    img.src = url;
  });
}

function versionToSong(version: SongVersion, parent: Song): Song {
  return {
    ...parent,
    id: version.id,
    title: version.title,
    artist: version.artist,
    album: version.album,
    releaseYear: version.releaseYear,
    provider: version.provider ?? parent.provider,
    spotifyUri: version.spotifyUri,
    appleMusicId: version.appleMusicId,
    previewUrl: version.previewUrl,
    alternateVersions: undefined,
  };
}

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
  const [progress, setProgress] = useState(0);
  const [shuffleOn, setShuffleOn] = useState(false);
  const [repeatMode, setRepeatMode] = useState<"off" | "all" | "one">("off");

  useEffect(() => { setProgress(0); }, [song?.id]);

  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => {
      setProgress((p) => (p >= 0.99 ? 0.99 : p + 1 / 240));
    }, 1000);
    return () => clearInterval(id);
  }, [isPlaying]);

  const totalSecs = 240;
  const elapsed = Math.floor(progress * totalSecs);
  const remaining = totalSecs - elapsed;
  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const handleShuffleToggle = () => {
    requestShuffleToggle();
    setShuffleOn((v) => !v);
  };

  const handleRepeatCycle = () => {
    requestRepeatCycle();
    setRepeatMode((r) => (r === "off" ? "all" : r === "all" ? "one" : "off"));
  };

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

      <PFLibraryActions song={song} />

      {/* Waveform */}
      <div className="pf-scrubber">
        <div className="pf-wave">
          {wave.map((h, i) => (
            <span
              key={i}
              className={cn("pf-bar", i / wave.length < progress ? "played" : "")}
              style={{ height: `${h * 100}%` }}
            />
          ))}
        </div>
        <div className="pf-wave-times">
          <span>{fmtTime(elapsed)}</span>
          <span>−{fmtTime(remaining)}</span>
        </div>
      </div>

      {/* Transport */}
      <div className="pf-transport">
        <button
          className={cn("pf-t-btn", shuffleOn && "pf-t-btn--active")}
          onClick={handleShuffleToggle}
          aria-label="Shuffle"
          title={shuffleOn ? "Shuffle attivo" : "Shuffle"}
        >
          <Shuffle className="w-3.5 h-3.5" />
        </button>
        <div className="pf-transport-main">
          <button className="pf-t-btn" onClick={onPrev} aria-label="Precedente" disabled={!song}>
            <SkipBack className="w-4 h-4" />
          </button>
          <button className="pf-t-play" onClick={onTogglePlay} aria-label={isPlaying ? "Pausa" : "Riproduci"} disabled={!song}>
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>
          <button className="pf-t-btn" onClick={onNext} aria-label="Successivo" disabled={!song}>
            <SkipForward className="w-4 h-4" />
          </button>
        </div>
        <button
          className={cn("pf-t-btn", repeatMode !== "off" && "pf-t-btn--active")}
          onClick={handleRepeatCycle}
          aria-label="Repeat"
          title={repeatMode === "off" ? "Ripeti" : repeatMode === "all" ? "Ripeti tutto" : "Ripeti uno"}
        >
          {repeatMode === "one" ? <Repeat1 className="w-3.5 h-3.5" /> : <Repeat className="w-3.5 h-3.5" />}
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

// ─── Library & Playlist actions (wired to Spotify / Apple Music) ─────────────

function PFLibraryActions({ song }: { song: Song | null }) {
  const appleMusic = useAppleMusic();
  const spotify = useSpotify();
  const [appleBusy, setAppleBusy] = useState(false);
  const [spotifyBusy, setSpotifyBusy] = useState(false);
  const [playlistsOpen, setPlaylistsOpen] = useState(false);
  const [playlists, setPlaylists] = useState<{ id: string; name: string }[]>([]);
  const [playlistsLoading, setPlaylistsLoading] = useState(false);
  const [addingToId, setAddingToId] = useState<string | null>(null);

  const appleMusicId = song?.appleMusicId;
  const spotifyTrackId = song?.spotifyUri?.replace("spotify:track:", "");
  const canApple = Boolean(appleMusic.isAuthorized && appleMusicId);
  const canSpotify = Boolean(spotify.isConnected && spotifyTrackId);

  // Reset playlist picker when song changes
  useEffect(() => {
    setPlaylistsOpen(false);
    setPlaylists([]);
  }, [song?.id]);

  const handleLibrary = useCallback(async () => {
    if (!song) return;
    if (canApple && appleMusicId) {
      setAppleBusy(true);
      const token = await getAppleMusicUserToken();
      if (token) {
        const r = await addAppleMusicSongToLibrary(appleMusicId, token);
        if ("error" in r) toast.error("Apple Music: errore aggiunta libreria");
        else toast.success("Aggiunto alla libreria Apple Music");
      }
      setAppleBusy(false);
    }
    if (canSpotify && spotifyTrackId) {
      setSpotifyBusy(true);
      const r = await spotifySaveTracks([spotifyTrackId]);
      setSpotifyBusy(false);
      if ("error" in r) toast.error("Spotify: brano non salvato");
      else toast.success("Salvato nei brani di Spotify");
    }
    if (!canApple && !canSpotify) {
      toast.info("Collega Spotify o Apple Music dal tuo profilo");
    }
  }, [song, canApple, canSpotify, appleMusicId, spotifyTrackId]);

  const handleOpenPlaylists = useCallback(async () => {
    if (!canSpotify) { toast.info("Collega Spotify dal profilo per usare le playlist"); return; }
    if (playlistsOpen) { setPlaylistsOpen(false); return; }
    setPlaylistsOpen(true);
    if (playlists.length === 0) {
      setPlaylistsLoading(true);
      const r = await spotifyListPlaylists();
      setPlaylistsLoading(false);
      if ("error" in r) { toast.error("Impossibile caricare le playlist"); setPlaylistsOpen(false); }
      else setPlaylists(r.playlists);
    }
  }, [canSpotify, playlistsOpen, playlists.length]);

  const handleAddToPlaylist = useCallback(async (playlistId: string) => {
    if (!spotifyTrackId) return;
    setAddingToId(playlistId);
    const r = await spotifyAddTrackToPlaylist(playlistId, spotifyTrackId);
    setAddingToId(null);
    if ("error" in r) toast.error("Non aggiunto alla playlist");
    else { toast.success("Aggiunto alla playlist"); setPlaylistsOpen(false); }
  }, [spotifyTrackId]);

  const libraryBusy = appleBusy || spotifyBusy;

  return (
    <div className="pf-rail-actions-wrap">
      <div className="pf-rail-actions">
        <button
          className="pf-rail-action-btn"
          onClick={() => void handleLibrary()}
          aria-label="Aggiungi a Libreria"
          disabled={!song || libraryBusy}
        >
          {libraryBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Heart className="w-3.5 h-3.5" />}
          <span>Libreria</span>
        </button>
        <button
          className={cn("pf-rail-action-btn", playlistsOpen && "pf-rail-action-btn--active")}
          onClick={() => void handleOpenPlaylists()}
          aria-label="Aggiungi a playlist"
          disabled={!song}
        >
          <ListMusic className="w-3.5 h-3.5" />
          <span>+ Playlist</span>
        </button>
      </div>

      {playlistsOpen && (
        <div className="pf-playlist-picker">
          {playlistsLoading ? (
            <div className="pf-playlist-loading"><Loader2 className="w-4 h-4 animate-spin" /></div>
          ) : playlists.length === 0 ? (
            <p className="pf-playlist-empty">Nessuna playlist trovata</p>
          ) : (
            playlists.map((p) => (
              <button
                key={p.id}
                className="pf-playlist-item"
                onClick={() => void handleAddToPlaylist(p.id)}
                disabled={addingToId === p.id}
              >
                {addingToId === p.id
                  ? <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                  : <ListMusic className="w-3 h-3 shrink-0" />}
                <span>{p.name}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Narrative with accent on first 4 words ───────────────────────────────────

function PFNarrative({ text }: { text: string }) {
  const words = text.trim().split(" ");
  const head = words.slice(0, 4).join(" ");
  const tail = " " + words.slice(4).join(" ");
  return (
    <p className="pf-narrative">
      <span className="accent">{head}</span>
      {tail}
    </p>
  );
}

// ─── Track Shelf (horizontal card carousel) ───────────────────────────────────

interface PFTrackShelfProps {
  songs: Song[];
  currentSong: Song | null;
  isGloballyPlaying: boolean;
  onPlay: (songs: Song[], idx: number) => void;
  onOpenDetail: (song: Song) => void;
}

function PFTrackShelf({ songs, currentSong, isGloballyPlaying, onPlay, onOpenDetail }: PFTrackShelfProps) {
  return (
    <div className="pf-tracks-shelf">
      <div className="pf-tracks-shelf-inner">
        {songs.map((song, i) => {
          const isNow = song.id === currentSong?.id;
          const glyph = song.title.charAt(0);
          return (
            <div
              key={song.id + i}
              className={cn("pf-track-card", isNow ? "now-playing" : "")}
              onClick={() => onOpenDetail(song)}
            >
              <div className="pf-track-card-art">
                {song.artwork ? (
                  <img src={song.artwork} alt={song.title} />
                ) : (
                  <div className="pf-tc-fallback">
                    <span className="pf-tc-glyph">{glyph}</span>
                  </div>
                )}
                <span className="pf-tc-relevance">
                  {Math.min(100, Math.round(song.relevanceScore ?? 80))}% MATCH
                </span>
                <div className="pf-tc-play">
                  <button
                    className="pf-tc-play-btn"
                    onClick={(e) => { e.stopPropagation(); onPlay(songs, i); }}
                    aria-label="Riproduci"
                  >
                    <Play className="w-5 h-5" />
                  </button>
                </div>
                {isNow && isGloballyPlaying && (
                  <span className="pf-now-bars"><i /><i /><i /></span>
                )}
              </div>
              <div className="pf-track-card-meta">
                <div className="pf-track-card-title">{song.title}</div>
                <div className="pf-track-card-artist">{song.artist}</div>
              </div>
              <div className="pf-track-card-foot">
                <span>{song.album}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Track Detail Panel ───────────────────────────────────────────────────────

interface PFTrackDetailProps {
  song: Song;
  narrative: string;
  emotionLine?: string;
  currentSongId: string | null;
  isGloballyPlaying: boolean;
  onClose: () => void;
  onPlay: (song: Song) => void;
  onQueue: (song: Song, mode: "next" | "end") => void;
}

function PFTrackDetail({
  song,
  narrative,
  emotionLine,
  currentSongId,
  isGloballyPlaying,
  onClose,
  onPlay,
  onQueue,
}: PFTrackDetailProps) {
  const versions: Array<{ song: Song; label: string; tag?: string; primary?: boolean }> = [
    { song, label: song.album || song.title, primary: true },
    ...(song.alternateVersions ?? []).map((v) => ({
      song: versionToSong(v, song),
      label: v.title,
      tag: v.album !== song.album ? v.album : undefined,
    })),
  ];
  const glyph = song.title.charAt(0);
  return (
    <>
      <div className="pf-detail-backdrop" onClick={onClose} />
      <div className="pf-track-detail">
        <div
          className="pf-td-head"
          style={song.artwork ? { backgroundImage: `url(${song.artwork})` } : {}}
        >
          <div className="pf-td-head-overlay" />
          <button className="pf-td-close" onClick={onClose} aria-label="Chiudi">
            <X className="w-4 h-4" />
          </button>
          <div className="pf-td-glyph">{glyph}</div>
          <div className="pf-td-meta">
            {song.album && (
              <div className="pf-td-eyebrow">{song.album}</div>
            )}
            <h2 className="pf-td-title">{song.title}</h2>
            <p className="pf-td-artist">{song.artist}</p>
            <div className="pf-td-stats">
              {song.relevanceScore != null && (
                <span><b>{Math.min(100, Math.round(song.relevanceScore))}%</b> match</span>
              )}
              <span><b>{versions.length}</b> {versions.length === 1 ? "versione" : "versioni"}</span>
            </div>
          </div>
        </div>

        <div className="pf-td-section">
          <p className="pf-td-section-title">Perché questo brano</p>
          <p className="pf-td-reasoning">{narrative}</p>
          {emotionLine && <p className="pf-td-emotion">— {emotionLine}</p>}
        </div>

        <div className="pf-td-section">
          <p className="pf-td-section-title">Versioni disponibili</p>
          <div className="pf-versions-list">
            {versions.map((v) => {
              const isPlaying = v.song.id === currentSongId && isGloballyPlaying;
              const isCurrent = v.song.id === currentSongId;
              return (
                <div key={v.song.id} className={cn("pf-version-row", isCurrent ? "playing" : "")}>
                  <button
                    className="pf-v-play"
                    onClick={() => onPlay(v.song)}
                    aria-label={isPlaying ? "In riproduzione" : "Riproduci"}
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <div className="pf-v-info">
                    <div className="pf-v-label">
                      {v.label}
                      {v.primary && <span className="pf-v-pin">ORIGINALE</span>}
                      {v.tag && <span className="pf-v-tag">{v.tag}</span>}
                    </div>
                    <div className="pf-v-meta">
                      {v.song.artist}
                      {v.song.releaseYear ? ` · ${v.song.releaseYear}` : ""}
                    </div>
                  </div>
                  <button className="pf-v-act" onClick={() => onQueue(v.song, "next")}>↓ Dopo</button>
                  <button className="pf-v-act" onClick={() => onQueue(v.song, "end")}>+ In coda</button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
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
  const [expandedSong, setExpandedSong] = useState<Song | null>(null);
  const [expandedNarrative, setExpandedNarrative] = useState("");
  const [expandedEmotion, setExpandedEmotion] = useState("");
  const appRef = useRef<HTMLDivElement>(null);

  const [showRail, setShowRail] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 920 : false
  );
  useEffect(() => {
    const mql = window.matchMedia("(min-width: 920px)");
    const handler = (e: MediaQueryListEvent) => setShowRail(e.matches);
    mql.addEventListener("change", handler);
    setShowRail(mql.matches);
    return () => mql.removeEventListener("change", handler);
  }, []);
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

  // Extract dominant color from current song artwork → CSS vars for tint
  useEffect(() => {
    const el = appRef.current;
    if (!el) return;
    const url = currentSong?.artwork;
    if (!url) {
      el.style.setProperty("--pf-art-h", "35");
      el.style.setProperty("--pf-art-s", "78%");
      el.style.setProperty("--pf-art-l", "50%");
      return;
    }
    void extractArtworkColor(url).then(({ h, s, l }) => {
      el.style.setProperty("--pf-art-h", String(h));
      el.style.setProperty("--pf-art-s", s + "%");
      el.style.setProperty("--pf-art-l", l + "%");
    });
  }, [currentSong?.artwork]);

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

  const handleTrackPlay = useCallback(
    (songs: Song[], idx: number, searchResult?: { id: string; prompt: string }) => {
      playNowReplace(songs, idx, true, {
        conversationId: activeConversationId ?? "",
        searchResultId: searchResult?.id ?? currentResult?.id ?? "",
        prompt: searchResult?.prompt ?? currentResult?.prompt ?? "",
        selectionIntent: "card-click",
      });
    },
    [playNowReplace, activeConversationId, currentResult]
  );

  const handleOpenDetail = useCallback(
    (song: Song, narrative: string, emotion: string) => {
      setExpandedSong(song);
      setExpandedNarrative(narrative);
      setExpandedEmotion(emotion);
    },
    []
  );

  const handleDetailPlay = useCallback((song: Song) => {
    if (!latestAssistant) return;
    const songs = latestAssistant.searchResult.songs;
    const idx = songs.findIndex((s) => s.id === song.id);
    if (idx >= 0) {
      handleTrackPlay(songs, idx, latestAssistant.searchResult);
    } else {
      // version not in original result list — play it directly as a single-track queue
      playNowReplace([song], 0, true, {
        conversationId: activeConversationId ?? "",
        searchResultId: currentResult?.id ?? "",
        prompt: currentResult?.prompt ?? "",
        selectionIntent: "play_now",
      });
    }
    setExpandedSong(null);
  }, [latestAssistant, handleTrackPlay, playNowReplace, activeConversationId, currentResult]);

  const handleDetailQueue = useCallback((song: Song, mode: "next" | "end") => {
    const source = {
      conversationId: activeConversationId ?? "",
      searchResultId: currentResult?.id ?? "",
      prompt: currentResult?.prompt ?? "",
    };
    if (mode === "next") {
      insertAfterCurrent([song], source);
    } else {
      appendToQueue([song], source);
    }
    setExpandedSong(null);
  }, [insertAfterCurrent, appendToQueue, activeConversationId, currentResult]);

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
      <div className="pf-app" ref={appRef}>
        {/* Now Playing Rail */}
        {showRail && (
          <NowPlayingRail
            song={currentSong}
            isPlaying={isGloballyPlaying}
            onTogglePlay={requestPlaybackToggle}
            onPrev={requestSkipPrev}
            onNext={requestSkipNext}
            queue={queue}
            currentIndex={currentIndex}
            onPickFromQueue={(i) => { setCurrentIndex(i); }}
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
                <span className="pf-wordmark-dot" />
                Echoes
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

          {/* Thread header — shown when conversation has messages */}
          {hasAnyMessage && activeConversation && (
            <div className="pf-thread-header">
              <h2 className="pf-thread-title">{activeConversation.title}</h2>
              <span className="pf-thread-meta">
                {(assistantTurns?.length ?? 0)}{" "}
                {(assistantTurns?.length ?? 0) === 1 ? "mossa" : "mosse"}
              </span>
            </div>
          )}

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
                  const narrative =
                    r.narrativeReply?.trim() ||
                    fallbackNarrativeForResult(r.prompt, r.emotionalProfile, {
                      lucky: isLuckyPrompt(r.prompt),
                      songCount: r.songs.length,
                    });
                  const emotionLine = r.emotionalProfile?.mood ?? "";

                  return (
                    <div key={m.id} className="pf-msg-assistant">
                      <div className="pf-echoes-eyebrow">
                        <span className="pf-echoes-mark">Echoes</span>
                        <span className="pf-wave-mini">
                          <i /><i /><i /><i /><i />
                        </span>
                      </div>

                      {r.songs.length > 0 ? (
                        <>
                          <PFNarrative text={narrative} />
                          {emotionLine && (
                            <p className="pf-emotion-line">{emotionLine}</p>
                          )}
                          <PFTrackShelf
                            songs={r.songs}
                            currentSong={currentSong}
                            isGloballyPlaying={isGloballyPlaying}
                            onPlay={(songs, idx) => handleTrackPlay(songs, idx, r)}
                            onOpenDetail={(song) => handleOpenDetail(song, song.explanation.trim() || narrative, emotionLine)}
                          />
                        </>
                      ) : (
                        <p className="pf-narrative">
                          {narrative}
                        </p>
                      )}

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

      {/* Track Detail Panel */}
      {expandedSong && (
        <PFTrackDetail
          song={expandedSong}
          narrative={expandedNarrative}
          emotionLine={expandedEmotion}
          currentSongId={currentSong?.id ?? null}
          isGloballyPlaying={isGloballyPlaying}
          onClose={() => setExpandedSong(null)}
          onPlay={handleDetailPlay}
          onQueue={handleDetailQueue}
        />
      )}

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
