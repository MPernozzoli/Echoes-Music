DROP FUNCTION IF EXISTS public.admin_list_users();

CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  display_name TEXT,
  created_at TIMESTAMPTZ,
  plan TEXT,
  status TEXT,
  current_period_end TIMESTAMPTZ,
  is_admin BOOLEAN,
  banned_until TIMESTAMPTZ,
  is_blocked BOOLEAN
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
    public.has_role(au.id, 'admin') AS is_admin,
    au.banned_until,
    COALESCE(au.banned_until > now(), FALSE) AS is_blocked
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

CREATE OR REPLACE FUNCTION public.admin_grant_admin(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_revoke_admin(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'cannot revoke your own admin role';
  END IF;

  DELETE FROM public.user_roles
  WHERE user_id = p_user_id
    AND role = 'admin';
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_block_user(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'cannot block your own account';
  END IF;

  UPDATE auth.users
  SET banned_until = 'infinity'::timestamptz,
      updated_at = now()
  WHERE id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_unblock_user(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE auth.users
  SET banned_until = NULL,
      updated_at = now()
  WHERE id = p_user_id;
END;
$$;
