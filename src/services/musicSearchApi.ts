import type { EmotionalProfile, Song } from "@/data/mockData";
import type { ConversationMemory, UserTasteProfile } from "@/types/conversation";

export type MusicSearchMode = "search" | "lucky" | "memory_compact";

export interface MusicSearchRequest {
  prompt?: string;
  descriptionLanguage?: string;
  mode?: MusicSearchMode;
  conversationMemory?: ConversationMemory | null;
  userTasteProfile?: UserTasteProfile | null;
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
}

function projectUrl(): string {
  const id = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  return `https://${id}.supabase.co/functions/v1/music-search`;
}

export async function callMusicSearch(body: MusicSearchRequest): Promise<MusicSearchResponse> {
  const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const res = await fetch(projectUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: ANON_KEY,
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json().catch(() => ({}))) as MusicSearchResponse & { error?: string };
  if (!res.ok) {
    return { error: data.error || "Search failed" };
  }
  return data;
}
