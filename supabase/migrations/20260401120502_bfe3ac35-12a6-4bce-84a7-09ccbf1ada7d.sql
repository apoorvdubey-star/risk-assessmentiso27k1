
-- ============================================
-- MULTI-TENANCY MIGRATION
-- ============================================

-- 1. Create tenants table
CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  domain text,
  industry text DEFAULT '',
  setup_completed boolean DEFAULT false,
  default_data_classification text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- 2. Create tenant_memberships table
CREATE TABLE public.tenant_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, tenant_id)
);
ALTER TABLE public.tenant_memberships ENABLE ROW LEVEL SECURITY;

-- 3. Add tenant_id to all data tables
ALTER TABLE public.assets ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.risks ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.departments ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.asset_owners ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.locations ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.app_settings ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.controls ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.profiles ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.user_roles ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.org_setup ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);

-- 4. Helper function: get current user's tenant_id
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.tenant_memberships
  WHERE user_id = auth.uid()
  LIMIT 1
$$;

-- 5. Update has_role to be tenant-aware
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
    AND (tenant_id IS NULL OR tenant_id = (
      SELECT tenant_id FROM public.tenant_memberships WHERE user_id = _user_id LIMIT 1
    ))
  )
$$;

-- 6. Update get_user_role to be tenant-aware
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role::text FROM public.user_roles
     WHERE user_id = auth.uid()
     AND (tenant_id IS NULL OR tenant_id = (SELECT tenant_id FROM public.tenant_memberships WHERE user_id = auth.uid() LIMIT 1))
     ORDER BY CASE role WHEN 'admin'::app_role THEN 1 WHEN 'risk_owner'::app_role THEN 2 WHEN 'user'::app_role THEN 3 END
     LIMIT 1),
    'user'
  )
$$;

-- 7. Update handle_signup (no longer assigns roles - tenant creation handles that)
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
END;
$$;

-- 8. Create tenant and assign creator as admin
CREATE OR REPLACE FUNCTION public.create_tenant_and_assign(
  _name text,
  _domain text DEFAULT NULL,
  _industry text DEFAULT ''
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tenant_id uuid;
  _user_id uuid := auth.uid();
BEGIN
  INSERT INTO public.tenants (name, domain, industry)
  VALUES (_name, _domain, _industry)
  RETURNING id INTO _tenant_id;

  INSERT INTO public.tenant_memberships (user_id, tenant_id)
  VALUES (_user_id, _tenant_id);

  UPDATE public.profiles SET tenant_id = _tenant_id WHERE id = _user_id;

  DELETE FROM public.user_roles WHERE user_id = _user_id;
  INSERT INTO public.user_roles (user_id, role, tenant_id) VALUES (_user_id, 'admin', _tenant_id);

  INSERT INTO public.app_settings (tenant_id) VALUES (_tenant_id);
  INSERT INTO public.org_setup (org_name, industry, tenant_id) VALUES (_name, _industry, _tenant_id);

  RETURN _tenant_id;
END;
$$;

-- 9. Join tenant by email domain
CREATE OR REPLACE FUNCTION public.join_tenant_by_domain(_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _domain text;
  _tenant_id uuid;
  _user_id uuid := auth.uid();
BEGIN
  _domain := split_part(_email, '@', 2);
  SELECT id INTO _tenant_id FROM public.tenants WHERE domain = _domain LIMIT 1;

  IF _tenant_id IS NOT NULL THEN
    INSERT INTO public.tenant_memberships (user_id, tenant_id)
    VALUES (_user_id, _tenant_id)
    ON CONFLICT DO NOTHING;

    UPDATE public.profiles SET tenant_id = _tenant_id WHERE id = _user_id;

    INSERT INTO public.user_roles (user_id, role, tenant_id)
    VALUES (_user_id, 'user', _tenant_id)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN _tenant_id;
END;
$$;

-- 10. Update get_all_users to be tenant-aware
CREATE OR REPLACE FUNCTION public.get_all_users()
RETURNS TABLE(id uuid, email text, full_name text, department text, role text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tenant_id uuid;
BEGIN
  SELECT tm.tenant_id INTO _tenant_id FROM public.tenant_memberships tm WHERE tm.user_id = auth.uid() LIMIT 1;

  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can list users';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    u.email::text,
    p.full_name,
    p.department,
    COALESCE((SELECT ur.role::text FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.tenant_id = _tenant_id
              ORDER BY CASE ur.role WHEN 'admin'::app_role THEN 1 WHEN 'risk_owner'::app_role THEN 2 WHEN 'user'::app_role THEN 3 END
              LIMIT 1), 'user') as role
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  JOIN public.tenant_memberships tm ON tm.user_id = p.id AND tm.tenant_id = _tenant_id;
END;
$$;

-- 11. Update set_user_role to be tenant-aware
CREATE OR REPLACE FUNCTION public.set_user_role(_target_user_id uuid, _role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tenant_id uuid;
BEGIN
  SELECT tm.tenant_id INTO _tenant_id FROM public.tenant_memberships tm WHERE tm.user_id = auth.uid() LIMIT 1;

  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can change roles';
  END IF;

  DELETE FROM public.user_roles WHERE user_id = _target_user_id AND tenant_id = _tenant_id;
  INSERT INTO public.user_roles (user_id, role, tenant_id) VALUES (_target_user_id, _role, _tenant_id);
END;
$$;

-- ============================================
-- RLS POLICIES: DROP OLD + CREATE TENANT-SCOPED
-- ============================================

-- TENANTS
CREATE POLICY "Members read own tenant" ON public.tenants
  FOR SELECT TO authenticated USING (id = public.get_user_tenant_id());
CREATE POLICY "Authenticated insert tenants" ON public.tenants
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admin update tenant" ON public.tenants
  FOR UPDATE TO authenticated
  USING (id = public.get_user_tenant_id() AND public.has_role(auth.uid(), 'admin'::app_role));

-- TENANT_MEMBERSHIPS
CREATE POLICY "Read own membership" ON public.tenant_memberships
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Insert own membership" ON public.tenant_memberships
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admin manage memberships" ON public.tenant_memberships
  FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.has_role(auth.uid(), 'admin'::app_role));

-- ASSETS
DROP POLICY IF EXISTS "Auth read assets" ON public.assets;
DROP POLICY IF EXISTS "Auth insert assets" ON public.assets;
DROP POLICY IF EXISTS "Auth update assets" ON public.assets;
DROP POLICY IF EXISTS "Admin RO delete assets" ON public.assets;
CREATE POLICY "Tenant read assets" ON public.assets FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Tenant insert assets" ON public.assets FOR INSERT TO authenticated WITH CHECK (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Tenant update assets" ON public.assets FOR UPDATE TO authenticated USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Tenant delete assets" ON public.assets FOR DELETE TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'risk_owner'::app_role)));

-- RISKS
DROP POLICY IF EXISTS "Auth read risks" ON public.risks;
DROP POLICY IF EXISTS "Auth insert risks" ON public.risks;
DROP POLICY IF EXISTS "Auth update risks" ON public.risks;
DROP POLICY IF EXISTS "Admin RO delete risks" ON public.risks;
CREATE POLICY "Tenant read risks" ON public.risks FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Tenant insert risks" ON public.risks FOR INSERT TO authenticated WITH CHECK (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Tenant update risks" ON public.risks FOR UPDATE TO authenticated USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Tenant delete risks" ON public.risks FOR DELETE TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'risk_owner'::app_role)));

-- DEPARTMENTS
DROP POLICY IF EXISTS "Auth read departments" ON public.departments;
DROP POLICY IF EXISTS "Admin manage departments" ON public.departments;
CREATE POLICY "Tenant read departments" ON public.departments FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Admin manage departments" ON public.departments FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.has_role(auth.uid(), 'admin'::app_role));

-- ASSET_OWNERS
DROP POLICY IF EXISTS "Auth read asset_owners" ON public.asset_owners;
DROP POLICY IF EXISTS "Admin manage asset_owners" ON public.asset_owners;
CREATE POLICY "Tenant read asset_owners" ON public.asset_owners FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Admin manage asset_owners" ON public.asset_owners FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.has_role(auth.uid(), 'admin'::app_role));

-- LOCATIONS
DROP POLICY IF EXISTS "Admin manage locations" ON public.locations;
DROP POLICY IF EXISTS "Auth read locations" ON public.locations;
CREATE POLICY "Tenant read locations" ON public.locations FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Admin manage locations" ON public.locations FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.has_role(auth.uid(), 'admin'::app_role));

-- APP_SETTINGS
DROP POLICY IF EXISTS "Auth read settings" ON public.app_settings;
DROP POLICY IF EXISTS "Admin update settings" ON public.app_settings;
CREATE POLICY "Tenant read settings" ON public.app_settings FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Admin manage settings" ON public.app_settings FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.has_role(auth.uid(), 'admin'::app_role));

-- CONTROLS
DROP POLICY IF EXISTS "Auth read controls" ON public.controls;
DROP POLICY IF EXISTS "Admin insert controls" ON public.controls;
DROP POLICY IF EXISTS "Admin update controls" ON public.controls;
DROP POLICY IF EXISTS "Admin delete controls" ON public.controls;
CREATE POLICY "Tenant read controls" ON public.controls FOR SELECT TO authenticated
  USING (tenant_id IS NULL OR tenant_id = public.get_user_tenant_id());
CREATE POLICY "Admin manage controls" ON public.controls FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- PROFILES
DROP POLICY IF EXISTS "Read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Insert own profile" ON public.profiles;
CREATE POLICY "Read own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Read tenant profiles" ON public.profiles FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "Insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- USER_ROLES
DROP POLICY IF EXISTS "Read own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admin read all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admin insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admin update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admin delete roles" ON public.user_roles;
CREATE POLICY "Read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Read tenant roles" ON public.user_roles FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Admin manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.has_role(auth.uid(), 'admin'::app_role));

-- ORG_SETUP
DROP POLICY IF EXISTS "Auth read org_setup" ON public.org_setup;
DROP POLICY IF EXISTS "Admin manage org_setup" ON public.org_setup;
CREATE POLICY "Tenant read org_setup" ON public.org_setup FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Admin manage org_setup" ON public.org_setup FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.has_role(auth.uid(), 'admin'::app_role));
