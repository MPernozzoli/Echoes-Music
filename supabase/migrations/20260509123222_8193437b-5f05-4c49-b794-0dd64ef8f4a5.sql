ALTER TABLE public.searches
  ADD COLUMN IF NOT EXISTS display_processed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS display_approved boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS display_prompt text;

CREATE INDEX IF NOT EXISTS idx_searches_display_approved
  ON public.searches (display_approved, created_at DESC)
  WHERE display_approved = true;