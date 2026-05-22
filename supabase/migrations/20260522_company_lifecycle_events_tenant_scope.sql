ALTER TABLE public.company_lifecycle_events
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.erp_instances(id);

UPDATE public.company_lifecycle_events lifecycle
SET tenant_id = COALESCE(company.tenant_id, '00000000-0000-0000-0000-000000000000'::uuid)
FROM public.companies company
WHERE lifecycle.company_id = company.id
  AND lifecycle.tenant_id IS NULL;

UPDATE public.company_lifecycle_events
SET tenant_id = '00000000-0000-0000-0000-000000000000'::uuid
WHERE tenant_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_company_lifecycle_events_tenant_id
  ON public.company_lifecycle_events(tenant_id);

CREATE INDEX IF NOT EXISTS company_lifecycle_events_tenant_company_date_idx
  ON public.company_lifecycle_events(tenant_id, company_id, created_at DESC);

NOTIFY pgrst, 'reload schema';
