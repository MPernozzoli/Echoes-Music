import type { EmotionalProfile, Song } from "@/data/mockData";
import type { ConversationMemory, UserTasteProfile } from "@/types/conversation";
import { supabase } from "@/integrations/supabase/client";
import { getSessionId } from "@/services/sessionId";
import type { FeedbackLearningSummary } from "@/services/tracking";

export type MusicSearchMode = "search" | "lucky" | "memory_compact" | "creator_trends";
export type StreamingProviderPreference = "auto" | "spotify" | "apple_music" | "youtube_music";

export interface MusicSearchRequest {
  /** Obbligatorio per utenti anonimi (quota IP + una chat) */
  conversationId?: string;
  prompt?: string;
  /** Base64 grezzo (senza prefisso data:) — usato con imageMimeType per vision */
  imageBase64?: string;
  imageMimeType?: string;
  descriptionLanguage?: string;
  mode?: MusicSearchMode;
  streamingProviderPreference?: StreamingProviderPreference;
  conversationMemory?: ConversationMemory | null;
  userTasteProfile?: UserTasteProfile | null;
  feedbackLearningSummary?: FeedbackLearningSummary | null;
  lastUserPrompt?: string;
}

export interface MusicSearchResponse {
  emotionalProfile?: EmotionalProfile;
  songs?: Song[];
  /** Risposta discorsiva; i titoli devono essere tra « » come in songSuggestions */
  narrativeReply?: string;
  adjacentInterpretations?: string[];
  conversationMemoryUpdate?: {
    threadSummary?: string;
    standardAxes?: Record<string, unknown>;
  } | null;
  userTasteProfileUpdate?: Partial<UserTasteProfile> | null;
  error?: string;
  /** Es. insufficient_tokens (402), anon_* (403), byo_* */
  code?: string;
  /** True when custom API key failed; user may switch to managed AI in settings */
  byo_fallback_suggested?: boolean;
}

function projectUrl(): string {
  const id = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  return `https://${id}.supabase.co/functions/v1/music-search`;
}

export async function callMusicSearch(body: MusicSearchRequest): Promise<MusicSearchResponse> {
  const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const { data: { session } } = await supabase.auth.getSession();
  const bearer = session?.access_token ?? ANON_KEY;
  const payload: Record<string, unknown> = { ...body };
  if (!session?.user) {
    payload.anonymousSessionId = getSessionId();
    if (body.conversationId) payload.conversationId = body.conversationId;
  }
  const res = await fetch(projectUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: ANON_KEY,
      Authorization: `Bearer ${bearer}`,
    },
    body: JSON.stringify(payload),
  });

  const data = (await res.json().catch(() => ({}))) as MusicSearchResponse & {
    error?: string;
    code?: string;
    byo_fallback_suggested?: boolean;
  };
  if (!res.ok) {
    return {
      error: data.error || "Search failed",
      ...(typeof data.code === "string" ? { code: data.code } : {}),
      ...(data.byo_fallback_suggested === true ? { byo_fallback_suggested: true } : {}),
    };
  }
  return data;
}
