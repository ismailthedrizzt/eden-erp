-- Satış Sonrası Hizmetler module
-- Tracks warranty, license, service/support, maintenance and contract follow-up records.

ALTER TABLE public.module_licenses ADD COLUMN IF NOT EXISTS module_name text;
ALTER TABLE public.module_licenses ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE public.module_licenses ADD COLUMN IF NOT EXISTS environment text NOT NULL DEFAULT 'all';

ALTER TABLE public.submodule_licenses ADD COLUMN IF NOT EXISTS submodule_name text;
ALTER TABLE public.submodule_licenses ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE public.submodule_licenses ADD COLUMN IF NOT EXISTS environment text NOT NULL DEFAULT 'all';

CREATE TABLE IF NOT EXISTS public.after_sales_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_no text NOT NULL UNIQUE,
  record_type text NOT NULL CHECK (record_type IN ('warranty', 'license', 'service', 'maintenance_contract')),
  title text NOT NULL,

  owner_company_id uuid REFERENCES public.companies(id),
  related_company_id uuid REFERENCES public.companies(id),
  scope_company_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],

  customer_person_id uuid REFERENCES public.persons(id),
  customer_organization_id uuid REFERENCES public.organizations(id),
  customer_display_name text NOT NULL,

  product_service_id uuid,
  product_service_name text NOT NULL,
  product_service_kind text NOT NULL DEFAULT 'product' CHECK (product_service_kind IN ('product', 'device', 'software', 'license', 'service')),
  serial_or_license_no text,

  responsible_employee_id uuid REFERENCES public.employees(id),
  sales_record_id uuid,
  sales_record_ref text,

  status text NOT NULL DEFAULT 'active',
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  start_date date,
  end_date date,
  renewal_date date,
  next_action_date date,
  sla_due_at timestamptz,
  last_contact_at timestamptz,

  contact_name text,
  contact_email text,
  contact_phone text,
  preferred_contact_channel text DEFAULT 'email' CHECK (preferred_contact_channel IN ('phone', 'email', 'portal', 'whatsapp', 'onsite')),
  portal_visibility text NOT NULL DEFAULT 'internal' CHECK (portal_visibility IN ('internal', 'customer_visible', 'partner_visible')),

  warning_count integer NOT NULL DEFAULT 0,
  alert_note text,
  notes text,

  -- Reserved integration surfaces for later phases. No portal, WhatsApp, email automation,
  -- auto billing, or advanced SLA processing is executed by this migration.
  portal_policy_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  contact_policy_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  billing_policy_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  sla_policy_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,

  record_status text NOT NULL DEFAULT 'active' CHECK (record_status IN ('active', 'passive')),
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  deleted_by uuid,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_after_sales_records_type_status ON public.after_sales_records(record_type, status, record_status, is_deleted);
CREATE INDEX IF NOT EXISTS idx_after_sales_records_owner_company ON public.after_sales_records(owner_company_id, record_status, is_deleted);
CREATE INDEX IF NOT EXISTS idx_after_sales_records_customer_person ON public.after_sales_records(customer_person_id) WHERE customer_person_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_after_sales_records_customer_org ON public.after_sales_records(customer_organization_id) WHERE customer_organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_after_sales_records_responsible ON public.after_sales_records(responsible_employee_id) WHERE responsible_employee_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_after_sales_records_end_date ON public.after_sales_records(end_date) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_after_sales_records_renewal_date ON public.after_sales_records(renewal_date) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_after_sales_records_sla_due ON public.after_sales_records(sla_due_at) WHERE is_deleted = false;

CREATE TABLE IF NOT EXISTS public.after_sales_record_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id uuid NOT NULL REFERENCES public.after_sales_records(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_at timestamptz NOT NULL DEFAULT now(),
  actor_employee_id uuid REFERENCES public.employees(id),
  actor_user_id uuid,
  channel text,
  summary text,
  payload_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_after_sales_record_events_record ON public.after_sales_record_events(record_id, event_at DESC);

INSERT INTO public.permissions (permission_key, name)
VALUES
  ('after_sales.view', 'Satış Sonrası Hizmetler görüntüleme'),
  ('after_sales.create', 'Satış Sonrası Hizmetler kayıt oluşturma'),
  ('after_sales.edit', 'Satış Sonrası Hizmetler kayıt düzenleme'),
  ('after_sales.delete', 'Satış Sonrası Hizmetler kayıt silme/pasifleştirme'),
  ('after_sales.manage', 'Satış Sonrası Hizmetler yönetim')
ON CONFLICT (permission_key) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO public.module_licenses (module_key, module_name, is_active, environment)
VALUES ('after_sales', 'Satış Sonrası Hizmetler', true, 'all')
ON CONFLICT (module_key) DO UPDATE
SET module_name = EXCLUDED.module_name,
    is_active = EXCLUDED.is_active,
    environment = EXCLUDED.environment,
    updated_at = now();

INSERT INTO public.submodule_licenses (module_key, submodule_key, submodule_name, is_active, environment)
VALUES
  ('after_sales', 'garanti-takip', 'Garanti Takip', true, 'all'),
  ('after_sales', 'lisans-takip', 'Lisans Takip', true, 'all'),
  ('after_sales', 'servis-destek-kayitlari', 'Servis ve Destek Kayıtları', true, 'all'),
  ('after_sales', 'bakim-sozlesme-takip', 'Bakım ve Sözleşme Takip', true, 'all')
ON CONFLICT (module_key, submodule_key) DO UPDATE
SET submodule_name = EXCLUDED.submodule_name,
    is_active = EXCLUDED.is_active,
    environment = EXCLUDED.environment,
    updated_at = now();
