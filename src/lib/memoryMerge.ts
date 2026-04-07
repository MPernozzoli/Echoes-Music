import type {
  ConversationMemory,
  StandardEmotionalAxes,
  UserTasteProfile,
} from "@/types/conversation";
import {
  DEFAULT_USER_TASTE_PROFILE,
  EMPTY_STANDARD_AXES,
} from "@/types/conversation";

const MAX_SUMMARY = 560;
const MAX_THEMES = 8;
const MAX_GENRE_TAGS = 12;
const MAX_LANGS = 6;

const ENERGY = new Set(["low", "medium", "high"]);
const BAND = new Set(["low", "medium", "high"]);

export function clampSummary(s: string, max = MAX_SUMMARY): string {
  const t = (s || "").trim();
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

export function normalizeStandardAxes(raw: Partial<StandardEmotionalAxes> | null | undefined): StandardEmotionalAxes {
  if (!raw || typeof raw !== "object") return { ...EMPTY_STANDARD_AXES };
  const energy = ENERGY.has(String(raw.energy)) ? (raw.energy as StandardEmotionalAxes["energy"]) : "medium";
  let intimacy = Number(raw.intimacy);
  if (!Number.isFinite(intimacy)) intimacy = 3;
  intimacy = Math.min(5, Math.max(1, Math.round(intimacy))) as StandardEmotionalAxes["intimacy"];
  const catharsis = BAND.has(String(raw.catharsis)) ? (raw.catharsis as StandardEmotionalAxes["catharsis"]) : "medium";
  const emotionalTension = BAND.has(String(raw.emotionalTension))
    ? (raw.emotionalTension as StandardEmotionalAxes["emotionalTension"])
    : "medium";
  const themes = Array.isArray(raw.dominantThemes)
    ? raw.dominantThemes
        .filter((t): t is string => typeof t === "string")
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, MAX_THEMES)
    : [];
  const moodLabel = clampSummary(typeof raw.moodLabel === "string" ? raw.moodLabel : "", 120);
  return {
    moodLabel,
    energy,
    intimacy: intimacy as StandardEmotionalAxes["intimacy"],
    catharsis,
    emotionalTension,
    dominantThemes: themes,
  };
}

export function normalizeConversationMemory(raw: Partial<ConversationMemory> | null | undefined): ConversationMemory {
  return {
    threadSummary: clampSummary(raw?.threadSummary ?? ""),
    standardAxes: normalizeStandardAxes(raw?.standardAxes),
    turnCount: typeof raw?.turnCount === "number" ? raw.turnCount : undefined,
    lastUpdatedAt: raw?.lastUpdatedAt,
  };
}

/** Replace thread memory with server update (server is source of truth per turn). */
export function applyConversationMemoryUpdate(
  prev: ConversationMemory | null,
  update: Partial<ConversationMemory> | null | undefined
): ConversationMemory {
  const base = prev ?? {
    threadSummary: "",
    standardAxes: { ...EMPTY_STANDARD_AXES },
  };
  const n = normalizeConversationMemory({
    ...base,
    ...update,
    standardAxes: update?.standardAxes ?? base.standardAxes,
  });
  n.turnCount = (base.turnCount ?? 0) + 1;
  n.lastUpdatedAt = new Date().toISOString();
  return n;
}

export function mergeUserTasteProfile(
  prev: UserTasteProfile,
  delta: Partial<UserTasteProfile> | null | undefined
): UserTasteProfile {
  if (!delta) return prev;
  const genre = mergeStringLists(prev.genreAffinityTags, delta.genreAffinityTags, MAX_GENRE_TAGS);
  const langs = mergeStringLists(prev.preferredLanguages, delta.preferredLanguages, MAX_LANGS);
  const globalSummary = delta.globalSummary != null ? clampSummary(delta.globalSummary, MAX_SUMMARY) : prev.globalSummary;
  let axes = prev.userStandardAxes;
  if (delta.userStandardAxes != null) {
    const n = normalizeStandardAxes(delta.userStandardAxes);
    axes = {
      moodLabel: n.moodLabel || prev.userStandardAxes.moodLabel,
      energy: n.moodLabel ? n.energy : prev.userStandardAxes.energy,
      intimacy: Math.min(
        5,
        Math.max(1, Math.round((prev.userStandardAxes.intimacy + n.intimacy) / 2))
      ) as StandardEmotionalAxes["intimacy"],
      catharsis: n.moodLabel ? n.catharsis : prev.userStandardAxes.catharsis,
      emotionalTension: n.moodLabel ? n.emotionalTension : prev.userStandardAxes.emotionalTension,
      dominantThemes: mergeStringLists(prev.userStandardAxes.dominantThemes, n.dominantThemes, MAX_THEMES),
    };
  }
  return {
    globalSummary,
    userStandardAxes: axes,
    genreAffinityTags: genre,
    preferredLanguages: langs,
  };
}

function mergeStringLists(a: string[], b: string[] | undefined, cap: number): string[] {
  if (!b?.length) return a.slice(0, cap);
  const set = new Set<string>();
  [...a, ...b].forEach((x) => {
    const t = String(x).trim();
    if (t) set.add(t);
  });
  return Array.from(set).slice(0, cap);
}

export function loadUserTasteProfile(raw: unknown): UserTasteProfile {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_USER_TASTE_PROFILE };
  const o = raw as Record<string, unknown>;
  return {
    globalSummary: clampSummary(typeof o.globalSummary === "string" ? o.globalSummary : "", MAX_SUMMARY),
    userStandardAxes: normalizeStandardAxes(o.userStandardAxes as StandardEmotionalAxes),
    genreAffinityTags: Array.isArray(o.genreAffinityTags)
      ? o.genreAffinityTags.filter((x): x is string => typeof x === "string").slice(0, MAX_GENRE_TAGS)
      : [],
    preferredLanguages: Array.isArray(o.preferredLanguages)
      ? o.preferredLanguages.filter((x): x is string => typeof x === "string").slice(0, MAX_LANGS)
      : [],
  };
}
