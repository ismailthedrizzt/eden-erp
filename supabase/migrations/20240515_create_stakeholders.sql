CREATE TABLE IF NOT EXISTS public.stakeholders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sirketler(id) ON DELETE SET NULL,
  stakeholder_type TEXT NOT NULL DEFAULT 'gercek_kisi',
  category TEXT NOT NULL,
  person_id UUID,
  organization_id UUID,
  display_name TEXT NOT NULL,
  tax_id TEXT,
  phone TEXT,
  email TEXT,
  country TEXT,
  city TEXT,
  status TEXT NOT NULL DEFAULT 'Aktif',
  priority_level TEXT,
  internal_owner_employee_id UUID,
  relationship_start_date DATE,
  relationship_end_date DATE,
  iban TEXT,
  bank_name TEXT,
  currency TEXT DEFAULT 'TRY',
  contract_status TEXT,
  notes TEXT,
  photo_logo JSONB NOT NULL DEFAULT '[]'::jsonb,
  stakeholder_documents JSONB NOT NULL DEFAULT '[]'::jsonb,
  stakeholder_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  history JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by TEXT
);

ALTER TABLE public.stakeholders
  DROP CONSTRAINT IF EXISTS stakeholders_type_check,
  DROP CONSTRAINT IF EXISTS stakeholders_status_check,
  DROP CONSTRAINT IF EXISTS stakeholders_priority_check;

ALTER TABLE public.stakeholders
  ADD CONSTRAINT stakeholders_type_check
  CHECK (stakeholder_type IN ('gercek_kisi', 'tuzel_kisi')),
  ADD CONSTRAINT stakeholders_status_check
  CHECK (status IN ('Aktif', 'Pasif', 'Askıda', 'Kara Liste', 'Çalışma Sonlandı')),
  ADD CONSTRAINT stakeholders_priority_check
  CHECK (priority_level IS NULL OR priority_level IN ('Düşük', 'Orta', 'Yüksek', 'Kritik'));

CREATE INDEX IF NOT EXISTS idx_stakeholders_company
  ON public.stakeholders(company_id, is_deleted, status);

CREATE INDEX IF NOT EXISTS idx_stakeholders_category
  ON public.stakeholders(category);

CREATE INDEX IF NOT EXISTS idx_stakeholders_history
  ON public.stakeholders USING GIN(history);
