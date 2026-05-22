-- Tenant / workspace foundation.
-- This migration is intentionally passive: it prepares tenant metadata and
-- nullable tenant markers without enabling tenant filtering or RLS.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.erp_instances
  ADD COLUMN IF NOT EXISTS tenant_key text,
  ADD COLUMN IF NOT EXISTS tenant_type text NOT NULL DEFAULT 'customer',
  ADD COLUMN IF NOT EXISTS isolation_mode text NOT NULL DEFAULT 'shared_schema',
  ADD COLUMN IF NOT EXISTS schema_name text NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS connection_name text,
  ADD COLUMN IF NOT EXISTS activation_phase text NOT NULL DEFAULT 'foundation',
  ADD COLUMN IF NOT EXISTS activated_at timestamptz,
  ADD COLUMN IF NOT EXISTS parent_instance_id uuid REFERENCES public.erp_instances(id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'erp_instances_isolation_mode_check'
  ) THEN
    ALTER TABLE public.erp_instances
      ADD CONSTRAINT erp_instances_isolation_mode_check
      CHECK (isolation_mode IN ('shared_schema', 'dedicated_schema', 'dedicated_database'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'erp_instances_activation_phase_check'
  ) THEN
    ALTER TABLE public.erp_instances
      ADD CONSTRAINT erp_instances_activation_phase_check
      CHECK (activation_phase IN ('foundation', 'pilot', 'active', 'paused'));
  END IF;
END;
$$;

UPDATE public.erp_instances
SET tenant_key = COALESCE(
  tenant_key,
  code,
  lower(regexp_replace(coalesce(name, id::text), '[^a-zA-Z0-9]+', '-', 'g'))
)
WHERE tenant_key IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS erp_instances_tenant_key_uidx
  ON public.erp_instances(tenant_key)
  WHERE tenant_key IS NOT NULL;

INSERT INTO public.erp_instances (
  id,
  name,
  code,
  tenant_key,
  tenant_type,
  status,
  isolation_mode,
  schema_name,
  activation_phase,
  metadata_json
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'Default Workspace',
  'default',
  'default',
  'internal',
  'active',
  'shared_schema',
  'public',
  'foundation',
  '{"source":"tenant_foundation","note":"Backward-compatible default workspace"}'::jsonb
)
ON CONFLICT (id) DO UPDATE
SET
  tenant_key = COALESCE(public.erp_instances.tenant_key, EXCLUDED.tenant_key),
  tenant_type = COALESCE(public.erp_instances.tenant_type, EXCLUDED.tenant_type),
  isolation_mode = COALESCE(public.erp_instances.isolation_mode, EXCLUDED.isolation_mode),
  schema_name = COALESCE(public.erp_instances.schema_name, EXCLUDED.schema_name),
  activation_phase = COALESCE(public.erp_instances.activation_phase, EXCLUDED.activation_phase),
  metadata_json = COALESCE(public.erp_instances.metadata_json, '{}'::jsonb) || EXCLUDED.metadata_json,
  updated_at = now();

CREATE TABLE IF NOT EXISTS public.tenant_database_bindings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.erp_instances(id) ON DELETE CASCADE,
  isolation_mode text NOT NULL DEFAULT 'shared_schema'
    CHECK (isolation_mode IN ('shared_schema', 'dedicated_schema', 'dedicated_database')),
  schema_name text NOT NULL DEFAULT 'public',
  connection_name text,
  connection_secret_name text,
  read_role_name text,
  write_role_name text,
  status text NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'active', 'readonly', 'disabled', 'migrating')),
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  activated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id)
);

CREATE INDEX IF NOT EXISTS tenant_database_bindings_status_idx
  ON public.tenant_database_bindings(status, isolation_mode);

INSERT INTO public.tenant_database_bindings (
  tenant_id,
  isolation_mode,
  schema_name,
  connection_name,
  status,
  metadata_json,
  activated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'shared_schema',
  'public',
  'default',
  'active',
  '{"source":"tenant_foundation"}'::jsonb,
  now()
)
ON CONFLICT (tenant_id) DO UPDATE
SET
  isolation_mode = EXCLUDED.isolation_mode,
  schema_name = EXCLUDED.schema_name,
  connection_name = EXCLUDED.connection_name,
  status = EXCLUDED.status,
  metadata_json = COALESCE(public.tenant_database_bindings.metadata_json, '{}'::jsonb) || EXCLUDED.metadata_json,
  updated_at = now();

CREATE TABLE IF NOT EXISTS public.tenant_company_scopes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.erp_instances(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  scope_type text NOT NULL DEFAULT 'owned'
    CHECK (scope_type IN ('owned', 'managed', 'shared', 'readonly')),
  is_primary boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'passive')),
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, company_id)
);

CREATE INDEX IF NOT EXISTS tenant_company_scopes_company_idx
  ON public.tenant_company_scopes(company_id, status);

CREATE TABLE IF NOT EXISTS public.tenant_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.erp_instances(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role_key text,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'invited', 'suspended', 'passive')),
  is_default boolean NOT NULL DEFAULT false,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id, role_key)
);

CREATE INDEX IF NOT EXISTS tenant_memberships_user_idx
  ON public.tenant_memberships(user_id, status);

CREATE UNIQUE INDEX IF NOT EXISTS tenant_memberships_default_user_uidx
  ON public.tenant_memberships(user_id)
  WHERE is_default = true AND status = 'active';

CREATE TABLE IF NOT EXISTS public.instance_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL REFERENCES public.erp_instances(id) ON DELETE CASCADE,
  module_code text NOT NULL,
  status text NOT NULL DEFAULT 'enabled'
    CHECK (status IN ('enabled', 'disabled', 'readonly', 'beta')),
  enabled_at timestamptz,
  disabled_at timestamptz,
  settings_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (instance_id, module_code)
);

CREATE INDEX IF NOT EXISTS instance_modules_module_idx
  ON public.instance_modules(module_code, status);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid REFERENCES public.erp_instances(id),
  user_id uuid,
  module_code text,
  resource text NOT NULL,
  record_id text,
  action text NOT NULL,
  before_json jsonb,
  after_json jsonb,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_instance_created_idx
  ON public.audit_logs(instance_id, created_at DESC);

CREATE INDEX IF NOT EXISTS audit_logs_resource_record_idx
  ON public.audit_logs(resource, record_id);

ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS instance_id uuid REFERENCES public.erp_instances(id);

UPDATE public.user_roles
SET instance_id = '00000000-0000-0000-0000-000000000000'
WHERE instance_id IS NULL;

ALTER TABLE public.user_roles
  ALTER COLUMN instance_id SET DEFAULT '00000000-0000-0000-0000-000000000000';

ALTER TABLE public.user_roles
  DROP CONSTRAINT IF EXISTS user_roles_user_id_role_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS user_roles_instance_user_role_uidx
  ON public.user_roles(instance_id, user_id, role_id);

CREATE INDEX IF NOT EXISTS user_roles_instance_user_idx
  ON public.user_roles(instance_id, user_id, status);

DO $$
DECLARE
  table_name text;
  default_tenant uuid := '00000000-0000-0000-0000-000000000000';
  tenant_tables text[] := ARRAY[
    'persons',
    'organizations',
    'companies',
    'organization_units',
    'positions',
    'employees',
    'employee_work_relations',
    'employee_work_lifecycle_events',
    'company_partners',
    'company_representatives',
    'stakeholders',
    'company_lifecycle_events',
    'partner_ownership_lifecycle_events',
    'ownership_transactions',
    'record_history',
    'company_logos',
    'company_public_tax',
    'company_public_sgk',
    'company_public_incentives',
    'company_public_registry',
    'company_public_licenses',
    'company_public_channels',
    'company_nace_codes',
    'company_vehicles',
    'entity_bank_accounts',
    'bank_connections',
    'bank_accounts',
    'bank_cards',
    'financial_institution_movements',
    'account_card_settings',
    'account_movements',
    'cash_transactions',
    'after_sales_records',
    'after_sales_record_events'
  ];
BEGIN
  FOREACH table_name IN ARRAY tenant_tables LOOP
    IF to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.erp_instances(id)',
        table_name
      );

      EXECUTE format(
        'UPDATE public.%I SET tenant_id = %L WHERE tenant_id IS NULL',
        table_name,
        default_tenant
      );

      EXECUTE format(
        'CREATE INDEX IF NOT EXISTS %I ON public.%I(tenant_id)',
        left('idx_' || table_name || '_tenant_id', 60),
        table_name
      );
    END IF;
  END LOOP;
END;
$$;

WITH ranked_companies AS (
  SELECT
    id,
    row_number() OVER (ORDER BY created_at NULLS LAST, id) AS row_no
  FROM public.companies
  WHERE COALESCE(is_deleted, false) = false
)
INSERT INTO public.tenant_company_scopes (
  tenant_id,
  company_id,
  scope_type,
  is_primary,
  status,
  metadata_json
)
SELECT
  '00000000-0000-0000-0000-000000000000',
  id,
  'owned',
  row_no = 1,
  'active',
  '{"source":"tenant_foundation_backfill"}'::jsonb
FROM ranked_companies
ON CONFLICT (tenant_id, company_id) DO NOTHING;

DO $$
BEGIN
  IF to_regclass('public.module_licenses') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'module_licenses'
        AND column_name = 'is_active'
    ) THEN
      INSERT INTO public.instance_modules (instance_id, module_code, status, enabled_at, disabled_at, settings_json)
      SELECT
        '00000000-0000-0000-0000-000000000000',
        module_key,
        CASE WHEN COALESCE(is_active, true) THEN 'enabled' ELSE 'disabled' END,
        CASE WHEN COALESCE(is_active, true) THEN now() ELSE NULL END,
        CASE WHEN COALESCE(is_active, true) THEN NULL ELSE now() END,
        jsonb_build_object('source', 'module_licenses')
      FROM public.module_licenses
      ON CONFLICT (instance_id, module_code) DO UPDATE
      SET
        status = EXCLUDED.status,
        enabled_at = COALESCE(public.instance_modules.enabled_at, EXCLUDED.enabled_at),
        disabled_at = EXCLUDED.disabled_at,
        updated_at = now();
    ELSE
      INSERT INTO public.instance_modules (instance_id, module_code, status, enabled_at, settings_json)
      SELECT
        '00000000-0000-0000-0000-000000000000',
        module_key,
        CASE WHEN COALESCE(status, 'active') = 'active' THEN 'enabled' ELSE 'disabled' END,
        now(),
        jsonb_build_object('source', 'module_licenses')
      FROM public.module_licenses
      ON CONFLICT (instance_id, module_code) DO NOTHING;
    END IF;
  END IF;
END;
$$;

INSERT INTO public.permissions(permission_key, name)
VALUES
  ('tenants.view', 'Tenant / workspace view'),
  ('tenants.manage', 'Tenant / workspace management'),
  ('tenants.switch', 'Tenant / workspace switch')
ON CONFLICT (permission_key) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO public.role_permissions(role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.role_key IN ('super_admin', 'admin', 'yonetici')
  AND p.permission_key IN ('tenants.view', 'tenants.manage', 'tenants.switch')
ON CONFLICT (role_id, permission_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  value text;
BEGIN
  value := NULLIF(current_setting('app.tenant_id', true), '');
  IF value IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN value::uuid;
EXCEPTION WHEN invalid_text_representation THEN
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_current_tenant(p_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM set_config('app.tenant_id', COALESCE(p_tenant_id::text, ''), true);
END;
$$;
