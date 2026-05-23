-- Store company fiscal year start as MMDD integer: 101 = 01 Jan, 401 = 01 Apr.
ALTER TABLE public.companies
  ALTER COLUMN fiscal_year_start SET DEFAULT 101;

UPDATE public.companies
SET fiscal_year_start = fiscal_year_start * 100 + 1
WHERE fiscal_year_start BETWEEN 1 AND 12;

ALTER TABLE public.companies
  DROP CONSTRAINT IF EXISTS companies_fiscal_year_start_month_day_chk;

ALTER TABLE public.companies
  ADD CONSTRAINT companies_fiscal_year_start_month_day_chk
  CHECK (
    fiscal_year_start / 100 BETWEEN 1 AND 12
    AND fiscal_year_start % 100 BETWEEN 1 AND CASE fiscal_year_start / 100
      WHEN 2 THEN 29
      WHEN 4 THEN 30
      WHEN 6 THEN 30
      WHEN 9 THEN 30
      WHEN 11 THEN 30
      ELSE 31
    END
  );
