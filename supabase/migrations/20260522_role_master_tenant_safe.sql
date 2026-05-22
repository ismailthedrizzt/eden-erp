-- Role master uniqueness should be checked inside the current tenant scope.
-- The previous trigger also tried to read organization_id on employees, where
-- that column does not exist.

DROP INDEX IF EXISTS public.idx_employees_unique_person_role;
DROP INDEX IF EXISTS public.idx_company_partners_unique_person_role;
DROP INDEX IF EXISTS public.idx_company_partners_unique_organization_role;
DROP INDEX IF EXISTS public.idx_stakeholders_unique_person_role;
DROP INDEX IF EXISTS public.idx_stakeholders_unique_organization_role;

DO $$
DECLARE
  default_tenant uuid := '00000000-0000-0000-0000-000000000000'::uuid;
BEGIN
  IF to_regclass('public.employees') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.employees
      WHERE person_id IS NOT NULL
        AND is_deleted = false
      GROUP BY COALESCE(tenant_id, default_tenant), person_id
      HAVING COUNT(*) > 1
    ) THEN
      CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_unique_tenant_person_role
        ON public.employees(COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), person_id)
        WHERE person_id IS NOT NULL AND is_deleted = false;
    ELSE
      RAISE NOTICE 'employees has duplicate tenant/person role rows; idx_employees_unique_tenant_person_role was not created.';
    END IF;
  END IF;

  IF to_regclass('public.company_partners') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.company_partners
      WHERE person_id IS NOT NULL
        AND is_deleted = false
      GROUP BY COALESCE(tenant_id, default_tenant), person_id
      HAVING COUNT(*) > 1
    ) THEN
      CREATE UNIQUE INDEX IF NOT EXISTS idx_company_partners_unique_tenant_person_role
        ON public.company_partners(COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), person_id)
        WHERE person_id IS NOT NULL AND is_deleted = false;
    ELSE
      RAISE NOTICE 'company_partners has duplicate tenant/person role rows; idx_company_partners_unique_tenant_person_role was not created.';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.company_partners
      WHERE organization_id IS NOT NULL
        AND is_deleted = false
      GROUP BY COALESCE(tenant_id, default_tenant), organization_id
      HAVING COUNT(*) > 1
    ) THEN
      CREATE UNIQUE INDEX IF NOT EXISTS idx_company_partners_unique_tenant_organization_role
        ON public.company_partners(COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), organization_id)
        WHERE organization_id IS NOT NULL AND is_deleted = false;
    ELSE
      RAISE NOTICE 'company_partners has duplicate tenant/organization role rows; idx_company_partners_unique_tenant_organization_role was not created.';
    END IF;
  END IF;

  IF to_regclass('public.stakeholders') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.stakeholders
      WHERE person_id IS NOT NULL
        AND is_deleted = false
      GROUP BY COALESCE(tenant_id, default_tenant), person_id
      HAVING COUNT(*) > 1
    ) THEN
      CREATE UNIQUE INDEX IF NOT EXISTS idx_stakeholders_unique_tenant_person_role
        ON public.stakeholders(COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), person_id)
        WHERE person_id IS NOT NULL AND is_deleted = false;
    ELSE
      RAISE NOTICE 'stakeholders has duplicate tenant/person role rows; idx_stakeholders_unique_tenant_person_role was not created.';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.stakeholders
      WHERE organization_id IS NOT NULL
        AND is_deleted = false
      GROUP BY COALESCE(tenant_id, default_tenant), organization_id
      HAVING COUNT(*) > 1
    ) THEN
      CREATE UNIQUE INDEX IF NOT EXISTS idx_stakeholders_unique_tenant_organization_role
        ON public.stakeholders(COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), organization_id)
        WHERE organization_id IS NOT NULL AND is_deleted = false;
    ELSE
      RAISE NOTICE 'stakeholders has duplicate tenant/organization role rows; idx_stakeholders_unique_tenant_organization_role was not created.';
    END IF;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.enforce_single_master_role()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  conflict_id uuid;
  default_tenant uuid := '00000000-0000-0000-0000-000000000000'::uuid;
  row_data jsonb;
  scoped_tenant uuid;
  organization_id uuid;
BEGIN
  IF COALESCE(NEW.is_deleted, false) = true THEN
    RETURN NEW;
  END IF;

  row_data := to_jsonb(NEW);
  scoped_tenant := NULLIF(row_data->>'tenant_id', '')::uuid;

  IF NEW.person_id IS NOT NULL THEN
    IF row_data ? 'tenant_id' THEN
      EXECUTE format(
        'SELECT id FROM public.%I WHERE person_id = $1 AND id IS DISTINCT FROM $2 AND is_deleted = false AND COALESCE(tenant_id, $4) = COALESCE($3, $4) LIMIT 1',
        TG_TABLE_NAME
      )
      INTO conflict_id
      USING NEW.person_id, NEW.id, scoped_tenant, default_tenant;
    ELSE
      EXECUTE format(
        'SELECT id FROM public.%I WHERE person_id = $1 AND id IS DISTINCT FROM $2 AND is_deleted = false LIMIT 1',
        TG_TABLE_NAME
      )
      INTO conflict_id
      USING NEW.person_id, NEW.id;
    END IF;

    IF conflict_id IS NOT NULL THEN
      RAISE EXCEPTION 'DUPLICATE_ROLE_MASTER: person_id already exists in %', TG_TABLE_NAME
        USING ERRCODE = '23505';
    END IF;
  END IF;

  IF row_data ? 'organization_id' THEN
    organization_id := NULLIF(row_data->>'organization_id', '')::uuid;
  ELSE
    organization_id := NULL;
  END IF;

  IF organization_id IS NOT NULL THEN
    IF row_data ? 'tenant_id' THEN
      EXECUTE format(
        'SELECT id FROM public.%I WHERE organization_id = $1 AND id IS DISTINCT FROM $2 AND is_deleted = false AND COALESCE(tenant_id, $4) = COALESCE($3, $4) LIMIT 1',
        TG_TABLE_NAME
      )
      INTO conflict_id
      USING organization_id, NEW.id, scoped_tenant, default_tenant;
    ELSE
      EXECUTE format(
        'SELECT id FROM public.%I WHERE organization_id = $1 AND id IS DISTINCT FROM $2 AND is_deleted = false LIMIT 1',
        TG_TABLE_NAME
      )
      INTO conflict_id
      USING organization_id, NEW.id;
    END IF;

    IF conflict_id IS NOT NULL THEN
      RAISE EXCEPTION 'DUPLICATE_ROLE_MASTER: organization_id already exists in %', TG_TABLE_NAME
        USING ERRCODE = '23505';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.employees') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_employees_single_master_role ON public.employees;
    CREATE TRIGGER trg_employees_single_master_role
      BEFORE INSERT OR UPDATE OF person_id, is_deleted
      ON public.employees
      FOR EACH ROW
      EXECUTE FUNCTION public.enforce_single_master_role();
  END IF;

  IF to_regclass('public.company_partners') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_company_partners_single_master_role ON public.company_partners;
    CREATE TRIGGER trg_company_partners_single_master_role
      BEFORE INSERT OR UPDATE OF person_id, organization_id, is_deleted
      ON public.company_partners
      FOR EACH ROW
      EXECUTE FUNCTION public.enforce_single_master_role();
  END IF;

  IF to_regclass('public.stakeholders') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_stakeholders_single_master_role ON public.stakeholders;
    CREATE TRIGGER trg_stakeholders_single_master_role
      BEFORE INSERT OR UPDATE OF person_id, organization_id, is_deleted
      ON public.stakeholders
      FOR EACH ROW
      EXECUTE FUNCTION public.enforce_single_master_role();
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
