CREATE TABLE IF NOT EXISTS public.organization_unit_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#2563eb',
  icon TEXT NOT NULL DEFAULT 'Layers',
  parent_type_id UUID REFERENCES public.organization_unit_types(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.birimler
  ADD COLUMN IF NOT EXISTS unit_type_id UUID REFERENCES public.organization_unit_types(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS short_name TEXT,
  ADD COLUMN IF NOT EXISTS code TEXT,
  ADD COLUMN IF NOT EXISTS location_id UUID,
  ADD COLUMN IF NOT EXISTS location_name TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Aktif',
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS documents JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS history JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by TEXT;

ALTER TABLE public.norm_kadrolar
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS grade TEXT,
  ADD COLUMN IF NOT EXISTS reports_to_position_id UUID REFERENCES public.norm_kadrolar(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_manager BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS norm_count INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS active_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS budget_code TEXT,
  ADD COLUMN IF NOT EXISTS work_type TEXT NOT NULL DEFAULT 'Tam Zamanlı',
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Aktif',
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS history JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by TEXT;

CREATE TABLE IF NOT EXISTS public.position_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id UUID NOT NULL REFERENCES public.norm_kadrolar(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'Aktif',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.position_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id UUID NOT NULL REFERENCES public.norm_kadrolar(id) ON DELETE CASCADE,
  field TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  changed_by TEXT
);

CREATE TABLE IF NOT EXISTS public.organization_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES public.birimler(id) ON DELETE CASCADE,
  field TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  changed_by TEXT
);

INSERT INTO public.organization_unit_types (name, slug, color, icon, sort_order)
VALUES
  ('Genel Müdürlük', 'genel-mudurluk', '#1d4ed8', 'Building2', 10),
  ('Direktörlük', 'direktorluk', '#7c3aed', 'Network', 20),
  ('Müdürlük', 'mudurluk', '#0891b2', 'Layers', 30),
  ('Departman', 'departman', '#2563eb', 'PanelTop', 40),
  ('Bölüm', 'bolum', '#16a34a', 'PanelsTopLeft', 50),
  ('Takım', 'takim', '#65a30d', 'Users', 60),
  ('Şube', 'sube', '#ea580c', 'MapPin', 70),
  ('Ofis', 'ofis', '#f59e0b', 'Briefcase', 80),
  ('Operasyon', 'operasyon', '#dc2626', 'Workflow', 90),
  ('Proje Ofisi', 'proje-ofisi', '#9333ea', 'FolderKanban', 100),
  ('Komite', 'komite', '#475569', 'BadgeCheck', 110),
  ('Kurul', 'kurul', '#334155', 'Landmark', 120),
  ('Diğer', 'diger', '#6b7280', 'Tag', 130)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  color = EXCLUDED.color,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order;

UPDATE public.birimler b
SET
  name = COALESCE(b.name, b.ad),
  status = CASE WHEN COALESCE(b.aktif, true) THEN 'Aktif' ELSE 'Pasif' END,
  unit_type_id = COALESCE(
    b.unit_type_id,
    (SELECT id FROM public.organization_unit_types WHERE slug = REPLACE(b.tip::text, '_', '-') LIMIT 1),
    (SELECT id FROM public.organization_unit_types WHERE slug = 'departman' LIMIT 1)
  )
WHERE b.name IS NULL OR b.unit_type_id IS NULL;

UPDATE public.norm_kadrolar
SET
  title = COALESCE(title, unvan),
  is_manager = COALESCE(is_manager, amir, false),
  active_count = CASE WHEN durum = 'dolu' THEN 1 ELSE active_count END,
  status = CASE WHEN durum = 'dondurulmus' THEN 'Kapalı' ELSE 'Aktif' END
WHERE title IS NULL;

CREATE INDEX IF NOT EXISTS idx_organization_units_parent
  ON public.birimler(ust_birim_id, is_deleted, status);

CREATE INDEX IF NOT EXISTS idx_organization_units_type
  ON public.birimler(unit_type_id);

CREATE INDEX IF NOT EXISTS idx_positions_unit
  ON public.norm_kadrolar(birim_id, is_deleted, status);
