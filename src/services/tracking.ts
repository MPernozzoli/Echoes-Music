import { supabase } from "@/integrations/supabase/client";
import { getSessionId } from "./sessionId";
import type { Song, EmotionalProfile } from "@/data/mockData";

const sessionId = getSessionId();

// --- SEARCH ---
export async function trackSearch(params: {
  rawPrompt: string;
  profile: EmotionalProfile;
  refineMetadata?: Record<string, unknown>;
}): Promise<string | null> {
  const { data, error } = await supabase
    .from("searches")
    .insert({
      anonymous_session_id: sessionId,
      raw_prompt: params.rawPrompt,
      prompt_language: "en",
      interpretation_summary: params.profile.mood,
      interpreted_themes: params.profile.themes as unknown as import("@/integrations/supabase/types").Json,
      interpreted_mood: { mood: params.profile.mood } as unknown as import("@/integrations/supabase/types").Json,
      interpreted_energy: params.profile.energy,
      interpreted_intimacy: params.profile.intimacy,
      interpreted_catharsis: params.profile.catharsis,
      interpreted_tension: params.profile.emotionalTension,
      model_version: "mock-v1",
      prompt_version: "1.0",
      refine_metadata: params.refineMetadata as unknown as import("@/integrations/supabase/types").Json ?? null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("trackSearch error:", error);
    return null;
  }
  return data.id;
}

// --- RESULTS ---
export async function trackResults(searchId: string, songs: Song[]): Promise<Record<string, string>> {
  const rows = songs.map((song, i) => ({
    search_id: searchId,
    position: i + 1,
    track_id: song.id,
    track_title: song.title,
    artist_name: song.artist,
    album_name: song.album,
    artwork_url: song.artwork,
    emotional_tags: song.emotionalTags as unknown as import("@/integrations/supabase/types").Json,
    match_explanation: song.explanation,
    relevance_score: song.relevanceScore,
    source_provider: "mock",
  }));

  const { data, error } = await supabase
    .from("search_results")
    .insert(rows)
    .select("id, track_id");

  if (error) {
    console.error("trackResults error:", error);
    return {};
  }

  const map: Record<string, string> = {};
  data?.forEach((r) => { map[r.track_id] = r.id; });
  return map;
}

// --- INTERACTION ---
export async function trackInteraction(params: {
  searchResultId: string;
  searchId: string;
  interactionType: string;
  metadata?: Record<string, unknown>;
}) {
  const { error } = await supabase.from("result_interactions").insert({
    search_result_id: params.searchResultId,
    search_id: params.searchId,
    anonymous_session_id: sessionId,
    interaction_type: params.interactionType,
    interaction_metadata: (params.metadata ?? null) as unknown as import("@/integrations/supabase/types").Json,
  });
  if (error) console.error("trackInteraction error:", error);
}

// --- SEARCH FEEDBACK ---
export async function trackSearchFeedback(params: {
  searchId: string;
  label: string;
  text?: string;
}) {
  const { error } = await supabase.from("search_feedback").insert({
    search_id: params.searchId,
    anonymous_session_id: sessionId,
    feedback_label: params.label,
    optional_text_feedback: params.text ?? null,
  });
  if (error) console.error("trackSearchFeedback error:", error);
}

// --- RESULT FEEDBACK ---
export async function trackResultFeedback(params: {
  searchResultId: string;
  searchId: string;
  label: string;
  text?: string;
}) {
  const { error } = await supabase.from("result_feedback").insert({
    search_result_id: params.searchResultId,
    search_id: params.searchId,
    anonymous_session_id: sessionId,
    feedback_label: params.label,
    optional_text_feedback: params.text ?? null,
  });
  if (error) console.error("trackResultFeedback error:", error);
}

// --- USER SETTINGS ---
export async function getUserSettings() {
  const { data } = await supabase
    .from("user_settings")
    .select("*")
    .eq("anonymous_session_id", sessionId)
    .maybeSingle();
  return data;
}

export async function setAllowAnonymizedData(allow: boolean) {
  const existing = await getUserSettings();
  if (existing) {
    await supabase
      .from("user_settings")
      .update({ allow_anonymized_improvement_data: allow })
      .eq("id", existing.id);
  } else {
    await supabase.from("user_settings").insert({
      anonymous_session_id: sessionId,
      allow_anonymized_improvement_data: allow,
    });
  }
}

// --- ANONYMIZED TRAINING EVENT ---
export async function maybeCreateTrainingEvent(params: {
  searchId: string;
  rawPrompt: string;
  interpretationSummary: string;
  displayedResults: unknown[];
  interactionSummary: unknown[];
  feedbackSummary: unknown[];
}) {
  const settings = await getUserSettings();
  if (settings && !settings.allow_anonymized_improvement_data) return;

  const anonId = crypto.randomUUID(); // fully anonymized, not linked to session

  const { error } = await supabase.from("anonymized_training_events").insert({
    anonymized_session_id: anonId,
    search_id: params.searchId,
    raw_prompt: params.rawPrompt,
    interpretation_summary: params.interpretationSummary,
    displayed_results: params.displayedResults as unknown as import("@/integrations/supabase/types").Json,
    interaction_summary: params.interactionSummary as unknown as import("@/integrations/supabase/types").Json,
    feedback_summary: params.feedbackSummary as unknown as import("@/integrations/supabase/types").Json,
  });
  if (error) console.error("maybeCreateTrainingEvent error:", error);
}
