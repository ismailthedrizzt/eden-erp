DO $$
BEGIN
  IF to_regclass('public.employees') IS NULL AND to_regclass('public.personel') IS NOT NULL THEN
    ALTER TABLE public.personel RENAME TO employees;
  END IF;
END $$;

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS sirket_id UUID REFERENCES public.sirketler(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS birim_id UUID REFERENCES public.birimler(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS kadro_id UUID REFERENCES public.norm_kadrolar(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fotograf_url TEXT,
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

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_employees_sirket ON public.employees(sirket_id);
CREATE INDEX IF NOT EXISTS idx_employees_birim ON public.employees(birim_id);
CREATE INDEX IF NOT EXISTS idx_employees_durum ON public.employees(calisma_durumu);
CREATE INDEX IF NOT EXISTS idx_employees_isim ON public.employees(soyad, ad);

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_personel_updated ON public.employees;
DROP TRIGGER IF EXISTS trg_employees_updated ON public.employees;
CREATE TRIGGER trg_employees_updated
  BEFORE UPDATE ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
