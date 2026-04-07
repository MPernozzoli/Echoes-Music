-- Preferenze profilo salvate per utente loggato (oltre a anonymous_session_id)
ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS ui_language text,
  ADD COLUMN IF NOT EXISTS description_language text,
  ADD COLUMN IF NOT EXISTS theme text;
