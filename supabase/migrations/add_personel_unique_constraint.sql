-- Add unique constraint on uyruk + (tc_kimlik or pasaport_no)
-- This prevents duplicate entries for the same person

-- First, remove any existing duplicates
WITH duplicate_tc AS (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY tc_kimlik
        ORDER BY created_at NULLS LAST, id::text
      ) AS row_number
    FROM public.personel
    WHERE tc_kimlik IS NOT NULL
  ) ranked
  WHERE row_number > 1
),
duplicate_pasaport AS (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY pasaport_no
        ORDER BY created_at NULLS LAST, id::text
      ) AS row_number
    FROM public.personel
    WHERE pasaport_no IS NOT NULL
  ) ranked
  WHERE row_number > 1
)
DELETE FROM public.personel
WHERE id IN (
  SELECT id FROM duplicate_tc
  UNION
  SELECT id FROM duplicate_pasaport
);

-- Add unique constraint for Turkish citizens (tc_kimlik must be unique when not null)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'personel_tc_kimlik_unique'
      AND conrelid = 'public.personel'::regclass
  ) THEN
    ALTER TABLE public.personel
    ADD CONSTRAINT personel_tc_kimlik_unique
    UNIQUE (tc_kimlik);
  END IF;
END $$;

-- Add unique constraint for foreigners (pasaport_no must be unique when not null)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'personel_pasaport_unique'
      AND conrelid = 'public.personel'::regclass
  ) THEN
    ALTER TABLE public.personel
    ADD CONSTRAINT personel_pasaport_unique
    UNIQUE (pasaport_no);
  END IF;
END $$;
