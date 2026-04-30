-- PRO users have unlimited app tokens: token spending becomes a no-op while
-- an active Premium subscription is present.
CREATE OR REPLACE FUNCTION public.spend_token(p_user_id uuid, p_amount integer DEFAULT 1)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance integer;
  v_is_premium boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.user_subscriptions
    WHERE user_id = p_user_id
      AND plan = 'premium'
      AND status = 'active'
      AND (current_period_end IS NULL OR current_period_end >= now())
  ) INTO v_is_premium;

  IF v_is_premium THEN
    RETURN true;
  END IF;

  SELECT balance INTO v_balance FROM public.user_tokens WHERE user_id = p_user_id FOR UPDATE;
  IF v_balance IS NULL OR v_balance < p_amount THEN
    RETURN false;
  END IF;
  UPDATE public.user_tokens SET balance = balance - p_amount, lifetime_spent = lifetime_spent + p_amount WHERE user_id = p_user_id;
  INSERT INTO public.token_transactions (user_id, amount, type, description)
  VALUES (p_user_id, -p_amount, 'search', 'Music search');
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.spend_token(uuid, integer) TO service_role;
