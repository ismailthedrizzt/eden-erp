CREATE TABLE IF NOT EXISTS public.company_public_tax (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.sirketler(id) ON DELETE CASCADE,
  tax_number TEXT,
  tax_office TEXT,
  tax_type TEXT,
  liability_start_date DATE,
  e_invoice_taxpayer BOOLEAN NOT NULL DEFAULT FALSE,
  e_archive_taxpayer BOOLEAN NOT NULL DEFAULT FALSE,
  e_waybill_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  gib_user_code TEXT,
  has_financial_seal BOOLEAN NOT NULL DEFAULT FALSE,
  financial_seal_expiry_date DATE,
  tax_debt_tracking_active BOOLEAN NOT NULL DEFAULT FALSE,
  last_check_date DATE,
  history JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id)
);

CREATE TABLE IF NOT EXISTS public.company_public_sgk (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.sirketler(id) ON DELETE CASCADE,
  workplace_registry_no TEXT,
  province TEXT,
  branch TEXT,
  registration_date DATE,
  nace_code TEXT,
  risk_class TEXT,
  uses_incentive BOOLEAN NOT NULL DEFAULT FALSE,
  active_incentive_type TEXT,
  incentive_end_date DATE,
  employee_count INTEGER,
  debt_tracking_active BOOLEAN NOT NULL DEFAULT FALSE,
  last_check_date DATE,
  history JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id)
);

CREATE TABLE IF NOT EXISTS public.company_public_incentives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.sirketler(id) ON DELETE CASCADE,
  has_kosgeb_registration BOOLEAN NOT NULL DEFAULT FALSE,
  kosgeb_no TEXT,
  active_support_program TEXT,
  application_date DATE,
  result_status TEXT,
  incentive_type TEXT,
  incentive_end_date DATE,
  responsible_person TEXT,
  notes TEXT,
  history JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id)
);

CREATE TABLE IF NOT EXISTS public.company_public_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.sirketler(id) ON DELETE CASCADE,
  mersis_no TEXT,
  trade_registry_no TEXT,
  registry_office TEXT,
  chamber_registry_no TEXT,
  chamber_name TEXT,
  establishment_registration_date DATE,
  last_change_date DATE,
  liquidation_status TEXT,
  history JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id)
);

CREATE TABLE IF NOT EXISTS public.company_public_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.sirketler(id) ON DELETE CASCADE,
  license_type TEXT,
  document_no TEXT,
  issuing_authority TEXT,
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'Aktif',
  document_file TEXT,
  reminder_days INTEGER,
  history JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.company_public_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.sirketler(id) ON DELETE CASCADE,
  kep_address TEXT,
  kep_provider TEXT,
  e_notification_address TEXT,
  e_notification_active BOOLEAN NOT NULL DEFAULT FALSE,
  e_government_authority_status TEXT,
  official_notification_email TEXT,
  official_notification_phone TEXT,
  has_web_service_integration BOOLEAN NOT NULL DEFAULT FALSE,
  api_notes TEXT,
  history JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id)
);

CREATE INDEX IF NOT EXISTS idx_company_public_licenses_company_id
  ON public.company_public_licenses(company_id);

CREATE INDEX IF NOT EXISTS idx_company_public_licenses_expiry
  ON public.company_public_licenses(end_date)
  WHERE is_deleted = FALSE;
