CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  display_name TEXT,
  created_at TIMESTAMPTZ,
  plan TEXT,
  status TEXT,
  current_period_end TIMESTAMPTZ,
  is_admin BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    au.id AS user_id,
    au.email::TEXT AS email,
    pr.display_name,
    au.created_at,
    COALESCE(sub.plan, 'free') AS plan,
    COALESCE(sub.status, 'inactive') AS status,
    sub.current_period_end,
    public.has_role(au.id, 'admin') AS is_admin
  FROM auth.users AS au
  LEFT JOIN public.profiles AS pr ON pr.id = au.id
  LEFT JOIN LATERAL (
    SELECT
      us.plan,
      us.status,
      us.current_period_end
    FROM public.user_subscriptions AS us
    WHERE us.user_id = au.id
      AND us.status = 'active'
    ORDER BY us.current_period_end DESC NULLS LAST
    LIMIT 1
  ) AS sub ON TRUE
  ORDER BY au.created_at DESC;
END;
$$;
