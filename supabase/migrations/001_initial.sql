-- ══════════════════════════════════════════════════════════════
-- EDEN ERP — Veritabanı Şeması
-- Supabase / PostgreSQL
-- ══════════════════════════════════════════════════════════════

-- Uzantılar
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- ── Enum Tipleri ──────────────────────────────────────────────

CREATE TYPE birim_tip AS ENUM (
  'sirket', 'genel_mudurluk', 'mudurluk', 'departman', 'bolum', 'takim'
);

CREATE TYPE kadro_durum AS ENUM ('dolu', 'acik', 'dondurulmus');

CREATE TYPE personel_durum AS ENUM ('gorevde', 'izinde', 'ayrilmis', 'askida');

CREATE TYPE proje_tip AS ENUM (
  'PG', 'EPIRB', 'Otel', 'İdari', 'Sermaye', 'Aktarım', 'Finansal', 'Destek', 'Yatırım'
);

CREATE TYPE hesap_tipi AS ENUM ('Vadesiz', 'Yatırım', 'Kredi Kartı', 'Nakit', 'Bonus');

CREATE TYPE islem_tarafi AS ENUM ('Eden', 'İsmail ILGAR', 'Canberk', 'Ergün');

-- ── Şirketler ─────────────────────────────────────────────────

CREATE TABLE sirketler (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ad          TEXT NOT NULL,
  vergi_no    TEXT,
  adres       TEXT,
  aktif       BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Birimler (Teşkilat Ağacı) ─────────────────────────────────

CREATE TABLE birimler (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sirket_id     UUID NOT NULL REFERENCES sirketler(id) ON DELETE CASCADE,
  ust_birim_id  UUID REFERENCES birimler(id) ON DELETE SET NULL,
  ad            TEXT NOT NULL,
  tip           birim_tip NOT NULL DEFAULT 'departman',
  aktif         BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_birimler_sirket ON birimler(sirket_id);
CREATE INDEX idx_birimler_ust ON birimler(ust_birim_id);

-- ── Personel ──────────────────────────────────────────────────

CREATE TABLE personel (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- Kişisel
  ad                    TEXT NOT NULL,
  soyad                 TEXT NOT NULL,
  uyruk                 TEXT NOT NULL DEFAULT 'tc' CHECK (uyruk IN ('tc', 'yabanci')),
  tc_kimlik             TEXT UNIQUE,
  pasaport_no           TEXT,
  cinsiyet              TEXT NOT NULL CHECK (cinsiyet IN ('erkek', 'kadin')),
  dogum_yeri            TEXT,
  dogum_tarihi          DATE,
  kan_grubu             TEXT CHECK (kan_grubu IN ('A+','A-','B+','B-','AB+','AB-','0+','0-')),
  askerlik_durumu       TEXT CHECK (askerlik_durumu IN ('muaf','caginda_degil','tecilli','belirsiz','bakaya','yapti')),
  engellilik            BOOLEAN NOT NULL DEFAULT false,
  hukumluluk            BOOLEAN NOT NULL DEFAULT false,
  -- İletişim
  cep_telefonu          TEXT,
  is_telefonu           TEXT,
  ev_telefonu           TEXT,
  email                 TEXT,
  adres                 TEXT,
  il                    TEXT,
  ilce                  TEXT,
  -- Acil Kişi
  acil_kisi_ad          TEXT,
  acil_kisi_soyad       TEXT,
  acil_kisi_yakinlik    TEXT,
  acil_kisi_telefon     TEXT,
  -- İş
  sgk_giris             DATE,
  calisma_durumu        personel_durum NOT NULL DEFAULT 'gorevde',
  birim_id              UUID REFERENCES birimler(id) ON DELETE SET NULL,
  kadro_id              UUID,
  -- Kıyafet
  ust_beden             TEXT,
  alt_beden             TEXT,
  ayakkabi              TEXT,
  kep                   TEXT,
  -- Banka
  iban                  TEXT,
  -- Meta
  notlar                TEXT,
  fotograf_url          TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_personel_birim ON personel(birim_id);
CREATE INDEX idx_personel_durum ON personel(calisma_durumu);
CREATE INDEX idx_personel_isim ON personel(soyad, ad);

-- ── Norm Kadro ────────────────────────────────────────────────

CREATE TABLE norm_kadrolar (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  birim_id    UUID NOT NULL REFERENCES birimler(id) ON DELETE CASCADE,
  unvan       TEXT NOT NULL,
  aciklama    TEXT,
  amir        BOOLEAN NOT NULL DEFAULT false,
  durum       kadro_durum NOT NULL DEFAULT 'acik',
  butce       NUMERIC(12,2),
  personel_id UUID REFERENCES personel(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_kadro_birim ON norm_kadrolar(birim_id);
CREATE INDEX idx_kadro_personel ON norm_kadrolar(personel_id);

-- ── Nakit İşlemler (Muhasebe) ─────────────────────────────────

CREATE TABLE nakit_islemler (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tarih         DATE NOT NULL,
  gelir         NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (gelir >= 0),
  gider         NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (gider >= 0),
  aciklama      TEXT NOT NULL,
  proje         proje_tip NOT NULL,
  belge_no      TEXT,
  islem_tarafi  islem_tarafi NOT NULL,
  karsi_taraf   TEXT,
  banka         TEXT,
  hesap_tipi    hesap_tipi,
  hesap_no      TEXT,
  created_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_tutar CHECK (gelir > 0 OR gider > 0)
);

CREATE INDEX idx_nakit_tarih ON nakit_islemler(tarih DESC);
CREATE INDEX idx_nakit_tarafi ON nakit_islemler(islem_tarafi);
CREATE INDEX idx_nakit_proje ON nakit_islemler(proje);

-- ── Seed: Eden Teknoloji A.Ş. ────────────────────────────────

INSERT INTO sirketler (id, ad, vergi_no) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Eden Teknoloji A.Ş.', '1234567890');

INSERT INTO birimler (id, sirket_id, ust_birim_id, ad, tip) VALUES
  ('22222222-2222-2222-2222-222222222221', '11111111-1111-1111-1111-111111111111', NULL, 'Eden Teknoloji A.Ş.', 'sirket'),
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222221', 'Mühendislik', 'departman'),
  ('22222222-2222-2222-2222-222222222223', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222221', 'Operasyon', 'departman'),
  ('22222222-2222-2222-2222-222222222224', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222221', 'Yönetim', 'departman'),
  ('22222222-2222-2222-2222-222222222225', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'Yazılım', 'bolum'),
  ('22222222-2222-2222-2222-222222222226', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'Donanım', 'bolum');

INSERT INTO personel (ad, soyad, cinsiyet, calisma_durumu, birim_id, cep_telefonu) VALUES
  ('İsmail', 'ILGAR', 'erkek', 'gorevde', '22222222-2222-2222-2222-222222222222', '+905551234567'),
  ('Canberk', 'Kaya', 'erkek', 'gorevde', '22222222-2222-2222-2222-222222222222', '+905552345678'),
  ('Ergün', 'Demir', 'erkek', 'izinde', '22222222-2222-2222-2222-222222222222', '+905553456789');

-- Örnek nakit işlemler (Excel'den)
INSERT INTO nakit_islemler (tarih, gelir, gider, aciklama, proje, islem_tarafi, karsi_taraf, banka, hesap_tipi, hesap_no, belge_no) VALUES
  ('2026-01-01', 2306.23, 0, 'Sermaye Aktarımı', 'Sermaye', 'Eden', 'İsmail ILGAR', 'Garanti', 'Vadesiz', '1182-6296019', '202601005773492'),
  ('2026-01-06', 17693.77, 0, 'Sermaye Aktarımı', 'Sermaye', 'Eden', 'İsmail ILGAR', 'Garanti', 'Vadesiz', '1182-6296019', NULL),
  ('2026-01-01', 0, 2306.23, 'Dahua Kamera Sistemi', 'PG', 'Eden', 'Kasa Elektronik', 'Garanti', 'Kredi Kartı', '9792*****0118', 'KAF2026000000662'),
  ('2026-01-01', 0, 10000, 'Yakıt & Ulaşım', 'İdari', 'İsmail ILGAR', 'Muhtelif', 'Nakit', 'Nakit', NULL, NULL),
  ('2026-01-08', 0, 16200, 'Şirket Kuruluş Masrafları', 'İdari', 'İsmail ILGAR', 'Muhasebeci', 'EnPara', 'Vadesiz', '03663-107195796', '202512005876043'),
  ('2026-01-10', 0, 7003.26, 'Dahua Kamera - 2. Parti', 'PG', 'Eden', 'Kasa Elektronik', 'Garanti', 'Kredi Kartı', '5400*****9017', 'KAF2026000000010'),
  ('2026-01-17', 20000, 0, 'KOSGEB Destek Ödemesi', 'Destek', 'Eden', 'KOSGEB', 'Garanti', 'Vadesiz', '1182-6296019', NULL),
  ('2026-01-22', 0, 3255, 'HikVision Kamera', 'PG', 'Eden', 'Teldata', 'Garanti', 'Kredi Kartı', '9792*****0118', 'TEL2026000000017'),
  ('2026-01-25', 0, 1543.20, 'Batarya Malzemeleri', 'PG', 'Canberk', 'PB Mobil', NULL, NULL, NULL, NULL),
  ('2026-01-25', 0, 4484, 'El Aletleri', 'PG', 'Canberk', NULL, NULL, NULL, NULL, NULL),
  ('2026-02-01', 0, 14640, 'Batarya - PB Mobil Enerji', 'PG', 'İsmail ILGAR', 'PB Mobil', NULL, 'Kredi Kartı', 'İşbank', NULL),
  ('2026-02-18', 21000, 0, 'Sermaye Aktarımı', 'Sermaye', 'Eden', 'İsmail ILGAR', 'Garanti', 'Vadesiz', '1182-6296019', NULL),
  ('2026-02-20', 0, 662.11, 'Elektrik Parçaları', 'PG', 'Ergün', 'RoboLink', NULL, NULL, NULL, NULL),
  ('2026-03-01', 0, 12321.36, 'Filament - Robo90', 'PG', 'İsmail ILGAR', 'Robo90', NULL, 'Kredi Kartı', 'Akbank', NULL),
  ('2026-03-15', 0, 3370.93, 'Kamera Parçaları - Otel', 'Otel', 'Eden', NULL, 'Garanti', 'Kredi Kartı', '5400*****9017', NULL);

-- ── RLS (Row Level Security) ──────────────────────────────────

ALTER TABLE sirketler ENABLE ROW LEVEL SECURITY;
ALTER TABLE birimler ENABLE ROW LEVEL SECURITY;
ALTER TABLE personel ENABLE ROW LEVEL SECURITY;
ALTER TABLE norm_kadrolar ENABLE ROW LEVEL SECURITY;
ALTER TABLE nakit_islemler ENABLE ROW LEVEL SECURITY;

-- Geçici: Giriş yapmış her kullanıcı her şeyi görebilir
-- TODO: Rol bazlı RLS politikaları eklenecek
CREATE POLICY "authenticated_read_all" ON sirketler FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_all" ON birimler FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_all" ON personel FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_all" ON norm_kadrolar FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_all" ON nakit_islemler FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_insert" ON nakit_islemler FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update" ON nakit_islemler FOR UPDATE TO authenticated USING (true);

CREATE POLICY "authenticated_insert_personel" ON personel FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update_personel" ON personel FOR UPDATE TO authenticated USING (true);

-- ── Updated_at otomatik güncelleme ────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sirketler_updated BEFORE UPDATE ON sirketler FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_birimler_updated BEFORE UPDATE ON birimler FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_personel_updated BEFORE UPDATE ON personel FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_nakit_updated BEFORE UPDATE ON nakit_islemler FOR EACH ROW EXECUTE FUNCTION update_updated_at();
