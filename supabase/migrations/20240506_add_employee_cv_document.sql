ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS cv_belgesi JSONB;
