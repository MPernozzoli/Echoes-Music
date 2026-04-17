CREATE TABLE public.apple_music_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_authorized_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.apple_music_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all apple_music_connections"
ON public.apple_music_connections
FOR ALL
USING (true)
WITH CHECK (true);

CREATE TRIGGER update_apple_music_connections_updated_at
  BEFORE UPDATE ON public.apple_music_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
