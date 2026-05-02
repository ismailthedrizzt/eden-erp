DO $$
BEGIN
  UPDATE public.employees
  SET tc_kimlik = NULL
  WHERE tc_kimlik = '';

  UPDATE public.employees
  SET pasaport_no = NULL
  WHERE pasaport_no = '';

  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'personel_tc_kimlik_unique'
      AND conrelid = 'public.employees'::regclass
  ) THEN
    ALTER TABLE public.employees
    RENAME CONSTRAINT personel_tc_kimlik_unique TO employees_tc_kimlik_unique;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'personel_pasaport_unique'
      AND conrelid = 'public.employees'::regclass
  ) THEN
    ALTER TABLE public.employees
    RENAME CONSTRAINT personel_pasaport_unique TO employees_pasaport_unique;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.employees
    WHERE tc_kimlik IS NOT NULL
      AND tc_kimlik <> ''
    GROUP BY tc_kimlik
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate TC Kimlik values exist in employees. Clean duplicates before applying unique constraint.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.employees
    WHERE pasaport_no IS NOT NULL
      AND pasaport_no <> ''
    GROUP BY pasaport_no
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate passport values exist in employees. Clean duplicates before applying unique constraint.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'employees_tc_kimlik_unique'
      AND conrelid = 'public.employees'::regclass
  ) THEN
    ALTER TABLE public.employees
    ADD CONSTRAINT employees_tc_kimlik_unique
    UNIQUE (tc_kimlik);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'employees_pasaport_unique'
      AND conrelid = 'public.employees'::regclass
  ) THEN
    ALTER TABLE public.employees
    ADD CONSTRAINT employees_pasaport_unique
    UNIQUE (pasaport_no);
  END IF;
END $$;
