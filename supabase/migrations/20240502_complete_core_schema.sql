CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "unaccent";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'birim_tip') THEN
    CREATE TYPE public.birim_tip AS ENUM (
      'sirket', 'genel_mudurluk', 'mudurluk', 'departman', 'bolum', 'takim'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'kadro_durum') THEN
    CREATE TYPE public.kadro_durum AS ENUM ('dolu', 'acik', 'dondurulmus');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'personel_durum') THEN
    CREATE TYPE public.personel_durum AS ENUM ('gorevde', 'izinde', 'ayrilmis', 'askida');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'proje_tip') THEN
    CREATE TYPE public.proje_tip AS ENUM (
      'PG', 'EPIRB', 'Otel', 'İdari', 'Sermaye', 'Aktarım', 'Finansal', 'Destek', 'Yatırım'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'hesap_tipi') THEN
    CREATE TYPE public.hesap_tipi AS ENUM ('Vadesiz', 'Yatırım', 'Kredi Kartı', 'Nakit', 'Bonus');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'islem_tarafi') THEN
    CREATE TYPE public.islem_tarafi AS ENUM ('Eden', 'İsmail ILGAR', 'Canberk', 'Ergün');
  END IF;
END $$;

INSERT INTO public.sirketler (
  id,
  ticari_unvan,
  kisa_unvan,
  vkn_tckn,
  vergi_dairesi,
  ulke,
  il,
  ilce,
  adres,
  sirket_kodu,
  is_active
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Eden Teknoloji A.Ş.',
  'Eden Teknoloji',
  '1234567890',
  'Merkez',
  'Türkiye',
  'İstanbul',
  'Merkez',
  'Adres girilecek',
  'EDEN',
  true
) ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF to_regclass('public.employees') IS NULL AND to_regclass('public.personel') IS NOT NULL THEN
    ALTER TABLE public.personel RENAME TO employees;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.employees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  ad VARCHAR(100) NOT NULL,
  soyad VARCHAR(100) NOT NULL,
  uyruk VARCHAR(20) DEFAULT 'tc',
  tc_kimlik VARCHAR(11),
  pasaport_no VARCHAR(50),
  cinsiyet VARCHAR(10) NOT NULL,
  dogum_yeri VARCHAR(100),
  dogum_tarihi DATE,
  cep_telefonu VARCHAR(20),
  is_telefonu VARCHAR(20),
  email VARCHAR(255),
  adres TEXT,
  il VARCHAR(100),
  ilce VARCHAR(100),
  acil_kisi_ad VARCHAR(100),
  acil_kisi_soyad VARCHAR(100),
  acil_kisi_yakinlik VARCHAR(50),
  acil_kisi_telefon VARCHAR(20),
  kan_grubu VARCHAR(5),
  askerlik_durumu VARCHAR(50),
  engellilik BOOLEAN DEFAULT false,
  hukumluluk BOOLEAN DEFAULT false,
  tecil_tarihi DATE,
  engellilik_yuzdesi NUMERIC(5,2),
  telefonlar JSONB NOT NULL DEFAULT '[]'::jsonb,
  epostalar JSONB NOT NULL DEFAULT '[]'::jsonb,
  sgk_giris DATE,
  isten_ayrilis DATE,
  calisma_durumu VARCHAR(20) DEFAULT 'gorevde',
  medeni_durum VARCHAR(20),
  sirket_id UUID REFERENCES public.sirketler(id) ON DELETE SET NULL,
  ust_beden VARCHAR(10),
  alt_beden VARCHAR(10),
  ayakkabi VARCHAR(10),
  kep VARCHAR(10),
  iban VARCHAR(34),
  notlar TEXT,
  fotograf_url TEXT,
  cv_belgesi JSONB,
  gorev TEXT,
  okuryazar_degil BOOLEAN NOT NULL DEFAULT false,
  egitim_okullari JSONB NOT NULL DEFAULT '[]'::jsonb,
  yabanci_diller JSONB NOT NULL DEFAULT '[]'::jsonb,
  sertifikalar JSONB NOT NULL DEFAULT '[]'::jsonb,
  yakinlar JSONB NOT NULL DEFAULT '[]'::jsonb,
  ise_giris_belgeleri JSONB NOT NULL DEFAULT '[]'::jsonb,
  isten_cikis_belgeleri JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  field_history JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.birimler (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sirket_id UUID NOT NULL REFERENCES public.sirketler(id) ON DELETE CASCADE,
  ust_birim_id UUID REFERENCES public.birimler(id) ON DELETE SET NULL,
  ad TEXT NOT NULL,
  tip public.birim_tip NOT NULL DEFAULT 'departman',
  aktif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_birimler_sirket ON public.birimler(sirket_id);
CREATE INDEX IF NOT EXISTS idx_birimler_ust ON public.birimler(ust_birim_id);

CREATE TABLE IF NOT EXISTS public.norm_kadrolar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  birim_id UUID NOT NULL REFERENCES public.birimler(id) ON DELETE CASCADE,
  unvan TEXT NOT NULL,
  aciklama TEXT,
  amir BOOLEAN NOT NULL DEFAULT false,
  durum public.kadro_durum NOT NULL DEFAULT 'acik',
  butce NUMERIC(12,2),
  personel_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kadro_birim ON public.norm_kadrolar(birim_id);
CREATE INDEX IF NOT EXISTS idx_kadro_personel ON public.norm_kadrolar(personel_id);

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS sirket_id UUID REFERENCES public.sirketler(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS birim_id UUID REFERENCES public.birimler(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS kadro_id UUID REFERENCES public.norm_kadrolar(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fotograf_url TEXT,
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
  ADD COLUMN IF NOT EXISTS isten_cikis_belgeleri JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS field_history JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_employees_sirket ON public.employees(sirket_id);
CREATE INDEX IF NOT EXISTS idx_employees_active ON public.employees(is_active);
CREATE INDEX IF NOT EXISTS idx_employees_birim ON public.employees(birim_id);
CREATE INDEX IF NOT EXISTS idx_employees_durum ON public.employees(calisma_durumu);
CREATE INDEX IF NOT EXISTS idx_employees_isim ON public.employees(soyad, ad);

CREATE TABLE IF NOT EXISTS public.nakit_islemler (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tarih DATE NOT NULL,
  gelir NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (gelir >= 0),
  gider NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (gider >= 0),
  aciklama TEXT NOT NULL,
  proje public.proje_tip NOT NULL,
  belge_no TEXT,
  islem_tarafi public.islem_tarafi NOT NULL,
  karsi_taraf TEXT,
  banka TEXT,
  hesap_tipi public.hesap_tipi,
  hesap_no TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_tutar CHECK (gelir > 0 OR gider > 0)
);

CREATE INDEX IF NOT EXISTS idx_nakit_tarih ON public.nakit_islemler(tarih DESC);
CREATE INDEX IF NOT EXISTS idx_nakit_tarafi ON public.nakit_islemler(islem_tarafi);
CREATE INDEX IF NOT EXISTS idx_nakit_proje ON public.nakit_islemler(proje);

INSERT INTO public.birimler (id, sirket_id, ust_birim_id, ad, tip) VALUES
  ('22222222-2222-2222-2222-222222222221', '11111111-1111-1111-1111-111111111111', NULL, 'Eden Teknoloji', 'sirket'),
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222221', 'Mühendislik', 'departman'),
  ('22222222-2222-2222-2222-222222222223', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222221', 'Operasyon', 'departman'),
  ('22222222-2222-2222-2222-222222222224', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222221', 'Yönetim', 'departman'),
  ('22222222-2222-2222-2222-222222222225', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'Yazılım', 'bolum'),
  ('22222222-2222-2222-2222-222222222226', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'Donanım', 'bolum')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.nakit_islemler (tarih, gelir, gider, aciklama, proje, islem_tarafi, karsi_taraf, banka, hesap_tipi, hesap_no, belge_no) VALUES
  ('2026-01-01', 2306.23, 0, 'Sermaye Aktarımı', 'Sermaye', 'Eden', 'İsmail ILGAR', 'Garanti', 'Vadesiz', '1182-6296019', '202601005773492'),
  ('2026-01-06', 17693.77, 0, 'Sermaye Aktarımı', 'Sermaye', 'Eden', 'İsmail ILGAR', 'Garanti', 'Vadesiz', '1182-6296019', NULL),
  ('2026-01-01', 0, 2306.23, 'Dahua Kamera Sistemi', 'PG', 'Eden', 'Kasa Elektronik', 'Garanti', 'Kredi Kartı', '9792*****0118', 'KAF2026000000662')
ON CONFLICT DO NOTHING;

ALTER TABLE public.birimler ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.norm_kadrolar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nakit_islemler ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'birimler' AND policyname = 'authenticated_read_all') THEN
    CREATE POLICY "authenticated_read_all" ON public.birimler FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'norm_kadrolar' AND policyname = 'authenticated_read_all') THEN
    CREATE POLICY "authenticated_read_all" ON public.norm_kadrolar FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'nakit_islemler' AND policyname = 'authenticated_read_all') THEN
    CREATE POLICY "authenticated_read_all" ON public.nakit_islemler FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'nakit_islemler' AND policyname = 'authenticated_insert') THEN
    CREATE POLICY "authenticated_insert" ON public.nakit_islemler FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'nakit_islemler' AND policyname = 'authenticated_update') THEN
    CREATE POLICY "authenticated_update" ON public.nakit_islemler FOR UPDATE TO authenticated USING (true);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_birimler_updated ON public.birimler;
CREATE TRIGGER trg_birimler_updated BEFORE UPDATE ON public.birimler FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_employees_updated ON public.employees;
CREATE TRIGGER trg_employees_updated BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_nakit_updated ON public.nakit_islemler;
CREATE TRIGGER trg_nakit_updated BEFORE UPDATE ON public.nakit_islemler FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
