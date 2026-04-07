-- Advanced "bring your own" OpenAI-compatible API key (metadata on settings; ciphertext in separate table)

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS ai_provider_mode text NOT NULL DEFAULT 'managed'
    CHECK (ai_provider_mode IN ('managed', 'byo_key')),
  ADD COLUMN IF NOT EXISTS byo_ai_provider text,
  ADD COLUMN IF NOT EXISTS byo_api_key_masked text,
  ADD COLUMN IF NOT EXISTS byo_key_status text,
  ADD COLUMN IF NOT EXISTS byo_key_last_validated_at timestamptz,
  ADD COLUMN IF NOT EXISTS byo_disclaimer_accepted_at timestamptz;

COMMENT ON COLUMN public.user_settings.ai_provider_mode IS 'managed = Echoes AI; byo_key = user OpenAI API key';
COMMENT ON COLUMN public.user_settings.byo_key_status IS 'valid | invalid | quota_exceeded | rate_limited | connection_failed | unknown | untested';

CREATE TABLE IF NOT EXISTS public.user_byo_ai_secrets (
  user_id uuid NOT NULL PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  iv text NOT NULL,
  ciphertext text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_byo_ai_secrets ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_user_byo_ai_secrets_updated_at
  BEFORE UPDATE ON public.user_byo_ai_secrets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
