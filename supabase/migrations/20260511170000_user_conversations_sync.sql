CREATE TABLE IF NOT EXISTS public.user_conversations (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Chat',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  conversation_profile JSONB,
  conversation_memory JSONB,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own conversations"
ON public.user_conversations FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversations"
ON public.user_conversations FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations"
ON public.user_conversations FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations"
ON public.user_conversations FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_conversations_user_updated
ON public.user_conversations (user_id, updated_at DESC);
