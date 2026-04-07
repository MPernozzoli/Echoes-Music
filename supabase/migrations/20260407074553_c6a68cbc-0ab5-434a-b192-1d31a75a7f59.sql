
-- 1. searches
CREATE TABLE public.searches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  anonymous_session_id TEXT,
  raw_prompt TEXT NOT NULL,
  prompt_language TEXT NOT NULL DEFAULT 'en',
  interpretation_summary TEXT,
  interpreted_themes JSONB DEFAULT '[]'::jsonb,
  interpreted_mood JSONB DEFAULT '{}'::jsonb,
  interpreted_energy TEXT,
  interpreted_intimacy TEXT,
  interpreted_catharsis TEXT,
  interpreted_tension TEXT,
  model_version TEXT NOT NULL DEFAULT 'mock-v1',
  prompt_version TEXT NOT NULL DEFAULT '1.0',
  refine_metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow insert searches" ON public.searches FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow select searches" ON public.searches FOR SELECT USING (true);

-- 2. search_results
CREATE TABLE public.search_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  search_id UUID NOT NULL REFERENCES public.searches(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  track_id TEXT NOT NULL,
  track_title TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  album_name TEXT,
  artwork_url TEXT,
  emotional_tags JSONB DEFAULT '[]'::jsonb,
  match_explanation TEXT NOT NULL,
  relevance_score NUMERIC,
  source_provider TEXT NOT NULL DEFAULT 'mock',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.search_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow insert search_results" ON public.search_results FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow select search_results" ON public.search_results FOR SELECT USING (true);

CREATE INDEX idx_search_results_search_id ON public.search_results(search_id);

-- 3. result_interactions
CREATE TABLE public.result_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  search_result_id UUID NOT NULL REFERENCES public.search_results(id) ON DELETE CASCADE,
  search_id UUID NOT NULL REFERENCES public.searches(id) ON DELETE CASCADE,
  user_id UUID,
  anonymous_session_id TEXT,
  interaction_type TEXT NOT NULL,
  interaction_metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.result_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow insert result_interactions" ON public.result_interactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow select result_interactions" ON public.result_interactions FOR SELECT USING (true);

CREATE INDEX idx_result_interactions_search_id ON public.result_interactions(search_id);
CREATE INDEX idx_result_interactions_type ON public.result_interactions(interaction_type);

-- 4. search_feedback
CREATE TABLE public.search_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  search_id UUID NOT NULL REFERENCES public.searches(id) ON DELETE CASCADE,
  user_id UUID,
  anonymous_session_id TEXT,
  feedback_label TEXT NOT NULL,
  optional_text_feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.search_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow insert search_feedback" ON public.search_feedback FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow select search_feedback" ON public.search_feedback FOR SELECT USING (true);

CREATE INDEX idx_search_feedback_search_id ON public.search_feedback(search_id);

-- 5. result_feedback
CREATE TABLE public.result_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  search_result_id UUID NOT NULL REFERENCES public.search_results(id) ON DELETE CASCADE,
  search_id UUID NOT NULL REFERENCES public.searches(id) ON DELETE CASCADE,
  user_id UUID,
  anonymous_session_id TEXT,
  feedback_label TEXT NOT NULL,
  optional_text_feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.result_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow insert result_feedback" ON public.result_feedback FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow select result_feedback" ON public.result_feedback FOR SELECT USING (true);

CREATE INDEX idx_result_feedback_search_result_id ON public.result_feedback(search_result_id);

-- 6. user_settings
CREATE TABLE public.user_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  anonymous_session_id TEXT,
  allow_anonymized_improvement_data BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all user_settings" ON public.user_settings FOR ALL USING (true) WITH CHECK (true);

-- 7. anonymized_training_events
CREATE TABLE public.anonymized_training_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  anonymized_session_id TEXT NOT NULL,
  search_id UUID NOT NULL REFERENCES public.searches(id) ON DELETE CASCADE,
  raw_prompt TEXT NOT NULL,
  interpretation_summary TEXT,
  displayed_results JSONB DEFAULT '[]'::jsonb,
  interaction_summary JSONB DEFAULT '[]'::jsonb,
  feedback_summary JSONB DEFAULT '[]'::jsonb,
  outcome_score NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.anonymized_training_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow insert anonymized_training_events" ON public.anonymized_training_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow select anonymized_training_events" ON public.anonymized_training_events FOR SELECT USING (true);

CREATE INDEX idx_anonymized_training_search_id ON public.anonymized_training_events(search_id);

-- Timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
