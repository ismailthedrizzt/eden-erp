-- Tenancy module catalog seed.
-- Runtime tenant foundation is stored on erp_instances and tenant_database_bindings.

ALTER TABLE public.module_licenses ADD COLUMN IF NOT EXISTS module_name text;
ALTER TABLE public.module_licenses ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE public.module_licenses ADD COLUMN IF NOT EXISTS environment text NOT NULL DEFAULT 'all';

ALTER TABLE public.submodule_licenses ADD COLUMN IF NOT EXISTS submodule_name text;
ALTER TABLE public.submodule_licenses ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE public.submodule_licenses ADD COLUMN IF NOT EXISTS environment text NOT NULL DEFAULT 'all';

INSERT INTO public.permissions (permission_key, name)
VALUES
  ('tenants.view', 'Tenant / Calisma Alani goruntuleme'),
  ('tenants.create', 'Tenant / Calisma Alani olusturma'),
  ('tenants.edit', 'Tenant / Calisma Alani duzenleme'),
  ('tenants.delete', 'Tenant / Calisma Alani silme/pasiflestirme'),
  ('tenants.manage', 'Tenant / Calisma Alani yonetim'),
  ('tenants.switch', 'Tenant / Calisma Alani degistirme')
ON CONFLICT (permission_key) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO public.module_licenses (module_key, module_name, is_active, environment)
VALUES ('tenancy', 'Tenant / Calisma Alanlari', true, 'all')
ON CONFLICT (module_key) DO UPDATE
SET module_name = EXCLUDED.module_name,
    is_active = EXCLUDED.is_active,
    environment = EXCLUDED.environment,
    updated_at = now();

INSERT INTO public.submodule_licenses (module_key, submodule_key, submodule_name, is_active, environment)
VALUES
  ('tenancy', 'tenant-workspaces', 'Tenant / Calisma Alanlari', true, 'all'),
  ('tenancy', 'schema-provisioning', 'Schema / Instance Hazirlik Plani', true, 'all')
ON CONFLICT (module_key, submodule_key) DO UPDATE
SET submodule_name = EXCLUDED.submodule_name,
    is_active = EXCLUDED.is_active,
    environment = EXCLUDED.environment,
    updated_at = now();
