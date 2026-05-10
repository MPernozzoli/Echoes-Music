ALTER TABLE public.homepage_discount_promotions
  ADD COLUMN IF NOT EXISTS first_time_only boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS applies_to_products text[] NOT NULL DEFAULT '{}'::text[];

CREATE OR REPLACE FUNCTION public.admin_upsert_homepage_discount_promotion(
  p_promotion_code_id text,
  p_code text,
  p_active boolean,
  p_starts_at timestamptz DEFAULT NULL,
  p_ends_at timestamptz DEFAULT NULL,
  p_messages jsonb DEFAULT '{}'::jsonb,
  p_first_time_only boolean DEFAULT false,
  p_applies_to_products text[] DEFAULT '{}'::text[]
)
RETURNS public.homepage_discount_promotions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.homepage_discount_promotions;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF p_starts_at IS NOT NULL AND p_ends_at IS NOT NULL AND p_starts_at >= p_ends_at THEN
    RAISE EXCEPTION 'starts_at must be before ends_at';
  END IF;

  IF p_active THEN
    UPDATE public.homepage_discount_promotions
      SET active = false
      WHERE active = true
        AND promotion_code_id <> p_promotion_code_id;
  END IF;

  INSERT INTO public.homepage_discount_promotions (
    promotion_code_id,
    code,
    active,
    first_time_only,
    applies_to_products,
    starts_at,
    ends_at,
    messages
  )
  VALUES (
    p_promotion_code_id,
    upper(trim(p_code)),
    p_active,
    COALESCE(p_first_time_only, false),
    COALESCE(p_applies_to_products, '{}'::text[]),
    p_starts_at,
    p_ends_at,
    COALESCE(p_messages, '{}'::jsonb)
  )
  ON CONFLICT (promotion_code_id) DO UPDATE
    SET code = excluded.code,
        active = excluded.active,
        first_time_only = excluded.first_time_only,
        applies_to_products = excluded.applies_to_products,
        starts_at = excluded.starts_at,
        ends_at = excluded.ends_at,
        messages = excluded.messages
  RETURNING * INTO result;

  RETURN result;
END;
$$;
