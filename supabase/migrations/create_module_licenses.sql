-- Create module licenses table
CREATE TABLE IF NOT EXISTS public.module_licenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  module_key VARCHAR(50) NOT NULL UNIQUE,
  module_name VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  environment VARCHAR(20) DEFAULT 'all', -- 'dev', 'prod', 'all'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create submodule licenses table
CREATE TABLE IF NOT EXISTS public.submodule_licenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  module_key VARCHAR(50) NOT NULL REFERENCES public.module_licenses(module_key) ON DELETE CASCADE,
  submodule_key VARCHAR(50) NOT NULL,
  submodule_name VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  environment VARCHAR(20) DEFAULT 'all',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(module_key, submodule_key)
);

-- Insert default modules
INSERT INTO public.module_licenses (module_key, module_name, is_active, environment) VALUES
  ('ik', 'İnsan Kaynakları', true, 'all'),
  ('teskilat', 'Teşkilat', true, 'all'),
  ('kadro', 'Kadro', true, 'all'),
  ('muhasebe', 'Muhasebe', true, 'all')
ON CONFLICT (module_key) DO NOTHING;

-- Insert default submodules
INSERT INTO public.submodule_licenses (module_key, submodule_key, submodule_name, is_active, environment) VALUES
  ('ik', 'teskilat', 'Teşkilat & Kadro', true, 'all'),
  ('ik', 'personel', 'Çalışanlarımız', true, 'all'),
  ('teskilat', 'birimler', 'Birimler', true, 'all'),
  ('kadro', 'kadrolar', 'Kadrolar', true, 'all'),
  ('muhasebe', 'dashboard', 'Dashboard', true, 'all'),
  ('muhasebe', 'fatura', 'Tüm İşlemler', true, 'all'),
  ('muhasebe', 'cari', 'Borç Takip', true, 'all')
ON CONFLICT (module_key, submodule_key) DO NOTHING;

-- Add updated_at column if missing (for existing tables)
ALTER TABLE public.submodule_licenses 
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Enable RLS
ALTER TABLE public.module_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submodule_licenses ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow read access for authenticated users" ON public.module_licenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow update for authenticated users" ON public.module_licenses FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow read access for authenticated users" ON public.submodule_licenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow update for authenticated users" ON public.submodule_licenses FOR UPDATE TO authenticated USING (true);
