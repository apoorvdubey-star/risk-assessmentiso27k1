ALTER TABLE public.locations DROP CONSTRAINT IF EXISTS locations_name_key;
DROP INDEX IF EXISTS public.locations_name_key;

CREATE UNIQUE INDEX locations_tenant_name_unique
ON public.locations (
  COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid),
  lower(btrim(name))
);