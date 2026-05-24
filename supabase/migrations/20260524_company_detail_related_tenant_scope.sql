ALTER TABLE public.company_opening_details
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.erp_instances(id);

ALTER TABLE public.company_liquidation_details
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.erp_instances(id);

ALTER TABLE public.company_deregistration_details
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.erp_instances(id);

UPDATE public.company_opening_details details
SET tenant_id = COALESCE(company.tenant_id, '00000000-0000-0000-0000-000000000000'::uuid)
FROM public.companies company
WHERE details.company_id = company.id
  AND details.tenant_id IS NULL;

UPDATE public.company_liquidation_details details
SET tenant_id = COALESCE(company.tenant_id, '00000000-0000-0000-0000-000000000000'::uuid)
FROM public.companies company
WHERE details.company_id = company.id
  AND details.tenant_id IS NULL;

UPDATE public.company_deregistration_details details
SET tenant_id = COALESCE(company.tenant_id, '00000000-0000-0000-0000-000000000000'::uuid)
FROM public.companies company
WHERE details.company_id = company.id
  AND details.tenant_id IS NULL;

CREATE OR REPLACE FUNCTION public.set_company_detail_tenant_id()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    SELECT COALESCE(company.tenant_id, '00000000-0000-0000-0000-000000000000'::uuid)
      INTO NEW.tenant_id
    FROM public.companies company
    WHERE company.id = NEW.company_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_company_opening_details_tenant_id ON public.company_opening_details;
CREATE TRIGGER trg_company_opening_details_tenant_id
  BEFORE INSERT OR UPDATE ON public.company_opening_details
  FOR EACH ROW EXECUTE FUNCTION public.set_company_detail_tenant_id();

DROP TRIGGER IF EXISTS trg_company_liquidation_details_tenant_id ON public.company_liquidation_details;
CREATE TRIGGER trg_company_liquidation_details_tenant_id
  BEFORE INSERT OR UPDATE ON public.company_liquidation_details
  FOR EACH ROW EXECUTE FUNCTION public.set_company_detail_tenant_id();

DROP TRIGGER IF EXISTS trg_company_deregistration_details_tenant_id ON public.company_deregistration_details;
CREATE TRIGGER trg_company_deregistration_details_tenant_id
  BEFORE INSERT OR UPDATE ON public.company_deregistration_details
  FOR EACH ROW EXECUTE FUNCTION public.set_company_detail_tenant_id();

CREATE INDEX IF NOT EXISTS idx_company_opening_details_tenant_company
  ON public.company_opening_details(tenant_id, company_id);

CREATE INDEX IF NOT EXISTS idx_company_liquidation_details_tenant_company
  ON public.company_liquidation_details(tenant_id, company_id);

CREATE INDEX IF NOT EXISTS idx_company_deregistration_details_tenant_company
  ON public.company_deregistration_details(tenant_id, company_id);

CREATE OR REPLACE VIEW public.v_current_ownership AS
SELECT
  tenant_id,
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
