import { supabase } from "@/integrations/supabase/client";

export interface AppleMusicConnectionRow {
  user_id: string;
  last_authorized_at: string | null;
}

export async function getAppleMusicConnection(userId: string): Promise<AppleMusicConnectionRow | null> {
  const { data, error } = await supabase
    .from("apple_music_connections")
    .select("user_id, last_authorized_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return data;
}

export async function upsertAppleMusicConnection(userId: string) {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("apple_music_connections")
    .upsert(
      {
        user_id: userId,
        last_authorized_at: now,
      },
      { onConflict: "user_id" },
    );
  if (error) throw error;
}

export async function deleteAppleMusicConnection(userId: string) {
  const { error } = await supabase
    .from("apple_music_connections")
    .delete()
    .eq("user_id", userId);
  if (error) throw error;
}
