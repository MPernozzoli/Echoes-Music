CREATE OR REPLACE FUNCTION public.admin_upsert_homepage_discount_promotion(
  p_promotion_code_id text,
  p_code text,
  p_active boolean,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_messages jsonb
)
RETURNS public.homepage_discount_promotions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.homepage_discount_promotions;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_promotion_code_id IS NULL OR length(trim(p_promotion_code_id)) = 0 THEN
    RAISE EXCEPTION 'promotion_code_id required';
  END IF;
  IF p_code IS NULL OR length(trim(p_code)) = 0 THEN
    RAISE EXCEPTION 'code required';
  END IF;

  -- Only one active promotion at a time
  IF p_active THEN
    UPDATE public.homepage_discount_promotions
    SET active = false, updated_at = now()
    WHERE active = true
      AND promotion_code_id <> p_promotion_code_id;
  END IF;

  INSERT INTO public.homepage_discount_promotions (
    promotion_code_id, code, active, starts_at, ends_at, messages
  ) VALUES (
    p_promotion_code_id, p_code, p_active, p_starts_at, p_ends_at, COALESCE(p_messages, '{}'::jsonb)
  )
  ON CONFLICT (promotion_code_id) DO UPDATE SET
    code = EXCLUDED.code,
    active = EXCLUDED.active,
    starts_at = EXCLUDED.starts_at,
    ends_at = EXCLUDED.ends_at,
    messages = EXCLUDED.messages,
    updated_at = now()
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

-- Ensure unique constraint exists so ON CONFLICT works
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.homepage_discount_promotions'::regclass
      AND contype = 'u'
      AND conname = 'homepage_discount_promotions_promotion_code_id_key'
  ) THEN
    ALTER TABLE public.homepage_discount_promotions
      ADD CONSTRAINT homepage_discount_promotions_promotion_code_id_key UNIQUE (promotion_code_id);
  END IF;
END$$;