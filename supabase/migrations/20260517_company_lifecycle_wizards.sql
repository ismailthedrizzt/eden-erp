-- Company lifecycle wizards: draft -> active -> liquidation -> deregistered

CREATE OR REPLACE FUNCTION public.safe_uuid(value text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN NULLIF(value, '')::uuid;
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$;

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS record_status text,
  ADD COLUMN IF NOT EXISTS company_status text;

UPDATE public.companies
SET
  record_status = CASE WHEN is_deleted THEN 'deregistered' ELSE 'active' END,
  company_status = CASE WHEN is_deleted THEN 'deregistered' ELSE 'active' END
WHERE record_status IS NULL OR company_status IS NULL;

ALTER TABLE public.companies
  ALTER COLUMN record_status SET DEFAULT 'draft',
  ALTER COLUMN company_status SET DEFAULT 'draft',
  ALTER COLUMN record_status SET NOT NULL,
  ALTER COLUMN company_status SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'companies_record_status_check') THEN
    ALTER TABLE public.companies
      ADD CONSTRAINT companies_record_status_check
      CHECK (record_status IN ('draft', 'active', 'liquidation', 'deregistered'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'companies_company_status_check') THEN
    ALTER TABLE public.companies
      ADD CONSTRAINT companies_company_status_check
      CHECK (company_status IN ('draft', 'active', 'liquidation', 'deregistered'));
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.company_lifecycle_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_date date NOT NULL DEFAULT CURRENT_DATE,
  old_status text,
  new_status text,
  payload_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  document_reference_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE TABLE IF NOT EXISTS public.company_opening_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  foundation_date date,
  registration_date date,
  trade_registry_office text,
  trade_registry_no text,
  mersis_no text,
  tax_office_id text,
  tax_no text,
  sgk_workplace_no text,
  primary_nace_id text,
  opening_document_id text,
  payload_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  version integer NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS public.company_liquidation_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  liquidation_decision_date date,
  liquidation_start_date date,
  decision_no text,
  decision_type text,
  liquidation_reason text,
  liquidator_person_id uuid,
  liquidator_organization_id uuid,
  liquidator_display_name text,
  liquidator_authority text,
  liquidator_authority_start_date date,
  liquidator_authority_document_id text,
  trade_registry_application_status text,
  tax_notification_status text,
  sgk_notification_status text,
  notes text,
  payload_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  version integer NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS public.company_deregistration_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  liquidation_completion_decision_date date,
  deregistration_application_date date,
  deregistration_registration_date date,
  deregistration_reference_no text,
  trade_registry_office text,
  tax_closure_status text,
  tax_closure_date date,
  sgk_closure_status text,
  sgk_closure_date date,
  kep_closure_status text,
  financial_seal_closure_note text,
  document_archive_responsible text,
  deregistration_document_id text,
  notes text,
  payload_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  version integer NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS company_lifecycle_events_company_date_idx
  ON public.company_lifecycle_events(company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS company_lifecycle_events_type_idx
  ON public.company_lifecycle_events(event_type);

CREATE INDEX IF NOT EXISTS companies_lifecycle_status_idx
  ON public.companies(record_status, company_status, is_deleted);

INSERT INTO public.permissions(permission_key, name)
VALUES
  ('companies.view', 'Sirket goruntuleme'),
  ('companies.insert', 'Sirket ekleme'),
  ('companies.edit', 'Sirket duzenleme'),
  ('companies.opening.start', 'Sirket acilisi wizard baslatma'),
  ('companies.opening.complete', 'Sirket acilisi tamamlama'),
  ('companies.liquidation.start', 'Tasfiye wizard baslatma'),
  ('companies.liquidation.complete', 'Tasfiye tamamlama'),
  ('companies.liquidation.update', 'Tasfiye bilgisi guncelleme'),
  ('companies.deregistration.start', 'Terkin wizard baslatma'),
  ('companies.deregistration.complete', 'Terkin tamamlama'),
  ('companies.lifecycle.view', 'Sirket yasam dongusu goruntuleme')
ON CONFLICT (permission_key) DO NOTHING;

INSERT INTO public.role_permissions(role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.role_key IN ('super_admin', 'admin', 'yonetici')
  AND p.permission_key IN (
    'companies.view',
    'companies.insert',
    'companies.edit',
    'companies.opening.start',
    'companies.opening.complete',
    'companies.liquidation.start',
    'companies.liquidation.complete',
    'companies.liquidation.update',
    'companies.deregistration.start',
    'companies.deregistration.complete',
    'companies.lifecycle.view'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.append_company_status_history(
  p_company public.companies,
  p_old_status text,
  p_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN jsonb_set(
    COALESCE(p_company.field_history, '{}'::jsonb),
    '{record_status}',
    COALESCE(p_company.field_history->'record_status', '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
      'value', COALESCE(p_old_status, ''),
      'date', now(),
      'user', COALESCE(p_user_id::text, 'Sistem Kullanicisi')
    )),
    true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_company_opening_wizard(
  p_company_id uuid,
  p_payload jsonb,
  p_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company public.companies%ROWTYPE;
  v_old_status text;
  v_document_id text;
  v_updated_company jsonb;
BEGIN
  SELECT * INTO v_company
  FROM public.companies
  WHERE id = p_company_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'COMPANY_NOT_FOUND';
  END IF;

  IF v_company.record_status = 'deregistered' THEN
    RAISE EXCEPTION 'COMPANY_ALREADY_DEREGISTERED';
  END IF;

  v_old_status := COALESCE(v_company.record_status, CASE WHEN v_company.is_deleted THEN 'deregistered' ELSE 'draft' END);
  v_document_id := COALESCE(
    NULLIF(p_payload #>> '{opening_document,documentId}', ''),
    NULLIF(p_payload #>> '{foundation_trade_registry_gazette,documentId}', ''),
    NULLIF(p_payload->>'opening_document_id', '')
  );

  INSERT INTO public.company_opening_details (
    company_id,
    foundation_date,
    registration_date,
    trade_registry_office,
    trade_registry_no,
    mersis_no,
    tax_office_id,
    tax_no,
    sgk_workplace_no,
    primary_nace_id,
    opening_document_id,
    payload_json,
    created_by,
    updated_by
  )
  VALUES (
    p_company_id,
    NULLIF(p_payload->>'foundation_date', '')::date,
    NULLIF(p_payload->>'registration_date', '')::date,
    NULLIF(COALESCE(p_payload->>'trade_registry_office', p_payload->>'trade_registry_office_id'), ''),
    NULLIF(COALESCE(p_payload->>'trade_registry_no', p_payload->>'trade_registry_number'), ''),
    NULLIF(COALESCE(p_payload->>'mersis_no', p_payload->>'mersis_number'), ''),
    NULLIF(COALESCE(p_payload->>'tax_office_id', p_payload->>'tax_office'), ''),
    NULLIF(COALESCE(p_payload->>'tax_no', p_payload->>'tax_number'), ''),
    NULLIF(COALESCE(p_payload->>'sgk_workplace_no', p_payload->>'sgk_workplace_registry_no'), ''),
    NULLIF(p_payload->>'primary_nace_id', ''),
    v_document_id,
    p_payload,
    p_user_id,
    p_user_id
  )
  ON CONFLICT (company_id) DO UPDATE
  SET
    foundation_date = EXCLUDED.foundation_date,
    registration_date = EXCLUDED.registration_date,
    trade_registry_office = EXCLUDED.trade_registry_office,
    trade_registry_no = EXCLUDED.trade_registry_no,
    mersis_no = EXCLUDED.mersis_no,
    tax_office_id = EXCLUDED.tax_office_id,
    tax_no = EXCLUDED.tax_no,
    sgk_workplace_no = EXCLUDED.sgk_workplace_no,
    primary_nace_id = EXCLUDED.primary_nace_id,
    opening_document_id = EXCLUDED.opening_document_id,
    payload_json = EXCLUDED.payload_json,
    updated_at = now(),
    updated_by = p_user_id,
    version = company_opening_details.version + 1;

  INSERT INTO public.company_public_tax (company_id, tax_number, tax_office, liability_start_date)
  VALUES (
    p_company_id,
    NULLIF(COALESCE(p_payload->>'tax_no', p_payload->>'tax_number'), ''),
    NULLIF(COALESCE(p_payload->>'tax_office', p_payload->>'tax_office_id'), ''),
    NULLIF(COALESCE(p_payload->>'registration_date', p_payload->>'foundation_date'), '')::date
  )
  ON CONFLICT (company_id) DO UPDATE
  SET
    tax_number = COALESCE(EXCLUDED.tax_number, public.company_public_tax.tax_number),
    tax_office = COALESCE(EXCLUDED.tax_office, public.company_public_tax.tax_office),
    liability_start_date = COALESCE(EXCLUDED.liability_start_date, public.company_public_tax.liability_start_date),
    updated_at = now();

  INSERT INTO public.company_public_sgk (company_id, workplace_registry_no, registration_date)
  VALUES (
    p_company_id,
    NULLIF(COALESCE(p_payload->>'sgk_workplace_no', p_payload->>'sgk_workplace_registry_no'), ''),
    NULLIF(COALESCE(p_payload->>'registration_date', p_payload->>'foundation_date'), '')::date
  )
  ON CONFLICT (company_id) DO UPDATE
  SET
    workplace_registry_no = COALESCE(EXCLUDED.workplace_registry_no, public.company_public_sgk.workplace_registry_no),
    registration_date = COALESCE(EXCLUDED.registration_date, public.company_public_sgk.registration_date),
    updated_at = now();

  INSERT INTO public.company_public_registry (company_id, mersis_number, trade_registry_no, registry_office, establishment_registration_date)
  VALUES (
    p_company_id,
    NULLIF(COALESCE(p_payload->>'mersis_no', p_payload->>'mersis_number'), ''),
    NULLIF(COALESCE(p_payload->>'trade_registry_no', p_payload->>'trade_registry_number'), ''),
    NULLIF(COALESCE(p_payload->>'trade_registry_office', p_payload->>'trade_registry_office_id'), ''),
    NULLIF(COALESCE(p_payload->>'registration_date', p_payload->>'foundation_date'), '')::date
  )
  ON CONFLICT (company_id) DO UPDATE
  SET
    mersis_number = COALESCE(EXCLUDED.mersis_number, public.company_public_registry.mersis_number),
    trade_registry_no = COALESCE(EXCLUDED.trade_registry_no, public.company_public_registry.trade_registry_no),
    registry_office = COALESCE(EXCLUDED.registry_office, public.company_public_registry.registry_office),
    establishment_registration_date = COALESCE(EXCLUDED.establishment_registration_date, public.company_public_registry.establishment_registration_date),
    updated_at = now();

  INSERT INTO public.company_public_channels (company_id, kep_address, e_notification_address, e_notification_active)
  VALUES (
    p_company_id,
    NULLIF(p_payload->>'kep_address', ''),
    NULLIF(COALESCE(p_payload->>'electronic_notification_address', p_payload->>'e_notification_address'), ''),
    COALESCE(NULLIF(p_payload->>'kep_info_available', '')::boolean, false)
  )
  ON CONFLICT (company_id) DO UPDATE
  SET
    kep_address = COALESCE(EXCLUDED.kep_address, public.company_public_channels.kep_address),
    e_notification_address = COALESCE(EXCLUDED.e_notification_address, public.company_public_channels.e_notification_address),
    e_notification_active = EXCLUDED.e_notification_active OR public.company_public_channels.e_notification_active,
    updated_at = now();

  INSERT INTO public.company_lifecycle_events (
    company_id, event_type, event_date, old_status, new_status, payload_json, document_reference_id, created_by
  )
  VALUES (
    p_company_id,
    'company_opening_completed',
    COALESCE(NULLIF(p_payload->>'registration_date', '')::date, NULLIF(p_payload->>'foundation_date', '')::date, CURRENT_DATE),
    v_old_status,
    'active',
    p_payload,
    v_document_id,
    p_user_id
  );

  INSERT INTO public.record_history (table_name, record_id, version, data_json, changed_by)
  VALUES (
    'companies',
    p_company_id,
    COALESCE(v_company.version, 1) + 1,
    jsonb_build_object('event_type', 'company_opening_completed', 'old_status', v_old_status, 'new_status', 'active', 'payload', p_payload),
    p_user_id
  );

  UPDATE public.companies AS c
  SET
    record_status = 'active',
    company_status = 'active',
    is_deleted = false,
    foundation_date = COALESCE(NULLIF(p_payload->>'foundation_date', '')::date, foundation_date),
    trade_registry_office = COALESCE(NULLIF(COALESCE(p_payload->>'trade_registry_office', p_payload->>'trade_registry_office_id'), ''), trade_registry_office),
    trade_registry_number = COALESCE(NULLIF(COALESCE(p_payload->>'trade_registry_no', p_payload->>'trade_registry_number'), ''), trade_registry_number),
    mersis_number = COALESCE(NULLIF(COALESCE(p_payload->>'mersis_no', p_payload->>'mersis_number'), ''), mersis_number),
    tax_number = COALESCE(NULLIF(COALESCE(p_payload->>'tax_no', p_payload->>'tax_number'), ''), tax_number),
    tax_office = COALESCE(NULLIF(COALESCE(p_payload->>'tax_office', p_payload->>'tax_office_id'), ''), tax_office),
    sgk_workplace_registry_no = COALESCE(NULLIF(COALESCE(p_payload->>'sgk_workplace_no', p_payload->>'sgk_workplace_registry_no'), ''), sgk_workplace_registry_no),
    field_history = public.append_company_status_history(v_company, v_old_status, p_user_id),
    updated_at = now(),
    updated_by = p_user_id,
    version = COALESCE(version, 1) + 1
  WHERE c.id = p_company_id
  RETURNING to_jsonb(c) INTO v_updated_company;

  RETURN jsonb_build_object('company', v_updated_company, 'status', 'active');
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_company_liquidation_wizard(
  p_company_id uuid,
  p_payload jsonb,
  p_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company public.companies%ROWTYPE;
  v_old_status text;
  v_document_id text;
  v_event_type text;
  v_updated_company jsonb;
BEGIN
  SELECT * INTO v_company
  FROM public.companies
  WHERE id = p_company_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'COMPANY_NOT_FOUND';
  END IF;

  IF v_company.record_status = 'deregistered' THEN
    RAISE EXCEPTION 'COMPANY_ALREADY_DEREGISTERED';
  END IF;

  v_old_status := COALESCE(v_company.record_status, CASE WHEN v_company.is_deleted THEN 'deregistered' ELSE 'active' END);
  v_event_type := CASE WHEN v_old_status = 'liquidation' THEN 'company_liquidation_updated' ELSE 'company_liquidation_started' END;
  v_document_id := COALESCE(
    NULLIF(p_payload #>> '{liquidation_decision_document,documentId}', ''),
    NULLIF(p_payload #>> '{liquidator_authority_document,documentId}', ''),
    NULLIF(p_payload->>'liquidator_authority_document_id', '')
  );

  INSERT INTO public.company_liquidation_details (
    company_id,
    liquidation_decision_date,
    liquidation_start_date,
    decision_no,
    decision_type,
    liquidation_reason,
    liquidator_person_id,
    liquidator_organization_id,
    liquidator_display_name,
    liquidator_authority,
    liquidator_authority_start_date,
    liquidator_authority_document_id,
    trade_registry_application_status,
    tax_notification_status,
    sgk_notification_status,
    notes,
    payload_json,
    created_by,
    updated_by
  )
  VALUES (
    p_company_id,
    NULLIF(p_payload->>'liquidation_decision_date', '')::date,
    NULLIF(p_payload->>'liquidation_start_date', '')::date,
    NULLIF(p_payload->>'decision_no', ''),
    NULLIF(p_payload->>'decision_type', ''),
    NULLIF(p_payload->>'liquidation_reason', ''),
    public.safe_uuid(COALESCE(p_payload->>'liquidator_person_id', p_payload->>'liquidator_id')),
    public.safe_uuid(p_payload->>'liquidator_organization_id'),
    NULLIF(COALESCE(p_payload->>'liquidator_display_name', p_payload->>'liquidator_name'), ''),
    NULLIF(p_payload->>'liquidator_authority', ''),
    NULLIF(p_payload->>'liquidator_authority_start_date', '')::date,
    v_document_id,
    NULLIF(p_payload->>'trade_registry_application_status', ''),
    NULLIF(p_payload->>'tax_notification_status', ''),
    NULLIF(p_payload->>'sgk_notification_status', ''),
    NULLIF(COALESCE(p_payload->>'notes', p_payload->>'description'), ''),
    p_payload,
    p_user_id,
    p_user_id
  )
  ON CONFLICT (company_id) DO UPDATE
  SET
    liquidation_decision_date = EXCLUDED.liquidation_decision_date,
    liquidation_start_date = EXCLUDED.liquidation_start_date,
    decision_no = EXCLUDED.decision_no,
    decision_type = EXCLUDED.decision_type,
    liquidation_reason = EXCLUDED.liquidation_reason,
    liquidator_person_id = EXCLUDED.liquidator_person_id,
    liquidator_organization_id = EXCLUDED.liquidator_organization_id,
    liquidator_display_name = EXCLUDED.liquidator_display_name,
    liquidator_authority = EXCLUDED.liquidator_authority,
    liquidator_authority_start_date = EXCLUDED.liquidator_authority_start_date,
    liquidator_authority_document_id = EXCLUDED.liquidator_authority_document_id,
    trade_registry_application_status = EXCLUDED.trade_registry_application_status,
    tax_notification_status = EXCLUDED.tax_notification_status,
    sgk_notification_status = EXCLUDED.sgk_notification_status,
    notes = EXCLUDED.notes,
    payload_json = EXCLUDED.payload_json,
    updated_at = now(),
    updated_by = p_user_id,
    version = company_liquidation_details.version + 1;

  INSERT INTO public.company_lifecycle_events (
    company_id, event_type, event_date, old_status, new_status, payload_json, document_reference_id, created_by
  )
  VALUES (
    p_company_id,
    v_event_type,
    COALESCE(NULLIF(p_payload->>'liquidation_start_date', '')::date, NULLIF(p_payload->>'liquidation_decision_date', '')::date, CURRENT_DATE),
    v_old_status,
    'liquidation',
    p_payload,
    v_document_id,
    p_user_id
  );

  INSERT INTO public.record_history (table_name, record_id, version, data_json, changed_by)
  VALUES (
    'companies',
    p_company_id,
    COALESCE(v_company.version, 1) + 1,
    jsonb_build_object('event_type', v_event_type, 'old_status', v_old_status, 'new_status', 'liquidation', 'payload', p_payload),
    p_user_id
  );

  UPDATE public.companies AS c
  SET
    record_status = 'liquidation',
    company_status = 'liquidation',
    is_deleted = false,
    field_history = public.append_company_status_history(v_company, v_old_status, p_user_id),
    updated_at = now(),
    updated_by = p_user_id,
    version = COALESCE(version, 1) + 1
  WHERE c.id = p_company_id
  RETURNING to_jsonb(c) INTO v_updated_company;

  RETURN jsonb_build_object('company', v_updated_company, 'status', 'liquidation');
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_company_deregistration_wizard(
  p_company_id uuid,
  p_payload jsonb,
  p_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company public.companies%ROWTYPE;
  v_old_status text;
  v_document_id text;
  v_updated_company jsonb;
BEGIN
  SELECT * INTO v_company
  FROM public.companies
  WHERE id = p_company_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'COMPANY_NOT_FOUND';
  END IF;

  IF v_company.record_status <> 'liquidation' THEN
    RAISE EXCEPTION 'COMPANY_NOT_IN_LIQUIDATION';
  END IF;

  v_old_status := COALESCE(v_company.record_status, 'liquidation');
  v_document_id := COALESCE(
    NULLIF(p_payload #>> '{deregistration_document,documentId}', ''),
    NULLIF(p_payload #>> '{deregistration_trade_registry_gazette,documentId}', ''),
    NULLIF(p_payload->>'deregistration_document_id', '')
  );

  INSERT INTO public.company_deregistration_details (
    company_id,
    liquidation_completion_decision_date,
    deregistration_application_date,
    deregistration_registration_date,
    deregistration_reference_no,
    trade_registry_office,
    tax_closure_status,
    tax_closure_date,
    sgk_closure_status,
    sgk_closure_date,
    kep_closure_status,
    financial_seal_closure_note,
    document_archive_responsible,
    deregistration_document_id,
    notes,
    payload_json,
    created_by,
    updated_by
  )
  VALUES (
    p_company_id,
    NULLIF(p_payload->>'liquidation_completion_decision_date', '')::date,
    NULLIF(p_payload->>'deregistration_application_date', '')::date,
    NULLIF(p_payload->>'deregistration_registration_date', '')::date,
    NULLIF(COALESCE(p_payload->>'deregistration_reference_no', p_payload->>'deregistration_registry_no'), ''),
    NULLIF(COALESCE(p_payload->>'trade_registry_office', p_payload->>'trade_registry_office_id'), ''),
    NULLIF(p_payload->>'tax_closure_status', ''),
    NULLIF(p_payload->>'tax_closure_date', '')::date,
    NULLIF(p_payload->>'sgk_closure_status', ''),
    NULLIF(p_payload->>'sgk_closure_date', '')::date,
    NULLIF(p_payload->>'kep_closure_status', ''),
    NULLIF(p_payload->>'financial_seal_closure_note', ''),
    NULLIF(p_payload->>'document_archive_responsible', ''),
    v_document_id,
    NULLIF(COALESCE(p_payload->>'notes', p_payload->>'description'), ''),
    p_payload,
    p_user_id,
    p_user_id
  )
  ON CONFLICT (company_id) DO UPDATE
  SET
    liquidation_completion_decision_date = EXCLUDED.liquidation_completion_decision_date,
    deregistration_application_date = EXCLUDED.deregistration_application_date,
    deregistration_registration_date = EXCLUDED.deregistration_registration_date,
    deregistration_reference_no = EXCLUDED.deregistration_reference_no,
    trade_registry_office = EXCLUDED.trade_registry_office,
    tax_closure_status = EXCLUDED.tax_closure_status,
    tax_closure_date = EXCLUDED.tax_closure_date,
    sgk_closure_status = EXCLUDED.sgk_closure_status,
    sgk_closure_date = EXCLUDED.sgk_closure_date,
    kep_closure_status = EXCLUDED.kep_closure_status,
    financial_seal_closure_note = EXCLUDED.financial_seal_closure_note,
    document_archive_responsible = EXCLUDED.document_archive_responsible,
    deregistration_document_id = EXCLUDED.deregistration_document_id,
    notes = EXCLUDED.notes,
    payload_json = EXCLUDED.payload_json,
    updated_at = now(),
    updated_by = p_user_id,
    version = company_deregistration_details.version + 1;

  INSERT INTO public.company_lifecycle_events (
    company_id, event_type, event_date, old_status, new_status, payload_json, document_reference_id, created_by
  )
  VALUES (
    p_company_id,
    'company_deregistered',
    COALESCE(NULLIF(p_payload->>'deregistration_registration_date', '')::date, CURRENT_DATE),
    v_old_status,
    'deregistered',
    p_payload,
    v_document_id,
    p_user_id
  );

  INSERT INTO public.record_history (table_name, record_id, version, data_json, changed_by)
  VALUES (
    'companies',
    p_company_id,
    COALESCE(v_company.version, 1) + 1,
    jsonb_build_object('event_type', 'company_deregistered', 'old_status', v_old_status, 'new_status', 'deregistered', 'payload', p_payload),
    p_user_id
  );

  UPDATE public.companies AS c
  SET
    record_status = 'deregistered',
    company_status = 'deregistered',
    is_deleted = true,
    deleted_at = COALESCE(deleted_at, now()),
    deleted_by = COALESCE(deleted_by, COALESCE(p_user_id::text, 'Sistem Kullanicisi')),
    field_history = public.append_company_status_history(v_company, v_old_status, p_user_id),
    updated_at = now(),
    updated_by = p_user_id,
    version = COALESCE(version, 1) + 1
  WHERE c.id = p_company_id
  RETURNING to_jsonb(c) INTO v_updated_company;

  RETURN jsonb_build_object('company', v_updated_company, 'status', 'deregistered');
END;
$$;
