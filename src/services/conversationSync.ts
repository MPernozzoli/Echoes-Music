import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { Conversation } from "@/types/conversation";

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

export async function fetchUserConversations(userId: string): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from("user_conversations")
    .select("id, title, updated_at, conversation_profile, conversation_memory, messages")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(80);

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title || "Chat",
    updatedAt: row.updated_at,
    messages: Array.isArray(row.messages) ? (row.messages as unknown as Conversation["messages"]) : [],
    conversationProfile: (row.conversation_profile as unknown as Conversation["conversationProfile"]) ?? null,
    conversationMemory: (row.conversation_memory as unknown as Conversation["conversationMemory"]) ?? null,
  }));
}

export async function syncUserConversations(userId: string, conversations: Conversation[]) {
  const rows = conversations.slice(0, 80).map((conversation) => ({
    id: conversation.id,
    user_id: userId,
    title: conversation.title || "Chat",
    updated_at: conversation.updatedAt,
    conversation_profile: conversation.conversationProfile ? toJson(conversation.conversationProfile) : null,
    conversation_memory: conversation.conversationMemory ? toJson(conversation.conversationMemory) : null,
    messages: toJson(conversation.messages),
  }));

  if (rows.length > 0) {
    const { error } = await supabase
      .from("user_conversations")
      .upsert(rows, { onConflict: "id" });
    if (error) throw error;
  }
}

export async function deleteUserConversation(userId: string, conversationId: string) {
  const { error } = await supabase
    .from("user_conversations")
    .delete()
    .eq("user_id", userId)
    .eq("id", conversationId);
  if (error) throw error;
}
