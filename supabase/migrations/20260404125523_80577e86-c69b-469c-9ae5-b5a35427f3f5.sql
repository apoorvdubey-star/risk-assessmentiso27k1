
ALTER TABLE public.controls DROP CONSTRAINT controls_control_id_key;
CREATE UNIQUE INDEX controls_control_id_tenant_unique ON public.controls (control_id, tenant_id);
