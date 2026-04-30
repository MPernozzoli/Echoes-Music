ALTER TABLE public.searches
  ADD COLUMN IF NOT EXISTS display_prompt TEXT,
  ADD COLUMN IF NOT EXISTS display_approved BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS display_processed BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_searches_display_approved
  ON public.searches (created_at DESC)
  WHERE display_approved = true;
