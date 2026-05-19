DO $$
BEGIN
  IF to_regclass('public.employees') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.employees
      WHERE person_id IS NOT NULL
        AND is_deleted = false
      GROUP BY person_id
      HAVING COUNT(*) > 1
    ) THEN
      CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_unique_person_role
        ON public.employees(person_id)
        WHERE person_id IS NOT NULL AND is_deleted = false;
    ELSE
      RAISE NOTICE 'employees has duplicate person_id role rows; idx_employees_unique_person_role was not created.';
    END IF;
  END IF;

  IF to_regclass('public.company_partners') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.company_partners
      WHERE person_id IS NOT NULL
        AND is_deleted = false
      GROUP BY person_id
      HAVING COUNT(*) > 1
    ) THEN
      CREATE UNIQUE INDEX IF NOT EXISTS idx_company_partners_unique_person_role
        ON public.company_partners(person_id)
        WHERE person_id IS NOT NULL AND is_deleted = false;
    ELSE
      RAISE NOTICE 'company_partners has duplicate person_id role rows; idx_company_partners_unique_person_role was not created.';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.company_partners
      WHERE organization_id IS NOT NULL
        AND is_deleted = false
      GROUP BY organization_id
      HAVING COUNT(*) > 1
    ) THEN
      CREATE UNIQUE INDEX IF NOT EXISTS idx_company_partners_unique_organization_role
        ON public.company_partners(organization_id)
        WHERE organization_id IS NOT NULL AND is_deleted = false;
    ELSE
      RAISE NOTICE 'company_partners has duplicate organization_id role rows; idx_company_partners_unique_organization_role was not created.';
    END IF;
  END IF;

  IF to_regclass('public.stakeholders') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.stakeholders
      WHERE person_id IS NOT NULL
        AND is_deleted = false
      GROUP BY person_id
      HAVING COUNT(*) > 1
    ) THEN
      CREATE UNIQUE INDEX IF NOT EXISTS idx_stakeholders_unique_person_role
        ON public.stakeholders(person_id)
        WHERE person_id IS NOT NULL AND is_deleted = false;
    ELSE
      RAISE NOTICE 'stakeholders has duplicate person_id role rows; idx_stakeholders_unique_person_role was not created.';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.stakeholders
      WHERE organization_id IS NOT NULL
        AND is_deleted = false
      GROUP BY organization_id
      HAVING COUNT(*) > 1
    ) THEN
      CREATE UNIQUE INDEX IF NOT EXISTS idx_stakeholders_unique_organization_role
        ON public.stakeholders(organization_id)
        WHERE organization_id IS NOT NULL AND is_deleted = false;
    ELSE
      RAISE NOTICE 'stakeholders has duplicate organization_id role rows; idx_stakeholders_unique_organization_role was not created.';
    END IF;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.enforce_single_master_role()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  conflict_id uuid;
BEGIN
  IF COALESCE(NEW.is_deleted, false) = true THEN
    RETURN NEW;
  END IF;

  IF NEW.person_id IS NOT NULL THEN
    EXECUTE format(
      'SELECT id FROM public.%I WHERE person_id = $1 AND id IS DISTINCT FROM $2 AND is_deleted = false LIMIT 1',
      TG_TABLE_NAME
    )
    INTO conflict_id
    USING NEW.person_id, NEW.id;

    IF conflict_id IS NOT NULL THEN
      RAISE EXCEPTION 'DUPLICATE_ROLE_MASTER: person_id already exists in %', TG_TABLE_NAME
        USING ERRCODE = '23505';
    END IF;
  END IF;

  IF TG_TABLE_NAME <> 'employees' AND NEW.organization_id IS NOT NULL THEN
    EXECUTE format(
      'SELECT id FROM public.%I WHERE organization_id = $1 AND id IS DISTINCT FROM $2 AND is_deleted = false LIMIT 1',
      TG_TABLE_NAME
    )
    INTO conflict_id
    USING NEW.organization_id, NEW.id;

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
