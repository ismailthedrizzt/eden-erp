-- Create personel table in public schema
CREATE TABLE IF NOT EXISTS public.personel (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Basic Info
  ad VARCHAR(100) NOT NULL,
  soyad VARCHAR(100) NOT NULL,
  uyruk VARCHAR(20) DEFAULT 'tc',
  tc_kimlik VARCHAR(11),
  pasaport_no VARCHAR(50),
  cinsiyet VARCHAR(10) NOT NULL,
  dogum_yeri VARCHAR(100),
  dogum_tarihi DATE,

  -- Contact Info
  cep_telefonu VARCHAR(20),
  is_telefonu VARCHAR(20),
  email VARCHAR(255),
  adres TEXT,
  il VARCHAR(100),
  ilce VARCHAR(100),

  -- Emergency Contact
  acil_kisi_ad VARCHAR(100),
  acil_kisi_soyad VARCHAR(100),
  acil_kisi_yakinlik VARCHAR(50),
  acil_kisi_telefon VARCHAR(20),

  -- Health & Legal
  kan_grubu VARCHAR(5),
  askerlik_durumu VARCHAR(50),
  engellilik BOOLEAN DEFAULT false,
  hukumluluk BOOLEAN DEFAULT false,

  -- Work Info
  sgk_giris DATE,
  calisma_durumu VARCHAR(20) DEFAULT 'gorevde',
  birim_id UUID REFERENCES public.birimler(id),
  kadro_id UUID REFERENCES public.norm_kadrolar(id),

  -- Uniform
  ust_beden VARCHAR(10),
  alt_beden VARCHAR(10),
  ayakkabi VARCHAR(10),
  kep VARCHAR(10),

  -- Bank
  iban VARCHAR(34),

  -- Notes
  notlar TEXT
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_personel_birim_id ON public.personel(birim_id);
CREATE INDEX IF NOT EXISTS idx_personel_kadro_id ON public.personel(kadro_id);
CREATE INDEX IF NOT EXISTS idx_personel_tc_kimlik ON public.personel(tc_kimlik);
CREATE INDEX IF NOT EXISTS idx_personel_soyad ON public.personel(soyad);

-- Enable Row Level Security
ALTER TABLE public.personel ENABLE ROW LEVEL SECURITY;

-- Create policies (adjust according to your auth requirements)
CREATE POLICY "Allow read access for authenticated users"
  ON public.personel FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow insert for authenticated users"
  ON public.personel FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow update for authenticated users"
  ON public.personel FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow delete for authenticated users"
  ON public.personel FOR DELETE
  TO authenticated
  USING (true);
