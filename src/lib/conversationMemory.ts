import type { SearchResult } from "@/data/mockData";
import type { ConversationMemory } from "@/types/conversation";
import { emotionalProfileToAxes } from "@/types/conversation";

export function memoryOrFromProfile(
  memory: ConversationMemory | null,
  profile: SearchResult["emotionalProfile"] | null
): ConversationMemory | null {
  if (memory?.threadSummary) return memory;
  if (!profile) return memory;
  return {
    threadSummary: profile.mood.slice(0, 200),
    standardAxes: emotionalProfileToAxes(profile),
    turnCount: memory?.turnCount ?? 0,
    lastUpdatedAt: memory?.lastUpdatedAt,
  };
}
