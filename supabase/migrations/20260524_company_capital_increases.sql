ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS committed_capital_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_capital_amount numeric NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.companies.committed_capital_amount IS
  'Sirketin guncel taahhut edilen sermaye tutari. Odenen sermaye muhasebe hareketlerinden ayrica izlenir.';

COMMENT ON COLUMN public.companies.paid_capital_amount IS
  'Sirket ortaklari tarafindan odenen toplam sermaye tutari. Muhasebe hareketleri ile guncellenir.';

ALTER TABLE public.company_partners
  ADD COLUMN IF NOT EXISTS paid_capital_amount numeric NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.company_partners.capital_amount IS
  'Ortagin guncel taahhut edilen sermaye tutari.';

COMMENT ON COLUMN public.company_partners.paid_capital_amount IS
  'Ortagin odenen sermaye tutari. Muhasebe hareketleri ile guncellenir.';

UPDATE public.companies c
SET committed_capital_amount = GREATEST(
  COALESCE(c.committed_capital_amount, 0),
  COALESCE(
    CASE
      WHEN (opening.payload_json->>'foundation_capital_amount') ~ '^-?[0-9]+(\.[0-9]+)?$'
        THEN (opening.payload_json->>'foundation_capital_amount')::numeric
      ELSE NULL
    END,
    CASE
      WHEN (opening.payload_json->>'capital_amount') ~ '^-?[0-9]+(\.[0-9]+)?$'
        THEN (opening.payload_json->>'capital_amount')::numeric
      ELSE NULL
    END,
    0
  )
)
FROM public.company_opening_details opening
WHERE opening.company_id = c.id;

UPDATE public.company_partners partner
SET capital_amount = ROUND((company.committed_capital_amount * COALESCE(partner.share_ratio, 0)) / 100, 2)
FROM public.companies company
WHERE partner.company_id = company.id
  AND COALESCE(company.committed_capital_amount, 0) > 0
  AND COALESCE(partner.share_ratio, 0) > 0
  AND COALESCE(partner.capital_amount, 0) = 0
  AND partner.is_deleted = false;

CREATE TABLE IF NOT EXISTS public.company_capital_increase_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid,
  company_id uuid NOT NULL REFERENCES public.companies(id),
  transaction_no text NOT NULL,
  increase_type text NOT NULL,
  transaction_date date NOT NULL,
  current_capital_amount numeric NOT NULL DEFAULT 0,
  increase_amount numeric NOT NULL DEFAULT 0,
  new_capital_amount numeric NOT NULL DEFAULT 0,
  paid_capital_amount numeric NOT NULL DEFAULT 0,
  participants jsonb NOT NULL DEFAULT '[]'::jsonb,
  previous_ownership jsonb NOT NULL DEFAULT '[]'::jsonb,
  new_ownership jsonb NOT NULL DEFAULT '[]'::jsonb,
  new_partner_id uuid REFERENCES public.company_partners(id),
  document_files jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  notes text,
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  history jsonb NOT NULL DEFAULT '[]'::jsonb,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  deleted_by text,
  version integer NOT NULL DEFAULT 1,
  CONSTRAINT company_capital_increase_status_check CHECK (status IN ('draft', 'documents_waiting', 'completed', 'cancelled')),
  CONSTRAINT company_capital_increase_positive_check CHECK (increase_amount >= 0 AND new_capital_amount >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_company_capital_increases_transaction_no
  ON public.company_capital_increase_transactions(transaction_no);

CREATE INDEX IF NOT EXISTS idx_company_capital_increases_company_status
  ON public.company_capital_increase_transactions(company_id, status, is_deleted);

CREATE INDEX IF NOT EXISTS idx_company_capital_increases_tenant_company
  ON public.company_capital_increase_transactions(tenant_id, company_id);

CREATE OR REPLACE VIEW public.v_current_ownership AS
SELECT
  company_id,
  id AS partner_id,
  display_name,
  COALESCE(share_ratio, 0) AS current_share_ratio,
  COALESCE(voting_ratio, 0) AS current_voting_ratio,
  COALESCE(profit_ratio, 0) AS current_profit_ratio,
  COALESCE(capital_amount, 0) AS current_capital_amount,
  COALESCE(share_units, 0) AS current_share_units,
  COALESCE(has_control_right, false) AS has_control_right,
  control_type,
  COALESCE(has_veto_right, false) AS has_veto_right,
  COALESCE(has_board_nomination_right, false) AS has_board_nomination_right,
  COALESCE(has_privileged_share, false) AS has_privileged_share,
  COALESCE(is_beneficial_owner, false) AS is_beneficial_owner,
  COALESCE(beneficial_ratio, 0) AS beneficial_ratio,
  ARRAY[]::text[] AS warnings,
  COALESCE(capital_amount, 0) AS committed_capital_amount,
  COALESCE(paid_capital_amount, 0) AS paid_capital_amount
FROM public.company_partners
WHERE is_deleted = false;
