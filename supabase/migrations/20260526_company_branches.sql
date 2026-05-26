CREATE TABLE IF NOT EXISTS public.company_branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.erp_instances(id),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  organization_unit_id uuid REFERENCES public.organization_units(id),
  facility_id uuid,
  branch_name text NOT NULL,
  branch_short_name text,
  branch_type text,
  is_official_branch boolean NOT NULL DEFAULT true,
  country text,
  city text,
  district text,
  neighborhood text,
  address text,
  postal_code text,
  phone text,
  email text,
  trade_registry_number text,
  trade_registry_office text,
  tax_office text,
  sgk_workplace_registry_no text,
  opening_decision_date date,
  opening_registration_date date,
  closing_decision_date date,
  closing_registration_date date,
  trade_registry_gazette_date date,
  trade_registry_gazette_number text,
  responsible_person_id uuid,
  status text NOT NULL DEFAULT 'active',
  record_status text NOT NULL DEFAULT 'active',
  start_date date,
  end_date date,
  notes text,
  document_files jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1,
  is_deleted boolean NOT NULL DEFAULT false,
  CONSTRAINT company_branches_status_check CHECK (
    status IN ('draft', 'active', 'passive', 'closed')
  ),
  CONSTRAINT company_branches_record_status_check CHECK (
    record_status IN ('draft', 'active', 'passive', 'closed')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_company_branches_active_name
  ON public.company_branches(tenant_id, company_id, lower(branch_name))
  WHERE is_deleted = false AND record_status = 'active';

CREATE INDEX IF NOT EXISTS idx_company_branches_tenant_company
  ON public.company_branches(tenant_id, company_id, record_status, is_deleted);

CREATE INDEX IF NOT EXISTS idx_company_branches_organization_unit
  ON public.company_branches(organization_unit_id);

CREATE INDEX IF NOT EXISTS idx_company_branches_facility
  ON public.company_branches(facility_id);

COMMENT ON TABLE public.company_branches IS
  'Branches and operational points under a company. Branches are not separate legal entities or company records.';

COMMENT ON COLUMN public.company_branches.company_id IS
  'Parent legal company. company_branches rows must never be inserted into companies as separate legal entities.';

COMMENT ON COLUMN public.company_branches.organization_unit_id IS
  'Optional organization unit created or linked for staffing and hierarchy management.';

COMMENT ON COLUMN public.company_branches.facility_id IS
  'Optional future facility/location reference. Phase 1 stores physical address on the branch when no facility table exists.';
