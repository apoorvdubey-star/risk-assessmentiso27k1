
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'risk_owner', 'user');

-- Profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  department text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role security definer function (MUST be created before policies that reference it)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Profiles RLS
CREATE POLICY "Read own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "Insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- User roles RLS
CREATE POLICY "Read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admin read all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin update roles" ON public.user_roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- handle_signup function
CREATE OR REPLACE FUNCTION public.handle_signup(_full_name text DEFAULT '', _department text DEFAULT '')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
BEGIN
  INSERT INTO public.profiles (id, full_name, department)
  VALUES (_user_id, _full_name, _department)
  ON CONFLICT (id) DO NOTHING;
  
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin'::app_role) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, 'admin'::app_role) ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, 'user'::app_role) ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

-- get_user_role function
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role::text FROM public.user_roles WHERE user_id = auth.uid()
     ORDER BY CASE role WHEN 'admin'::app_role THEN 1 WHEN 'risk_owner'::app_role THEN 2 WHEN 'user'::app_role THEN 3 END
     LIMIT 1),
    'user'
  )
$$;

-- set_user_role function (admin only)
CREATE OR REPLACE FUNCTION public.set_user_role(_target_user_id uuid, _role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can change roles';
  END IF;
  DELETE FROM public.user_roles WHERE user_id = _target_user_id;
  INSERT INTO public.user_roles (user_id, role) VALUES (_target_user_id, _role);
END;
$$;

-- get_all_users function (admin only)
CREATE OR REPLACE FUNCTION public.get_all_users()
RETURNS TABLE(id uuid, email text, full_name text, department text, role text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can list users';
  END IF;
  RETURN QUERY
  SELECT 
    p.id,
    u.email::text,
    p.full_name,
    p.department,
    COALESCE((SELECT ur.role::text FROM public.user_roles ur WHERE ur.user_id = p.id
              ORDER BY CASE ur.role WHEN 'admin'::app_role THEN 1 WHEN 'risk_owner'::app_role THEN 2 WHEN 'user'::app_role THEN 3 END
              LIMIT 1), 'user') as role
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id;
END;
$$;

-- Add criticality approval columns to assets
ALTER TABLE public.assets ADD COLUMN criticality_approved boolean NOT NULL DEFAULT false;
ALTER TABLE public.assets ADD COLUMN criticality_approved_by uuid REFERENCES auth.users(id);

-- Update assets RLS
DROP POLICY IF EXISTS "Allow public read assets" ON public.assets;
DROP POLICY IF EXISTS "Allow public insert assets" ON public.assets;
DROP POLICY IF EXISTS "Allow public update assets" ON public.assets;
DROP POLICY IF EXISTS "Allow public delete assets" ON public.assets;
CREATE POLICY "Auth read assets" ON public.assets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert assets" ON public.assets FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update assets" ON public.assets FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admin RO delete assets" ON public.assets FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'risk_owner'::app_role));

-- Update risks RLS
DROP POLICY IF EXISTS "Allow public read risks" ON public.risks;
DROP POLICY IF EXISTS "Allow public insert risks" ON public.risks;
DROP POLICY IF EXISTS "Allow public update risks" ON public.risks;
DROP POLICY IF EXISTS "Allow public delete risks" ON public.risks;
CREATE POLICY "Auth read risks" ON public.risks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert risks" ON public.risks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update risks" ON public.risks FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admin RO delete risks" ON public.risks FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'risk_owner'::app_role));

-- Update controls RLS
DROP POLICY IF EXISTS "Allow public read controls" ON public.controls;
CREATE POLICY "Auth read controls" ON public.controls FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin insert controls" ON public.controls FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin update controls" ON public.controls FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin delete controls" ON public.controls FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Update settings RLS
DROP POLICY IF EXISTS "Allow public read settings" ON public.app_settings;
DROP POLICY IF EXISTS "Allow public update settings" ON public.app_settings;
CREATE POLICY "Auth read settings" ON public.app_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin update settings" ON public.app_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
