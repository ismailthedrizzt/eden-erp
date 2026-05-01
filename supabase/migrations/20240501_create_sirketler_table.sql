-- Create sirketler table for Company Management module
-- Migration: 20240501_create_sirketler_table

-- Main company table
CREATE TABLE IF NOT EXISTS public.sirketler (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Kimlik - Identity
    ticari_unvan TEXT NOT NULL,
    kisa_unvan TEXT NOT NULL,
    vkn_tckn TEXT NOT NULL,
    vergi_dairesi TEXT NOT NULL,
    
    -- Tescil - Registration
    mersis_no TEXT,
    ticaret_sicil_no TEXT,
    kurulus_tarihi DATE,
    sirket_turu TEXT CHECK (sirket_turu IN ('anonim', 'limited', 'sahis', 'kooperatif', 'diger')),
    
    -- Adres - Address
    ulke TEXT NOT NULL DEFAULT 'Türkiye',
    il TEXT NOT NULL,
    ilce TEXT NOT NULL,
    adres TEXT NOT NULL,
    
    -- Iletisim - Contact
    telefon TEXT,
    email TEXT,
    web_sitesi TEXT,
    
    -- Kurumsal Kimlik - Corporate Identity
    legal_entity TEXT,
    parent_company_id UUID REFERENCES public.sirketler(id),
    sirket_kodu TEXT UNIQUE,
    
    -- Vergi ve SGK - Tax and SGK
    e_fatura_mukellefi BOOLEAN DEFAULT false,
    e_arsiv_mukellefi BOOLEAN DEFAULT false,
    e_irsaliye_mukellefi BOOLEAN DEFAULT false,
    sgk_is_yeri_sicil_no TEXT,
    sgk_il TEXT,
    sgk_sube TEXT,
    nace_kodlari TEXT[],
    tehlike_sinifi TEXT CHECK (tehlike_sinifi IN ('az_tehlikeli', 'tehlikeli', 'cok_tehlikeli')),
    
    -- ERP Ayarlari - ERP Settings
    varsayilan_para_birimi TEXT DEFAULT 'TRY',
    varsayilan_dil TEXT DEFAULT 'tr',
    zaman_dilimi TEXT DEFAULT 'Europe/Istanbul',
    mali_yil_baslangici INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    
    CONSTRAINT unique_kisa_unvan UNIQUE (kisa_unvan),
    CONSTRAINT unique_vkn UNIQUE (vkn_tckn)
);

-- Create related tables

-- Company Partners (Ortaklar)
CREATE TABLE IF NOT EXISTS public.sirket_ortaklar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sirket_id UUID NOT NULL REFERENCES public.sirketler(id) ON DELETE CASCADE,
    ortak_adi TEXT NOT NULL,
    ortak_tipi TEXT CHECK (ortak_tipi IN ('kisi', 'sirket')) DEFAULT 'kisi',
    tckn_vkn TEXT,
    hisse_orani NUMERIC(5,2) CHECK (hisse_orani >= 0 AND hisse_orani <= 100),
    imza_yetkisi BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Company Representatives (Temsilciler)
CREATE TABLE IF NOT EXISTS public.sirket_temsilciler (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sirket_id UUID NOT NULL REFERENCES public.sirketler(id) ON DELETE CASCADE,
    ad_soyad TEXT NOT NULL,
    gorev TEXT,
    telefon TEXT,
    email TEXT,
    yetki_turu TEXT CHECK (yetki_turu IN ('ceo', 'mali_musavir', 'finans_muduru', 'ik_muduru', 'imza_sahibi', 'diger')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Company Documents
CREATE TABLE IF NOT EXISTS public.sirket_dokumanlar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sirket_id UUID NOT NULL REFERENCES public.sirketler(id) ON DELETE CASCADE,
    dokuman_turu TEXT CHECK (dokuman_turu IN ('vergi_levhasi', 'ticaret_sicil', 'imza_sirkuleri', 'faaliyet_belgesi', 'diger')),
    dosya_adi TEXT NOT NULL,
    dosya_url TEXT NOT NULL,
    yuklenme_tarihi TIMESTAMPTZ DEFAULT now(),
    yukleyen_kullanici_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Company Logos
CREATE TABLE IF NOT EXISTS public.sirket_logolar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sirket_id UUID NOT NULL REFERENCES public.sirketler(id) ON DELETE CASCADE,
    dosya_adi TEXT NOT NULL,
    dosya_url TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    yuklenme_tarihi TIMESTAMPTZ DEFAULT now(),
    yukleyen_kullanici_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_sirketler_kisa_unvan ON public.sirketler(kisa_unvan);
CREATE INDEX idx_sirketler_vkn ON public.sirketler(vkn_tckn);
CREATE INDEX idx_sirketler_is_active ON public.sirketler(is_active);
CREATE INDEX idx_ortaklar_sirket_id ON public.sirket_ortaklar(sirket_id);
CREATE INDEX idx_temsilciler_sirket_id ON public.sirket_temsilciler(sirket_id);
CREATE INDEX idx_dokumanlar_sirket_id ON public.sirket_dokumanlar(sirket_id);
CREATE INDEX idx_logolar_sirket_id ON public.sirket_logolar(sirket_id);

-- Enable RLS
ALTER TABLE public.sirketler ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sirket_ortaklar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sirket_temsilciler ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sirket_dokumanlar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sirket_logolar ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sirketler
CREATE POLICY "Enable read access for authenticated users" 
    ON public.sirketler FOR SELECT 
    TO authenticated 
    USING (true);

CREATE POLICY "Enable insert access for authenticated users" 
    ON public.sirketler FOR INSERT 
    TO authenticated 
    WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" 
    ON public.sirketler FOR UPDATE 
    TO authenticated 
    USING (true);

CREATE POLICY "Enable delete access for authenticated users" 
    ON public.sirketler FOR DELETE 
    TO authenticated 
    USING (true);

-- RLS Policies for related tables
CREATE POLICY "Enable all access for authenticated users" 
    ON public.sirket_ortaklar FOR ALL 
    TO authenticated 
    USING (true);

CREATE POLICY "Enable all access for authenticated users" 
    ON public.sirket_temsilciler FOR ALL 
    TO authenticated 
    USING (true);

CREATE POLICY "Enable all access for authenticated users" 
    ON public.sirket_dokumanlar FOR ALL 
    TO authenticated 
    USING (true);

CREATE POLICY "Enable all access for authenticated users" 
    ON public.sirket_logolar FOR ALL 
    TO authenticated 
    USING (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sirketler_updated_at BEFORE UPDATE ON public.sirketler
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sirket_ortaklar_updated_at BEFORE UPDATE ON public.sirket_ortaklar
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sirket_temsilciler_updated_at BEFORE UPDATE ON public.sirket_temsilciler
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON public.sirketler TO authenticated;
GRANT ALL ON public.sirket_ortaklar TO authenticated;
GRANT ALL ON public.sirket_temsilciler TO authenticated;
GRANT ALL ON public.sirket_dokumanlar TO authenticated;
GRANT ALL ON public.sirket_logolar TO authenticated;
