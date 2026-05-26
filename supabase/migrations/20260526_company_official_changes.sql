ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS postal_code text;

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS activity_subject text;

CREATE TABLE IF NOT EXISTS public.company_official_change_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.erp_instances(id),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  branch_id uuid REFERENCES public.company_branches(id),
  operation_id uuid REFERENCES public.operation_requests(id),
  transaction_no text NOT NULL,
  transaction_type text NOT NULL,
  old_values jsonb NOT NULL DEFAULT '{}'::jsonb,
  new_values jsonb NOT NULL DEFAULT '{}'::jsonb,
  changed_fields text[] NOT NULL DEFAULT ARRAY[]::text[],
  document_files jsonb NOT NULL DEFAULT '[]'::jsonb,
  decision_date date,
  registration_date date,
  trade_registry_gazette_date date,
  trade_registry_gazette_number text,
  effective_date date,
  approval_status text NOT NULL DEFAULT 'approved',
  workflow_status text NOT NULL DEFAULT 'completed',
  status text NOT NULL DEFAULT 'completed',
  notes text,
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1,
  is_deleted boolean NOT NULL DEFAULT false,
  CONSTRAINT company_official_change_type_check CHECK (
    transaction_type IN ('title_change', 'address_change', 'public_registration_update', 'branch_opening', 'branch_closing', 'nace_change', 'activity_subject_change')
  ),
  CONSTRAINT company_official_change_status_check CHECK (
    status IN ('draft', 'completed', 'cancelled', 'failed')
  )
);

ALTER TABLE public.company_official_change_transactions
  DROP CONSTRAINT IF EXISTS company_official_change_type_check;

ALTER TABLE public.company_official_change_transactions
  ADD CONSTRAINT company_official_change_type_check CHECK (
    transaction_type IN ('title_change', 'address_change', 'public_registration_update', 'branch_opening', 'branch_closing', 'nace_change', 'activity_subject_change')
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_company_official_change_transaction_no
  ON public.company_official_change_transactions(transaction_no);

CREATE INDEX IF NOT EXISTS idx_company_official_change_tenant_company
  ON public.company_official_change_transactions(tenant_id, company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_company_official_change_operation
  ON public.company_official_change_transactions(operation_id);

CREATE INDEX IF NOT EXISTS idx_company_official_change_branch
  ON public.company_official_change_transactions(branch_id);

CREATE INDEX IF NOT EXISTS idx_company_official_change_type
  ON public.company_official_change_transactions(company_id, transaction_type, status, is_deleted);

COMMENT ON TABLE public.company_official_change_transactions IS
  'Official company changes outside capital operations: title, address, public/registration, branch lifecycle, NACE, and activity subject updates.';

COMMENT ON COLUMN public.company_official_change_transactions.document_files IS
  'Document slot payloads attached to the official change operation.';
