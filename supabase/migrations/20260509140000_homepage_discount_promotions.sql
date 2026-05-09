CREATE TABLE IF NOT EXISTS public.homepage_discount_promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_code_id text NOT NULL UNIQUE,
  code text NOT NULL,
  active boolean NOT NULL DEFAULT false,
  starts_at timestamptz,
  ends_at timestamptz,
  messages jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT homepage_discount_promotions_messages_object
    CHECK (jsonb_typeof(messages) = 'object'),
  CONSTRAINT homepage_discount_promotions_valid_range
    CHECK (starts_at IS NULL OR ends_at IS NULL OR starts_at < ends_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS homepage_discount_promotions_one_active
  ON public.homepage_discount_promotions ((active))
  WHERE active;

CREATE INDEX IF NOT EXISTS homepage_discount_promotions_public_active_idx
  ON public.homepage_discount_promotions (active, starts_at, ends_at);

DROP TRIGGER IF EXISTS update_homepage_discount_promotions_updated_at
  ON public.homepage_discount_promotions;

CREATE TRIGGER update_homepage_discount_promotions_updated_at
  BEFORE UPDATE ON public.homepage_discount_promotions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.homepage_discount_promotions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read active homepage discount promotions"
  ON public.homepage_discount_promotions;

CREATE POLICY "Public can read active homepage discount promotions"
  ON public.homepage_discount_promotions
  FOR SELECT
  TO anon, authenticated
  USING (
    active = true
    AND (starts_at IS NULL OR starts_at <= now())
    AND (ends_at IS NULL OR ends_at >= now())
  );

DROP POLICY IF EXISTS "Admins can manage homepage discount promotions"
  ON public.homepage_discount_promotions;
DROP POLICY IF EXISTS "Admins can read homepage discount promotions"
  ON public.homepage_discount_promotions;
DROP POLICY IF EXISTS "Admins can insert homepage discount promotions"
  ON public.homepage_discount_promotions;
DROP POLICY IF EXISTS "Admins can update homepage discount promotions"
  ON public.homepage_discount_promotions;
DROP POLICY IF EXISTS "Admins can delete homepage discount promotions"
  ON public.homepage_discount_promotions;

CREATE POLICY "Admins can read homepage discount promotions"
  ON public.homepage_discount_promotions
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert homepage discount promotions"
  ON public.homepage_discount_promotions
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update homepage discount promotions"
  ON public.homepage_discount_promotions
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete homepage discount promotions"
  ON public.homepage_discount_promotions
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.admin_upsert_homepage_discount_promotion(
  p_promotion_code_id text,
  p_code text,
  p_active boolean,
  p_starts_at timestamptz DEFAULT NULL,
  p_ends_at timestamptz DEFAULT NULL,
  p_messages jsonb DEFAULT '{}'::jsonb
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
    starts_at,
    ends_at,
    messages
  )
  VALUES (
    p_promotion_code_id,
    upper(trim(p_code)),
    p_active,
    p_starts_at,
    p_ends_at,
    COALESCE(p_messages, '{}'::jsonb)
  )
  ON CONFLICT (promotion_code_id) DO UPDATE
    SET code = excluded.code,
        active = excluded.active,
        starts_at = excluded.starts_at,
        ends_at = excluded.ends_at,
        messages = excluded.messages
  RETURNING * INTO result;

  RETURN result;
END;
$$;
