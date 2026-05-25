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
DECLARE
  v_rep public.company_representatives%ROWTYPE;
  v_operation public.representative_operations%ROWTYPE;
  v_tx public.company_representative_authority_transactions%ROWTYPE;
  v_authority public.representative_authorities%ROWTYPE;
  v_effective_date date := COALESCE(NULLIF(p_payload->>'effective_date', '')::date, NULLIF(p_payload->>'start_date', '')::date, CURRENT_DATE);
  v_end_date date := NULLIF(p_payload->>'end_date', '')::date;
  v_authority_types jsonb := COALESCE(p_payload->'authority_types', '[]'::jsonb);
  v_limits jsonb := jsonb_build_object(
    'transaction_limit', NULLIF(p_payload->>'transaction_limit', '')::numeric,
    'payment_approval_limit', NULLIF(p_payload->>'payment_approval_limit', '')::numeric,
    'purchase_approval_limit', NULLIF(p_payload->>'purchase_approval_limit', '')::numeric,
    'bank_transaction_limit', NULLIF(p_payload->>'bank_transaction_limit', '')::numeric,
    'contract_signature_limit', NULLIF(p_payload->>'contract_signature_limit', '')::numeric
  );
  v_scope jsonb := jsonb_build_object(
    'bank_authority_level', NULLIF(p_payload->>'bank_authority_level', ''),
    'department_scope', NULLIF(p_payload->>'department_scope', ''),
    'gib_permissions', NULLIF(p_payload->>'gib_permissions', ''),
    'can_submit_declaration', COALESCE((p_payload->>'can_submit_declaration')::boolean, false),
    'can_process_e_invoice', COALESCE((p_payload->>'can_process_e_invoice')::boolean, false),
    'sgk_permissions', NULLIF(p_payload->>'sgk_permissions', ''),
    'can_submit_hiring_notice', COALESCE((p_payload->>'can_submit_hiring_notice')::boolean, false),
    'can_submit_termination_notice', COALESCE((p_payload->>'can_submit_termination_notice')::boolean, false),
    'official_correspondence_authority', COALESCE((p_payload->>'official_correspondence_authority')::boolean, false)
  );
  v_main_record_status text := CASE
    WHEN p_target_record_status = 'draft' THEN 'draft'
    WHEN p_target_record_status = 'passive' THEN 'passive'
    ELSE 'active'
  END;
  v_main_status text := CASE
    WHEN p_target_record_status = 'draft' THEN 'Taslak'
    WHEN p_target_record_status = 'passive' THEN 'Pasif'
    ELSE 'Aktif'
  END;
BEGIN
  SELECT *
    INTO v_rep
  FROM public.company_representatives
  WHERE id = p_representative_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Temsilci bulunamadı.' USING ERRCODE = 'P0002';
  END IF;

  IF p_client_request_id IS NOT NULL THEN
    SELECT *
      INTO v_operation
    FROM public.representative_operations
    WHERE tenant_id IS NOT DISTINCT FROM v_rep.tenant_id
      AND client_request_id = p_client_request_id
    LIMIT 1;

    IF FOUND AND v_operation.operation_status = 'completed' THEN
      RETURN COALESCE(v_operation.result_payload, '{}'::jsonb);
    ELSIF FOUND THEN
      UPDATE public.representative_operations
      SET
        operation_status = 'pending',
        operation_type = p_transaction_type,
        payload = p_payload,
        error_payload = '{}'::jsonb,
        updated_at = now()
      WHERE id = v_operation.id
      RETURNING * INTO v_operation;
    END IF;
  END IF;

  IF v_operation.id IS NULL THEN
    INSERT INTO public.representative_operations (
      tenant_id,
      company_id,
      representative_id,
      operation_type,
      operation_status,
      client_request_id,
      payload,
      requested_by
    ) VALUES (
      v_rep.tenant_id,
      v_rep.company_id,
      p_representative_id,
      p_transaction_type,
      'pending',
      p_client_request_id,
      p_payload,
      p_requested_by
    )
    RETURNING * INTO v_operation;
  END IF;

  INSERT INTO public.company_representative_authority_transactions (
    tenant_id,
    company_id,
    representative_id,
    person_id,
    organization_id,
    transaction_no,
    transaction_type,
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
    p_transaction_type,
    v_authority_types,
    NULLIF(p_payload->>'signature_type', ''),
    NULLIF(p_payload->>'transaction_limit', '')::numeric,
    NULLIF(p_payload->>'payment_approval_limit', '')::numeric,
    NULLIF(p_payload->>'purchase_approval_limit', '')::numeric,
    NULLIF(p_payload->>'bank_transaction_limit', '')::numeric,
    NULLIF(p_payload->>'contract_signature_limit', '')::numeric,
    COALESCE(NULLIF(p_payload->>'currency', ''), v_rep.currency, 'TRY'),
    v_limits,
    v_scope,
    COALESCE((p_payload->>'requires_joint_signature')::boolean, false),
    COALESCE((p_payload->>'can_approve_alone')::boolean, false),
    COALESCE(p_payload->'document_files', '[]'::jsonb),
    v_effective_date,
    v_end_date,
    'approved',
    'approved',
    CASE WHEN p_target_record_status IN ('active', 'suspended', 'terminated', 'expired') THEN 'active' ELSE 'draft' END,
    NULLIF(p_payload->>'notes', ''),
    '[]'::jsonb,
    p_payload,
    p_requested_by,
    now(),
    p_requested_by,
    p_requested_by
  )
  RETURNING * INTO v_tx;

  IF p_target_record_status IN ('active', 'suspended', 'terminated', 'expired') THEN
    INSERT INTO public.representative_authorities (
      tenant_id,
      company_id,
      representative_id,
      authority_transaction_id,
      authority_types,
      signature_type,
      limits,
      scope,
      status,
      effective_date,
      end_date,
      created_by
    ) VALUES (
      v_rep.tenant_id,
      v_rep.company_id,
      p_representative_id,
      v_tx.id,
      v_authority_types,
      NULLIF(p_payload->>'signature_type', ''),
      v_limits,
      v_scope,
      p_target_record_status,
      v_effective_date,
      CASE WHEN p_target_record_status = 'terminated' THEN COALESCE(v_end_date, v_effective_date) ELSE v_end_date END,
      p_requested_by
    )
    RETURNING * INTO v_authority;

    UPDATE public.representative_authorities
    SET status = 'expired'
    WHERE representative_id = p_representative_id
      AND id <> v_authority.id
      AND status IN ('draft', 'active', 'suspended')
      AND effective_date <= v_effective_date;
  END IF;

  INSERT INTO public.representative_documents (
    tenant_id,
    company_id,
    representative_id,
    authority_id,
    operation_id,
    document_payload,
    document_type,
    created_by
  )
  SELECT
    v_rep.tenant_id,
    v_rep.company_id,
    p_representative_id,
    v_authority.id,
    v_operation.id,
    document_item,
    COALESCE(document_item->>'document_type', document_item->>'slotId', 'authority_document'),
    p_requested_by
  FROM jsonb_array_elements(COALESCE(p_payload->'document_files', '[]'::jsonb)) AS document_item;

  INSERT INTO public.representative_history (
    tenant_id,
    company_id,
    representative_id,
    operation_id,
    event_type,
    old_status,
    new_status,
    payload,
    created_by
  ) VALUES (
    v_rep.tenant_id,
    v_rep.company_id,
    p_representative_id,
    v_operation.id,
    p_transaction_type,
    v_rep.record_status,
    v_main_record_status,
    jsonb_build_object(
      'authority_status', p_target_record_status,
      'transaction_id', v_tx.id,
      'authority_id', v_authority.id,
      'payload', p_payload
    ),
    p_requested_by
  );

  UPDATE public.company_representatives
  SET
    status = v_main_status,
    record_status = v_main_record_status,
    start_date = CASE WHEN v_main_record_status = 'active' AND start_date IS NULL THEN v_effective_date ELSE start_date END,
    updated_at = now(),
    version = COALESCE(version, 1) + 1
  WHERE id = p_representative_id;

  UPDATE public.representative_operations
  SET
    operation_status = 'completed',
    result_payload = jsonb_build_object(
      'representative_id', p_representative_id,
      'transaction_id', v_tx.id,
      'record_status', v_main_record_status,
      'authority_record_status', p_target_record_status
    ),
    completed_at = now()
  WHERE id = v_operation.id
  RETURNING * INTO v_operation;

  RETURN v_operation.result_payload;
END;
$$;
