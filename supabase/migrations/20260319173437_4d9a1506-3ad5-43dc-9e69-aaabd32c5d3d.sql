
-- Create enum types
CREATE TYPE public.asset_type AS ENUM ('Hardware', 'Software', 'Service', 'People', 'Data', 'Others');
CREATE TYPE public.control_effectiveness AS ENUM ('Effective', 'Not Effective', 'NA');
CREATE TYPE public.management_decision AS ENUM ('Avoid', 'Mitigate', 'Transfer', 'Accept');
CREATE TYPE public.risk_status AS ENUM ('Open', 'Closed', 'WIP');
CREATE TYPE public.risk_level AS ENUM ('Low', 'Medium', 'High', 'Critical');
CREATE TYPE public.control_category AS ENUM ('Organizational', 'People', 'Physical', 'Technological');

-- Assets table
CREATE TABLE public.assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id TEXT NOT NULL UNIQUE,
  asset_name TEXT NOT NULL,
  asset_type public.asset_type NOT NULL DEFAULT 'Others',
  data_classification TEXT DEFAULT '',
  description TEXT DEFAULT '',
  asset_owner TEXT DEFAULT '',
  department TEXT DEFAULT '',
  confidentiality INTEGER NOT NULL DEFAULT 3 CHECK (confidentiality >= 1 AND confidentiality <= 5),
  integrity INTEGER NOT NULL DEFAULT 3 CHECK (integrity >= 1 AND integrity <= 5),
  availability INTEGER NOT NULL DEFAULT 3 CHECK (availability >= 1 AND availability <= 5),
  criticality_score INTEGER GENERATED ALWAYS AS (confidentiality * integrity * availability) STORED,
  is_critical BOOLEAN GENERATED ALWAYS AS (confidentiality * integrity * availability > 8) STORED,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Controls table (Annex A)
CREATE TABLE public.controls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  control_id TEXT NOT NULL UNIQUE,
  control_name TEXT NOT NULL,
  control_description TEXT NOT NULL DEFAULT '',
  control_category public.control_category NOT NULL
);

-- Risks table
CREATE TABLE public.risks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  linked_asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  threat TEXT NOT NULL,
  vulnerability TEXT NOT NULL,
  existing_control_ids TEXT[] DEFAULT '{}',
  control_effectiveness public.control_effectiveness NOT NULL DEFAULT 'NA',
  risk_scenario TEXT DEFAULT '',
  consequence TEXT DEFAULT '',
  risk_owner TEXT DEFAULT '',
  likelihood INTEGER NOT NULL DEFAULT 3 CHECK (likelihood >= 1 AND likelihood <= 5),
  impact INTEGER NOT NULL DEFAULT 3 CHECK (impact >= 1 AND impact <= 5),
  risk_score INTEGER GENERATED ALWAYS AS (likelihood * impact) STORED,
  risk_level public.risk_level NOT NULL DEFAULT 'Medium',
  management_decision public.management_decision,
  resultant_risk INTEGER NOT NULL DEFAULT 0,
  status public.risk_status NOT NULL DEFAULT 'Open',
  expected_closure_date DATE,
  remarks TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Settings table
CREATE TABLE public.app_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  risk_matrix_type TEXT NOT NULL DEFAULT '5x5' CHECK (risk_matrix_type IN ('3x3', '5x5')),
  risk_threshold INTEGER NOT NULL DEFAULT 12,
  risk_reduction_percent INTEGER NOT NULL DEFAULT 40 CHECK (risk_reduction_percent >= 10 AND risk_reduction_percent <= 80),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default settings
INSERT INTO public.app_settings (risk_matrix_type, risk_threshold, risk_reduction_percent) VALUES ('5x5', 12, 40);

-- Enable RLS on all tables
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Public access policies (no auth required for now)
CREATE POLICY "Allow public read assets" ON public.assets FOR SELECT USING (true);
CREATE POLICY "Allow public insert assets" ON public.assets FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update assets" ON public.assets FOR UPDATE USING (true);
CREATE POLICY "Allow public delete assets" ON public.assets FOR DELETE USING (true);

CREATE POLICY "Allow public read controls" ON public.controls FOR SELECT USING (true);

CREATE POLICY "Allow public read risks" ON public.risks FOR SELECT USING (true);
CREATE POLICY "Allow public insert risks" ON public.risks FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update risks" ON public.risks FOR UPDATE USING (true);
CREATE POLICY "Allow public delete risks" ON public.risks FOR DELETE USING (true);

CREATE POLICY "Allow public read settings" ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "Allow public update settings" ON public.app_settings FOR UPDATE USING (true);

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON public.assets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_risks_updated_at BEFORE UPDATE ON public.risks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON public.app_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes
CREATE INDEX idx_assets_department ON public.assets(department);
CREATE INDEX idx_assets_is_critical ON public.assets(is_critical);
CREATE INDEX idx_risks_linked_asset ON public.risks(linked_asset_id);
CREATE INDEX idx_risks_status ON public.risks(status);
CREATE INDEX idx_risks_risk_level ON public.risks(risk_level);
CREATE INDEX idx_controls_category ON public.controls(control_category);
