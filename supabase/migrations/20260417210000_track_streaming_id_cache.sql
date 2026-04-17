-- Cache condivisa titolo/artista normalizzati → ID Apple Music / Spotify (hit_count = frequenza d’uso)

CREATE TABLE public.track_streaming_id_cache (
  title_normalized TEXT NOT NULL CHECK (char_length(title_normalized) BETWEEN 1 AND 512),
  artist_normalized TEXT NOT NULL CHECK (char_length(artist_normalized) BETWEEN 1 AND 512),
  apple_music_catalog_id TEXT,
  apple_music_storefront TEXT,
  spotify_track_id TEXT,
  preview_url TEXT,
  artwork_url_template TEXT,
  hit_count INTEGER NOT NULL DEFAULT 1 CHECK (hit_count >= 0),
  last_hit_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (title_normalized, artist_normalized)
);

CREATE INDEX idx_track_streaming_id_cache_hit_count ON public.track_streaming_id_cache (hit_count DESC);

ALTER TABLE public.track_streaming_id_cache ENABLE ROW LEVEL SECURITY;

-- Nessuna policy: accesso solo tramite funzioni SECURITY DEFINER sotto.

CREATE OR REPLACE FUNCTION public.get_track_streaming_id_cache(
  p_title_normalized text,
  p_artist_normalized text
)
RETURNS SETOF public.track_streaming_id_cache
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF char_length(p_title_normalized) < 1 OR char_length(p_title_normalized) > 512
     OR char_length(p_artist_normalized) < 1 OR char_length(p_artist_normalized) > 512 THEN
    RETURN;
  END IF;

  RETURN QUERY
  UPDATE public.track_streaming_id_cache t
  SET hit_count = t.hit_count + 1,
      last_hit_at = now()
  WHERE t.title_normalized = p_title_normalized
    AND t.artist_normalized = p_artist_normalized
  RETURNING t.*;
END;
$$;

CREATE OR REPLACE FUNCTION public.merge_track_streaming_id_cache(
  p_title_normalized text,
  p_artist_normalized text,
  p_apple_music_catalog_id text DEFAULT NULL,
  p_apple_music_storefront text DEFAULT NULL,
  p_spotify_track_id text DEFAULT NULL,
  p_preview_url text DEFAULT NULL,
  p_artwork_url_template text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF char_length(p_title_normalized) < 1 OR char_length(p_title_normalized) > 512
     OR char_length(p_artist_normalized) < 1 OR char_length(p_artist_normalized) > 512 THEN
    RETURN;
  END IF;

  INSERT INTO public.track_streaming_id_cache (
    title_normalized,
    artist_normalized,
    apple_music_catalog_id,
    apple_music_storefront,
    spotify_track_id,
    preview_url,
    artwork_url_template,
    hit_count,
    last_hit_at,
    created_at
  ) VALUES (
    p_title_normalized,
    p_artist_normalized,
    p_apple_music_catalog_id,
    p_apple_music_storefront,
    p_spotify_track_id,
    p_preview_url,
    p_artwork_url_template,
    1,
    now(),
    now()
  )
  ON CONFLICT (title_normalized, artist_normalized) DO UPDATE SET
    apple_music_catalog_id = COALESCE(EXCLUDED.apple_music_catalog_id, public.track_streaming_id_cache.apple_music_catalog_id),
    apple_music_storefront = COALESCE(EXCLUDED.apple_music_storefront, public.track_streaming_id_cache.apple_music_storefront),
    spotify_track_id = COALESCE(EXCLUDED.spotify_track_id, public.track_streaming_id_cache.spotify_track_id),
    preview_url = COALESCE(EXCLUDED.preview_url, public.track_streaming_id_cache.preview_url),
    artwork_url_template = COALESCE(EXCLUDED.artwork_url_template, public.track_streaming_id_cache.artwork_url_template),
    hit_count = public.track_streaming_id_cache.hit_count + 1,
    last_hit_at = now();
END;
$$;

REVOKE ALL ON public.track_streaming_id_cache FROM PUBLIC;
GRANT ALL ON public.track_streaming_id_cache TO service_role;

GRANT EXECUTE ON FUNCTION public.get_track_streaming_id_cache(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.merge_track_streaming_id_cache(text, text, text, text, text, text, text) TO anon, authenticated;
