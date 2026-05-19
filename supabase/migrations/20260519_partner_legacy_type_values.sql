DO $$
BEGIN
  IF to_regclass('public.sirket_ortaklar') IS NOT NULL THEN
    ALTER TABLE public.sirket_ortaklar
      DROP CONSTRAINT IF EXISTS sirket_ortaklar_ortak_tipi_check;

    ALTER TABLE public.sirket_ortaklar
      ADD CONSTRAINT sirket_ortaklar_ortak_tipi_check
      CHECK (ortak_tipi = ANY (ARRAY['kisi'::text, 'sirket'::text, 'person'::text, 'organization'::text, 'company'::text]));

    ALTER TABLE public.sirket_ortaklar
      DROP CONSTRAINT IF EXISTS sirket_ortaklar_owner_kind_check;

    ALTER TABLE public.sirket_ortaklar
      ADD CONSTRAINT sirket_ortaklar_owner_kind_check
      CHECK (owner_kind = ANY (ARRAY['gercek_kisi'::text, 'tuzel_kisi'::text, 'person'::text, 'organization'::text]));
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
