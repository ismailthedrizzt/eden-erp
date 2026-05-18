-- Urun ve Hizmetler central catalog.
-- Shared by sales, purchasing, stock, production, license tracking and after-sales modules.

ALTER TABLE public.module_licenses ADD COLUMN IF NOT EXISTS module_name text;
ALTER TABLE public.module_licenses ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE public.module_licenses ADD COLUMN IF NOT EXISTS environment text NOT NULL DEFAULT 'all';

ALTER TABLE public.submodule_licenses ADD COLUMN IF NOT EXISTS submodule_name text;
ALTER TABLE public.submodule_licenses ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE public.submodule_licenses ADD COLUMN IF NOT EXISTS environment text NOT NULL DEFAULT 'all';

CREATE TABLE IF NOT EXISTS public.product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.erp_instances(id),
  company_id uuid REFERENCES public.companies(id),
  parent_id uuid REFERENCES public.product_categories(id),
  code text NOT NULL,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'passive', 'archived')),
  is_active boolean NOT NULL DEFAULT true,
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  deleted_by uuid,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_categories_tenant_code
  ON public.product_categories(COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), code)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_product_categories_parent ON public.product_categories(parent_id) WHERE parent_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.product_brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.erp_instances(id),
  company_id uuid REFERENCES public.companies(id),
  code text NOT NULL,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'passive', 'archived')),
  is_active boolean NOT NULL DEFAULT true,
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  deleted_by uuid,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_brands_tenant_code
  ON public.product_brands(COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), code)
  WHERE is_deleted = false;

CREATE TABLE IF NOT EXISTS public.product_service_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.erp_instances(id),
  company_id uuid REFERENCES public.companies(id),
  code text NOT NULL,
  name text NOT NULL,
  description text,
  item_kind text NOT NULL CHECK (item_kind IN ('product', 'service', 'license_subscription')),
  item_type text NOT NULL CHECK (
    item_type IN (
      'physical_product', 'device', 'equipment', 'spare_part', 'manufactured_product', 'imported_product', 'consumable', 'other',
      'installation', 'maintenance', 'technical_support', 'training', 'consulting', 'integration', 'project_service',
      'single_user', 'multi_user', 'enterprise', 'subscription', 'perpetual', 'trial'
    )
  ),
  category_id uuid REFERENCES public.product_categories(id),
  brand_id uuid REFERENCES public.product_brands(id),
  model text,
  unit text,
  vat_rate numeric(8, 2),
  purchase_price numeric(18, 2),
  sale_price numeric(18, 2),
  currency text NOT NULL DEFAULT 'TRY',

  is_sellable boolean NOT NULL DEFAULT false,
  is_purchasable boolean NOT NULL DEFAULT false,
  is_stock_tracked boolean NOT NULL DEFAULT false,
  is_manufacturable boolean NOT NULL DEFAULT false,
  requires_serial_number boolean NOT NULL DEFAULT false,
  has_warranty_tracking boolean NOT NULL DEFAULT false,
  has_license_tracking boolean NOT NULL DEFAULT false,
  is_serviceable boolean NOT NULL DEFAULT false,
  is_maintenance_contract_eligible boolean NOT NULL DEFAULT false,

  minimum_stock_level numeric(18, 2),
  default_warranty_duration integer,
  default_warranty_unit text CHECK (default_warranty_unit IS NULL OR default_warranty_unit IN ('day', 'month', 'year')),
  default_user_count integer,
  default_license_duration integer,
  default_license_unit text CHECK (default_license_unit IS NULL OR default_license_unit IN ('day', 'month', 'year')),
  is_time_limited_license boolean NOT NULL DEFAULT false,
  is_renewable boolean NOT NULL DEFAULT false,
  is_auto_renewal_eligible boolean NOT NULL DEFAULT false,
  is_periodic_service boolean NOT NULL DEFAULT false,
  can_attach_to_contract boolean NOT NULL DEFAULT false,
  can_attach_to_service_request boolean NOT NULL DEFAULT false,

  attachments_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'passive', 'archived')),
  is_active boolean NOT NULL DEFAULT true,
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  deleted_by uuid,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_service_items_tenant_code
  ON public.product_service_items(COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), code)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_product_service_items_kind_flags
  ON public.product_service_items(item_kind, is_sellable, is_purchasable, is_stock_tracked, is_manufacturable, is_serviceable)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_product_service_items_category ON public.product_service_items(category_id) WHERE category_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_product_service_items_brand ON public.product_service_items(brand_id) WHERE brand_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_product_service_items_tenant ON public.product_service_items(tenant_id) WHERE tenant_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.product_serials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.erp_instances(id),
  company_id uuid REFERENCES public.companies(id),
  code text NOT NULL,
  name text NOT NULL,
  product_service_item_id uuid NOT NULL REFERENCES public.product_service_items(id),
  serial_number text NOT NULL,
  lot_number text,
  supplier_id uuid,
  supplier_name text,
  purchase_date date,
  sale_date date,
  delivery_date date,
  customer_id uuid,
  customer_person_id uuid REFERENCES public.persons(id),
  customer_organization_id uuid REFERENCES public.organizations(id),
  customer_display_name text,
  warranty_start_date date,
  warranty_end_date date,
  warranty_status text,
  status text NOT NULL DEFAULT 'in_stock' CHECK (status IN ('in_stock', 'sold', 'at_customer', 'in_service', 'returned', 'replaced', 'scrapped')),
  notes text,
  attachments_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  deleted_by uuid,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_serials_tenant_serial
  ON public.product_serials(COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), serial_number)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_product_serials_item ON public.product_serials(product_service_item_id, status);
CREATE INDEX IF NOT EXISTS idx_product_serials_customer_org ON public.product_serials(customer_organization_id) WHERE customer_organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_product_serials_customer_person ON public.product_serials(customer_person_id) WHERE customer_person_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.warranty_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.erp_instances(id),
  company_id uuid REFERENCES public.companies(id),
  code text NOT NULL,
  name text NOT NULL,
  description text,
  warranty_duration integer NOT NULL,
  duration_unit text NOT NULL DEFAULT 'month' CHECK (duration_unit IN ('day', 'month', 'year')),
  warranty_type text NOT NULL CHECK (warranty_type IN ('standard', 'extended', 'manufacturer', 'seller', 'service')),
  product_service_item_id uuid REFERENCES public.product_service_items(id),
  category_id uuid REFERENCES public.product_categories(id),
  coverage text,
  exclusions text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'passive', 'archived')),
  is_active boolean NOT NULL DEFAULT true,
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  deleted_by uuid,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_warranty_templates_tenant_code
  ON public.warranty_templates(COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), code)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_warranty_templates_item ON public.warranty_templates(product_service_item_id) WHERE product_service_item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_warranty_templates_category ON public.warranty_templates(category_id) WHERE category_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.maintenance_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.erp_instances(id),
  company_id uuid REFERENCES public.companies(id),
  code text NOT NULL,
  name text NOT NULL,
  description text,
  package_type text NOT NULL CHECK (package_type IN ('periodic_maintenance', 'technical_support', 'sla_package', 'license_maintenance', 'warranty_extension', 'enterprise_support')),
  period text,
  sla_enabled boolean NOT NULL DEFAULT false,
  sla_level text,
  response_time text,
  resolution_time text,
  sale_price numeric(18, 2),
  currency text NOT NULL DEFAULT 'TRY',
  vat_rate numeric(8, 2),
  related_category_id uuid REFERENCES public.product_categories(id),
  is_sellable boolean NOT NULL DEFAULT true,
  notes text,
  attachments_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'passive', 'archived')),
  is_active boolean NOT NULL DEFAULT true,
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  deleted_by uuid,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_maintenance_packages_tenant_code
  ON public.maintenance_packages(COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), code)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_maintenance_packages_category ON public.maintenance_packages(related_category_id) WHERE related_category_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.customer_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.erp_instances(id),
  customer_asset_no text NOT NULL,
  customer_id uuid,
  customer_person_id uuid REFERENCES public.persons(id),
  customer_organization_id uuid REFERENCES public.organizations(id),
  customer_display_name text NOT NULL,
  company_id uuid REFERENCES public.companies(id),
  product_service_item_id uuid NOT NULL REFERENCES public.product_service_items(id),
  product_serial_id uuid REFERENCES public.product_serials(id),
  serial_number text,
  sales_record_id uuid,
  sales_record_ref text,
  license_id uuid,
  warranty_id uuid,
  contract_id uuid,
  delivery_date date,
  installation_date date,
  warranty_start_date date,
  warranty_end_date date,
  license_end_date date,
  location text,
  assigned_to uuid REFERENCES public.employees(id),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'under_warranty', 'out_of_warranty', 'in_service', 'in_maintenance', 'license_expired', 'inactive', 'returned')),
  warranty_status text,
  license_status text,
  service_status text,
  notes text,
  attachments_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  deleted_by uuid,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_assets_tenant_no
  ON public.customer_assets(COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), customer_asset_no)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_customer_assets_customer_org ON public.customer_assets(customer_organization_id, status) WHERE customer_organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customer_assets_customer_person ON public.customer_assets(customer_person_id, status) WHERE customer_person_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customer_assets_item ON public.customer_assets(product_service_item_id, status);
CREATE INDEX IF NOT EXISTS idx_customer_assets_serial ON public.customer_assets(product_serial_id) WHERE product_serial_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customer_assets_warranty_end ON public.customer_assets(warranty_end_date) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_customer_assets_license_end ON public.customer_assets(license_end_date) WHERE is_deleted = false;

DO $$
BEGIN
  IF to_regclass('public.after_sales_records') IS NOT NULL THEN
    ALTER TABLE public.after_sales_records
      ADD COLUMN IF NOT EXISTS product_service_item_id uuid REFERENCES public.product_service_items(id),
      ADD COLUMN IF NOT EXISTS customer_asset_id uuid REFERENCES public.customer_assets(id),
      ADD COLUMN IF NOT EXISTS warranty_template_id uuid REFERENCES public.warranty_templates(id),
      ADD COLUMN IF NOT EXISTS maintenance_package_id uuid REFERENCES public.maintenance_packages(id);

    CREATE INDEX IF NOT EXISTS idx_after_sales_records_product_service_item
      ON public.after_sales_records(product_service_item_id)
      WHERE product_service_item_id IS NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_after_sales_records_customer_asset
      ON public.after_sales_records(customer_asset_id)
      WHERE customer_asset_id IS NOT NULL;
  END IF;
END $$;

INSERT INTO public.permissions (permission_key, name)
VALUES
  ('product_services.view', 'Urun ve Hizmetler goruntuleme'),
  ('product_services.create', 'Urun ve Hizmetler kayit olusturma'),
  ('product_services.edit', 'Urun ve Hizmetler kayit duzenleme'),
  ('product_services.delete', 'Urun ve Hizmetler kayit silme/pasiflestirme'),
  ('product_services.manage', 'Urun ve Hizmetler yonetim')
ON CONFLICT (permission_key) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO public.module_licenses (module_key, module_name, is_active, environment)
VALUES ('product_services', 'Urun ve Hizmetler', true, 'all')
ON CONFLICT (module_key) DO UPDATE
SET module_name = EXCLUDED.module_name,
    is_active = EXCLUDED.is_active,
    environment = EXCLUDED.environment,
    updated_at = now();

INSERT INTO public.submodule_licenses (module_key, submodule_key, submodule_name, is_active, environment)
VALUES
  ('product_services', 'urun-kartlari', 'Urun Kartlari', true, 'all'),
  ('product_services', 'hizmet-kartlari', 'Hizmet Kartlari', true, 'all'),
  ('product_services', 'lisans-abonelik-urunleri', 'Lisans / Abonelik Urunleri', true, 'all'),
  ('product_services', 'seri-numarali-urunler', 'Seri Numarali Urunler', true, 'all'),
  ('product_services', 'garanti-sablonlari', 'Garanti Sablonlari', true, 'all'),
  ('product_services', 'bakim-paketleri', 'Bakim Paketleri', true, 'all')
ON CONFLICT (module_key, submodule_key) DO UPDATE
SET submodule_name = EXCLUDED.submodule_name,
    is_active = EXCLUDED.is_active,
    environment = EXCLUDED.environment,
    updated_at = now();

INSERT INTO public.submodule_licenses (module_key, submodule_key, submodule_name, is_active, environment)
VALUES ('after_sales', 'musterideki-urunler', 'Musterideki Urunler', true, 'all')
ON CONFLICT (module_key, submodule_key) DO UPDATE
SET submodule_name = EXCLUDED.submodule_name,
    is_active = EXCLUDED.is_active,
    environment = EXCLUDED.environment,
    updated_at = now();
