ALTER TABLE IF EXISTS public.employees
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text;

DO $$
BEGIN
  IF to_regclass('public.employees') IS NOT NULL
     AND to_regclass('public.persons') IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'employees'
         AND column_name = 'person_id'
     ) THEN
    UPDATE public.employees employee
       SET first_name = COALESCE(NULLIF(employee.first_name, ''), person.first_name),
           last_name = COALESCE(NULLIF(employee.last_name, ''), person.last_name)
      FROM public.persons person
     WHERE employee.person_id = person.id
       AND (
         employee.first_name IS NULL
         OR employee.first_name = ''
         OR employee.last_name IS NULL
         OR employee.last_name = ''
       );
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.employees') IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'employees'
         AND column_name = 'record_status'
     ) THEN
    CREATE INDEX IF NOT EXISTS idx_employees_active_name
      ON public.employees(record_status, last_name, first_name);
  END IF;
END $$;
