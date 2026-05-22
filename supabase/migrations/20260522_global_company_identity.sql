-- Legal entity identity is global, while tenant company profiles remain
-- tenant-private. A tenant can manage its own company row for the same legal
-- entity, but only one tenant may own that legal entity at a time.

CREATE UNIQUE INDEX IF NOT EXISTS organizations_global_tax_uidx
  ON public.organizations (
    (
      CASE
        WHEN regexp_replace(upper(coalesce(country, 'TR')), '[^A-Z]', '', 'g') IN ('TR', 'TURKIYE', 'TRKIYE', 'TURKEY')
          THEN 'TR'
        ELSE upper(coalesce(country, 'TR'))
      END
    ),
    tax_number
  )
  WHERE COALESCE(is_deleted, false) = false
    AND NULLIF(tax_number, '') IS NOT NULL;

DROP INDEX IF EXISTS public.companies_global_tax_uidx;

CREATE UNIQUE INDEX IF NOT EXISTS companies_tenant_tax_uidx
  ON public.companies (
    COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid),
    (
      CASE
        WHEN regexp_replace(upper(coalesce(country, 'TR')), '[^A-Z]', '', 'g') IN ('TR', 'TURKIYE', 'TRKIYE', 'TURKEY')
          THEN 'TR'
        ELSE upper(coalesce(country, 'TR'))
      END
    ),
    tax_number
  )
  WHERE COALESCE(is_deleted, false) = false
    AND NULLIF(tax_number, '') IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS tenant_company_scopes_owned_company_uidx
  ON public.tenant_company_scopes(company_id)
  WHERE status = 'active'
    AND scope_type = 'owned';

CREATE OR REPLACE FUNCTION public.enforce_single_owned_company_scope_per_organization()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  new_organization_id uuid;
  existing_scope record;
BEGIN
  IF NEW.status = 'active' AND NEW.scope_type = 'owned' THEN
    SELECT organization_id
    INTO new_organization_id
    FROM public.companies
    WHERE id = NEW.company_id
      AND COALESCE(is_deleted, false) = false;

    IF new_organization_id IS NOT NULL THEN
      SELECT tcs.tenant_id, tcs.company_id
      INTO existing_scope
      FROM public.tenant_company_scopes tcs
      JOIN public.companies c ON c.id = tcs.company_id
      WHERE c.organization_id = new_organization_id
        AND tcs.status = 'active'
        AND tcs.scope_type = 'owned'
        AND NOT (tcs.tenant_id = NEW.tenant_id AND tcs.company_id = NEW.company_id)
      LIMIT 1;

      IF FOUND THEN
        RAISE EXCEPTION 'COMPANY_LEGAL_ENTITY_ALREADY_OWNED'
          USING ERRCODE = '23505';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_single_owned_company_scope_per_organization_trg
  ON public.tenant_company_scopes;

CREATE TRIGGER enforce_single_owned_company_scope_per_organization_trg
BEFORE INSERT OR UPDATE OF company_id, scope_type, status
ON public.tenant_company_scopes
FOR EACH ROW
EXECUTE FUNCTION public.enforce_single_owned_company_scope_per_organization();

ALTER TABLE public.tenant_database_bindings
  ADD COLUMN IF NOT EXISTS protected_data boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS migration_status text NOT NULL DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS migration_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS cutover_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tenant_database_bindings_migration_status_check'
  ) THEN
    ALTER TABLE public.tenant_database_bindings
      ADD CONSTRAINT tenant_database_bindings_migration_status_check
      CHECK (migration_status IN ('not_required', 'planned', 'copying', 'validating', 'ready', 'cutover', 'complete', 'failed'));
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS tenant_database_bindings_protected_idx
  ON public.tenant_database_bindings(protected_data, isolation_mode, status);

CREATE UNIQUE INDEX IF NOT EXISTS tenant_database_bindings_dedicated_connection_uidx
  ON public.tenant_database_bindings(connection_name)
  WHERE isolation_mode = 'dedicated_database'
    AND status IN ('planned', 'active', 'readonly', 'migrating')
    AND NULLIF(connection_name, '') IS NOT NULL;

INSERT INTO public.permissions(permission_key, name)
VALUES
  ('companies.scope.manage', 'Manage tenant company scope')
ON CONFLICT (permission_key) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO public.role_permissions(role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.role_key IN ('super_admin', 'admin', 'yonetici')
  AND p.permission_key = 'companies.scope.manage'
ON CONFLICT (role_id, permission_id) DO NOTHING;

NOTIFY pgrst, 'reload schema';
