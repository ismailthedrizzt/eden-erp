ALTER TABLE public.company_partners
  ADD COLUMN IF NOT EXISTS partner_profile jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.company_partners.partner_profile IS
  'Role-specific partner profile data copied from master person or organization records.';
