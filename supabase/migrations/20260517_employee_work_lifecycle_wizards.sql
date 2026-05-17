-- Employee entry/exit lifecycle wizards

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

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS entry_date date;

ALTER TABLE public.employee_work_relations
  ADD COLUMN IF NOT EXISTS employment_type text,
  ADD COLUMN IF NOT EXISTS duration_type text,
  ADD COLUMN IF NOT EXISTS sgk_responsibility text,
  ADD COLUMN IF NOT EXISTS work_arrangement text,
  ADD COLUMN IF NOT EXISTS company_unit_id uuid,
  ADD COLUMN IF NOT EXISTS computed_manager_employee_id uuid,
  ADD COLUMN IF NOT EXISTS work_location_id uuid,
  ADD COLUMN IF NOT EXISTS cost_center_id uuid,
  ADD COLUMN IF NOT EXISTS project_id uuid,
  ADD COLUMN IF NOT EXISTS shift_group_id uuid,
  ADD COLUMN IF NOT EXISTS vessel_or_platform_id uuid,
  ADD COLUMN IF NOT EXISTS payment_type text,
  ADD COLUMN IF NOT EXISTS gross_net_type text,
  ADD COLUMN IF NOT EXISTS currency text,
  ADD COLUMN IF NOT EXISTS payment_period text,
  ADD COLUMN IF NOT EXISTS weekly_working_days numeric,
  ADD COLUMN IF NOT EXISTS daily_working_hours numeric,
  ADD COLUMN IF NOT EXISTS works_saturday boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS works_sunday boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_shift_based boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_night_shift boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS overtime_applicable boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS works_on_public_holidays boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_part_time boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_remote boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS disability_status text,
  ADD COLUMN IF NOT EXISTS conviction_status text,
  ADD COLUMN IF NOT EXISTS sgk_entry_date date,
  ADD COLUMN IF NOT EXISTS sgk_entry_reference_no text,
  ADD COLUMN IF NOT EXISTS sgk_entry_document_id text,
  ADD COLUMN IF NOT EXISTS sgk_entry_web_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sgk_submission_status text,
  ADD COLUMN IF NOT EXISTS sgk_exit_date date,
  ADD COLUMN IF NOT EXISTS sgk_exit_reference_no text,
  ADD COLUMN IF NOT EXISTS sgk_exit_document_id text,
  ADD COLUMN IF NOT EXISTS sgk_exit_web_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sgk_exit_status text,
  ADD COLUMN IF NOT EXISTS insurance_branch text,
  ADD COLUMN IF NOT EXISTS occupation_code text,
  ADD COLUMN IF NOT EXISTS duty_code text,
  ADD COLUMN IF NOT EXISTS csgb_work_branch text,
  ADD COLUMN IF NOT EXISTS education_code text,
  ADD COLUMN IF NOT EXISTS partial_day text,
  ADD COLUMN IF NOT EXISTS reference_code text,
  ADD COLUMN IF NOT EXISTS school_or_university text,
  ADD COLUMN IF NOT EXISTS department_or_program text,
  ADD COLUMN IF NOT EXISTS internship_type text,
  ADD COLUMN IF NOT EXISTS internship_start_date date,
  ADD COLUMN IF NOT EXISTS internship_end_date date,
  ADD COLUMN IF NOT EXISTS school_sgk_notification_status text,
  ADD COLUMN IF NOT EXISTS school_sgk_document_id text,
  ADD COLUMN IF NOT EXISTS internship_protocol_document_id text,
  ADD COLUMN IF NOT EXISTS contract_type text,
  ADD COLUMN IF NOT EXISTS contract_start_date date,
  ADD COLUMN IF NOT EXISTS contract_end_date date,
  ADD COLUMN IF NOT EXISTS service_type text,
  ADD COLUMN IF NOT EXISTS invoice_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS account_card_id uuid,
  ADD COLUMN IF NOT EXISTS contract_document_id text,
  ADD COLUMN IF NOT EXISTS nda_document_id text,
  ADD COLUMN IF NOT EXISTS exit_date date,
  ADD COLUMN IF NOT EXISTS exit_reason text,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS updated_by uuid,
  ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by text,
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS employee_work_relations_employee_id_idx
  ON public.employee_work_relations(employee_id);

CREATE INDEX IF NOT EXISTS employee_work_relations_status_idx
  ON public.employee_work_relations(status);

ALTER TABLE public.employee_work_lifecycle_events
  ADD COLUMN IF NOT EXISTS company_id uuid,
  ADD COLUMN IF NOT EXISTS payload_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS document_reference_id text;

INSERT INTO public.permissions(permission_key, name)
VALUES
  ('employees.view', 'Çalışan görüntüleme'),
  ('employees.insert', 'Çalışan ekleme'),
  ('employees.edit', 'Çalışan düzenleme'),
  ('employees.entry.start', 'Çalışan işe giriş wizard başlatma'),
  ('employees.entry.complete', 'Çalışan işe giriş tamamlama'),
  ('employees.entry.manual_sgk', 'Çalışan manuel SGK işe giriş tamamlama'),
  ('employees.exit.start', 'Çalışan işten çıkış wizard başlatma'),
  ('employees.exit.complete', 'Çalışan işten çıkış tamamlama'),
  ('employees.exit.manual_sgk', 'Çalışan manuel SGK işten çıkış tamamlama'),
  ('employees.work_relation.view', 'Çalışan çalışma rejimi görüntüleme'),
  ('employees.work_relation.edit', 'Çalışan çalışma rejimi düzenleme'),
  ('employees.lifecycle.view', 'Çalışan iş yaşam döngüsü görüntüleme')
ON CONFLICT (permission_key) DO NOTHING;

INSERT INTO public.role_permissions(role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.role_key IN ('super_admin', 'admin', 'yonetici', 'ik_muduru', 'ik_personeli')
  AND p.permission_key IN (
    'employees.view',
    'employees.insert',
    'employees.edit',
    'employees.entry.start',
    'employees.entry.complete',
    'employees.entry.manual_sgk',
    'employees.exit.start',
    'employees.exit.complete',
    'employees.exit.manual_sgk',
    'employees.work_relation.view',
    'employees.work_relation.edit',
    'employees.lifecycle.view'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.complete_employee_entry_wizard(
  p_employee_id uuid,
  p_payload jsonb,
  p_manual_sgk boolean DEFAULT false,
  p_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_employee public.employees%ROWTYPE;
  v_relation_id uuid;
  v_company_id uuid;
  v_start_date date;
  v_sgk_responsibility text;
  v_event_type text;
  v_updated_employee jsonb;
BEGIN
  SELECT * INTO v_employee
  FROM public.employees
  WHERE id = p_employee_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'EMPLOYEE_NOT_FOUND';
  END IF;

  v_company_id := COALESCE(public.safe_uuid(p_payload->>'company_id'), v_employee.company_id);
  v_start_date := COALESCE(
    NULLIF(p_payload->>'start_date', '')::date,
    NULLIF(p_payload->>'sgk_entry_date', '')::date,
    NULLIF(p_payload #>> '{manual_sgk,sgk_entry_date}', '')::date,
    CURRENT_DATE
  );
  v_sgk_responsibility := COALESCE(NULLIF(p_payload->>'sgk_responsibility', ''), 'company');

  UPDATE public.employee_work_relations
  SET
    company_id = v_company_id,
    employment_type = NULLIF(COALESCE(p_payload->>'employment_type', p_payload->>'relationship_type'), ''),
    duration_type = NULLIF(p_payload->>'duration_type', ''),
    sgk_responsibility = v_sgk_responsibility,
    work_arrangement = NULLIF(p_payload->>'work_arrangement', ''),
    relation_type = NULLIF(COALESCE(p_payload->>'employment_type', p_payload->>'relationship_type'), ''),
    start_date = v_start_date,
    status = 'active',
    company_unit_id = public.safe_uuid(p_payload->>'company_unit_id'),
    unit_id = public.safe_uuid(p_payload->>'company_unit_id'),
    position_id = public.safe_uuid(p_payload->>'position_id'),
    computed_manager_employee_id = public.safe_uuid(p_payload->>'computed_manager_employee_id'),
    work_location_id = public.safe_uuid(p_payload->>'work_location_id'),
    cost_center_id = public.safe_uuid(p_payload->>'cost_center_id'),
    project_id = public.safe_uuid(p_payload->>'project_id'),
    shift_group_id = public.safe_uuid(p_payload->>'shift_group_id'),
    vessel_or_platform_id = public.safe_uuid(p_payload->>'vessel_or_platform_id'),
    payment_type = NULLIF(p_payload->>'payment_type', ''),
    gross_net_type = NULLIF(p_payload->>'gross_net_type', ''),
    currency = NULLIF(p_payload->>'currency', ''),
    payment_period = NULLIF(p_payload->>'payment_period', ''),
    weekly_working_days = NULLIF(p_payload->>'weekly_working_days', '')::numeric,
    daily_working_hours = NULLIF(p_payload->>'daily_working_hours', '')::numeric,
    works_saturday = COALESCE((p_payload->>'works_saturday')::boolean, false),
    works_sunday = COALESCE((p_payload->>'works_sunday')::boolean, false),
    is_shift_based = COALESCE((p_payload->>'is_shift_based')::boolean, false),
    has_night_shift = COALESCE((p_payload->>'has_night_shift')::boolean, false),
    overtime_applicable = COALESCE((p_payload->>'overtime_applicable')::boolean, false),
    works_on_public_holidays = COALESCE((p_payload->>'works_on_public_holidays')::boolean, false),
    is_part_time = COALESCE((p_payload->>'is_part_time')::boolean, false),
    is_remote = COALESCE((p_payload->>'is_remote')::boolean, false),
    disability_status = NULLIF(p_payload->>'disability_status', ''),
    conviction_status = NULLIF(p_payload->>'conviction_status', ''),
    sgk_entry_date = COALESCE(NULLIF(p_payload #>> '{manual_sgk,sgk_entry_date}', '')::date, NULLIF(p_payload->>'sgk_entry_date', '')::date, v_start_date),
    sgk_entry_reference_no = NULLIF(COALESCE(p_payload #>> '{manual_sgk,sgk_entry_reference_no}', p_payload->>'sgk_entry_reference_no'), ''),
    sgk_entry_document_id = NULLIF(COALESCE(p_payload #>> '{manual_sgk,sgk_entry_document_id}', p_payload->>'sgk_entry_document_id'), ''),
    sgk_entry_web_completed = COALESCE((p_payload #>> '{manual_sgk,sgk_entry_web_completed}')::boolean, (p_payload->>'sgk_entry_web_completed')::boolean, false),
    sgk_submission_status = CASE WHEN p_manual_sgk THEN 'manually_completed' WHEN v_sgk_responsibility = 'company' THEN 'pending_manual' ELSE 'not_required' END,
    insurance_branch = NULLIF(p_payload->>'insurance_branch', ''),
    occupation_code = NULLIF(p_payload->>'occupation_code', ''),
    duty_code = NULLIF(p_payload->>'duty_code', ''),
    csgb_work_branch = NULLIF(p_payload->>'csgb_work_branch', ''),
    education_code = NULLIF(p_payload->>'education_code', ''),
    partial_day = NULLIF(p_payload->>'partial_day', ''),
    reference_code = NULLIF(p_payload->>'reference_code', ''),
    school_or_university = NULLIF(p_payload->>'school_or_university', ''),
    department_or_program = NULLIF(p_payload->>'department_or_program', ''),
    internship_type = NULLIF(p_payload->>'internship_type', ''),
    internship_start_date = NULLIF(p_payload->>'internship_start_date', '')::date,
    internship_end_date = NULLIF(p_payload->>'internship_end_date', '')::date,
    school_sgk_notification_status = NULLIF(p_payload->>'school_sgk_notification_status', ''),
    school_sgk_document_id = NULLIF(p_payload->>'school_sgk_document_id', ''),
    internship_protocol_document_id = NULLIF(p_payload->>'internship_protocol_document_id', ''),
    contract_type = NULLIF(p_payload->>'contract_type', ''),
    contract_start_date = NULLIF(p_payload->>'contract_start_date', '')::date,
    contract_end_date = NULLIF(p_payload->>'contract_end_date', '')::date,
    service_type = NULLIF(p_payload->>'service_type', ''),
    invoice_required = COALESCE((p_payload->>'invoice_required')::boolean, false),
    account_card_id = public.safe_uuid(p_payload->>'account_card_id'),
    contract_document_id = NULLIF(p_payload->>'contract_document_id', ''),
    nda_document_id = NULLIF(p_payload->>'nda_document_id', ''),
    updated_at = now(),
    updated_by = p_user_id,
    version = version + 1
  WHERE employee_id = p_employee_id
  RETURNING id INTO v_relation_id;

  IF v_relation_id IS NULL THEN
    INSERT INTO public.employee_work_relations (
      employee_id, company_id, employment_type, duration_type, sgk_responsibility, work_arrangement,
      relation_type, start_date, status, company_unit_id, unit_id, position_id, computed_manager_employee_id,
      work_location_id, cost_center_id, project_id, shift_group_id, vessel_or_platform_id, payment_type,
      gross_net_type, currency, payment_period, weekly_working_days, daily_working_hours, works_saturday,
      works_sunday, is_shift_based, has_night_shift, overtime_applicable, works_on_public_holidays,
      is_part_time, is_remote, disability_status, conviction_status, sgk_entry_date, sgk_entry_reference_no,
      sgk_entry_document_id, sgk_entry_web_completed, sgk_submission_status, insurance_branch, occupation_code,
      duty_code, csgb_work_branch, education_code, partial_day, reference_code, school_or_university,
      department_or_program, internship_type, internship_start_date, internship_end_date,
      school_sgk_notification_status, school_sgk_document_id, internship_protocol_document_id, contract_type,
      contract_start_date, contract_end_date, service_type, invoice_required, account_card_id,
      contract_document_id, nda_document_id, created_by, updated_by
    )
    VALUES (
      p_employee_id, v_company_id, NULLIF(COALESCE(p_payload->>'employment_type', p_payload->>'relationship_type'), ''),
      NULLIF(p_payload->>'duration_type', ''), v_sgk_responsibility, NULLIF(p_payload->>'work_arrangement', ''),
      NULLIF(COALESCE(p_payload->>'employment_type', p_payload->>'relationship_type'), ''), v_start_date, 'active',
      public.safe_uuid(p_payload->>'company_unit_id'), public.safe_uuid(p_payload->>'company_unit_id'),
      public.safe_uuid(p_payload->>'position_id'), public.safe_uuid(p_payload->>'computed_manager_employee_id'),
      public.safe_uuid(p_payload->>'work_location_id'), public.safe_uuid(p_payload->>'cost_center_id'),
      public.safe_uuid(p_payload->>'project_id'), public.safe_uuid(p_payload->>'shift_group_id'),
      public.safe_uuid(p_payload->>'vessel_or_platform_id'), NULLIF(p_payload->>'payment_type', ''),
      NULLIF(p_payload->>'gross_net_type', ''), NULLIF(p_payload->>'currency', ''), NULLIF(p_payload->>'payment_period', ''),
      NULLIF(p_payload->>'weekly_working_days', '')::numeric, NULLIF(p_payload->>'daily_working_hours', '')::numeric,
      COALESCE((p_payload->>'works_saturday')::boolean, false), COALESCE((p_payload->>'works_sunday')::boolean, false),
      COALESCE((p_payload->>'is_shift_based')::boolean, false), COALESCE((p_payload->>'has_night_shift')::boolean, false),
      COALESCE((p_payload->>'overtime_applicable')::boolean, false), COALESCE((p_payload->>'works_on_public_holidays')::boolean, false),
      COALESCE((p_payload->>'is_part_time')::boolean, false), COALESCE((p_payload->>'is_remote')::boolean, false),
      NULLIF(p_payload->>'disability_status', ''), NULLIF(p_payload->>'conviction_status', ''),
      COALESCE(NULLIF(p_payload #>> '{manual_sgk,sgk_entry_date}', '')::date, NULLIF(p_payload->>'sgk_entry_date', '')::date, v_start_date),
      NULLIF(COALESCE(p_payload #>> '{manual_sgk,sgk_entry_reference_no}', p_payload->>'sgk_entry_reference_no'), ''),
      NULLIF(COALESCE(p_payload #>> '{manual_sgk,sgk_entry_document_id}', p_payload->>'sgk_entry_document_id'), ''),
      COALESCE((p_payload #>> '{manual_sgk,sgk_entry_web_completed}')::boolean, (p_payload->>'sgk_entry_web_completed')::boolean, false),
      CASE WHEN p_manual_sgk THEN 'manually_completed' WHEN v_sgk_responsibility = 'company' THEN 'pending_manual' ELSE 'not_required' END,
      NULLIF(p_payload->>'insurance_branch', ''), NULLIF(p_payload->>'occupation_code', ''),
      NULLIF(p_payload->>'duty_code', ''), NULLIF(p_payload->>'csgb_work_branch', ''),
      NULLIF(p_payload->>'education_code', ''), NULLIF(p_payload->>'partial_day', ''),
      NULLIF(p_payload->>'reference_code', ''), NULLIF(p_payload->>'school_or_university', ''),
      NULLIF(p_payload->>'department_or_program', ''), NULLIF(p_payload->>'internship_type', ''),
      NULLIF(p_payload->>'internship_start_date', '')::date, NULLIF(p_payload->>'internship_end_date', '')::date,
      NULLIF(p_payload->>'school_sgk_notification_status', ''), NULLIF(p_payload->>'school_sgk_document_id', ''),
      NULLIF(p_payload->>'internship_protocol_document_id', ''), NULLIF(p_payload->>'contract_type', ''),
      NULLIF(p_payload->>'contract_start_date', '')::date, NULLIF(p_payload->>'contract_end_date', '')::date,
      NULLIF(p_payload->>'service_type', ''), COALESCE((p_payload->>'invoice_required')::boolean, false),
      public.safe_uuid(p_payload->>'account_card_id'), NULLIF(p_payload->>'contract_document_id', ''),
      NULLIF(p_payload->>'nda_document_id', ''), p_user_id, p_user_id
    )
    RETURNING id INTO v_relation_id;
  END IF;

  v_event_type := CASE
    WHEN p_manual_sgk THEN 'sgk_entry_manual_completed'
    WHEN COALESCE(p_payload->>'employment_type', '') = 'intern' OR v_sgk_responsibility = 'school_university' THEN 'internship_started'
    WHEN COALESCE(p_payload->>'employment_type', '') = 'marine' OR COALESCE(p_payload->>'duration_type', '') = 'voyage_based' OR COALESCE(p_payload->>'work_arrangement', '') = 'marine_vessel' THEN 'marine_contract_started'
    WHEN COALESCE(p_payload->>'employment_type', '') IN ('contracted', 'outsourced', 'consultant_freelancer') THEN 'contract_started'
    ELSE 'entry_completed'
  END;

  INSERT INTO public.employee_work_lifecycle_events (
    employee_id, company_id, event_type, event_date, old_record_status, new_record_status,
    payload, payload_json, document_reference_id, created_by
  )
  VALUES (
    p_employee_id, v_company_id, v_event_type, v_start_date, COALESCE(v_employee.record_status, 'draft'), 'active',
    p_payload, p_payload, NULLIF(p_payload #>> '{manual_sgk,sgk_entry_document_id}', ''), p_user_id
  );

  UPDATE public.employees e
  SET
    record_status = 'active',
    employment_status = 'active',
    work_status = 'active',
    entry_date = v_start_date,
    start_date = v_start_date,
    sgk_entry_date = COALESCE(NULLIF(p_payload #>> '{manual_sgk,sgk_entry_date}', '')::date, NULLIF(p_payload->>'sgk_entry_date', '')::date, v_start_date),
    sgk_entry_reference_no = NULLIF(COALESCE(p_payload #>> '{manual_sgk,sgk_entry_reference_no}', p_payload->>'sgk_entry_reference_no'), ''),
    sgk_entry_method = CASE WHEN p_manual_sgk THEN 'web' ELSE NULLIF(p_payload->>'sgk_entry_method', '') END,
    work_type = NULLIF(COALESCE(p_payload->>'employment_type', p_payload->>'relationship_type'), ''),
    company_id = v_company_id,
    unit_id = COALESCE(public.safe_uuid(p_payload->>'company_unit_id'), e.unit_id),
    position_id = COALESCE(public.safe_uuid(p_payload->>'position_id'), e.position_id),
    field_history = jsonb_set(
      COALESCE(e.field_history, '{}'::jsonb),
      '{record_status}',
      COALESCE(e.field_history->'record_status', '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
        'value', CASE WHEN p_manual_sgk THEN 'SGK işe girişi manuel tamamlandı' ELSE 'İşe giriş tamamlandı' END,
        'date', now(),
        'user', 'Sistem Kullanıcısı'
      )),
      true
    ),
    updated_at = now()
  WHERE e.id = p_employee_id
  RETURNING to_jsonb(e) INTO v_updated_employee;

  RETURN jsonb_build_object('data', v_updated_employee);
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_employee_exit_wizard(
  p_employee_id uuid,
  p_payload jsonb,
  p_manual_sgk boolean DEFAULT false,
  p_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_employee public.employees%ROWTYPE;
  v_relation public.employee_work_relations%ROWTYPE;
  v_company_id uuid;
  v_exit_date date;
  v_event_type text;
  v_updated_employee jsonb;
BEGIN
  SELECT * INTO v_employee
  FROM public.employees
  WHERE id = p_employee_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'EMPLOYEE_NOT_FOUND';
  END IF;

  SELECT * INTO v_relation
  FROM public.employee_work_relations
  WHERE employee_id = p_employee_id
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  v_company_id := COALESCE(public.safe_uuid(p_payload->>'company_id'), v_employee.company_id, v_relation.company_id);
  v_exit_date := COALESCE(
    NULLIF(p_payload->>'exit_date', '')::date,
    NULLIF(p_payload->>'sgk_exit_date', '')::date,
    NULLIF(p_payload #>> '{manual_sgk,sgk_exit_date}', '')::date,
    CURRENT_DATE
  );

  IF v_relation.id IS NOT NULL THEN
    UPDATE public.employee_work_relations
    SET
      end_date = v_exit_date,
      exit_date = v_exit_date,
      exit_reason = NULLIF(COALESCE(p_payload->>'exit_reason', p_payload->>'termination_reason'), ''),
      status = 'passive',
      sgk_exit_date = COALESCE(NULLIF(p_payload #>> '{manual_sgk,sgk_exit_date}', '')::date, NULLIF(p_payload->>'sgk_exit_date', '')::date, v_exit_date),
      sgk_exit_reference_no = NULLIF(COALESCE(p_payload #>> '{manual_sgk,sgk_exit_reference_no}', p_payload->>'sgk_exit_reference_no'), ''),
      sgk_exit_document_id = NULLIF(COALESCE(p_payload #>> '{manual_sgk,sgk_exit_document_id}', p_payload->>'sgk_exit_document_id'), ''),
      sgk_exit_web_completed = COALESCE((p_payload #>> '{manual_sgk,sgk_exit_web_completed}')::boolean, (p_payload->>'sgk_exit_web_completed')::boolean, false),
      sgk_exit_status = CASE WHEN p_manual_sgk THEN 'manually_completed' ELSE sgk_exit_status END,
      occupation_code = COALESCE(NULLIF(p_payload->>'sgk_exit_occupation_code', ''), occupation_code),
      csgb_work_branch = COALESCE(NULLIF(p_payload->>'sgk_exit_csgb_work_branch', ''), csgb_work_branch),
      reference_code = COALESCE(NULLIF(p_payload->>'sgk_exit_reference_code', ''), reference_code),
      contract_end_date = COALESCE(NULLIF(p_payload->>'contract_end_date', '')::date, contract_end_date),
      updated_at = now(),
      updated_by = p_user_id,
      version = version + 1
    WHERE id = v_relation.id;
  END IF;

  v_event_type := CASE
    WHEN p_manual_sgk THEN 'sgk_exit_manual_completed'
    WHEN COALESCE(p_payload->>'employment_type', v_relation.employment_type, '') = 'intern' OR COALESCE(p_payload->>'sgk_responsibility', v_relation.sgk_responsibility, '') = 'school_university' THEN 'internship_completed'
    WHEN COALESCE(p_payload->>'employment_type', v_relation.employment_type, '') = 'marine' OR COALESCE(p_payload->>'duration_type', v_relation.duration_type, '') = 'voyage_based' OR COALESCE(p_payload->>'work_arrangement', v_relation.work_arrangement, '') = 'marine_vessel' THEN 'marine_contract_completed'
    WHEN COALESCE(p_payload->>'employment_type', v_relation.employment_type, '') IN ('contracted', 'outsourced', 'consultant_freelancer') THEN 'contract_terminated'
    ELSE 'exit_completed'
  END;

  INSERT INTO public.employee_work_lifecycle_events (
    employee_id, company_id, event_type, event_date, old_record_status, new_record_status,
    payload, payload_json, document_reference_id, created_by
  )
  VALUES (
    p_employee_id, v_company_id, v_event_type, v_exit_date, COALESCE(v_employee.record_status, 'active'), 'passive',
    p_payload, p_payload,
    COALESCE(NULLIF(p_payload #>> '{manual_sgk,sgk_exit_document_id}', ''), NULLIF(p_payload->>'closing_document_id', '')),
    p_user_id
  );

  UPDATE public.employees e
  SET
    record_status = 'passive',
    employment_status = 'terminated',
    work_status = 'terminated',
    exit_date = v_exit_date,
    sgk_exit_reference_no = NULLIF(COALESCE(p_payload #>> '{manual_sgk,sgk_exit_reference_no}', p_payload->>'sgk_exit_reference_no'), ''),
    sgk_exit_method = CASE WHEN p_manual_sgk THEN 'web' ELSE NULLIF(p_payload->>'sgk_exit_method', '') END,
    sgk_exit_reason = NULLIF(COALESCE(p_payload->>'sgk_exit_reason', p_payload->>'exit_reason'), ''),
    field_history = jsonb_set(
      COALESCE(e.field_history, '{}'::jsonb),
      '{record_status}',
      COALESCE(e.field_history->'record_status', '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
        'value', CASE WHEN p_manual_sgk THEN 'SGK işten çıkışı manuel tamamlandı' ELSE 'İşten çıkış tamamlandı' END,
        'date', now(),
        'user', 'Sistem Kullanıcısı'
      )),
      true
    ),
    updated_at = now()
  WHERE e.id = p_employee_id
  RETURNING to_jsonb(e) INTO v_updated_employee;

  RETURN jsonb_build_object('data', v_updated_employee);
END;
$$;
