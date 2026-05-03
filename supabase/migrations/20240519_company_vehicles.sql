CREATE TABLE IF NOT EXISTS public.company_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sirketler(id) ON DELETE SET NULL,
  category TEXT NOT NULL DEFAULT 'Kara',
  vehicle_type TEXT NOT NULL,
  brand TEXT NOT NULL,
  manufacturer TEXT,
  model TEXT,
  model_year INTEGER,
  color TEXT,
  registration_no TEXT,
  vin_serial_no TEXT,
  status TEXT NOT NULL DEFAULT 'Aktif',
  ownership_type TEXT NOT NULL DEFAULT 'Şirket Malı',
  assigned_to_employee_id UUID,
  operator_employee_id UUID,
  location_name TEXT,
  current_usage_value NUMERIC,
  usage_unit TEXT DEFAULT 'km',
  fuel_type TEXT,
  insurance_policy_no TEXT,
  insurance_expiry_date DATE,
  inspection_expiry_date DATE,
  maintenance_due_date DATE,
  purchase_date DATE,
  lease_start_date DATE,
  lease_end_date DATE,
  budget_code TEXT,
  cost_center TEXT,
  notes TEXT,
  api_notes TEXT,
  media JSONB NOT NULL DEFAULT '[]'::jsonb,
  documents JSONB NOT NULL DEFAULT '[]'::jsonb,
  history JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_company_vehicles_company_id ON public.company_vehicles(company_id);
CREATE INDEX IF NOT EXISTS idx_company_vehicles_category ON public.company_vehicles(category);
CREATE INDEX IF NOT EXISTS idx_company_vehicles_status ON public.company_vehicles(status);
CREATE INDEX IF NOT EXISTS idx_company_vehicles_soft_delete ON public.company_vehicles(is_deleted);

COMMENT ON TABLE public.company_vehicles IS 'All company road, marine, and air vehicles with soft delete and history support.';
