-- Public signup flow for requesting access to an existing tenant/company.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.user_registration_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.erp_instances(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  company_tax_number text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  full_name text,
  nationality text NOT NULL DEFAULT 'TR',
  national_id text NOT NULL,
  gender text,
  email text,
  phone text,
  requested_role_key text NOT NULL DEFAULT 'kullanici',
  status text NOT NULL DEFAULT 'pending',
  created_person_id uuid REFERENCES public.persons(id),
  created_membership_id uuid REFERENCES public.tenant_memberships(id),
  created_user_role_id uuid REFERENCES public.user_roles(id),
  reviewed_by uuid,
  reviewed_at timestamptz,
  approval_notes text,
  rejection_reason text,
  notification_results jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_registration_requests_status_check
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  CONSTRAINT user_registration_requests_gender_check
    CHECK (gender IS NULL OR gender IN ('male', 'female'))
);

ALTER TABLE public.user_registration_requests
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.erp_instances(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS company_tax_number text,
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS nationality text NOT NULL DEFAULT 'TR',
  ADD COLUMN IF NOT EXISTS national_id text,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS requested_role_key text NOT NULL DEFAULT 'kullanici',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS created_person_id uuid REFERENCES public.persons(id),
  ADD COLUMN IF NOT EXISTS created_membership_id uuid REFERENCES public.tenant_memberships(id),
  ADD COLUMN IF NOT EXISTS created_user_role_id uuid REFERENCES public.user_roles(id),
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS approval_notes text,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS notification_results jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS user_registration_requests_tenant_status_idx
  ON public.user_registration_requests(tenant_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS user_registration_requests_company_idx
  ON public.user_registration_requests(company_id, status);

CREATE UNIQUE INDEX IF NOT EXISTS user_registration_requests_pending_identity_uidx
  ON public.user_registration_requests(
    tenant_id,
    lower(COALESCE(email, '')),
    COALESCE(phone, ''),
    COALESCE(national_id, '')
  )
  WHERE status = 'pending';

INSERT INTO public.roles(role_key, name, status)
VALUES ('kullanici', 'Kullanici', 'active')
ON CONFLICT (role_key) DO UPDATE
SET name = COALESCE(public.roles.name, EXCLUDED.name),
    status = 'active';
