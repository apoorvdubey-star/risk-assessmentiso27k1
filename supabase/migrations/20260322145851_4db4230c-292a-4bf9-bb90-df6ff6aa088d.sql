
-- Add risk_id column with auto-generated sequential IDs
ALTER TABLE public.risks ADD COLUMN risk_id text UNIQUE;

-- Create a function to generate next risk_id
CREATE OR REPLACE FUNCTION public.generate_risk_id()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  next_num integer;
BEGIN
  SELECT COALESCE(MAX(
    CASE WHEN risk_id ~ '^RISK-\d+$' 
    THEN CAST(SUBSTRING(risk_id FROM 6) AS integer) 
    ELSE 0 END
  ), 0) + 1 INTO next_num FROM public.risks;
  NEW.risk_id := 'RISK-' || next_num;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_risk_id
  BEFORE INSERT ON public.risks
  FOR EACH ROW
  WHEN (NEW.risk_id IS NULL)
  EXECUTE FUNCTION public.generate_risk_id();

-- Backfill existing risks
DO $$
DECLARE
  r RECORD;
  counter integer := 1;
BEGIN
  FOR r IN SELECT id FROM public.risks ORDER BY created_at ASC
  LOOP
    UPDATE public.risks SET risk_id = 'RISK-' || counter WHERE id = r.id;
    counter := counter + 1;
  END LOOP;
END;
$$;
