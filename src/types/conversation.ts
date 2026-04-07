import type { EmotionalProfile, SearchResult } from "@/data/mockData";

/** Canonical axis values sent to / from the API */
export type EnergyBand = "low" | "medium" | "high";
export type CatharsisBand = "low" | "medium" | "high";
export type TensionBand = "low" | "medium" | "high";

export interface StandardEmotionalAxes {
  moodLabel: string;
  energy: EnergyBand;
  intimacy: 1 | 2 | 3 | 4 | 5;
  catharsis: CatharsisBand;
  emotionalTension: TensionBand;
  dominantThemes: string[];
}

export interface ConversationMemory {
  threadSummary: string;
  standardAxes: StandardEmotionalAxes;
  turnCount?: number;
  lastUpdatedAt?: string;
}

export interface UserTasteProfile {
  globalSummary: string;
  userStandardAxes: StandardEmotionalAxes;
  genreAffinityTags: string[];
  preferredLanguages: string[];
}

export type ChatMessage =
  | { id: string; role: "user"; text: string; timestamp: string }
  | { id: string; role: "assistant"; timestamp: string; searchResult: SearchResult };

export interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
  messages: ChatMessage[];
  /** Last rich emotional profile from the latest assistant turn (UI) */
  conversationProfile: EmotionalProfile | null;
  /** Compact memory sent to the backend */
  conversationMemory: ConversationMemory | null;
}

export const EMPTY_STANDARD_AXES: StandardEmotionalAxes = {
  moodLabel: "",
  energy: "medium",
  intimacy: 3,
  catharsis: "medium",
  emotionalTension: "medium",
  dominantThemes: [],
};

export const DEFAULT_USER_TASTE_PROFILE: UserTasteProfile = {
  globalSummary: "",
  userStandardAxes: { ...EMPTY_STANDARD_AXES },
  genreAffinityTags: [],
  preferredLanguages: [],
};

export function emotionalProfileToAxes(profile: EmotionalProfile): StandardEmotionalAxes {
  return {
    moodLabel: profile.mood.slice(0, 120),
    energy: guessEnergyBand(profile.energy),
    intimacy: guessIntimacy(profile.intimacy),
    catharsis: guessCatharsisBand(profile.catharsis),
    emotionalTension: guessTensionBand(profile.emotionalTension),
    dominantThemes: profile.themes.slice(0, 8),
  };
}

function guessEnergyBand(s: string): EnergyBand {
  const x = s.toLowerCase();
  if (/\blow\b|calm|quiet|soft|minimal/i.test(x)) return "low";
  if (/\bhigh\b|intense|aggressive|driving|euphor/i.test(x)) return "high";
  return "medium";
}

function guessIntimacy(s: string): 1 | 2 | 3 | 4 | 5 {
  const x = s.toLowerCase();
  if (/very high|deeply personal|extremely/i.test(x)) return 5;
  if (/high|personal|intimate|raw/i.test(x)) return 4;
  if (/medium|moderate/i.test(x)) return 3;
  if (/low|distant|surface/i.test(x)) return 2;
  return 3;
}

function guessCatharsisBand(s: string): CatharsisBand {
  const x = s.toLowerCase();
  if (/gentle|subtle|mild|quiet/i.test(x)) return "low";
  if (/deep|explosive|overwhelming|dramatic|peak/i.test(x)) return "high";
  return "medium";
}

function guessTensionBand(s: string): TensionBand {
  const x = s.toLowerCase();
  if (/calm|resolved|peace|release|ease/i.test(x)) return "low";
  if (/high|unresolved|conflict|anxious|sharp/i.test(x)) return "high";
  return "medium";
}
