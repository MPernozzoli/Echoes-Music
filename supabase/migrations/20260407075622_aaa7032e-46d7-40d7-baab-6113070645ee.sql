
CREATE TABLE public.spotify_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  anonymous_session_id TEXT,
  spotify_user_id TEXT NOT NULL,
  display_name TEXT,
  product TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.spotify_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all spotify_connections" ON public.spotify_connections FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_spotify_connections_updated_at
  BEFORE UPDATE ON public.spotify_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE UNIQUE INDEX idx_spotify_connections_session ON public.spotify_connections(anonymous_session_id);
