
-- apple_music_connections
DROP POLICY IF EXISTS "Allow all apple_music_connections" ON public.apple_music_connections;
CREATE POLICY "AM users select own" ON public.apple_music_connections
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "AM users insert own" ON public.apple_music_connections
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "AM users update own" ON public.apple_music_connections
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "AM users delete own" ON public.apple_music_connections
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- spotify_connections
DROP POLICY IF EXISTS "Allow all spotify_connections" ON public.spotify_connections;
CREATE POLICY "SP users select own" ON public.spotify_connections
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "SP users insert own" ON public.spotify_connections
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "SP users update own or claim anon" ON public.spotify_connections
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "SP users delete own" ON public.spotify_connections
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- user_settings
DROP POLICY IF EXISTS "Allow all user_settings" ON public.user_settings;
CREATE POLICY "US auth select own" ON public.user_settings
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "US auth insert own" ON public.user_settings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "US auth update own or claim anon" ON public.user_settings
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "US auth delete own" ON public.user_settings
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "US anon select anon rows" ON public.user_settings
  FOR SELECT TO anon USING (user_id IS NULL);
CREATE POLICY "US anon insert anon rows" ON public.user_settings
  FOR INSERT TO anon WITH CHECK (user_id IS NULL);
CREATE POLICY "US anon update anon rows" ON public.user_settings
  FOR UPDATE TO anon USING (user_id IS NULL) WITH CHECK (user_id IS NULL);

-- token_transactions: remove direct user inserts (service role only)
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.token_transactions;

-- user_tokens: remove direct user updates (service role only)
DROP POLICY IF EXISTS "Users can update own tokens" ON public.user_tokens;

-- result_feedback: restrict select to owner
DROP POLICY IF EXISTS "Allow select result_feedback" ON public.result_feedback;
CREATE POLICY "RF select own" ON public.result_feedback
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- searches: restrict select
DROP POLICY IF EXISTS "Allow select searches" ON public.searches;
CREATE POLICY "Searches public select approved" ON public.searches
  FOR SELECT TO anon, authenticated USING (display_approved = true);
CREATE POLICY "Searches users select own" ON public.searches
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Fix mutable search_path on email helper functions
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public;
