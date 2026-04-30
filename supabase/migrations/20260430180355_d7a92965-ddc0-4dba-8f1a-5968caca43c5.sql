
-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table (separate from profiles to prevent privilege escalation)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check role (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS: users can read own roles; admins can read all
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.user_roles FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Seed admin: massimo.pernozzoli@gmail.com
INSERT INTO public.user_roles (user_id, role)
VALUES ('86e6cc2f-57d7-49f8-892c-5fc0c29fc443', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Admin-only RPCs to manage subscriptions and view users
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
    u.id AS user_id,
    u.email::TEXT AS email,
    p.display_name,
    u.created_at,
    COALESCE(s.plan, 'free') AS plan,
    COALESCE(s.status, 'inactive') AS status,
    s.current_period_end,
    public.has_role(u.id, 'admin') AS is_admin
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  LEFT JOIN LATERAL (
    SELECT plan, status, current_period_end
    FROM public.user_subscriptions
    WHERE user_id = u.id AND status = 'active'
    ORDER BY current_period_end DESC NULLS LAST
    LIMIT 1
  ) s ON TRUE
  ORDER BY u.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_grant_pro(p_user_id UUID, p_years INTEGER DEFAULT 100)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_id UUID;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT id INTO existing_id
  FROM public.user_subscriptions
  WHERE user_id = p_user_id AND status = 'active'
  LIMIT 1;

  IF existing_id IS NOT NULL THEN
    UPDATE public.user_subscriptions
    SET plan = 'premium',
        status = 'active',
        current_period_start = now(),
        current_period_end = now() + (p_years || ' years')::INTERVAL,
        updated_at = now()
    WHERE id = existing_id;
  ELSE
    INSERT INTO public.user_subscriptions (user_id, plan, status, current_period_start, current_period_end)
    VALUES (p_user_id, 'premium', 'active', now(), now() + (p_years || ' years')::INTERVAL);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_revoke_pro(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.user_subscriptions
  SET status = 'canceled', updated_at = now()
  WHERE user_id = p_user_id AND status = 'active';
END;
$$;
