CREATE OR REPLACE FUNCTION public.claim_anonymous_search(p_ip text, p_session text, p_conversation text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  r public.anonymous_ip_quotas%ROWTYPE;
  v_limit constant integer := 5;
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
    RETURN jsonb_build_object('ok', true, 'remaining', v_limit - 1);
  END IF;

  IF r.anonymous_session_id IS DISTINCT FROM trim(p_session) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'session_mismatch');
  END IF;

  IF r.search_count >= v_limit THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'search_limit');
  END IF;

  UPDATE public.anonymous_ip_quotas
  SET search_count = r.search_count + 1,
      conversation_id = trim(p_conversation),
      updated_at = now()
  WHERE ip = p_ip;
  RETURN jsonb_build_object('ok', true, 'remaining', v_limit - (r.search_count + 1));
END;
$function$;