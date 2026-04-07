-- Metriche IA (inference): token prompt/completion e stima costo Gemini 3 Flash (listino Google).
CREATE TABLE public.ai_usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  provider text NOT NULL DEFAULT 'lovable_gateway',
  model text NOT NULL,
  operation text NOT NULL,
  search_mode text,
  prompt_tokens integer,
  completion_tokens integer,
  total_tokens integer,
  estimated_cost_usd numeric(14, 8),
  gateway_request_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_usage_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX ai_usage_events_created_at_idx ON public.ai_usage_events (created_at DESC);
CREATE INDEX ai_usage_events_user_id_idx ON public.ai_usage_events (user_id) WHERE user_id IS NOT NULL;

-- Idempotenza webhook Stripe
CREATE TABLE public.stripe_processed_events (
  id text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stripe_processed_events ENABLE ROW LEVEL SECURITY;

-- Accredito token (checkout, rinnovi) — solo service role / funzioni SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.grant_tokens(
  p_user_id uuid,
  p_amount integer,
  p_type text,
  p_description text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN;
  END IF;
  INSERT INTO public.user_tokens (user_id, balance, lifetime_earned, lifetime_spent)
  VALUES (p_user_id, p_amount, p_amount, 0)
  ON CONFLICT (user_id) DO UPDATE SET
    balance = public.user_tokens.balance + p_amount,
    lifetime_earned = public.user_tokens.lifetime_earned + p_amount;
  INSERT INTO public.token_transactions (user_id, amount, type, description)
  VALUES (p_user_id, p_amount, p_type, COALESCE(p_description, p_type));
END;
$$;

-- Bonus iscrizione: 30 token (allineato a src/constants/tokenEconomy.ts)
CREATE OR REPLACE FUNCTION public.handle_new_user_tokens()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_tokens (user_id, balance, lifetime_earned, lifetime_spent)
  VALUES (NEW.id, 30, 30, 0);
  INSERT INTO public.token_transactions (user_id, amount, type, description)
  VALUES (NEW.id, 30, 'signup_bonus', 'Welcome bonus - 30 free searches');
  RETURN NEW;
END;
$$;

ALTER TABLE public.user_tokens ALTER COLUMN balance SET DEFAULT 30;
ALTER TABLE public.user_tokens ALTER COLUMN lifetime_earned SET DEFAULT 30;
