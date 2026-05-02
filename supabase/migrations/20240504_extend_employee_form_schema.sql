ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS sirket_id UUID REFERENCES public.sirketler(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cv_belgesi JSONB,
  ADD COLUMN IF NOT EXISTS tecil_tarihi DATE,
  ADD COLUMN IF NOT EXISTS engellilik_yuzdesi NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS telefonlar JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS epostalar JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS gorev TEXT,
  ADD COLUMN IF NOT EXISTS okuryazar_degil BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS egitim_okullari JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS yabanci_diller JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS sertifikalar JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS yakinlar JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ise_giris_belgeleri JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS isten_cikis_belgeleri JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS field_history JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_employees_sirket ON public.employees(sirket_id);
CREATE INDEX IF NOT EXISTS idx_employees_active ON public.employees(is_active);
