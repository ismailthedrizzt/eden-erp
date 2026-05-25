UPDATE public.company_representatives
SET
  record_status = CASE WHEN COALESCE(is_deleted, false) THEN 'passive' ELSE 'active' END,
  status = CASE WHEN COALESCE(is_deleted, false) THEN 'Pasif' ELSE 'Aktif' END
WHERE record_status IN ('suspended', 'expired', 'terminated')
   OR lower(COALESCE(status, '')) IN ('askıda', 'askida', 'sonlandırıldı', 'sonlandirildi', 'sona erdi', 'süresi dolmuş', 'suresi dolmus');

ALTER TABLE public.company_representatives
  DROP CONSTRAINT IF EXISTS company_representatives_record_status_check;

ALTER TABLE public.company_representatives
  ADD CONSTRAINT company_representatives_record_status_check
  CHECK (record_status IN ('draft', 'active', 'passive'));

ALTER TABLE public.company_representative_authority_transactions
  ADD COLUMN IF NOT EXISTS transaction_status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS authority_effect_status text,
  ADD COLUMN IF NOT EXISTS authority_record_status text;

UPDATE public.company_representative_authority_transactions
SET
  transaction_status = CASE
    WHEN approval_status IN ('approved', 'rejected', 'failed', 'submitted', 'draft') THEN approval_status
    WHEN workflow_status IN ('approved', 'rejected', 'failed', 'submitted', 'draft') THEN workflow_status
    ELSE 'draft'
  END,
  authority_effect_status = COALESCE(authority_effect_status, authority_record_status, CASE
    WHEN transaction_type = 'Askıya Alma' THEN 'suspended'
    WHEN transaction_type = 'Sonlandırma' THEN 'terminated'
    WHEN transaction_type IN ('Temsilcilik Başlatma', 'Yetki Yenileme', 'Yetki Kapsamı Değişikliği', 'Limit Değişikliği', 'Düzeltme Kaydı') THEN 'active'
    WHEN transaction_type = 'Ters Kayıt' THEN 'terminated'
    ELSE 'draft'
  END),
  authority_record_status = COALESCE(authority_record_status, authority_effect_status, CASE
    WHEN transaction_type = 'Askıya Alma' THEN 'suspended'
    WHEN transaction_type = 'Sonlandırma' THEN 'terminated'
    WHEN transaction_type IN ('Temsilcilik Başlatma', 'Yetki Yenileme', 'Yetki Kapsamı Değişikliği', 'Limit Değişikliği', 'Düzeltme Kaydı') THEN 'active'
    WHEN transaction_type = 'Ters Kayıt' THEN 'terminated'
    ELSE 'draft'
  END);

ALTER TABLE public.company_representative_authority_transactions
  DROP CONSTRAINT IF EXISTS representative_authority_tx_transaction_status_check,
  DROP CONSTRAINT IF EXISTS representative_authority_tx_workflow_status_check,
  DROP CONSTRAINT IF EXISTS representative_authority_tx_approval_status_check,
  DROP CONSTRAINT IF EXISTS representative_authority_tx_authority_effect_status_check,
  DROP CONSTRAINT IF EXISTS representative_authority_tx_authority_record_status_check;

ALTER TABLE public.company_representative_authority_transactions
  ADD CONSTRAINT representative_authority_tx_transaction_status_check
    CHECK (transaction_status IN ('draft', 'submitted', 'approved', 'rejected', 'failed')),
  ADD CONSTRAINT representative_authority_tx_workflow_status_check
    CHECK (workflow_status IN ('draft', 'submitted', 'approved', 'rejected', 'failed')),
  ADD CONSTRAINT representative_authority_tx_approval_status_check
    CHECK (approval_status IN ('draft', 'submitted', 'approved', 'rejected', 'failed')),
  ADD CONSTRAINT representative_authority_tx_authority_effect_status_check
    CHECK (authority_effect_status IS NULL OR authority_effect_status IN ('draft', 'active', 'suspended', 'expired', 'terminated')),
  ADD CONSTRAINT representative_authority_tx_authority_record_status_check
    CHECK (authority_record_status IS NULL OR authority_record_status IN ('draft', 'active', 'suspended', 'expired', 'terminated'));

CREATE INDEX IF NOT EXISTS idx_rep_authority_tx_rep_effect
  ON public.company_representative_authority_transactions(representative_id, authority_record_status, effective_date DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rep_authority_tx_company_effect
  ON public.company_representative_authority_transactions(company_id, authority_record_status, effective_date DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rep_authority_tx_tenant_effect
  ON public.company_representative_authority_transactions(tenant_id, authority_record_status, workflow_status, approval_status, created_at DESC);

CREATE OR REPLACE FUNCTION public.representative_main_record_status(p_status text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN lower(COALESCE(p_status, '')) IN ('passive', 'pasif') THEN 'passive'
    WHEN lower(COALESCE(p_status, '')) IN ('active', 'aktif', 'suspended', 'askıda', 'askida', 'expired', 'terminated', 'sonlandırıldı', 'sonlandirildi', 'sona erdi') THEN 'active'
    ELSE 'draft'
  END;
$$;

CREATE OR REPLACE FUNCTION public.representative_authority_effect_status(p_transaction_type text, p_payload jsonb DEFAULT '{}'::jsonb)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN COALESCE(p_payload->>'authority_record_status', p_payload->>'authority_effect_status') IN ('draft', 'active', 'suspended', 'expired', 'terminated')
      THEN COALESCE(p_payload->>'authority_record_status', p_payload->>'authority_effect_status')
    WHEN lower(p_transaction_type) LIKE 'ask%' THEN 'suspended'
    WHEN lower(p_transaction_type) LIKE 'sonland%' THEN 'terminated'
    WHEN lower(p_transaction_type) LIKE 'ters%' THEN 'terminated'
    ELSE 'active'
  END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_representative_authority_approval_policy(p_tenant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_metadata jsonb := '{}'::jsonb;
  v_mode text;
  v_auto_text text;
  v_auto_approve boolean;
BEGIN
  SELECT COALESCE(metadata_json, '{}'::jsonb)
    INTO v_metadata
  FROM public.erp_instances
  WHERE id = p_tenant_id;

  v_mode := lower(COALESCE(
    v_metadata->>'representative_authority_workflow_mode',
    v_metadata->>'workflow_mode',
    'simple'
  ));
  v_auto_text := lower(COALESCE(v_metadata->>'representative_authority_auto_approve', ''));
  v_auto_approve := v_auto_text IN ('true', '1', 'yes', 'on');

  IF v_auto_approve OR v_mode IN ('simple', 'small_business', 'small-business', 'disabled', 'off', 'none') THEN
    RETURN jsonb_build_object('approval_status', 'approved', 'workflow_status', 'approved', 'auto_approved', true);
  END IF;

  RETURN jsonb_build_object('approval_status', 'submitted', 'workflow_status', 'submitted', 'auto_approved', false);
END;
$$;

DROP VIEW IF EXISTS public.v_current_representative_authorities;

CREATE OR REPLACE VIEW public.v_current_representative_authorities AS
WITH RECURSIVE approved_transactions AS (
  SELECT
    tx.*,
    COALESCE(tx.authority_record_status, tx.authority_effect_status, public.representative_authority_effect_status(tx.transaction_type, tx.new_values)) AS tx_authority_record_status
  FROM public.company_representative_authority_transactions tx
  WHERE tx.approval_status = 'approved'
    AND tx.workflow_status = 'approved'
    AND COALESCE(tx.is_deleted, false) = false
    AND tx.effective_date <= CURRENT_DATE
),
ordered_transactions AS (
  SELECT
    tx.*,
    row_number() OVER (
      PARTITION BY tx.company_id, tx.representative_id
      ORDER BY tx.effective_date, COALESCE(substring(tx.transaction_no from '([0-9]+)$')::integer, 0), tx.created_at, tx.id
    )::bigint AS transaction_order,
    reversed.tx_authority_record_status AS reversed_authority_record_status
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
    NULL::uuid AS last_transaction_id,
    NULL::text AS last_transaction_type,
    'draft'::text AS authority_record_status,
    'draft'::text AS authority_status,
    'Taslak'::text AS authority_status_label,
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
    tx.id AS last_transaction_id,
    tx.transaction_type AS last_transaction_type,
    CASE
      WHEN tx.transaction_type = 'Ters Kayıt' AND tx.reversed_authority_record_status IN ('suspended', 'terminated') THEN 'active'
      ELSE tx.tx_authority_record_status
    END AS authority_record_status,
    CASE
      WHEN tx.transaction_type = 'Ters Kayıt' AND tx.reversed_authority_record_status IN ('suspended', 'terminated') THEN 'active'
      ELSE tx.tx_authority_record_status
    END AS authority_status,
    CASE
      WHEN tx.transaction_type = 'Ters Kayıt' AND tx.reversed_authority_record_status IN ('suspended', 'terminated') THEN 'Aktif'
      WHEN tx.tx_authority_record_status = 'suspended' THEN 'Askıda'
      WHEN tx.tx_authority_record_status = 'terminated' THEN 'Sonlandırılmış'
      WHEN tx.tx_authority_record_status = 'expired' THEN 'Süresi Dolmuş'
      WHEN tx.tx_authority_record_status = 'active' THEN 'Yetkili'
      ELSE 'Taslak'
    END AS authority_status_label,
    CASE
      WHEN tx.transaction_type IN ('Temsilcilik Başlatma', 'Yetki Yenileme', 'Yetki Kapsamı Değişikliği', 'Düzeltme Kaydı')
        THEN COALESCE(NULLIF(tx.authority_types, '[]'::jsonb), state.authority_types)
      WHEN tx.transaction_type = 'Ters Kayıt' AND tx.reversed_authority_record_status NOT IN ('suspended', 'terminated')
        THEN '[]'::jsonb
      ELSE state.authority_types
    END AS authority_types,
    CASE
      WHEN tx.transaction_type IN ('Temsilcilik Başlatma', 'Yetki Yenileme', 'Yetki Kapsamı Değişikliği', 'Düzeltme Kaydı')
        THEN COALESCE(tx.signature_type, state.signature_type)
      WHEN tx.transaction_type = 'Ters Kayıt' AND tx.reversed_authority_record_status NOT IN ('suspended', 'terminated')
        THEN NULL::text
      ELSE state.signature_type
    END AS signature_type,
    CASE
      WHEN tx.transaction_type IN ('Temsilcilik Başlatma', 'Yetki Yenileme', 'Limit Değişikliği', 'Düzeltme Kaydı')
        THEN COALESCE(tx.transaction_limit, public.try_jsonb_numeric(tx.limits, 'transaction_limit'), state.transaction_limit)
      WHEN tx.transaction_type = 'Ters Kayıt' AND tx.reversed_authority_record_status NOT IN ('suspended', 'terminated')
        THEN NULL::numeric
      ELSE state.transaction_limit
    END AS transaction_limit,
    CASE WHEN tx.transaction_type IN ('Temsilcilik Başlatma', 'Yetki Yenileme', 'Limit Değişikliği', 'Düzeltme Kaydı')
      THEN COALESCE(tx.payment_approval_limit, public.try_jsonb_numeric(tx.limits, 'payment_approval_limit'), state.payment_approval_limit)
      ELSE state.payment_approval_limit END AS payment_approval_limit,
    CASE WHEN tx.transaction_type IN ('Temsilcilik Başlatma', 'Yetki Yenileme', 'Limit Değişikliği', 'Düzeltme Kaydı')
      THEN COALESCE(tx.purchase_approval_limit, public.try_jsonb_numeric(tx.limits, 'purchase_approval_limit'), state.purchase_approval_limit)
      ELSE state.purchase_approval_limit END AS purchase_approval_limit,
    CASE WHEN tx.transaction_type IN ('Temsilcilik Başlatma', 'Yetki Yenileme', 'Limit Değişikliği', 'Düzeltme Kaydı')
      THEN COALESCE(tx.bank_transaction_limit, public.try_jsonb_numeric(tx.limits, 'bank_transaction_limit'), state.bank_transaction_limit)
      ELSE state.bank_transaction_limit END AS bank_transaction_limit,
    CASE WHEN tx.transaction_type IN ('Temsilcilik Başlatma', 'Yetki Yenileme', 'Limit Değişikliği', 'Düzeltme Kaydı')
      THEN COALESCE(tx.contract_signature_limit, public.try_jsonb_numeric(tx.limits, 'contract_signature_limit'), state.contract_signature_limit)
      ELSE state.contract_signature_limit END AS contract_signature_limit,
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
      WHEN tx.tx_authority_record_status = 'terminated' THEN COALESCE(tx.end_date, tx.effective_date)
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
  representative_id,
  company_id,
  tenant_id,
  authority_status,
  authority_record_status,
  authority_status_label,
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
  last_transaction_id,
  last_transaction_type,
  display_name,
  person_id,
  organization_id
FROM latest_state
WHERE transaction_order > 0;

CREATE OR REPLACE FUNCTION public.perform_representative_authority_transaction(
  p_representative_id uuid,
  p_transaction_type text,
  p_payload jsonb DEFAULT '{}'::jsonb,
  p_client_request_id text DEFAULT gen_random_uuid()::text,
  p_requested_by uuid DEFAULT NULL,
  p_base_version integer DEFAULT NULL,
  p_base_updated_at timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_rep public.company_representatives%ROWTYPE;
  v_operation public.operation_requests%ROWTYPE;
  v_tx public.company_representative_authority_transactions%ROWTYPE;
  v_policy jsonb;
  v_approval_status text;
  v_workflow_status text;
  v_operation_status text;
  v_main_status text;
  v_current_authority_status text;
  v_authority_effect_status text;
  v_effective_date date;
  v_end_date date;
  v_authority_types jsonb;
  v_documents jsonb;
  v_limits jsonb;
  v_scope jsonb;
  v_result jsonb;
  v_transaction_key text;
  v_transaction_type text;
BEGIN
  SELECT *
    INTO v_rep
  FROM public.company_representatives
  WHERE id = p_representative_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'http_status', 404, 'code', 'REPRESENTATIVE_NOT_FOUND', 'error', 'Temsilci bulunamadı.');
  END IF;

  SELECT *
    INTO v_operation
  FROM public.operation_requests
  WHERE COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE(v_rep.tenant_id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND client_request_id = p_client_request_id
  LIMIT 1
  FOR UPDATE;

  IF FOUND AND v_operation.operation_status IN ('completed', 'requires_action') THEN
    RETURN COALESCE(v_operation.result_json, '{}'::jsonb)
      || jsonb_build_object('ok', true, 'operation_id', v_operation.id, 'operation_status', v_operation.operation_status);
  ELSIF FOUND THEN
    UPDATE public.operation_requests
    SET
      operation_status = 'processing',
      started_at = COALESCE(started_at, now()),
      payload_json = p_payload,
      error_json = NULL
    WHERE id = v_operation.id
    RETURNING * INTO v_operation;
  ELSE
    INSERT INTO public.operation_requests (
      tenant_id,
      company_id,
      module_key,
      entity_type,
      entity_id,
      operation_type,
      operation_status,
      client_request_id,
      base_version,
      base_updated_at,
      requested_by,
      payload_json,
      started_at
    ) VALUES (
      v_rep.tenant_id,
      v_rep.company_id,
      'sirket',
      'company_representative',
      p_representative_id,
      'representative.authority.transaction',
      'processing',
      p_client_request_id,
      p_base_version,
      p_base_updated_at,
      p_requested_by,
      p_payload,
      now()
    )
    RETURNING * INTO v_operation;
  END IF;

  v_transaction_key := lower(COALESCE(p_transaction_type, ''));
  v_transaction_type := CASE
    WHEN v_transaction_key LIKE 'temsilcilik%' THEN 'Temsilcilik Başlatma'
    WHEN v_transaction_key LIKE 'yetki yenileme%' THEN 'Yetki Yenileme'
    WHEN v_transaction_key LIKE 'yetki kapsam%' THEN 'Yetki Kapsamı Değişikliği'
    WHEN v_transaction_key LIKE 'limit%' THEN 'Limit Değişikliği'
    WHEN v_transaction_key LIKE 'ask%' THEN 'Askıya Alma'
    WHEN v_transaction_key LIKE 'sonland%' THEN 'Sonlandırma'
    WHEN v_transaction_key LIKE 'd%' THEN 'Düzeltme Kaydı'
    WHEN v_transaction_key LIKE 'ters%' THEN 'Ters Kayıt'
    ELSE p_transaction_type
  END;

  IF p_base_version IS NOT NULL AND COALESCE(v_rep.version, 0) <> p_base_version THEN
    UPDATE public.operation_requests
    SET operation_status = 'failed', error_json = jsonb_build_object('code', 'VERSION_CONFLICT'), failed_at = now()
    WHERE id = v_operation.id;
    RETURN jsonb_build_object('ok', false, 'http_status', 409, 'code', 'VERSION_CONFLICT', 'error', 'Kayıt başka bir işlem tarafından güncellendi.', 'operation_id', v_operation.id, 'operation_status', 'failed');
  END IF;

  IF p_base_updated_at IS NOT NULL AND v_rep.updated_at IS NOT NULL AND v_rep.updated_at <> p_base_updated_at THEN
    UPDATE public.operation_requests
    SET operation_status = 'failed', error_json = jsonb_build_object('code', 'VERSION_CONFLICT'), failed_at = now()
    WHERE id = v_operation.id;
    RETURN jsonb_build_object('ok', false, 'http_status', 409, 'code', 'VERSION_CONFLICT', 'error', 'Kayıt başka bir işlem tarafından güncellendi.', 'operation_id', v_operation.id, 'operation_status', 'failed');
  END IF;

  v_main_status := public.representative_main_record_status(COALESCE(v_rep.record_status, v_rep.status));

  SELECT authority_record_status
    INTO v_current_authority_status
  FROM public.v_current_representative_authorities
  WHERE representative_id = p_representative_id
  LIMIT 1;

  v_current_authority_status := COALESCE(v_current_authority_status, 'draft');

  IF v_transaction_type = 'Temsilcilik Başlatma' AND v_main_status <> 'draft' THEN
    UPDATE public.operation_requests SET operation_status = 'failed', error_json = jsonb_build_object('code', 'REPRESENTATIVE_ACTIVATION_REQUIRES_DRAFT'), failed_at = now() WHERE id = v_operation.id;
    RETURN jsonb_build_object('ok', false, 'http_status', 409, 'code', 'REPRESENTATIVE_ACTIVATION_REQUIRES_DRAFT', 'error', 'Temsilcilik Başlatma yalnızca Taslak temsilci kartları için çalışır.', 'operation_id', v_operation.id, 'operation_status', 'failed');
  END IF;

  IF v_transaction_type IN ('Yetki Yenileme', 'Yetki Kapsamı Değişikliği', 'Limit Değişikliği', 'Askıya Alma', 'Sonlandırma', 'Düzeltme Kaydı', 'Ters Kayıt') AND v_main_status <> 'active' THEN
    UPDATE public.operation_requests SET operation_status = 'failed', error_json = jsonb_build_object('code', 'REPRESENTATIVE_AUTHORITY_REQUIRES_ACTIVE'), failed_at = now() WHERE id = v_operation.id;
    RETURN jsonb_build_object('ok', false, 'http_status', 409, 'code', 'REPRESENTATIVE_AUTHORITY_REQUIRES_ACTIVE', 'error', 'Temsilcilik işlemleri yalnızca Aktif temsilci kartları için yapılabilir.', 'operation_id', v_operation.id, 'operation_status', 'failed');
  END IF;

  IF v_transaction_type IN ('Yetki Kapsamı Değişikliği', 'Limit Değişikliği', 'Askıya Alma', 'Düzeltme Kaydı', 'Ters Kayıt') AND v_current_authority_status <> 'active' THEN
    UPDATE public.operation_requests SET operation_status = 'failed', error_json = jsonb_build_object('code', 'REPRESENTATIVE_AUTHORITY_REQUIRES_ACTIVE_AUTHORITY'), failed_at = now() WHERE id = v_operation.id;
    RETURN jsonb_build_object('ok', false, 'http_status', 409, 'code', 'REPRESENTATIVE_AUTHORITY_REQUIRES_ACTIVE_AUTHORITY', 'error', 'Bu işlem için güncel temsil yetkisi Aktif olmalıdır.', 'operation_id', v_operation.id, 'operation_status', 'failed');
  END IF;

  IF v_transaction_type = 'Yetki Yenileme' AND v_current_authority_status NOT IN ('active', 'suspended') THEN
    UPDATE public.operation_requests SET operation_status = 'failed', error_json = jsonb_build_object('code', 'REPRESENTATIVE_RENEW_REQUIRES_CURRENT_AUTHORITY'), failed_at = now() WHERE id = v_operation.id;
    RETURN jsonb_build_object('ok', false, 'http_status', 409, 'code', 'REPRESENTATIVE_RENEW_REQUIRES_CURRENT_AUTHORITY', 'error', 'Yetki yenileme için güncel yetki Aktif veya Askıda olmalıdır.', 'operation_id', v_operation.id, 'operation_status', 'failed');
  END IF;

  IF v_transaction_type = 'Sonlandırma' AND v_current_authority_status NOT IN ('active', 'suspended') THEN
    UPDATE public.operation_requests SET operation_status = 'failed', error_json = jsonb_build_object('code', 'REPRESENTATIVE_TERMINATE_REQUIRES_CURRENT_AUTHORITY'), failed_at = now() WHERE id = v_operation.id;
    RETURN jsonb_build_object('ok', false, 'http_status', 409, 'code', 'REPRESENTATIVE_TERMINATE_REQUIRES_CURRENT_AUTHORITY', 'error', 'Sonlandırma yalnızca Aktif veya Askıda yetki için yapılabilir.', 'operation_id', v_operation.id, 'operation_status', 'failed');
  END IF;

  v_effective_date := COALESCE(NULLIF(p_payload->>'effective_date', '')::date, NULLIF(p_payload->>'start_date', '')::date, CURRENT_DATE);
  v_end_date := COALESCE(NULLIF(p_payload->>'end_date', '')::date, CASE WHEN v_transaction_type = 'Sonlandırma' THEN v_effective_date ELSE NULL END);
  v_authority_types := COALESCE(NULLIF(p_payload->'authority_types', 'null'::jsonb), '[]'::jsonb);
  v_documents := COALESCE(NULLIF(p_payload->'document_files', 'null'::jsonb), '[]'::jsonb);
  v_limits := COALESCE(NULLIF(p_payload->'limits', 'null'::jsonb), '{}'::jsonb);
  v_scope := COALESCE(NULLIF(p_payload->'scope', 'null'::jsonb), '{}'::jsonb);
  v_authority_effect_status := public.representative_authority_effect_status(v_transaction_type, p_payload);

  IF v_transaction_type <> 'Sonlandırma' AND COALESCE(jsonb_array_length(v_authority_types), 0) = 0 THEN
    UPDATE public.operation_requests SET operation_status = 'failed', error_json = jsonb_build_object('code', 'AUTHORITY_TYPE_REQUIRED'), failed_at = now() WHERE id = v_operation.id;
    RETURN jsonb_build_object('ok', false, 'http_status', 400, 'code', 'AUTHORITY_TYPE_REQUIRED', 'error', 'En az bir yetki tipi seçilmelidir.', 'operation_id', v_operation.id, 'operation_status', 'failed');
  END IF;

  IF v_transaction_type = 'Temsilcilik Başlatma' AND COALESCE(jsonb_array_length(v_documents), 0) = 0 THEN
    UPDATE public.operation_requests SET operation_status = 'failed', error_json = jsonb_build_object('code', 'AUTHORITY_DOCUMENT_REQUIRED'), failed_at = now() WHERE id = v_operation.id;
    RETURN jsonb_build_object('ok', false, 'http_status', 400, 'code', 'AUTHORITY_DOCUMENT_REQUIRED', 'error', 'Aktivasyon için en az bir yetki belgesi gereklidir.', 'operation_id', v_operation.id, 'operation_status', 'failed');
  END IF;

  IF v_transaction_type = 'Sonlandırma'
    AND COALESCE(NULLIF(p_payload->>'termination_reason', ''), NULLIF(p_payload->>'notes', '')) IS NULL
  THEN
    UPDATE public.operation_requests SET operation_status = 'failed', error_json = jsonb_build_object('code', 'TERMINATION_REASON_REQUIRED'), failed_at = now() WHERE id = v_operation.id;
    RETURN jsonb_build_object('ok', false, 'http_status', 400, 'code', 'TERMINATION_REASON_REQUIRED', 'error', 'Sonlandırma nedeni zorunludur.', 'operation_id', v_operation.id, 'operation_status', 'failed');
  END IF;

  v_policy := public.resolve_representative_authority_approval_policy(v_rep.tenant_id);
  v_approval_status := v_policy->>'approval_status';
  v_workflow_status := v_policy->>'workflow_status';
  v_operation_status := CASE WHEN v_approval_status = 'approved' AND v_workflow_status = 'approved' THEN 'completed' ELSE 'requires_action' END;

  INSERT INTO public.company_representative_authority_transactions (
    tenant_id,
    company_id,
    representative_id,
    person_id,
    organization_id,
    transaction_no,
    transaction_type,
    transaction_status,
    authority_effect_status,
    authority_record_status,
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
    document_files,
    effective_date,
    end_date,
    approval_status,
    workflow_status,
    status,
    notes,
    warnings,
    reversal_transaction_id,
    new_values,
    approved_by,
    approved_at,
    created_by,
    updated_by
  ) VALUES (
    v_rep.tenant_id,
    v_rep.company_id,
    p_representative_id,
    v_rep.person_id,
    v_rep.organization_id,
    'RT-' || EXTRACT(YEAR FROM now())::int || '-' || lpad(nextval('public.representative_operation_no_seq')::text, 5, '0'),
    v_transaction_type,
    v_approval_status,
    v_authority_effect_status,
    v_authority_effect_status,
    v_authority_types,
    NULLIF(p_payload->>'signature_type', ''),
    NULLIF(p_payload->>'transaction_limit', '')::numeric,
    NULLIF(p_payload->>'payment_approval_limit', '')::numeric,
    NULLIF(p_payload->>'purchase_approval_limit', '')::numeric,
    NULLIF(p_payload->>'bank_transaction_limit', '')::numeric,
    NULLIF(p_payload->>'contract_signature_limit', '')::numeric,
    COALESCE(NULLIF(p_payload->>'currency', ''), 'TRY'),
    v_limits,
    v_scope,
    COALESCE(NULLIF(p_payload->>'requires_joint_signature', '')::boolean, false),
    COALESCE(NULLIF(p_payload->>'can_approve_alone', '')::boolean, false),
    v_documents,
    v_effective_date,
    v_end_date,
    v_approval_status,
    v_workflow_status,
    v_approval_status,
    COALESCE(NULLIF(p_payload->>'notes', ''), NULLIF(p_payload->>'termination_reason', '')),
    '[]'::jsonb,
    NULLIF(p_payload->>'reversal_transaction_id', '')::uuid,
    p_payload,
    CASE WHEN v_approval_status = 'approved' THEN p_requested_by ELSE NULL END,
    CASE WHEN v_approval_status = 'approved' THEN now() ELSE NULL END,
    p_requested_by,
    p_requested_by
  )
  RETURNING * INTO v_tx;

  IF v_approval_status = 'approved' AND v_workflow_status = 'approved' THEN
    UPDATE public.company_representatives
    SET
      status = 'Aktif',
      record_status = 'active',
      updated_at = now(),
      version = COALESCE(version, 1) + 1
    WHERE id = p_representative_id;

    INSERT INTO public.representative_history (
      tenant_id,
      company_id,
      representative_id,
      event_type,
      old_status,
      new_status,
      payload,
      created_by
    ) VALUES (
      v_rep.tenant_id,
      v_rep.company_id,
      p_representative_id,
      v_transaction_type,
      v_current_authority_status,
      v_authority_effect_status,
      jsonb_build_object('transaction_id', v_tx.id, 'payload', p_payload),
      p_requested_by
    );
  END IF;

  INSERT INTO public.outbox_events (
    tenant_id,
    company_id,
    module_key,
    event_type,
    aggregate_type,
    aggregate_id,
    operation_id,
    payload_json
  ) VALUES (
    v_rep.tenant_id,
    v_rep.company_id,
    'sirket',
    'representative.authority.transaction.created',
    'company_representative',
    p_representative_id,
    v_operation.id,
    jsonb_build_object(
      'representative_id', p_representative_id,
      'transaction_id', v_tx.id,
      'transaction_type', v_transaction_type,
      'authority_record_status', v_authority_effect_status,
      'approval_status', v_approval_status,
      'workflow_status', v_workflow_status
    )
  );

  v_result := jsonb_build_object(
    'ok', true,
    'representative_id', p_representative_id,
    'transaction_id', v_tx.id,
    'record_status', CASE WHEN v_approval_status = 'approved' THEN 'active' ELSE v_main_status END,
    'authority_record_status', v_authority_effect_status,
    'approval_status', v_approval_status,
    'workflow_status', v_workflow_status,
    'operation_id', v_operation.id,
    'operation_status', v_operation_status
  );

  UPDATE public.operation_requests
  SET
    operation_status = v_operation_status,
    result_json = v_result,
    completed_at = CASE WHEN v_operation_status = 'completed' THEN now() ELSE completed_at END
  WHERE id = v_operation.id;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_representative_authority_command(
  p_representative_id uuid,
  p_transaction_type text,
  p_target_status text,
  p_target_record_status text,
  p_payload jsonb,
  p_client_request_id text DEFAULT gen_random_uuid()::text,
  p_requested_by uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN public.perform_representative_authority_transaction(
    p_representative_id,
    p_transaction_type,
    COALESCE(p_payload, '{}'::jsonb) || jsonb_build_object('authority_record_status', p_target_record_status),
    p_client_request_id,
    p_requested_by,
    NULL,
    NULL
  );
END;
$$;
