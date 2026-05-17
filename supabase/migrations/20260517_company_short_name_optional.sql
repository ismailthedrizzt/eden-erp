ALTER TABLE IF EXISTS public.companies
  ALTER COLUMN short_name DROP NOT NULL;

ALTER TABLE IF EXISTS public.organizations
  ALTER COLUMN short_name DROP NOT NULL;

ALTER TABLE IF EXISTS public.organization_units
  ALTER COLUMN short_name DROP NOT NULL;
