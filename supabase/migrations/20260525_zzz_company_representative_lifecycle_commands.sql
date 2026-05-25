ALTER TABLE public.company_representatives
  ADD COLUMN IF NOT EXISTS payment_approval_limit numeric,
  ADD COLUMN IF NOT EXISTS purchase_approval_limit numeric,
  ADD COLUMN IF NOT EXISTS bank_transaction_limit numeric,
  ADD COLUMN IF NOT EXISTS contract_signature_limit numeric,
  ADD COLUMN IF NOT EXISTS official_correspondence_authority boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'operation_requests_operation_status_check'
  ) THEN
    ALTER TABLE public.operation_requests
      DROP CONSTRAINT operation_requests_operation_status_check;
  END IF;

  ALTER TABLE public.operation_requests
    ADD CONSTRAINT operation_requests_operation_status_check
    CHECK (operation_status IN ('pending', 'accepted', 'processing', 'completed', 'failed', 'cancelled', 'requires_action'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END;
$$;

CREATE TABLE IF NOT EXISTS public.representative_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.erp_instances(id),
  company_id uuid REFERENCES public.companies(id),
  representative_id uuid REFERENCES public.company_representatives(id) ON DELETE CASCADE,
  operation_type text NOT NULL,
  operation_status text NOT NULL DEFAULT 'pending'
    CHECK (operation_status IN ('pending', 'completed', 'failed')),
  client_request_id text NOT NULL,
  request_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  result_payload jsonb,
  error_payload jsonb,
  requested_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  failed_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS representative_operations_tenant_client_uidx
  ON public.representative_operations(COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), client_request_id);

CREATE INDEX IF NOT EXISTS representative_operations_rep_idx
  ON public.representative_operations(representative_id, operation_status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.representative_authorities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.erp_instances(id),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  representative_id uuid NOT NULL REFERENCES public.company_representatives(id) ON DELETE CASCADE,
  authority_transaction_id uuid REFERENCES public.company_representative_authority_transactions(id) ON DELETE SET NULL,
  operation_id uuid REFERENCES public.representative_operations(id) ON DELETE SET NULL,
  authority_types jsonb NOT NULL DEFAULT '[]'::jsonb,
  signature_type text,
  transaction_limit numeric,
  payment_approval_limit numeric,
  purchase_approval_limit numeric,
  bank_transaction_limit numeric,
  contract_signature_limit numeric,
  currency text NOT NULL DEFAULT 'TRY',
  scope jsonb NOT NULL DEFAULT '{}'::jsonb,
  document_files jsonb NOT NULL DEFAULT '[]'::jsonb,
  effective_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE INDEX IF NOT EXISTS representative_authorities_current_idx
  ON public.representative_authorities(representative_id, status, effective_date DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS public.representative_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.erp_instances(id),
  company_id uuid REFERENCES public.companies(id),
  representative_id uuid NOT NULL REFERENCES public.company_representatives(id) ON DELETE CASCADE,
  authority_id uuid REFERENCES public.representative_authorities(id) ON DELETE SET NULL,
  operation_id uuid REFERENCES public.representative_operations(id) ON DELETE SET NULL,
  document_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  document_type text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE INDEX IF NOT EXISTS representative_documents_rep_idx
  ON public.representative_documents(representative_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.representative_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.erp_instances(id),
  company_id uuid REFERENCES public.companies(id),
  representative_id uuid NOT NULL REFERENCES public.company_representatives(id) ON DELETE CASCADE,
  operation_id uuid REFERENCES public.representative_operations(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  old_status text,
  new_status text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE INDEX IF NOT EXISTS representative_history_rep_idx
  ON public.representative_history(representative_id, created_at DESC);

CREATE SEQUENCE IF NOT EXISTS public.representative_operation_no_seq;

CREATE OR REPLACE FUNCTION public.representative_normalized_status(p_status text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN lower(COALESCE(p_status, '')) IN ('active', 'aktif') THEN 'active'
    WHEN lower(COALESCE(p_status, '')) IN ('suspended', 'askıda', 'askida') THEN 'suspended'
    WHEN lower(COALESCE(p_status, '')) IN ('terminated', 'sonlandırıldı', 'sonlandirildi', 'sona erdi') THEN 'terminated'
    WHEN lower(COALESCE(p_status, '')) IN ('expired', 'süresi dolmuş', 'suresi dolmus') THEN 'expired'
    WHEN lower(COALESCE(p_status, '')) IN ('passive', 'pasif') THEN 'passive'
    ELSE 'draft'
  END;
$$;

CREATE OR REPLACE FUNCTION public.representative_has_blocking_links(p_representative_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_representative_authority_transactions tx
    WHERE tx.representative_id = p_representative_id
      AND COALESCE(tx.is_deleted, false) = false
  )
  OR EXISTS (
    SELECT 1 FROM public.representative_authorities authority
    WHERE authority.representative_id = p_representative_id
  )
  OR EXISTS (
    SELECT 1 FROM public.representative_documents document
    WHERE document.representative_id = p_representative_id
  )
  OR EXISTS (
    SELECT 1 FROM public.representative_history history
    WHERE history.representative_id = p_representative_id
  )
  OR EXISTS (
    SELECT 1 FROM public.representative_operations operation
    WHERE operation.representative_id = p_representative_id
      AND operation.operation_status = 'completed'
      AND operation.operation_type <> 'delete_draft_representative'
  );
$$;

CREATE OR REPLACE FUNCTION public.prevent_company_representative_illegal_hard_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_status text;
BEGIN
  v_status := public.representative_normalized_status(COALESCE(OLD.record_status, OLD.status));
  IF v_status <> 'draft'
    OR public.representative_has_blocking_links(OLD.id)
    OR COALESCE(jsonb_array_length(COALESCE(OLD.authority_documents, '[]'::jsonb)), 0) > 0
  THEN
    RAISE EXCEPTION 'Only draft representatives without lifecycle history or linked objects can be hard deleted.'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_company_representatives_prevent_illegal_hard_delete ON public.company_representatives;
CREATE TRIGGER trg_company_representatives_prevent_illegal_hard_delete
  BEFORE DELETE ON public.company_representatives
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_company_representative_illegal_hard_delete();

CREATE OR REPLACE FUNCTION public.representative_open_operation(
  p_representative_id uuid,
  p_operation_type text,
  p_payload jsonb,
  p_client_request_id text,
  p_requested_by uuid DEFAULT NULL
)
RETURNS public.representative_operations
LANGUAGE plpgsql
AS $$
DECLARE
  v_rep public.company_representatives%ROWTYPE;
  v_operation public.representative_operations%ROWTYPE;
BEGIN
  SELECT * INTO v_rep
  FROM public.company_representatives
  WHERE id = p_representative_id;

  SELECT * INTO v_operation
  FROM public.representative_operations
  WHERE COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE(v_rep.tenant_id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND client_request_id = p_client_request_id
  LIMIT 1;

  IF FOUND THEN
    RETURN v_operation;
  END IF;

  INSERT INTO public.representative_operations (
    tenant_id,
    company_id,
    representative_id,
    operation_type,
    operation_status,
    client_request_id,
    request_payload,
    requested_by
  )
  VALUES (
    v_rep.tenant_id,
    v_rep.company_id,
    p_representative_id,
    p_operation_type,
    'pending',
    p_client_request_id,
    COALESCE(p_payload, '{}'::jsonb),
    p_requested_by
  )
  RETURNING * INTO v_operation;

  RETURN v_operation;
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
DECLARE
  v_rep public.company_representatives%ROWTYPE;
  v_operation public.representative_operations%ROWTYPE;
  v_tx public.company_representative_authority_transactions%ROWTYPE;
  v_authority_id uuid;
  v_authority_types jsonb;
  v_documents jsonb;
  v_effective_date date;
  v_end_date date;
BEGIN
  SELECT * INTO v_rep
  FROM public.company_representatives
  WHERE id = p_representative_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Representative not found.' USING ERRCODE = 'P0001';
  END IF;

  v_operation := public.representative_open_operation(
    p_representative_id,
    CASE
      WHEN p_transaction_type = 'Temsilcilik Başlatma' THEN 'activate_representative'
      WHEN p_transaction_type = 'Askıya Alma' THEN 'suspend_representative'
      WHEN p_transaction_type = 'Sonlandırma' THEN 'terminate_representative'
      ELSE 'change_representative_authority'
    END,
    p_payload,
    p_client_request_id,
    p_requested_by
  );

  IF v_operation.operation_status = 'completed' THEN
    RETURN v_operation.result_payload;
  END IF;

  v_authority_types := COALESCE(NULLIF(p_payload->'authority_types', 'null'::jsonb), v_rep.authority_types, '[]'::jsonb);
  v_documents := COALESCE(NULLIF(p_payload->'document_files', 'null'::jsonb), v_rep.authority_documents, '[]'::jsonb);
  v_effective_date := COALESCE(NULLIF(p_payload->>'effective_date', '')::date, NULLIF(p_payload->>'start_date', '')::date, CURRENT_DATE);
  v_end_date := COALESCE(NULLIF(p_payload->>'end_date', '')::date, CASE WHEN p_transaction_type = 'Sonlandırma' THEN v_effective_date ELSE NULL END);

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
    new_values,
    approved_by,
    approved_at,
    created_by,
    updated_by
  )
  VALUES (
    v_rep.tenant_id,
    v_rep.company_id,
    p_representative_id,
    v_rep.person_id,
    v_rep.organization_id,
    'RT-' || EXTRACT(YEAR FROM now())::int || '-' || lpad(nextval('public.representative_operation_no_seq')::text, 5, '0'),
    p_transaction_type,
    v_authority_types,
    COALESCE(NULLIF(p_payload->>'signature_type', ''), v_rep.signature_type),
    COALESCE(NULLIF(p_payload->>'transaction_limit', '')::numeric, v_rep.transaction_limit),
    COALESCE(NULLIF(p_payload->>'payment_approval_limit', '')::numeric, v_rep.payment_approval_limit),
    COALESCE(NULLIF(p_payload->>'purchase_approval_limit', '')::numeric, v_rep.purchase_approval_limit),
    COALESCE(NULLIF(p_payload->>'bank_transaction_limit', '')::numeric, v_rep.bank_transaction_limit),
    COALESCE(NULLIF(p_payload->>'contract_signature_limit', '')::numeric, v_rep.contract_signature_limit),
    COALESCE(NULLIF(p_payload->>'currency', ''), v_rep.currency, 'TRY'),
    COALESCE(p_payload->'limits', '{}'::jsonb),
    COALESCE(p_payload->'scope', '{}'::jsonb),
    COALESCE(NULLIF(p_payload->>'requires_joint_signature', '')::boolean, v_rep.requires_joint_signature, false),
    COALESCE(NULLIF(p_payload->>'can_approve_alone', '')::boolean, v_rep.can_approve_alone, false),
    v_documents,
    v_effective_date,
    v_end_date,
    'approved',
    'approved',
    'active',
    p_payload->>'notes',
    p_payload,
    p_requested_by,
    now(),
    p_requested_by,
    p_requested_by
  )
  RETURNING * INTO v_tx;

  INSERT INTO public.representative_authorities (
    tenant_id,
    company_id,
    representative_id,
    authority_transaction_id,
    operation_id,
    authority_types,
    signature_type,
    transaction_limit,
    payment_approval_limit,
    purchase_approval_limit,
    bank_transaction_limit,
    contract_signature_limit,
    currency,
    scope,
    document_files,
    effective_date,
    end_date,
    status,
    created_by
  )
  VALUES (
    v_rep.tenant_id,
    v_rep.company_id,
    p_representative_id,
    v_tx.id,
    v_operation.id,
    v_tx.authority_types,
    v_tx.signature_type,
    v_tx.transaction_limit,
    v_tx.payment_approval_limit,
    v_tx.purchase_approval_limit,
    v_tx.bank_transaction_limit,
    v_tx.contract_signature_limit,
    v_tx.currency,
    v_tx.scope,
    v_documents,
    v_effective_date,
    v_end_date,
    p_target_record_status,
    p_requested_by
  )
  RETURNING id INTO v_authority_id;

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
    v_authority_id,
    v_operation.id,
    document_item,
    COALESCE(document_item->>'slotId', document_item->>'documentType', document_item->>'name'),
    p_requested_by
  FROM jsonb_array_elements(v_documents) AS document_item;

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
  )
  VALUES (
    v_rep.tenant_id,
    v_rep.company_id,
    p_representative_id,
    v_operation.id,
    p_transaction_type,
    v_rep.record_status,
    p_target_record_status,
    p_payload,
    p_requested_by
  );

  UPDATE public.company_representatives
  SET
    status = p_target_status,
    record_status = p_target_record_status,
    start_date = CASE WHEN p_target_record_status = 'active' THEN v_effective_date ELSE start_date END,
    end_date = CASE WHEN p_target_record_status = 'terminated' THEN COALESCE(v_end_date, v_effective_date) ELSE v_end_date END,
    updated_at = now(),
    version = COALESCE(version, 1) + 1
  WHERE id = p_representative_id;

  UPDATE public.representative_operations
  SET
    operation_status = 'completed',
    result_payload = jsonb_build_object('representative_id', p_representative_id, 'transaction_id', v_tx.id, 'record_status', p_target_record_status),
    completed_at = now()
  WHERE id = v_operation.id
  RETURNING * INTO v_operation;

  RETURN v_operation.result_payload;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_draft_representative(
  p_payload jsonb,
  p_client_request_id text DEFAULT gen_random_uuid()::text,
  p_requested_by uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_representative public.company_representatives%ROWTYPE;
  v_operation public.representative_operations%ROWTYPE;
BEGIN
  INSERT INTO public.company_representatives (
    tenant_id,
    company_id,
    person_id,
    organization_id,
    person_kind,
    source_type,
    source_id,
    display_name,
    full_name,
    authority_type,
    authority_types,
    job_title,
    status,
    record_status,
    start_date,
    end_date,
    signature_type,
    transaction_limit,
    payment_approval_limit,
    purchase_approval_limit,
    bank_transaction_limit,
    contract_signature_limit,
    currency,
    requires_joint_signature,
    can_approve_alone,
    authority_documents,
    representative_profile,
    notes,
    is_deleted
  )
  VALUES (
    NULLIF(p_payload->>'tenant_id', '')::uuid,
    (p_payload->>'company_id')::uuid,
    NULLIF(p_payload->>'person_id', '')::uuid,
    NULLIF(p_payload->>'organization_id', '')::uuid,
    COALESCE(NULLIF(p_payload->>'person_or_entity_type', ''), NULLIF(p_payload->>'person_kind', ''), 'person'),
    COALESCE(NULLIF(p_payload->>'source_type', ''), 'new'),
    NULLIF(p_payload->>'source_id', '')::uuid,
    COALESCE(NULLIF(p_payload->>'display_name', ''), NULLIF(p_payload->>'full_name', ''), 'Temsilci'),
    COALESCE(NULLIF(p_payload->>'full_name', ''), NULLIF(p_payload->>'display_name', ''), 'Temsilci'),
    COALESCE(NULLIF(p_payload->>'authority_type', ''), NULLIF(p_payload->>'primary_authority_type', ''), 'other'),
    COALESCE(NULLIF(p_payload->'authority_types', 'null'::jsonb), '[]'::jsonb),
    NULLIF(p_payload->>'job_title', ''),
    'Taslak',
    'draft',
    NULLIF(p_payload->>'start_date', '')::date,
    NULLIF(p_payload->>'end_date', '')::date,
    NULLIF(p_payload->>'signature_type', ''),
    NULLIF(p_payload->>'transaction_limit', '')::numeric,
    NULLIF(p_payload->>'payment_approval_limit', '')::numeric,
    NULLIF(p_payload->>'purchase_approval_limit', '')::numeric,
    NULLIF(p_payload->>'bank_transaction_limit', '')::numeric,
    NULLIF(p_payload->>'contract_signature_limit', '')::numeric,
    COALESCE(NULLIF(p_payload->>'currency', ''), 'TRY'),
    COALESCE(NULLIF(p_payload->>'requires_joint_signature', '')::boolean, false),
    COALESCE(NULLIF(p_payload->>'can_approve_alone', '')::boolean, false),
    COALESCE(NULLIF(p_payload->'authority_documents', 'null'::jsonb), '[]'::jsonb),
    p_payload,
    p_payload->>'notes',
    false
  )
  RETURNING * INTO v_representative;

  INSERT INTO public.representative_operations (
    tenant_id,
    company_id,
    representative_id,
    operation_type,
    operation_status,
    client_request_id,
    request_payload,
    result_payload,
    requested_by,
    completed_at
  )
  VALUES (
    v_representative.tenant_id,
    v_representative.company_id,
    v_representative.id,
    'create_draft_representative',
    'completed',
    p_client_request_id,
    p_payload,
    jsonb_build_object('representative_id', v_representative.id, 'record_status', 'draft'),
    p_requested_by,
    now()
  )
  RETURNING * INTO v_operation;

  RETURN v_operation.result_payload;
END;
$$;

CREATE OR REPLACE FUNCTION public.activate_representative(
  p_representative_id uuid,
  p_payload jsonb DEFAULT '{}'::jsonb,
  p_client_request_id text DEFAULT gen_random_uuid()::text,
  p_requested_by uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_status text;
BEGIN
  SELECT public.representative_normalized_status(COALESCE(record_status, status))
  INTO v_status
  FROM public.company_representatives
  WHERE id = p_representative_id;

  IF v_status <> 'draft' THEN
    RAISE EXCEPTION 'Activation requires a draft representative.' USING ERRCODE = 'P0001';
  END IF;

  IF COALESCE(jsonb_array_length(COALESCE(p_payload->'document_files', '[]'::jsonb)), 0) = 0 THEN
    RAISE EXCEPTION 'Activation requires at least one authority document.' USING ERRCODE = 'P0001';
  END IF;

  RETURN public.apply_representative_authority_command(
    p_representative_id,
    'Temsilcilik Başlatma',
    'Aktif',
    'active',
    p_payload,
    p_client_request_id,
    p_requested_by
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.change_representative_authority(
  p_representative_id uuid,
  p_payload jsonb DEFAULT '{}'::jsonb,
  p_client_request_id text DEFAULT gen_random_uuid()::text,
  p_requested_by uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_status text;
BEGIN
  SELECT public.representative_normalized_status(COALESCE(record_status, status))
  INTO v_status
  FROM public.company_representatives
  WHERE id = p_representative_id;

  IF v_status <> 'active' THEN
    RAISE EXCEPTION 'Authority changes require an active representative.' USING ERRCODE = 'P0001';
  END IF;

  RETURN public.apply_representative_authority_command(
    p_representative_id,
    COALESCE(NULLIF(p_payload->>'transaction_type', ''), 'Yetki Kapsamı Değişikliği'),
    'Aktif',
    'active',
    p_payload,
    p_client_request_id,
    p_requested_by
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.suspend_representative(
  p_representative_id uuid,
  p_payload jsonb DEFAULT '{}'::jsonb,
  p_client_request_id text DEFAULT gen_random_uuid()::text,
  p_requested_by uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_status text;
BEGIN
  SELECT public.representative_normalized_status(COALESCE(record_status, status))
  INTO v_status
  FROM public.company_representatives
  WHERE id = p_representative_id;

  IF v_status <> 'active' THEN
    RAISE EXCEPTION 'Suspend requires an active representative.' USING ERRCODE = 'P0001';
  END IF;

  RETURN public.apply_representative_authority_command(
    p_representative_id,
    'Askıya Alma',
    'Askıda',
    'suspended',
    p_payload,
    p_client_request_id,
    p_requested_by
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.terminate_representative(
  p_representative_id uuid,
  p_payload jsonb DEFAULT '{}'::jsonb,
  p_client_request_id text DEFAULT gen_random_uuid()::text,
  p_requested_by uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_status text;
BEGIN
  SELECT public.representative_normalized_status(COALESCE(record_status, status))
  INTO v_status
  FROM public.company_representatives
  WHERE id = p_representative_id;

  IF v_status NOT IN ('active', 'suspended') THEN
    RAISE EXCEPTION 'Termination requires an active or suspended representative.' USING ERRCODE = 'P0001';
  END IF;

  IF COALESCE(NULLIF(p_payload->>'termination_reason', ''), NULLIF(p_payload->>'notes', '')) IS NULL THEN
    RAISE EXCEPTION 'Termination reason is required.' USING ERRCODE = 'P0001';
  END IF;

  IF COALESCE(jsonb_array_length(COALESCE(p_payload->'document_files', '[]'::jsonb)), 0) = 0 THEN
    RAISE EXCEPTION 'Termination requires a document.' USING ERRCODE = 'P0001';
  END IF;

  RETURN public.apply_representative_authority_command(
    p_representative_id,
    'Sonlandırma',
    'Sona Erdi',
    'terminated',
    p_payload,
    p_client_request_id,
    p_requested_by
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_draft_representative(
  p_representative_id uuid,
  p_client_request_id text DEFAULT gen_random_uuid()::text,
  p_requested_by uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_rep public.company_representatives%ROWTYPE;
  v_operation public.representative_operations%ROWTYPE;
BEGIN
  SELECT * INTO v_rep
  FROM public.company_representatives
  WHERE id = p_representative_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Representative not found.' USING ERRCODE = 'P0001';
  END IF;

  IF public.representative_normalized_status(COALESCE(v_rep.record_status, v_rep.status)) <> 'draft'
    OR public.representative_has_blocking_links(p_representative_id)
    OR COALESCE(jsonb_array_length(COALESCE(v_rep.authority_documents, '[]'::jsonb)), 0) > 0
  THEN
    RAISE EXCEPTION 'Only draft representatives without lifecycle history or linked objects can be hard deleted.'
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.representative_operations (
    tenant_id,
    company_id,
    representative_id,
    operation_type,
    operation_status,
    client_request_id,
    request_payload,
    result_payload,
    requested_by,
    completed_at
  )
  VALUES (
    v_rep.tenant_id,
    v_rep.company_id,
    p_representative_id,
    'delete_draft_representative',
    'completed',
    p_client_request_id,
    jsonb_build_object('representative_id', p_representative_id),
    jsonb_build_object('representative_id', p_representative_id, 'deleted', true),
    p_requested_by,
    now()
  )
  RETURNING * INTO v_operation;

  DELETE FROM public.company_representatives
  WHERE id = p_representative_id;

  RETURN v_operation.result_payload;
END;
$$;
