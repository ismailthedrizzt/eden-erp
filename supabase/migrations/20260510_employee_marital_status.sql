ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS medeni_durum VARCHAR(20);

ALTER TABLE public.employees
  DROP CONSTRAINT IF EXISTS employees_medeni_durum_check;

ALTER TABLE public.employees
  ADD CONSTRAINT employees_medeni_durum_check
  CHECK (medeni_durum IS NULL OR medeni_durum IN ('bekar', 'evli'));
