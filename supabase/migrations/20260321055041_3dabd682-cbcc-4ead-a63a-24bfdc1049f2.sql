
-- Organization setup table (one-time config)
CREATE TABLE public.org_setup (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_name text NOT NULL DEFAULT '',
  industry text NOT NULL DEFAULT '',
  setup_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.org_setup ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read org_setup" ON public.org_setup FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage org_setup" ON public.org_setup FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Departments table
CREATE TABLE public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read departments" ON public.departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage departments" ON public.departments FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Asset owners table (each department can have up to 2 asset owners who are also risk owners)
CREATE TABLE public.asset_owners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  department_id uuid REFERENCES public.departments(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.asset_owners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read asset_owners" ON public.asset_owners FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage asset_owners" ON public.asset_owners FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
