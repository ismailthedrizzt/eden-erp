ALTER TABLE public.company_capital_increase_transactions
  ADD COLUMN IF NOT EXISTS operation_id uuid REFERENCES public.operation_requests(id),
  ADD COLUMN IF NOT EXISTS effective_date date,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'TRY',
  ADD COLUMN IF NOT EXISTS increase_reason text,
  ADD COLUMN IF NOT EXISTS distribution_method text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS ownership_transaction_ids jsonb NOT NULL DEFAULT '[]'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'company_capital_increase_distribution_method_check'
  ) THEN
    ALTER TABLE public.company_capital_increase_transactions
      ADD CONSTRAINT company_capital_increase_distribution_method_check
      CHECK (distribution_method IN ('proportional', 'manual'));
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_company_capital_increases_operation
  ON public.company_capital_increase_transactions(operation_id);

CREATE INDEX IF NOT EXISTS idx_company_capital_increases_effective
  ON public.company_capital_increase_transactions(tenant_id, company_id, effective_date DESC);

CREATE INDEX IF NOT EXISTS idx_ownership_transactions_capital_effective
  ON public.ownership_transactions(tenant_id, company_id, effective_date, approval_status, workflow_status, transaction_reason);

COMMENT ON COLUMN public.company_capital_increase_transactions.operation_id IS
  'Sermaye artırımı operasyonunu izleyen operation_requests kaydı.';

COMMENT ON COLUMN public.company_capital_increase_transactions.ownership_transaction_ids IS
  'Sermaye artırımı sonucunda current ownership read modelini besleyen ownership transaction kayıtları.';
