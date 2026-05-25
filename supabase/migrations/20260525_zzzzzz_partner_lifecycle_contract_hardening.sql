ALTER TABLE public.partner_ownership_lifecycle_events
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.erp_instances(id),
  ADD COLUMN IF NOT EXISTS old_record_status text,
  ADD COLUMN IF NOT EXISTS new_record_status text,
  ADD COLUMN IF NOT EXISTS payload_json jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.partner_ownership_lifecycle_events
SET
  old_record_status = COALESCE(old_record_status, old_status),
  new_record_status = COALESCE(new_record_status, new_status),
  payload_json = CASE
    WHEN payload_json IS NULL OR payload_json = '{}'::jsonb THEN COALESCE(payload, '{}'::jsonb)
    ELSE payload_json
  END
WHERE old_record_status IS NULL
   OR new_record_status IS NULL
   OR payload_json IS NULL
   OR payload_json = '{}'::jsonb;

UPDATE public.company_partners
SET record_status = CASE
  WHEN COALESCE(is_deleted, false) THEN 'passive'
  WHEN lower(COALESCE(record_status, status, '')) IN ('draft', 'taslak') THEN 'draft'
  WHEN lower(COALESCE(record_status, status, '')) IN ('passive', 'pasif') THEN 'passive'
  ELSE 'active'
END
WHERE record_status IS NULL
   OR lower(record_status) NOT IN ('draft', 'active', 'passive');

ALTER TABLE public.company_partners
  ALTER COLUMN record_status SET DEFAULT 'draft',
  ALTER COLUMN record_status SET NOT NULL,
  DROP CONSTRAINT IF EXISTS company_partners_record_status_check,
  ADD CONSTRAINT company_partners_record_status_check
    CHECK (record_status IN ('draft', 'active', 'passive'));

CREATE INDEX IF NOT EXISTS company_partners_tenant_company_record_status_idx
  ON public.company_partners(tenant_id, company_id, record_status, is_deleted);

CREATE INDEX IF NOT EXISTS company_partners_tenant_person_idx
  ON public.company_partners(tenant_id, person_id)
  WHERE person_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS company_partners_tenant_organization_idx
  ON public.company_partners(tenant_id, organization_id)
  WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS partner_lifecycle_events_tenant_partner_idx
  ON public.partner_ownership_lifecycle_events(tenant_id, partner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ownership_transactions_tenant_company_effective_idx
  ON public.ownership_transactions(tenant_id, company_id, effective_date, approval_status, workflow_status);

CREATE INDEX IF NOT EXISTS ownership_transactions_tenant_partner_effective_idx
  ON public.ownership_transactions(tenant_id, affected_partner_id, from_partner_id, to_partner_id, effective_date);

CREATE OR REPLACE FUNCTION public.company_partner_has_business_history(p_partner_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.ownership_transactions tx
    WHERE COALESCE(tx.is_deleted, false) = false
      AND (
        tx.affected_partner_id = p_partner_id
        OR tx.from_partner_id = p_partner_id
        OR tx.to_partner_id = p_partner_id
      )
  )
  OR EXISTS (
    SELECT 1
    FROM public.partner_ownership_lifecycle_events ev
    WHERE ev.partner_id = p_partner_id
  );
$$;

CREATE OR REPLACE FUNCTION public.prevent_company_partner_illegal_hard_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF COALESCE(OLD.record_status, 'draft') = 'draft'
     AND COALESCE(OLD.is_deleted, false) = false
     AND NOT public.company_partner_has_business_history(OLD.id)
  THEN
    RETURN OLD;
  END IF;

  RAISE EXCEPTION 'PARTNER_DELETE_REQUIRES_OWNERSHIP_EXIT'
    USING ERRCODE = 'P0001';
END;
$$;

DROP TRIGGER IF EXISTS trg_company_partners_prevent_illegal_hard_delete ON public.company_partners;
CREATE TRIGGER trg_company_partners_prevent_illegal_hard_delete
  BEFORE DELETE ON public.company_partners
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_company_partner_illegal_hard_delete();

CREATE OR REPLACE FUNCTION public.sync_partner_lifecycle_from_ownership_transaction()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_partner public.company_partners%ROWTYPE;
  v_target_status text;
  v_target_legacy_status text;
  v_target_partner_id uuid;
  v_event_type text;
BEGIN
  IF COALESCE(NEW.is_deleted, false)
     OR NEW.approval_status <> 'approved'
     OR NEW.workflow_status <> 'approved'
  THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
     AND COALESCE(OLD.approval_status, '') = COALESCE(NEW.approval_status, '')
     AND COALESCE(OLD.workflow_status, '') = COALESCE(NEW.workflow_status, '')
  THEN
    RETURN NEW;
  END IF;

  IF NEW.transaction_type = 'initial_partnership_entry' THEN
    v_target_partner_id := NEW.to_partner_id;
    v_target_status := 'active';
    v_target_legacy_status := 'Aktif';
    v_event_type := 'initial_partnership_entry_completed';
  ELSIF NEW.transaction_type = 'Ortaklıktan Çıkış' THEN
    v_target_partner_id := NEW.from_partner_id;
    v_target_status := 'passive';
    v_target_legacy_status := 'Pasif';
    v_event_type := 'ownership_exit_completed';
  ELSE
    RETURN NEW;
  END IF;

  IF v_target_partner_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT *
    INTO v_partner
  FROM public.company_partners
  WHERE id = v_target_partner_id
  FOR UPDATE;

  IF v_partner.id IS NULL THEN
    RETURN NEW;
  END IF;

  IF COALESCE(v_partner.record_status, 'draft') IS DISTINCT FROM v_target_status THEN
    UPDATE public.company_partners
    SET
      record_status = v_target_status,
      status = v_target_legacy_status,
      start_date = CASE WHEN v_target_status = 'active' THEN COALESCE(start_date, NEW.effective_date) ELSE start_date END,
      end_date = CASE WHEN v_target_status = 'passive' THEN COALESCE(NEW.effective_date, end_date) ELSE end_date END,
      updated_at = now(),
      version = COALESCE(version, 1) + 1
    WHERE id = v_target_partner_id;

    INSERT INTO public.partner_ownership_lifecycle_events (
      tenant_id,
      partner_id,
      company_id,
      event_type,
      event_date,
      old_status,
      new_status,
      old_record_status,
      new_record_status,
      payload,
      payload_json
    ) VALUES (
      v_partner.tenant_id,
      v_target_partner_id,
      NEW.company_id,
      v_event_type,
      COALESCE(NEW.effective_date, NEW.transaction_date, CURRENT_DATE),
      v_partner.status,
      v_target_legacy_status,
      v_partner.record_status,
      v_target_status,
      jsonb_build_object('ownership_transaction_id', NEW.id),
      jsonb_build_object('ownership_transaction_id', NEW.id, 'transaction_type', NEW.transaction_type)
    );

    IF to_regclass('public.outbox_events') IS NOT NULL THEN
      INSERT INTO public.outbox_events (
        tenant_id,
        company_id,
        module_key,
        event_type,
        aggregate_type,
        aggregate_id,
        payload_json
      ) VALUES (
        v_partner.tenant_id,
        NEW.company_id,
        'sirket',
        'partner.lifecycle.updated',
        'company_partner',
        v_target_partner_id,
        jsonb_build_object(
          'partner_id', v_target_partner_id,
          'ownership_transaction_id', NEW.id,
          'record_status', v_target_status
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_partner_lifecycle_from_ownership_transaction ON public.ownership_transactions;
CREATE TRIGGER trg_sync_partner_lifecycle_from_ownership_transaction
  AFTER INSERT OR UPDATE OF approval_status, workflow_status, status, is_deleted ON public.ownership_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_partner_lifecycle_from_ownership_transaction();
