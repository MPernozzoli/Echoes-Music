-- Sincronizza i preferiti Echoes con una playlist "Echoes" sullo streaming (opzione utente)
ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS sync_favorites_echoes_playlist boolean NOT NULL DEFAULT false;
