ALTER TABLE IF EXISTS public.sirket_ortaklar
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sirketler(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.sirket_temsilciler
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sirketler(id) ON DELETE CASCADE;

UPDATE public.sirket_ortaklar
SET company_id = sirket_id
WHERE company_id IS NULL
  AND sirket_id IS NOT NULL;

UPDATE public.sirket_temsilciler
SET company_id = sirket_id
WHERE company_id IS NULL
  AND sirket_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sirket_ortaklar_company_id_deleted_status
  ON public.sirket_ortaklar(company_id, is_deleted, status);

CREATE INDEX IF NOT EXISTS idx_sirket_temsilciler_company_id_deleted_status
  ON public.sirket_temsilciler(company_id, is_deleted, status);
