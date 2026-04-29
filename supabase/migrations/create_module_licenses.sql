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
  UNIQUE(module_key, submodule_key)
);

-- Insert default modules
INSERT INTO public.module_licenses (module_key, module_name, is_active, environment) VALUES
  ('teskilat', 'Teşkilat', true, 'all'),
  ('kadro', 'Kadro', true, 'all'),
  ('ik', 'İnsan Kaynakları', true, 'all'),
  ('muhasebe', 'Muhasebe', true, 'all')
ON CONFLICT (module_key) DO NOTHING;

-- Insert default submodules
INSERT INTO public.submodule_licenses (module_key, submodule_key, submodule_name, is_active, environment) VALUES
  ('teskilat', 'birimler', 'Birimler', true, 'all'),
  ('teskilat', 'kadrolar', 'Kadrolar', true, 'all'),
  ('ik', 'personel', 'Personel', true, 'all'),
  ('ik', 'teskilat', 'Teşkilat', true, 'all'),
  ('muhasebe', 'fatura', 'Fatura', true, 'all'),
  ('muhasebe', 'cari', 'Cari', true, 'all')
ON CONFLICT (module_key, submodule_key) DO NOTHING;

-- Enable RLS
ALTER TABLE public.module_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submodule_licenses ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow read access for authenticated users" ON public.module_licenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow update for authenticated users" ON public.module_licenses FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow read access for authenticated users" ON public.submodule_licenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow update for authenticated users" ON public.submodule_licenses FOR UPDATE TO authenticated USING (true);
