ALTER TABLE public.company_representatives
  ADD COLUMN IF NOT EXISTS record_status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.erp_instances(id),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

UPDATE public.company_representatives
SET record_status = CASE
  WHEN COALESCE(is_deleted, false) THEN 'passive'
  WHEN status = 'Aktif' THEN 'active'
  WHEN status = 'Askıda' THEN 'suspended'
  WHEN status = 'Süresi Dolmuş' THEN 'expired'
  WHEN status = 'Sonlandırıldı' THEN 'terminated'
  ELSE COALESCE(record_status, 'draft')
END
WHERE record_status IS NULL OR record_status = '';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'company_representatives_record_status_check'
  ) THEN
    ALTER TABLE public.company_representatives
      ADD CONSTRAINT company_representatives_record_status_check
      CHECK (record_status IN ('draft', 'active', 'suspended', 'expired', 'terminated', 'passive'));
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_company_representatives_record_status
  ON public.company_representatives(company_id, record_status, is_deleted);

CREATE TABLE IF NOT EXISTS public.company_representative_authority_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.erp_instances(id),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  representative_id uuid NOT NULL REFERENCES public.company_representatives(id) ON DELETE CASCADE,
  person_id uuid REFERENCES public.persons(id),
  organization_id uuid REFERENCES public.organizations(id),
  transaction_no text,
  transaction_type text NOT NULL,
  authority_types jsonb NOT NULL DEFAULT '[]'::jsonb,
  signature_type text,
  transaction_limit numeric,
  payment_approval_limit numeric,
  purchase_approval_limit numeric,
  bank_transaction_limit numeric,
  contract_signature_limit numeric,
  currency text NOT NULL DEFAULT 'TRY',
  limits jsonb NOT NULL DEFAULT '{}'::jsonb,
  scope jsonb NOT NULL DEFAULT '{}'::jsonb,
  requires_joint_signature boolean NOT NULL DEFAULT false,
  can_approve_alone boolean NOT NULL DEFAULT false,
  document_files jsonb NOT NULL DEFAULT '[]'::jsonb,
  effective_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  approval_status text NOT NULL DEFAULT 'draft',
  workflow_status text NOT NULL DEFAULT 'draft',
  status text NOT NULL DEFAULT 'draft',
  notes text,
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  reversal_transaction_id uuid REFERENCES public.company_representative_authority_transactions(id),
  new_values jsonb,
  history jsonb NOT NULL DEFAULT '[]'::jsonb,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  deleted_by text,
  version integer NOT NULL DEFAULT 1
);

ALTER TABLE public.company_representative_authority_transactions
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.erp_instances(id),
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id),
  ADD COLUMN IF NOT EXISTS representative_id uuid REFERENCES public.company_representatives(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS person_id uuid REFERENCES public.persons(id),
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id),
  ADD COLUMN IF NOT EXISTS transaction_no text,
  ADD COLUMN IF NOT EXISTS transaction_type text,
  ADD COLUMN IF NOT EXISTS authority_types jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS signature_type text,
  ADD COLUMN IF NOT EXISTS transaction_limit numeric,
  ADD COLUMN IF NOT EXISTS payment_approval_limit numeric,
  ADD COLUMN IF NOT EXISTS purchase_approval_limit numeric,
  ADD COLUMN IF NOT EXISTS bank_transaction_limit numeric,
  ADD COLUMN IF NOT EXISTS contract_signature_limit numeric,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'TRY',
  ADD COLUMN IF NOT EXISTS limits jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS scope jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS requires_joint_signature boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_approve_alone boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS document_files jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS effective_date date NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS workflow_status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS reversal_transaction_id uuid REFERENCES public.company_representative_authority_transactions(id),
  ADD COLUMN IF NOT EXISTS new_values jsonb,
  ADD COLUMN IF NOT EXISTS history jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_by uuid,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by text,
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

DO $$
DECLARE
  default_tenant uuid := '00000000-0000-0000-0000-000000000000';
BEGIN
  UPDATE public.company_representatives
  SET tenant_id = default_tenant
  WHERE tenant_id IS NULL;

  UPDATE public.company_representative_authority_transactions
  SET tenant_id = default_tenant
  WHERE tenant_id IS NULL;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_rep_authority_tx_current
  ON public.company_representative_authority_transactions(company_id, representative_id, approval_status, is_deleted, effective_date, created_at);

CREATE INDEX IF NOT EXISTS idx_rep_authority_tx_tenant
  ON public.company_representative_authority_transactions(tenant_id, approval_status, workflow_status, created_at DESC);

CREATE OR REPLACE VIEW public.v_current_representative_authorities AS
WITH RECURSIVE approved_transactions AS (
  SELECT *
  FROM public.company_representative_authority_transactions
  WHERE approval_status = 'approved'
    AND COALESCE(is_deleted, false) = false
    AND effective_date <= CURRENT_DATE
),
ordered_transactions AS (
  SELECT
    tx.*,
    row_number() OVER (
      PARTITION BY tx.company_id, tx.representative_id
      ORDER BY tx.effective_date, tx.created_at, tx.id
    )::bigint AS transaction_order,
    reversed.transaction_type AS reversed_transaction_type
  FROM approved_transactions tx
  LEFT JOIN approved_transactions reversed
    ON reversed.id = tx.reversal_transaction_id
),
participants AS (
  SELECT DISTINCT
    tx.company_id,
    tx.representative_id,
    COALESCE(rep.display_name, rep.full_name, 'Temsilci') AS display_name,
    COALESCE(rep.person_id, tx.person_id) AS person_id,
    COALESCE(rep.organization_id, tx.organization_id) AS organization_id,
    COALESCE(rep.tenant_id, tx.tenant_id, company.tenant_id) AS tenant_id
  FROM approved_transactions tx
  LEFT JOIN public.company_representatives rep
    ON rep.id = tx.representative_id
  LEFT JOIN public.companies company
    ON company.id = tx.company_id
),
authority_state AS (
  SELECT
    participants.company_id,
    participants.representative_id,
    participants.person_id,
    participants.organization_id,
    participants.display_name,
    participants.tenant_id,
    0::bigint AS transaction_order,
    'draft'::text AS record_status,
    'Taslak'::text AS status,
    '[]'::jsonb AS authority_types,
    NULL::text AS signature_type,
    NULL::numeric AS transaction_limit,
    NULL::numeric AS payment_approval_limit,
    NULL::numeric AS purchase_approval_limit,
    NULL::numeric AS bank_transaction_limit,
    NULL::numeric AS contract_signature_limit,
    'TRY'::text AS currency,
    '{}'::jsonb AS limits,
    '{}'::jsonb AS scope,
    false AS requires_joint_signature,
    false AS can_approve_alone,
    NULL::date AS effective_date,
    NULL::date AS end_date,
    ARRAY[]::text[] AS warnings
  FROM participants

  UNION ALL

  SELECT
    state.company_id,
    state.representative_id,
    state.person_id,
    state.organization_id,
    state.display_name,
    state.tenant_id,
    tx.transaction_order,
    CASE
      WHEN tx.transaction_type = 'Askıya Alma' THEN 'suspended'
      WHEN tx.transaction_type = 'Sonlandırma' THEN 'terminated'
      WHEN tx.transaction_type = 'Ters Kayıt' AND tx.reversed_transaction_type IN ('Askıya Alma', 'Sonlandırma') THEN 'active'
      WHEN tx.transaction_type = 'Ters Kayıt' THEN 'terminated'
      ELSE 'active'
    END AS record_status,
    CASE
      WHEN tx.transaction_type = 'Askıya Alma' THEN 'Askıda'
      WHEN tx.transaction_type = 'Sonlandırma' THEN 'Sonlandırıldı'
      WHEN tx.transaction_type = 'Ters Kayıt' AND tx.reversed_transaction_type IN ('Askıya Alma', 'Sonlandırma') THEN 'Aktif'
      WHEN tx.transaction_type = 'Ters Kayıt' THEN 'Sonlandırıldı'
      ELSE 'Aktif'
    END AS status,
    CASE
      WHEN tx.transaction_type IN ('Temsilcilik Başlatma', 'Yetki Yenileme', 'Yetki Kapsamı Değişikliği', 'Düzeltme Kaydı')
        THEN COALESCE(NULLIF(tx.authority_types, '[]'::jsonb), state.authority_types)
      WHEN tx.transaction_type = 'Ters Kayıt' AND tx.reversed_transaction_type NOT IN ('Askıya Alma', 'Sonlandırma')
        THEN '[]'::jsonb
      ELSE state.authority_types
    END AS authority_types,
    CASE
      WHEN tx.transaction_type IN ('Temsilcilik Başlatma', 'Yetki Yenileme', 'Yetki Kapsamı Değişikliği', 'Düzeltme Kaydı')
        THEN COALESCE(tx.signature_type, state.signature_type)
      WHEN tx.transaction_type = 'Ters Kayıt' AND tx.reversed_transaction_type NOT IN ('Askıya Alma', 'Sonlandırma')
        THEN NULL::text
      ELSE state.signature_type
    END AS signature_type,
    CASE
      WHEN tx.transaction_type IN ('Temsilcilik Başlatma', 'Yetki Yenileme', 'Limit Değişikliği', 'Düzeltme Kaydı')
        THEN COALESCE(tx.transaction_limit, state.transaction_limit)
      WHEN tx.transaction_type = 'Ters Kayıt' AND tx.reversed_transaction_type NOT IN ('Askıya Alma', 'Sonlandırma')
        THEN NULL::numeric
      ELSE state.transaction_limit
    END AS transaction_limit,
    CASE
      WHEN tx.transaction_type IN ('Temsilcilik Başlatma', 'Yetki Yenileme', 'Limit Değişikliği', 'Düzeltme Kaydı')
        THEN COALESCE(tx.payment_approval_limit, public.try_jsonb_numeric(tx.limits, 'payment_approval_limit'), state.payment_approval_limit)
      ELSE state.payment_approval_limit
    END AS payment_approval_limit,
    CASE
      WHEN tx.transaction_type IN ('Temsilcilik Başlatma', 'Yetki Yenileme', 'Limit Değişikliği', 'Düzeltme Kaydı')
        THEN COALESCE(tx.purchase_approval_limit, public.try_jsonb_numeric(tx.limits, 'purchase_approval_limit'), state.purchase_approval_limit)
      ELSE state.purchase_approval_limit
    END AS purchase_approval_limit,
    CASE
      WHEN tx.transaction_type IN ('Temsilcilik Başlatma', 'Yetki Yenileme', 'Limit Değişikliği', 'Düzeltme Kaydı')
        THEN COALESCE(tx.bank_transaction_limit, public.try_jsonb_numeric(tx.limits, 'bank_transaction_limit'), state.bank_transaction_limit)
      ELSE state.bank_transaction_limit
    END AS bank_transaction_limit,
    CASE
      WHEN tx.transaction_type IN ('Temsilcilik Başlatma', 'Yetki Yenileme', 'Limit Değişikliği', 'Düzeltme Kaydı')
        THEN COALESCE(tx.contract_signature_limit, public.try_jsonb_numeric(tx.limits, 'contract_signature_limit'), state.contract_signature_limit)
      ELSE state.contract_signature_limit
    END AS contract_signature_limit,
    COALESCE(tx.currency, state.currency) AS currency,
    CASE
      WHEN tx.transaction_type IN ('Temsilcilik Başlatma', 'Yetki Yenileme', 'Limit Değişikliği', 'Düzeltme Kaydı')
        THEN COALESCE(NULLIF(tx.limits, '{}'::jsonb), state.limits)
      ELSE state.limits
    END AS limits,
    CASE
      WHEN tx.transaction_type IN ('Temsilcilik Başlatma', 'Yetki Yenileme', 'Yetki Kapsamı Değişikliği', 'Düzeltme Kaydı')
        THEN COALESCE(NULLIF(tx.scope, '{}'::jsonb), state.scope)
      ELSE state.scope
    END AS scope,
    CASE
      WHEN tx.transaction_type IN ('Temsilcilik Başlatma', 'Yetki Yenileme', 'Yetki Kapsamı Değişikliği', 'Düzeltme Kaydı')
        THEN COALESCE(tx.requires_joint_signature, state.requires_joint_signature)
      ELSE state.requires_joint_signature
    END AS requires_joint_signature,
    CASE
      WHEN tx.transaction_type IN ('Temsilcilik Başlatma', 'Yetki Yenileme', 'Yetki Kapsamı Değişikliği', 'Düzeltme Kaydı')
        THEN COALESCE(tx.can_approve_alone, state.can_approve_alone)
      ELSE state.can_approve_alone
    END AS can_approve_alone,
    COALESCE(tx.effective_date, state.effective_date) AS effective_date,
    CASE
      WHEN tx.transaction_type = 'Sonlandırma' THEN COALESCE(tx.end_date, tx.effective_date)
      WHEN tx.transaction_type = 'Yetki Yenileme' THEN tx.end_date
      ELSE COALESCE(tx.end_date, state.end_date)
    END AS end_date,
    array_remove(ARRAY[
      CASE WHEN tx.transaction_type IN ('Temsilcilik Başlatma', 'Yetki Yenileme') AND tx.authority_types = '[]'::jsonb THEN 'Yetki tipi tanımlı değil' END,
      CASE WHEN tx.end_date IS NOT NULL AND tx.end_date < tx.effective_date THEN 'Bitiş tarihi yürürlük tarihinden önce' END
    ]::text[], NULL) AS warnings
  FROM authority_state state
  JOIN ordered_transactions tx
    ON tx.company_id = state.company_id
   AND tx.representative_id = state.representative_id
   AND tx.transaction_order = state.transaction_order + 1
),
latest_state AS (
  SELECT DISTINCT ON (company_id, representative_id)
    *
  FROM authority_state
  ORDER BY company_id, representative_id, transaction_order DESC
)
SELECT
  company_id,
  representative_id,
  display_name,
  person_id,
  organization_id,
  record_status,
  status,
  authority_types,
  signature_type,
  transaction_limit,
  payment_approval_limit,
  purchase_approval_limit,
  bank_transaction_limit,
  contract_signature_limit,
  currency,
  limits,
  scope,
  requires_joint_signature,
  can_approve_alone,
  effective_date,
  end_date,
  warnings,
  tenant_id
FROM latest_state
WHERE transaction_order > 0;
