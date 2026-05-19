DO $$
DECLARE
  target_table regclass;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    to_regclass('public.employees'),
    to_regclass('public.persons'),
    to_regclass('public.sirket_ortaklar')
  ]
  LOOP
    IF target_table IS NOT NULL THEN
      EXECUTE format(
        'ALTER TABLE %s
          DROP COLUMN IF EXISTS blood_type,
          DROP COLUMN IF EXISTS military_status,
          DROP COLUMN IF EXISTS deferment_date,
          DROP COLUMN IF EXISTS has_disability,
          DROP COLUMN IF EXISTS disability_percentage,
          DROP COLUMN IF EXISTS has_conviction',
        target_table
      );
    END IF;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
