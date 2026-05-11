
ALTER TABLE public.homepage_discount_promotions
  ADD COLUMN IF NOT EXISTS first_time_only boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS applies_to_products text[] NOT NULL DEFAULT '{}'::text[];

CREATE OR REPLACE FUNCTION public.admin_upsert_homepage_discount_promotion(
  p_promotion_code_id text,
  p_code text,
  p_active boolean,
  p_starts_at timestamp with time zone,
  p_ends_at timestamp with time zone,
  p_messages jsonb,
  p_first_time_only boolean DEFAULT false,
  p_applies_to_products text[] DEFAULT '{}'::text[]
)
RETURNS public.homepage_discount_promotions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  IF p_active THEN
    UPDATE public.homepage_discount_promotions
    SET active = false, updated_at = now()
    WHERE active = true
      AND promotion_code_id <> p_promotion_code_id;
  END IF;

  INSERT INTO public.homepage_discount_promotions (
    promotion_code_id, code, active, starts_at, ends_at, messages,
    first_time_only, applies_to_products
  ) VALUES (
    p_promotion_code_id, p_code, p_active, p_starts_at, p_ends_at, COALESCE(p_messages, '{}'::jsonb),
    COALESCE(p_first_time_only, false), COALESCE(p_applies_to_products, '{}'::text[])
  )
  ON CONFLICT (promotion_code_id) DO UPDATE SET
    code = EXCLUDED.code,
    active = EXCLUDED.active,
    starts_at = EXCLUDED.starts_at,
    ends_at = EXCLUDED.ends_at,
    messages = EXCLUDED.messages,
    first_time_only = EXCLUDED.first_time_only,
    applies_to_products = EXCLUDED.applies_to_products,
    updated_at = now()
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$function$;
