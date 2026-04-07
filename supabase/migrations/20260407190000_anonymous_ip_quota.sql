-- Quota ricerche anonime per IP (anti-abuso se si svuota localStorage)
CREATE TABLE public.anonymous_ip_quotas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip text NOT NULL,
  anonymous_session_id text NOT NULL,
  conversation_id text NOT NULL,
  search_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT anonymous_ip_quotas_ip_unique UNIQUE (ip)
);

ALTER TABLE public.anonymous_ip_quotas ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_anonymous_ip_quotas_updated_at
  BEFORE UPDATE ON public.anonymous_ip_quotas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.anonymous_ip_quotas IS 'Traccia IP e sessione per massimo 1 ricerca anonima e 1 sola chat.';

CREATE OR REPLACE FUNCTION public.claim_anonymous_search(p_ip text, p_session text, p_conversation text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.anonymous_ip_quotas%ROWTYPE;
BEGIN
  IF p_ip IS NULL OR length(trim(p_ip)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_ip');
  END IF;
  IF p_session IS NULL OR length(trim(p_session)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_session');
  END IF;
  IF p_conversation IS NULL OR length(trim(p_conversation)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_conversation');
  END IF;

  SELECT * INTO r FROM public.anonymous_ip_quotas WHERE ip = p_ip FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.anonymous_ip_quotas (ip, anonymous_session_id, conversation_id, search_count)
    VALUES (trim(p_ip), trim(p_session), trim(p_conversation), 1);
    RETURN jsonb_build_object('ok', true);
  END IF;

  IF r.anonymous_session_id IS DISTINCT FROM trim(p_session) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'session_mismatch');
  END IF;

  IF r.conversation_id IS DISTINCT FROM trim(p_conversation) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'conversation_mismatch');
  END IF;

  IF r.search_count >= 1 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'search_limit');
  END IF;

  UPDATE public.anonymous_ip_quotas
  SET search_count = r.search_count + 1, updated_at = now()
  WHERE ip = p_ip;
  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_anonymous_search(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_anonymous_search(text, text, text) TO service_role;
