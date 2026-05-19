DO $$
DECLARE
  company_partners_kind "char";
BEGIN
  IF to_regclass('public.sirket_ortaklar') IS NOT NULL THEN
    ALTER TABLE public.sirket_ortaklar
      ALTER COLUMN sirket_id DROP NOT NULL;
  END IF;

  SELECT relkind INTO company_partners_kind
  FROM pg_class
  WHERE oid = to_regclass('public.company_partners');

  IF company_partners_kind IN ('r', 'p') THEN
    ALTER TABLE public.company_partners
      ALTER COLUMN company_id DROP NOT NULL;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
