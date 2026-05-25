CREATE TABLE IF NOT EXISTS public.operation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.erp_instances(id),
  company_id uuid REFERENCES public.companies(id),
  module_key text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  operation_type text NOT NULL,
  operation_status text NOT NULL DEFAULT 'accepted'
    CHECK (operation_status IN ('accepted', 'processing', 'completed', 'failed', 'cancelled', 'requires_action')),
  client_request_id text NOT NULL,
  base_version integer,
  base_updated_at timestamptz,
  requested_by uuid,
  payload_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  result_json jsonb,
  error_json jsonb,
  warning_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS operation_requests_tenant_client_uidx
  ON public.operation_requests(COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), client_request_id);

CREATE INDEX IF NOT EXISTS operation_requests_tenant_status_idx
  ON public.operation_requests(tenant_id, operation_status, created_at DESC);

CREATE INDEX IF NOT EXISTS operation_requests_entity_idx
  ON public.operation_requests(entity_type, entity_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.outbox_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.erp_instances(id),
  company_id uuid REFERENCES public.companies(id),
  module_key text NOT NULL,
  event_type text NOT NULL,
  aggregate_type text NOT NULL,
  aggregate_id uuid NOT NULL,
  operation_id uuid REFERENCES public.operation_requests(id),
  payload_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'published', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  error_json jsonb
);

CREATE INDEX IF NOT EXISTS outbox_events_status_created_idx
  ON public.outbox_events(status, created_at);

CREATE INDEX IF NOT EXISTS outbox_events_aggregate_idx
  ON public.outbox_events(aggregate_type, aggregate_id, created_at DESC);

CREATE OR REPLACE VIEW public.v_company_list_projection AS
SELECT
  company.id,
  company.organization_id,
  company.short_name,
  company.trade_name,
  company.tax_number,
  company.tax_office,
  company.company_type,
  company.city,
  company.district,
  company.phone,
  company.email,
  company.logo_url,
  company.is_deleted,
  company.record_status,
  company.company_status,
  COALESCE(company.committed_capital_amount, 0) AS committed_capital_amount,
  COALESCE(company.paid_capital_amount, 0) AS paid_capital_amount,
  company.default_currency,
  company.tenant_id,
  company.updated_at,
  company.created_at
FROM public.companies company;

CREATE OR REPLACE VIEW public.v_company_partner_list_projection AS
SELECT
  partner.id,
  partner.company_id,
  COALESCE(company.short_name, company.trade_name) AS company_name,
  partner.person_id,
  partner.organization_id,
  partner.owner_kind,
  partner.partner_type,
  partner.display_name,
  partner.partner_name,
  partner.identity_number,
  partner.identity_tax_number,
  partner.share_ratio,
  partner.voting_ratio,
  partner.profit_ratio,
  ownership.current_share_ratio,
  ownership.current_voting_ratio,
  ownership.current_profit_ratio,
  ownership.current_capital_amount,
  ownership.current_share_units,
  (
    SELECT COUNT(*)
    FROM public.company_representatives representative
    WHERE representative.company_id = partner.company_id
      AND COALESCE(representative.is_deleted, false) = false
      AND (
        (partner.person_id IS NOT NULL AND representative.person_id = partner.person_id)
        OR (partner.organization_id IS NOT NULL AND representative.organization_id = partner.organization_id)
        OR (partner.source_id IS NOT NULL AND representative.source_id = partner.source_id)
        OR (
          COALESCE(partner.display_name, partner.partner_name) IS NOT NULL
          AND COALESCE(representative.display_name, representative.full_name) = COALESCE(partner.display_name, partner.partner_name)
        )
      )
  ) AS representative_authority_count,
  partner.start_date,
  partner.end_date,
  partner.status,
  partner.record_status,
  partner.is_deleted,
  partner.source_type,
  partner.source_id,
  partner.tenant_id,
  partner.created_at,
  partner.updated_at
FROM public.company_partners partner
LEFT JOIN public.companies company
  ON company.id = partner.company_id
LEFT JOIN public.v_current_ownership ownership
  ON ownership.company_id = partner.company_id
 AND ownership.partner_id = partner.id;
