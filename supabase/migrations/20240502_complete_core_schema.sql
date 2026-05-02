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
  personel_id UUID REFERENCES public.personel(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kadro_birim ON public.norm_kadrolar(birim_id);
CREATE INDEX IF NOT EXISTS idx_kadro_personel ON public.norm_kadrolar(personel_id);

ALTER TABLE public.personel
  ADD COLUMN IF NOT EXISTS birim_id UUID REFERENCES public.birimler(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS kadro_id UUID REFERENCES public.norm_kadrolar(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fotograf_url TEXT;

CREATE INDEX IF NOT EXISTS idx_personel_birim ON public.personel(birim_id);
CREATE INDEX IF NOT EXISTS idx_personel_durum ON public.personel(calisma_durumu);
CREATE INDEX IF NOT EXISTS idx_personel_isim ON public.personel(soyad, ad);

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
ALTER TABLE public.personel ENABLE ROW LEVEL SECURITY;
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

DROP TRIGGER IF EXISTS trg_personel_updated ON public.personel;
CREATE TRIGGER trg_personel_updated BEFORE UPDATE ON public.personel FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_nakit_updated ON public.nakit_islemler;
CREATE TRIGGER trg_nakit_updated BEFORE UPDATE ON public.nakit_islemler FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
