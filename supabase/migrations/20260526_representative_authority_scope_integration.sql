ALTER TABLE IF EXISTS public.company_representative_authority_transactions
  ADD COLUMN IF NOT EXISTS scope_type text DEFAULT 'company_wide',
  ADD COLUMN IF NOT EXISTS branch_id uuid,
  ADD COLUMN IF NOT EXISTS organization_unit_id uuid,
  ADD COLUMN IF NOT EXISTS facility_id uuid,
  ADD COLUMN IF NOT EXISTS scope_label text,
  ADD COLUMN IF NOT EXISTS scope_notes text;

CREATE INDEX IF NOT EXISTS representative_authority_scope_company_idx
  ON public.company_representative_authority_transactions(company_id, scope_type)
  WHERE COALESCE(is_deleted, false) = false;

CREATE INDEX IF NOT EXISTS representative_authority_scope_branch_idx
  ON public.company_representative_authority_transactions(branch_id)
  WHERE branch_id IS NOT NULL AND COALESCE(is_deleted, false) = false;

CREATE INDEX IF NOT EXISTS representative_authority_scope_unit_idx
  ON public.company_representative_authority_transactions(organization_unit_id)
  WHERE organization_unit_id IS NOT NULL AND COALESCE(is_deleted, false) = false;

CREATE INDEX IF NOT EXISTS representative_authority_scope_facility_idx
  ON public.company_representative_authority_transactions(facility_id)
  WHERE facility_id IS NOT NULL AND COALESCE(is_deleted, false) = false;

CREATE INDEX IF NOT EXISTS representative_authority_scope_rep_idx
  ON public.company_representative_authority_transactions(representative_id, scope_type)
  WHERE COALESCE(is_deleted, false) = false;

CREATE OR REPLACE FUNCTION public.sync_representative_authority_scope_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_scope jsonb := COALESCE(NEW.scope, '{}'::jsonb);
  v_scope_type text := COALESCE(NULLIF(NEW.scope_type, ''), NULLIF(v_scope->>'scope_type', ''), 'company_wide');
BEGIN
  NEW.scope_type := v_scope_type;

  IF v_scope_type = 'company_wide' THEN
    NEW.branch_id := NULL;
    NEW.organization_unit_id := NULL;
    NEW.facility_id := NULL;
  ELSIF v_scope_type = 'branch' THEN
    NEW.branch_id := COALESCE(NEW.branch_id, NULLIF(v_scope->>'branch_id', '')::uuid);
    NEW.organization_unit_id := NULL;
    NEW.facility_id := NULL;
  ELSIF v_scope_type = 'organization_unit' THEN
    NEW.branch_id := NULL;
    NEW.organization_unit_id := COALESCE(NEW.organization_unit_id, NULLIF(v_scope->>'organization_unit_id', '')::uuid);
    NEW.facility_id := NULL;
  ELSIF v_scope_type = 'facility' THEN
    NEW.branch_id := NULL;
    NEW.organization_unit_id := NULL;
    NEW.facility_id := COALESCE(NEW.facility_id, NULLIF(v_scope->>'facility_id', '')::uuid);
  END IF;

  NEW.scope_label := COALESCE(NEW.scope_label, NULLIF(v_scope->>'scope_label', ''));
  NEW.scope_notes := COALESCE(NEW.scope_notes, NULLIF(v_scope->>'scope_notes', ''));
  NEW.scope := v_scope || jsonb_strip_nulls(jsonb_build_object(
    'scope_type', NEW.scope_type,
    'branch_id', NEW.branch_id,
    'organization_unit_id', NEW.organization_unit_id,
    'facility_id', NEW.facility_id,
    'scope_label', NEW.scope_label,
    'scope_notes', NEW.scope_notes
  ));

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_representative_authority_scope_columns_trg
  ON public.company_representative_authority_transactions;

CREATE TRIGGER sync_representative_authority_scope_columns_trg
BEFORE INSERT OR UPDATE OF scope, scope_type, branch_id, organization_unit_id, facility_id, scope_label, scope_notes
ON public.company_representative_authority_transactions
FOR EACH ROW
EXECUTE FUNCTION public.sync_representative_authority_scope_columns();

UPDATE public.company_representative_authority_transactions
SET
  scope_type = COALESCE(NULLIF(scope_type, ''), NULLIF(scope->>'scope_type', ''), 'company_wide'),
  branch_id = CASE
    WHEN COALESCE(NULLIF(scope_type, ''), NULLIF(scope->>'scope_type', ''), 'company_wide') = 'branch'
      THEN COALESCE(branch_id, NULLIF(scope->>'branch_id', '')::uuid)
    ELSE NULL
  END,
  organization_unit_id = CASE
    WHEN COALESCE(NULLIF(scope_type, ''), NULLIF(scope->>'scope_type', ''), 'company_wide') = 'organization_unit'
      THEN COALESCE(organization_unit_id, NULLIF(scope->>'organization_unit_id', '')::uuid)
    ELSE NULL
  END,
  facility_id = CASE
    WHEN COALESCE(NULLIF(scope_type, ''), NULLIF(scope->>'scope_type', ''), 'company_wide') = 'facility'
      THEN COALESCE(facility_id, NULLIF(scope->>'facility_id', '')::uuid)
    ELSE NULL
  END,
  scope_label = COALESCE(scope_label, NULLIF(scope->>'scope_label', '')),
  scope_notes = COALESCE(scope_notes, NULLIF(scope->>'scope_notes', ''))
WHERE scope IS NOT NULL;

DO $$
BEGIN
  IF to_regclass('public.v_current_representative_authorities') IS NOT NULL
     AND to_regclass('public.v_current_representative_authorities_base') IS NULL THEN
    ALTER VIEW public.v_current_representative_authorities RENAME TO v_current_representative_authorities_base;
  END IF;
END $$;

CREATE OR REPLACE VIEW public.v_current_representative_authorities AS
SELECT
  base.*,
  COALESCE(NULLIF(base.scope->>'scope_type', ''), 'company_wide') AS scope_type,
  NULLIF(base.scope->>'branch_id', '') AS branch_id,
  COALESCE(branch.branch_name, branch.branch_short_name) AS branch_name,
  NULLIF(base.scope->>'organization_unit_id', '') AS organization_unit_id,
  COALESCE(unit.name, unit.short_name) AS organization_unit_name,
  NULLIF(base.scope->>'facility_id', '') AS facility_id,
  facility.facility_name AS facility_name,
  COALESCE(
    NULLIF(base.scope->>'scope_label', ''),
    CASE COALESCE(NULLIF(base.scope->>'scope_type', ''), 'company_wide')
      WHEN 'branch' THEN COALESCE('Sube: ' || NULLIF(COALESCE(branch.branch_name, branch.branch_short_name), ''), 'Sube')
      WHEN 'organization_unit' THEN COALESCE('Organizasyon: ' || NULLIF(COALESCE(unit.name, unit.short_name), ''), 'Organizasyon birimi')
      WHEN 'facility' THEN COALESCE('Tesis/Lokasyon: ' || NULLIF(facility.facility_name, ''), 'Tesis/Lokasyon')
      ELSE 'Sirket geneli'
    END
  ) AS scope_label,
  NULLIF(base.scope->>'scope_notes', '') AS scope_notes
FROM public.v_current_representative_authorities_base base
LEFT JOIN public.company_branches branch
  ON branch.id::text = NULLIF(base.scope->>'branch_id', '')
LEFT JOIN public.organization_units unit
  ON unit.id::text = NULLIF(base.scope->>'organization_unit_id', '')
LEFT JOIN public.company_facilities facility
  ON facility.id::text = NULLIF(base.scope->>'facility_id', '');

COMMENT ON VIEW public.v_current_representative_authorities IS
  'Current representative authority read model with branch/organization/facility scope hydration.';
