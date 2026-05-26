CREATE TABLE IF NOT EXISTS public.company_facilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.erp_instances(id),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  branch_id uuid REFERENCES public.company_branches(id),
  facility_name text NOT NULL,
  facility_type text NOT NULL DEFAULT 'branch_location',
  country text,
  city text,
  district text,
  neighborhood text,
  address text,
  postal_code text,
  phone text,
  email text,
  status text NOT NULL DEFAULT 'active',
  record_status text NOT NULL DEFAULT 'active',
  start_date date,
  end_date date,
  notes text,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1,
  is_deleted boolean NOT NULL DEFAULT false,
  CONSTRAINT company_facilities_status_check CHECK (status IN ('draft', 'active', 'passive', 'closed', 'reusable')),
  CONSTRAINT company_facilities_record_status_check CHECK (record_status IN ('draft', 'active', 'passive', 'closed'))
);

CREATE INDEX IF NOT EXISTS idx_company_facilities_tenant_company
  ON public.company_facilities(tenant_id, company_id, record_status, is_deleted);

CREATE INDEX IF NOT EXISTS idx_company_facilities_branch
  ON public.company_facilities(branch_id)
  WHERE branch_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_company_facilities_active_name
  ON public.company_facilities(tenant_id, company_id, lower(facility_name))
  WHERE is_deleted = false AND record_status = 'active';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'company_branches_facility_id_fkey'
      AND conrelid = 'public.company_branches'::regclass
  ) THEN
    ALTER TABLE public.company_branches
      ADD CONSTRAINT company_branches_facility_id_fkey
      FOREIGN KEY (facility_id) REFERENCES public.company_facilities(id)
      NOT VALID;
  END IF;
END $$;

ALTER TABLE public.company_official_change_transactions
  DROP CONSTRAINT IF EXISTS company_official_change_type_check;

ALTER TABLE public.company_official_change_transactions
  ADD CONSTRAINT company_official_change_type_check CHECK (
    transaction_type IN (
      'title_change',
      'address_change',
      'public_registration_update',
      'branch_opening',
      'branch_closing',
      'branch_document_update',
      'nace_change',
      'activity_subject_change'
    )
  );

COMMENT ON TABLE public.company_facilities IS
  'Minimal company facility/location records used by branch opening and closing operations. Facilities are not companies or legal entities.';

COMMENT ON COLUMN public.company_facilities.branch_id IS
  'Optional branch currently associated with this physical facility/location.';
