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

ALTER TABLE public.operation_requests
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.erp_instances(id),
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id),
  ADD COLUMN IF NOT EXISTS module_key text NOT NULL DEFAULT 'sirket',
  ADD COLUMN IF NOT EXISTS entity_type text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS entity_id uuid,
  ADD COLUMN IF NOT EXISTS operation_type text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS operation_status text NOT NULL DEFAULT 'accepted',
  ADD COLUMN IF NOT EXISTS client_request_id text NOT NULL DEFAULT gen_random_uuid()::text,
  ADD COLUMN IF NOT EXISTS base_version integer,
  ADD COLUMN IF NOT EXISTS base_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS requested_by uuid,
  ADD COLUMN IF NOT EXISTS payload_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS result_json jsonb,
  ADD COLUMN IF NOT EXISTS error_json jsonb,
  ADD COLUMN IF NOT EXISTS warning_json jsonb,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS failed_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS operation_requests_tenant_client_request_id_uidx
  ON public.operation_requests(tenant_id, client_request_id);

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

ALTER TABLE public.outbox_events
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.erp_instances(id),
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id),
  ADD COLUMN IF NOT EXISTS module_key text NOT NULL DEFAULT 'sirket',
  ADD COLUMN IF NOT EXISTS event_type text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS aggregate_type text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS aggregate_id uuid,
  ADD COLUMN IF NOT EXISTS operation_id uuid REFERENCES public.operation_requests(id),
  ADD COLUMN IF NOT EXISTS payload_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS error_json jsonb;

CREATE INDEX IF NOT EXISTS outbox_events_status_created_idx
  ON public.outbox_events(status, created_at);

CREATE INDEX IF NOT EXISTS outbox_events_aggregate_idx
  ON public.outbox_events(aggregate_type, aggregate_id, created_at DESC);

CREATE INDEX IF NOT EXISTS outbox_events_status_tenant_aggregate_idx
  ON public.outbox_events(status, tenant_id, aggregate_type, aggregate_id, created_at DESC);

CREATE INDEX IF NOT EXISTS outbox_events_tenant_aggregate_idx
  ON public.outbox_events(tenant_id, aggregate_type, aggregate_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ownership_transactions_current_ownership_idx
  ON public.ownership_transactions(company_id, approval_status, is_deleted, effective_date, created_at);

CREATE INDEX IF NOT EXISTS ownership_transactions_partner_refs_idx
  ON public.ownership_transactions(company_id, from_partner_id, to_partner_id, affected_partner_id);

CREATE OR REPLACE FUNCTION public.try_jsonb_numeric(payload jsonb, key text)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN payload IS NOT NULL
      AND payload ? key
      AND (payload ->> key) ~ '^-?[0-9]+(\.[0-9]+)?$'
      THEN (payload ->> key)::numeric
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public.try_jsonb_boolean(payload jsonb, key text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN payload IS NOT NULL
      AND payload ? key
      AND lower(payload ->> key) IN ('true', 'false')
      THEN (payload ->> key)::boolean
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public.try_jsonb_uuid(payload jsonb, key text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN payload IS NOT NULL
      AND payload ? key
      AND (payload ->> key) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      THEN (payload ->> key)::uuid
    ELSE NULL
  END;
$$;

CREATE OR REPLACE VIEW public.v_current_ownership AS
WITH RECURSIVE approved_transactions AS (
  SELECT *
  FROM public.ownership_transactions
  WHERE approval_status = 'approved'
    AND COALESCE(is_deleted, false) = false
    AND COALESCE(effective_date, transaction_date, created_at::date) <= CURRENT_DATE
),
ordered_transactions AS (
  SELECT
    tx.*,
    row_number() OVER (
      PARTITION BY tx.company_id
      ORDER BY COALESCE(tx.effective_date, tx.transaction_date, tx.created_at::date), tx.created_at, tx.id
    )::bigint AS transaction_order,
    COALESCE(
      tx.affected_partner_id,
      public.try_jsonb_uuid(tx.new_values, 'partner_id'),
      public.try_jsonb_uuid(tx.new_values, 'partnerId'),
      tx.to_partner_id,
      tx.from_partner_id
    ) AS target_partner_id,
    COALESCE(public.try_jsonb_numeric(tx.new_values, 'current_share_ratio'), public.try_jsonb_numeric(tx.new_values, 'share_ratio')) AS json_share_ratio,
    COALESCE(public.try_jsonb_numeric(tx.new_values, 'current_voting_ratio'), public.try_jsonb_numeric(tx.new_values, 'voting_ratio'), public.try_jsonb_numeric(tx.new_values, 'new_voting_ratio')) AS json_voting_ratio,
    COALESCE(public.try_jsonb_numeric(tx.new_values, 'current_profit_ratio'), public.try_jsonb_numeric(tx.new_values, 'profit_ratio'), public.try_jsonb_numeric(tx.new_values, 'new_profit_ratio')) AS json_profit_ratio,
    COALESCE(public.try_jsonb_numeric(tx.new_values, 'current_capital_amount'), public.try_jsonb_numeric(tx.new_values, 'capital_amount'), public.try_jsonb_numeric(tx.new_values, 'committed_capital_amount')) AS json_capital_amount,
    COALESCE(public.try_jsonb_numeric(tx.new_values, 'current_share_units'), public.try_jsonb_numeric(tx.new_values, 'share_units')) AS json_share_units,
    public.try_jsonb_boolean(tx.new_values, 'has_control_right') AS json_has_control_right,
    COALESCE(tx.new_values ->> 'control_type', tx.new_values ->> 'controlType') AS json_control_type,
    public.try_jsonb_boolean(tx.new_values, 'has_veto_right') AS json_has_veto_right,
    public.try_jsonb_boolean(tx.new_values, 'has_board_nomination_right') AS json_has_board_nomination_right,
    public.try_jsonb_boolean(tx.new_values, 'has_privileged_share') AS json_has_privileged_share,
    public.try_jsonb_boolean(tx.new_values, 'is_beneficial_owner') AS json_is_beneficial_owner,
    public.try_jsonb_numeric(tx.new_values, 'beneficial_ratio') AS json_beneficial_ratio,
    reversed.transaction_type AS reversed_transaction_type,
    reversed.from_partner_id AS reversed_from_partner_id,
    reversed.to_partner_id AS reversed_to_partner_id,
    reversed.affected_partner_id AS reversed_affected_partner_id,
    reversed.share_ratio AS reversed_share_ratio,
    reversed.voting_ratio AS reversed_voting_ratio,
    reversed.profit_ratio AS reversed_profit_ratio,
    reversed.capital_amount AS reversed_capital_amount,
    reversed.committed_capital_amount AS reversed_committed_capital_amount,
    reversed.share_units AS reversed_share_units,
    reversed.old_voting_ratio AS reversed_old_voting_ratio,
    reversed.old_profit_ratio AS reversed_old_profit_ratio
  FROM approved_transactions tx
  LEFT JOIN approved_transactions reversed
    ON reversed.id = tx.reversal_transaction_id
),
participant_ids AS (
  SELECT company_id, tenant_id, from_partner_id AS partner_id
  FROM approved_transactions
  WHERE from_partner_id IS NOT NULL
  UNION
  SELECT company_id, tenant_id, to_partner_id AS partner_id
  FROM approved_transactions
  WHERE to_partner_id IS NOT NULL
  UNION
  SELECT company_id, tenant_id, affected_partner_id AS partner_id
  FROM approved_transactions
  WHERE affected_partner_id IS NOT NULL
  UNION
  SELECT company_id, tenant_id, COALESCE(public.try_jsonb_uuid(new_values, 'partner_id'), public.try_jsonb_uuid(new_values, 'partnerId')) AS partner_id
  FROM approved_transactions
  WHERE COALESCE(public.try_jsonb_uuid(new_values, 'partner_id'), public.try_jsonb_uuid(new_values, 'partnerId')) IS NOT NULL
),
participants AS (
  SELECT DISTINCT
    ids.company_id,
    ids.partner_id,
    COALESCE(partner.display_name, partner.partner_name, 'Ortak') AS display_name,
    COALESCE(partner.tenant_id, ids.tenant_id, company.tenant_id) AS tenant_id
  FROM participant_ids ids
  LEFT JOIN public.company_partners partner
    ON partner.id = ids.partner_id
  LEFT JOIN public.companies company
    ON company.id = ids.company_id
  WHERE ids.partner_id IS NOT NULL
    AND COALESCE(partner.is_deleted, false) = false
),
ownership_state AS (
  SELECT
    participants.company_id,
    participants.partner_id,
    0::bigint AS transaction_order,
    0::numeric AS current_share_ratio,
    0::numeric AS current_voting_ratio,
    0::numeric AS current_profit_ratio,
    0::numeric AS current_capital_amount,
    0::numeric AS current_share_units,
    false AS has_control_right,
    NULL::text AS control_type,
    false AS has_veto_right,
    false AS has_board_nomination_right,
    false AS has_privileged_share,
    false AS is_beneficial_owner,
    0::numeric AS beneficial_ratio
  FROM participants

  UNION ALL

  SELECT
    state.company_id,
    state.partner_id,
    tx.transaction_order,
    CASE
      WHEN tx.transaction_type = 'Ters Kayıt'
        AND tx.reversed_transaction_type IN ('initial_partnership_entry', 'Yeni Ortaklık Girişi')
        AND state.partner_id = COALESCE(tx.reversed_to_partner_id, tx.reversed_affected_partner_id)
        THEN state.current_share_ratio - COALESCE(tx.reversed_share_ratio, 0)
      WHEN tx.transaction_type = 'Ters Kayıt'
        AND tx.reversed_transaction_type IN ('Pay Devri', 'Kısmi Pay Devri')
        AND state.partner_id = tx.reversed_from_partner_id
        THEN state.current_share_ratio + COALESCE(tx.reversed_share_ratio, 0)
      WHEN tx.transaction_type = 'Ters Kayıt'
        AND tx.reversed_transaction_type IN ('Pay Devri', 'Kısmi Pay Devri')
        AND state.partner_id = tx.reversed_to_partner_id
        THEN state.current_share_ratio - COALESCE(tx.reversed_share_ratio, 0)
      WHEN tx.transaction_type IN ('initial_partnership_entry', 'Yeni Ortaklık Girişi')
        AND state.partner_id = COALESCE(tx.to_partner_id, tx.affected_partner_id)
        THEN state.current_share_ratio + COALESCE(tx.share_ratio, tx.json_share_ratio, 0)
      WHEN tx.transaction_type IN ('Pay Devri', 'Kısmi Pay Devri')
        AND state.partner_id = tx.from_partner_id
        THEN state.current_share_ratio - COALESCE(tx.share_ratio, 0)
      WHEN tx.transaction_type IN ('Pay Devri', 'Kısmi Pay Devri')
        AND state.partner_id = tx.to_partner_id
        THEN state.current_share_ratio + COALESCE(tx.share_ratio, 0)
      WHEN tx.transaction_type = 'Ortaklıktan Çıkış'
        AND state.partner_id = COALESCE(tx.from_partner_id, tx.affected_partner_id)
        THEN CASE WHEN COALESCE(tx.share_ratio, tx.json_share_ratio, 0) = 0 THEN 0 ELSE state.current_share_ratio - COALESCE(tx.share_ratio, tx.json_share_ratio, 0) END
      WHEN tx.transaction_type = 'Düzeltme Kaydı'
        AND state.partner_id = tx.target_partner_id
        THEN COALESCE(tx.json_share_ratio, tx.share_ratio, state.current_share_ratio)
      ELSE state.current_share_ratio
    END AS current_share_ratio,
    CASE
      WHEN tx.transaction_type = 'Ters Kayıt'
        AND tx.reversed_transaction_type IN ('initial_partnership_entry', 'Yeni Ortaklık Girişi')
        AND state.partner_id = COALESCE(tx.reversed_to_partner_id, tx.reversed_affected_partner_id)
        THEN state.current_voting_ratio - COALESCE(tx.reversed_voting_ratio, tx.reversed_share_ratio, 0)
      WHEN tx.transaction_type = 'Ters Kayıt'
        AND tx.reversed_transaction_type IN ('Pay Devri', 'Kısmi Pay Devri')
        AND state.partner_id = tx.reversed_from_partner_id
        THEN state.current_voting_ratio + COALESCE(tx.reversed_voting_ratio, tx.reversed_share_ratio, 0)
      WHEN tx.transaction_type = 'Ters Kayıt'
        AND tx.reversed_transaction_type IN ('Pay Devri', 'Kısmi Pay Devri')
        AND state.partner_id = tx.reversed_to_partner_id
        THEN state.current_voting_ratio - COALESCE(tx.reversed_voting_ratio, tx.reversed_share_ratio, 0)
      WHEN tx.transaction_type = 'Ters Kayıt'
        AND tx.reversed_transaction_type = 'Oy Hakkı Değişikliği'
        AND state.partner_id = COALESCE(tx.reversed_affected_partner_id, tx.reversed_to_partner_id)
        THEN COALESCE(tx.reversed_old_voting_ratio, state.current_voting_ratio)
      WHEN tx.transaction_type IN ('initial_partnership_entry', 'Yeni Ortaklık Girişi')
        AND state.partner_id = COALESCE(tx.to_partner_id, tx.affected_partner_id)
        THEN state.current_voting_ratio + COALESCE(tx.voting_ratio, tx.share_ratio, tx.json_voting_ratio, 0)
      WHEN tx.transaction_type IN ('Pay Devri', 'Kısmi Pay Devri')
        AND state.partner_id = tx.from_partner_id
        THEN state.current_voting_ratio - COALESCE(tx.voting_ratio, tx.share_ratio, 0)
      WHEN tx.transaction_type IN ('Pay Devri', 'Kısmi Pay Devri')
        AND state.partner_id = tx.to_partner_id
        THEN state.current_voting_ratio + COALESCE(tx.voting_ratio, tx.share_ratio, 0)
      WHEN tx.transaction_type = 'Ortaklıktan Çıkış'
        AND state.partner_id = COALESCE(tx.from_partner_id, tx.affected_partner_id)
        THEN CASE WHEN COALESCE(tx.voting_ratio, tx.share_ratio, tx.json_voting_ratio, 0) = 0 THEN 0 ELSE state.current_voting_ratio - COALESCE(tx.voting_ratio, tx.share_ratio, tx.json_voting_ratio, 0) END
      WHEN tx.transaction_type = 'Oy Hakkı Değişikliği'
        AND state.partner_id = tx.target_partner_id
        THEN COALESCE(tx.new_voting_ratio, tx.voting_ratio, tx.json_voting_ratio, state.current_voting_ratio)
      WHEN tx.transaction_type = 'Düzeltme Kaydı'
        AND state.partner_id = tx.target_partner_id
        THEN COALESCE(tx.json_voting_ratio, tx.new_voting_ratio, tx.voting_ratio, state.current_voting_ratio)
      ELSE state.current_voting_ratio
    END AS current_voting_ratio,
    CASE
      WHEN tx.transaction_type = 'Ters Kayıt'
        AND tx.reversed_transaction_type IN ('initial_partnership_entry', 'Yeni Ortaklık Girişi')
        AND state.partner_id = COALESCE(tx.reversed_to_partner_id, tx.reversed_affected_partner_id)
        THEN state.current_profit_ratio - COALESCE(tx.reversed_profit_ratio, tx.reversed_share_ratio, 0)
      WHEN tx.transaction_type = 'Ters Kayıt'
        AND tx.reversed_transaction_type IN ('Pay Devri', 'Kısmi Pay Devri')
        AND state.partner_id = tx.reversed_from_partner_id
        THEN state.current_profit_ratio + COALESCE(tx.reversed_profit_ratio, tx.reversed_share_ratio, 0)
      WHEN tx.transaction_type = 'Ters Kayıt'
        AND tx.reversed_transaction_type IN ('Pay Devri', 'Kısmi Pay Devri')
        AND state.partner_id = tx.reversed_to_partner_id
        THEN state.current_profit_ratio - COALESCE(tx.reversed_profit_ratio, tx.reversed_share_ratio, 0)
      WHEN tx.transaction_type = 'Ters Kayıt'
        AND tx.reversed_transaction_type = 'Kar Payı Oranı Değişikliği'
        AND state.partner_id = COALESCE(tx.reversed_affected_partner_id, tx.reversed_to_partner_id)
        THEN COALESCE(tx.reversed_old_profit_ratio, state.current_profit_ratio)
      WHEN tx.transaction_type IN ('initial_partnership_entry', 'Yeni Ortaklık Girişi')
        AND state.partner_id = COALESCE(tx.to_partner_id, tx.affected_partner_id)
        THEN state.current_profit_ratio + COALESCE(tx.profit_ratio, tx.share_ratio, tx.json_profit_ratio, 0)
      WHEN tx.transaction_type IN ('Pay Devri', 'Kısmi Pay Devri')
        AND state.partner_id = tx.from_partner_id
        THEN state.current_profit_ratio - COALESCE(tx.profit_ratio, tx.share_ratio, 0)
      WHEN tx.transaction_type IN ('Pay Devri', 'Kısmi Pay Devri')
        AND state.partner_id = tx.to_partner_id
        THEN state.current_profit_ratio + COALESCE(tx.profit_ratio, tx.share_ratio, 0)
      WHEN tx.transaction_type = 'Ortaklıktan Çıkış'
        AND state.partner_id = COALESCE(tx.from_partner_id, tx.affected_partner_id)
        THEN CASE WHEN COALESCE(tx.profit_ratio, tx.share_ratio, tx.json_profit_ratio, 0) = 0 THEN 0 ELSE state.current_profit_ratio - COALESCE(tx.profit_ratio, tx.share_ratio, tx.json_profit_ratio, 0) END
      WHEN tx.transaction_type = 'Kar Payı Oranı Değişikliği'
        AND state.partner_id = tx.target_partner_id
        THEN COALESCE(tx.new_profit_ratio, tx.profit_ratio, tx.json_profit_ratio, state.current_profit_ratio)
      WHEN tx.transaction_type = 'Düzeltme Kaydı'
        AND state.partner_id = tx.target_partner_id
        THEN COALESCE(tx.json_profit_ratio, tx.new_profit_ratio, tx.profit_ratio, state.current_profit_ratio)
      ELSE state.current_profit_ratio
    END AS current_profit_ratio,
    CASE
      WHEN tx.transaction_type = 'Ters Kayıt'
        AND tx.reversed_transaction_type IN ('initial_partnership_entry', 'Yeni Ortaklık Girişi')
        AND state.partner_id = COALESCE(tx.reversed_to_partner_id, tx.reversed_affected_partner_id)
        THEN state.current_capital_amount - COALESCE(tx.reversed_capital_amount, tx.reversed_committed_capital_amount, 0)
      WHEN tx.transaction_type = 'Ters Kayıt'
        AND tx.reversed_transaction_type IN ('Pay Devri', 'Kısmi Pay Devri')
        AND state.partner_id = tx.reversed_from_partner_id
        THEN state.current_capital_amount + COALESCE(tx.reversed_capital_amount, tx.reversed_committed_capital_amount, 0)
      WHEN tx.transaction_type = 'Ters Kayıt'
        AND tx.reversed_transaction_type IN ('Pay Devri', 'Kısmi Pay Devri')
        AND state.partner_id = tx.reversed_to_partner_id
        THEN state.current_capital_amount - COALESCE(tx.reversed_capital_amount, tx.reversed_committed_capital_amount, 0)
      WHEN tx.transaction_type IN ('initial_partnership_entry', 'Yeni Ortaklık Girişi')
        AND state.partner_id = COALESCE(tx.to_partner_id, tx.affected_partner_id)
        THEN state.current_capital_amount + COALESCE(tx.capital_amount, tx.committed_capital_amount, tx.json_capital_amount, 0)
      WHEN tx.transaction_type IN ('Pay Devri', 'Kısmi Pay Devri')
        AND state.partner_id = tx.from_partner_id
        THEN state.current_capital_amount - COALESCE(tx.capital_amount, tx.committed_capital_amount, 0)
      WHEN tx.transaction_type IN ('Pay Devri', 'Kısmi Pay Devri')
        AND state.partner_id = tx.to_partner_id
        THEN state.current_capital_amount + COALESCE(tx.capital_amount, tx.committed_capital_amount, 0)
      WHEN tx.transaction_type = 'Ortaklıktan Çıkış'
        AND state.partner_id = COALESCE(tx.from_partner_id, tx.affected_partner_id)
        THEN CASE WHEN COALESCE(tx.capital_amount, tx.committed_capital_amount, tx.json_capital_amount, 0) = 0 THEN 0 ELSE state.current_capital_amount - COALESCE(tx.capital_amount, tx.committed_capital_amount, tx.json_capital_amount, 0) END
      WHEN tx.transaction_type = 'Düzeltme Kaydı'
        AND state.partner_id = tx.target_partner_id
        THEN COALESCE(tx.json_capital_amount, tx.capital_amount, tx.committed_capital_amount, state.current_capital_amount)
      ELSE state.current_capital_amount
    END AS current_capital_amount,
    CASE
      WHEN tx.transaction_type = 'Ters Kayıt'
        AND tx.reversed_transaction_type IN ('initial_partnership_entry', 'Yeni Ortaklık Girişi')
        AND state.partner_id = COALESCE(tx.reversed_to_partner_id, tx.reversed_affected_partner_id)
        THEN state.current_share_units - COALESCE(tx.reversed_share_units, 0)
      WHEN tx.transaction_type = 'Ters Kayıt'
        AND tx.reversed_transaction_type IN ('Pay Devri', 'Kısmi Pay Devri')
        AND state.partner_id = tx.reversed_from_partner_id
        THEN state.current_share_units + COALESCE(tx.reversed_share_units, 0)
      WHEN tx.transaction_type = 'Ters Kayıt'
        AND tx.reversed_transaction_type IN ('Pay Devri', 'Kısmi Pay Devri')
        AND state.partner_id = tx.reversed_to_partner_id
        THEN state.current_share_units - COALESCE(tx.reversed_share_units, 0)
      WHEN tx.transaction_type IN ('initial_partnership_entry', 'Yeni Ortaklık Girişi')
        AND state.partner_id = COALESCE(tx.to_partner_id, tx.affected_partner_id)
        THEN state.current_share_units + COALESCE(tx.share_units, tx.json_share_units, 0)
      WHEN tx.transaction_type IN ('Pay Devri', 'Kısmi Pay Devri')
        AND state.partner_id = tx.from_partner_id
        THEN state.current_share_units - COALESCE(tx.share_units, 0)
      WHEN tx.transaction_type IN ('Pay Devri', 'Kısmi Pay Devri')
        AND state.partner_id = tx.to_partner_id
        THEN state.current_share_units + COALESCE(tx.share_units, 0)
      WHEN tx.transaction_type = 'Ortaklıktan Çıkış'
        AND state.partner_id = COALESCE(tx.from_partner_id, tx.affected_partner_id)
        THEN CASE WHEN COALESCE(tx.share_units, tx.json_share_units, 0) = 0 THEN 0 ELSE state.current_share_units - COALESCE(tx.share_units, tx.json_share_units, 0) END
      WHEN tx.transaction_type = 'Düzeltme Kaydı'
        AND state.partner_id = tx.target_partner_id
        THEN COALESCE(tx.json_share_units, tx.share_units, state.current_share_units)
      ELSE state.current_share_units
    END AS current_share_units,
    CASE
      WHEN tx.transaction_type IN ('İmtiyazlı Pay Kaldırma', 'Ortaklıktan Çıkış')
        AND state.partner_id = tx.target_partner_id
        THEN false
      WHEN tx.transaction_type = 'İmtiyazlı Pay Tanımı'
        AND state.partner_id = tx.target_partner_id
        THEN COALESCE(tx.has_control_right, state.has_control_right)
      WHEN tx.transaction_type = 'Düzeltme Kaydı'
        AND state.partner_id = tx.target_partner_id
        THEN COALESCE(tx.json_has_control_right, state.has_control_right)
      ELSE state.has_control_right
    END AS has_control_right,
    CASE
      WHEN tx.transaction_type IN ('İmtiyazlı Pay Kaldırma', 'Ortaklıktan Çıkış')
        AND state.partner_id = tx.target_partner_id
        THEN NULL::text
      WHEN tx.transaction_type = 'İmtiyazlı Pay Tanımı'
        AND state.partner_id = tx.target_partner_id
        THEN COALESCE(tx.control_type, state.control_type)
      WHEN tx.transaction_type = 'Düzeltme Kaydı'
        AND state.partner_id = tx.target_partner_id
        THEN COALESCE(tx.json_control_type, tx.control_type, state.control_type)
      ELSE state.control_type
    END AS control_type,
    CASE
      WHEN tx.transaction_type IN ('İmtiyazlı Pay Kaldırma', 'Ortaklıktan Çıkış')
        AND state.partner_id = tx.target_partner_id
        THEN false
      WHEN tx.transaction_type = 'İmtiyazlı Pay Tanımı'
        AND state.partner_id = tx.target_partner_id
        THEN COALESCE(tx.has_veto_right, state.has_veto_right)
      WHEN tx.transaction_type = 'Düzeltme Kaydı'
        AND state.partner_id = tx.target_partner_id
        THEN COALESCE(tx.json_has_veto_right, state.has_veto_right)
      ELSE state.has_veto_right
    END AS has_veto_right,
    CASE
      WHEN tx.transaction_type IN ('İmtiyazlı Pay Kaldırma', 'Ortaklıktan Çıkış')
        AND state.partner_id = tx.target_partner_id
        THEN false
      WHEN tx.transaction_type = 'İmtiyazlı Pay Tanımı'
        AND state.partner_id = tx.target_partner_id
        THEN COALESCE(tx.has_board_nomination_right, state.has_board_nomination_right)
      WHEN tx.transaction_type = 'Düzeltme Kaydı'
        AND state.partner_id = tx.target_partner_id
        THEN COALESCE(tx.json_has_board_nomination_right, state.has_board_nomination_right)
      ELSE state.has_board_nomination_right
    END AS has_board_nomination_right,
    CASE
      WHEN tx.transaction_type IN ('İmtiyazlı Pay Kaldırma', 'Ortaklıktan Çıkış')
        AND state.partner_id = tx.target_partner_id
        THEN false
      WHEN tx.transaction_type IN ('initial_partnership_entry', 'Yeni Ortaklık Girişi')
        AND state.partner_id = COALESCE(tx.to_partner_id, tx.affected_partner_id)
        THEN COALESCE(tx.has_privileged_share, state.has_privileged_share)
      WHEN tx.transaction_type = 'İmtiyazlı Pay Tanımı'
        AND state.partner_id = tx.target_partner_id
        THEN true
      WHEN tx.transaction_type = 'Düzeltme Kaydı'
        AND state.partner_id = tx.target_partner_id
        THEN COALESCE(tx.json_has_privileged_share, state.has_privileged_share)
      ELSE state.has_privileged_share
    END AS has_privileged_share,
    CASE
      WHEN tx.transaction_type = 'Düzeltme Kaydı'
        AND state.partner_id = tx.target_partner_id
        THEN COALESCE(tx.json_is_beneficial_owner, state.is_beneficial_owner)
      WHEN tx.transaction_type IN ('initial_partnership_entry', 'Yeni Ortaklık Girişi')
        AND state.partner_id = COALESCE(tx.to_partner_id, tx.affected_partner_id)
        THEN COALESCE(tx.is_beneficial_owner, state.is_beneficial_owner)
      ELSE state.is_beneficial_owner
    END AS is_beneficial_owner,
    CASE
      WHEN tx.transaction_type = 'Düzeltme Kaydı'
        AND state.partner_id = tx.target_partner_id
        THEN COALESCE(tx.json_beneficial_ratio, tx.beneficial_ratio, state.beneficial_ratio)
      WHEN tx.transaction_type IN ('initial_partnership_entry', 'Yeni Ortaklık Girişi')
        AND state.partner_id = COALESCE(tx.to_partner_id, tx.affected_partner_id)
        THEN COALESCE(tx.beneficial_ratio, state.beneficial_ratio)
      ELSE state.beneficial_ratio
    END AS beneficial_ratio
  FROM ownership_state state
  JOIN ordered_transactions tx
    ON tx.company_id = state.company_id
   AND tx.transaction_order = state.transaction_order + 1
),
latest_state AS (
  SELECT DISTINCT ON (state.company_id, state.partner_id)
    state.*
  FROM ownership_state state
  ORDER BY state.company_id, state.partner_id, state.transaction_order DESC
),
visible_ownership AS (
  SELECT
    latest_state.company_id,
    latest_state.partner_id,
    participants.display_name,
    latest_state.current_share_ratio,
    latest_state.current_voting_ratio,
    latest_state.current_profit_ratio,
    latest_state.current_capital_amount,
    latest_state.current_share_units,
    latest_state.has_control_right,
    latest_state.control_type,
    latest_state.has_veto_right,
    latest_state.has_board_nomination_right,
    latest_state.has_privileged_share,
    latest_state.is_beneficial_owner,
    latest_state.beneficial_ratio,
    participants.tenant_id
  FROM latest_state
  JOIN participants
    ON participants.company_id = latest_state.company_id
   AND participants.partner_id = latest_state.partner_id
  WHERE latest_state.current_share_ratio <> 0
     OR latest_state.current_voting_ratio <> 0
     OR latest_state.current_profit_ratio <> 0
     OR latest_state.current_capital_amount <> 0
     OR latest_state.current_share_units <> 0
     OR latest_state.has_control_right
     OR latest_state.has_veto_right
     OR latest_state.has_board_nomination_right
     OR latest_state.has_privileged_share
     OR latest_state.is_beneficial_owner
),
company_totals AS (
  SELECT
    company_id,
    SUM(current_share_ratio) AS total_share_ratio,
    SUM(current_voting_ratio) AS total_voting_ratio
  FROM visible_ownership
  GROUP BY company_id
)
SELECT
  ownership.company_id,
  ownership.partner_id,
  ownership.display_name,
  ownership.current_share_ratio,
  ownership.current_voting_ratio,
  ownership.current_profit_ratio,
  ownership.current_capital_amount,
  ownership.current_share_units,
  ownership.has_control_right,
  ownership.control_type,
  ownership.has_veto_right,
  ownership.has_board_nomination_right,
  ownership.has_privileged_share,
  ownership.is_beneficial_owner,
  ownership.beneficial_ratio,
  array_remove(ARRAY[
    CASE WHEN ABS(COALESCE(totals.total_share_ratio, 0) - 100) > 0.01 THEN 'Toplam hisse %100 değil' END,
    CASE WHEN ABS(COALESCE(totals.total_voting_ratio, 0) - 100) > 0.01 THEN 'Toplam oy hakkı %100 değil' END,
    CASE WHEN ownership.current_share_ratio < 0 THEN 'Hisse oranı negatif' END,
    CASE WHEN ownership.current_share_ratio > 100 THEN 'Hisse oranı %100 üzerinde' END,
    CASE WHEN ownership.current_voting_ratio < 0 THEN 'Oy hakkı oranı negatif' END,
    CASE WHEN ownership.current_voting_ratio > 100 THEN 'Oy hakkı oranı %100 üzerinde' END
  ]::text[], NULL) AS warnings,
  ownership.current_capital_amount AS committed_capital_amount,
  0::numeric AS paid_capital_amount,
  ownership.tenant_id
FROM visible_ownership ownership
LEFT JOIN company_totals totals
  ON totals.company_id = ownership.company_id;

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
  company.created_at,
  company.version
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
  partner.updated_at,
  partner.version
FROM public.company_partners partner
LEFT JOIN public.companies company
  ON company.id = partner.company_id
LEFT JOIN public.v_current_ownership ownership
  ON ownership.company_id = partner.company_id
 AND ownership.partner_id = partner.id;
