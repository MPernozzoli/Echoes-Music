import type { EmotionalProfile, SearchResult } from "@/data/mockData";

export const EMPTY_SEARCH_PROFILE: EmotionalProfile = {
  themes: [],
  mood: "—",
  energy: "",
  intimacy: "",
  catharsis: "",
  emotionalTension: "",
};

export function buildEmptySearchResult(args: {
  prompt: string;
  narrative: string;
  emotionalProfile?: EmotionalProfile;
  adjacentInterpretations?: string[];
  searchMode?: SearchResult["searchMode"];
}): SearchResult {
  const profile = args.emotionalProfile ?? EMPTY_SEARCH_PROFILE;
  return {
    id: `sr-${Date.now()}`,
    prompt: args.prompt,
    timestamp: new Date().toISOString(),
    emotionalProfile: profile,
    songs: [],
    adjacentInterpretations: args.adjacentInterpretations ?? [],
    narrativeReply: args.narrative,
    ...(args.searchMode ? { searchMode: args.searchMode } : {}),
  };
}
