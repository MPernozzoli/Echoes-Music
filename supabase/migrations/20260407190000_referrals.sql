-- Porta un amico: codice invito su profilo, relazione referrer→referee, bonus token.
-- Bonus iscrizione: +30 a entrambi (allineare a src/constants/tokenEconomy.ts REFERRAL_SIGNUP_BONUS_EACH).
-- Bonus Pro: gestito in edge stripe-webhook (50% del grant del ciclo).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code text,
  ADD COLUMN IF NOT EXISTS referred_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_referral_code_lower_key
  ON public.profiles (lower(referral_code))
  WHERE referral_code IS NOT NULL AND trim(referral_code) <> '';

CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signup_rewarded_at timestamptz NOT NULL DEFAULT now(),
  pro_rewarded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT referrals_referee_unique UNIQUE (referee_id),
  CONSTRAINT referrals_no_self CHECK (referrer_id <> referee_id)
);

CREATE INDEX referrals_referrer_id_idx ON public.referrals (referrer_id);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own referral rows"
  ON public.referrals FOR SELECT TO authenticated
  USING (auth.uid() = referrer_id OR auth.uid() = referee_id);

-- Backfill codice invito per utenti esistenti
DO $$
DECLARE
  r record;
  c text;
  n int;
BEGIN
  FOR r IN SELECT id FROM public.profiles WHERE referral_code IS NULL OR trim(referral_code) = '' LOOP
    n := 0;
    LOOP
      c := lower(left(replace(gen_random_uuid()::text, '-', ''), 12));
      BEGIN
        UPDATE public.profiles SET referral_code = c WHERE id = r.id;
        EXIT;
      EXCEPTION
        WHEN unique_violation THEN
          n := n + 1;
          IF n > 20 THEN
            RAISE EXCEPTION 'referral_code backfill failed for %', r.id;
          END IF;
      END;
    END LOOP;
  END LOOP;
END $$;

ALTER TABLE public.profiles ALTER COLUMN referral_code SET NOT NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code text;
  n int := 0;
BEGIN
  LOOP
    new_code := lower(left(replace(gen_random_uuid()::text, '-', ''), 12));
    BEGIN
      INSERT INTO public.profiles (id, display_name, avatar_url, email, referral_code)
      VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', ''),
        NEW.email,
        new_code
      );
      EXIT;
    EXCEPTION
      WHEN unique_violation THEN
        n := n + 1;
        IF n > 25 THEN
          RAISE;
        END IF;
    END;
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_referral(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  rid uuid;
  normalized text := lower(trim(both from coalesce(p_code, '')));
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'auth');
  END IF;
  IF normalized = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'empty');
  END IF;

  SELECT id INTO rid FROM public.profiles WHERE lower(trim(both from referral_code)) = normalized;
  IF rid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_code');
  END IF;
  IF rid = uid THEN
    RETURN jsonb_build_object('ok', false, 'error', 'self');
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = uid AND referred_by_user_id IS NOT NULL) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_referred');
  END IF;
  IF EXISTS (SELECT 1 FROM public.referrals WHERE referee_id = uid) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_claimed');
  END IF;

  INSERT INTO public.referrals (referrer_id, referee_id, signup_rewarded_at)
  VALUES (rid, uid, now());

  UPDATE public.profiles SET referred_by_user_id = rid WHERE id = uid;

  PERFORM public.grant_tokens(rid, 30, 'referral_signup', 'Porta un amico — bonus referrer');
  PERFORM public.grant_tokens(uid, 30, 'referral_signup', 'Porta un amico — bonus invitato');

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_referral(text) TO authenticated;

-- Chiamata solo da edge (service_role): bonus Pro una tantum per coppia referrer/referee.
CREATE OR REPLACE FUNCTION public.try_grant_referral_pro_bonus(p_referee_id uuid, p_bonus integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r uuid;
BEGIN
  IF p_bonus IS NULL OR p_bonus <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_bonus');
  END IF;

  SELECT referrer_id INTO r
  FROM public.referrals
  WHERE referee_id = p_referee_id AND pro_rewarded_at IS NULL
  FOR UPDATE;

  IF r IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'none');
  END IF;

  UPDATE public.referrals
  SET pro_rewarded_at = now()
  WHERE referee_id = p_referee_id AND pro_rewarded_at IS NULL;

  PERFORM public.grant_tokens(
    r,
    p_bonus,
    'referral_pro',
    format('Porta un amico — bonus Pro referrer (+%s)', p_bonus)
  );
  PERFORM public.grant_tokens(
    p_referee_id,
    p_bonus,
    'referral_pro',
    format('Porta un amico — bonus Pro invitato (+%s)', p_bonus)
  );

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.try_grant_referral_pro_bonus(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.try_grant_referral_pro_bonus(uuid, integer) TO service_role;
