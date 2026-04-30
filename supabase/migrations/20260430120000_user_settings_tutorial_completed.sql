ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS tutorial_completed_at TIMESTAMP WITH TIME ZONE;
