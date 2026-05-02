ALTER TABLE public.sirketler
  ADD COLUMN IF NOT EXISTS hero_images JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS hero_documents JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.sirketler
SET hero_images = '[]'::jsonb
WHERE hero_images IS NULL;

UPDATE public.sirketler
SET hero_documents = '[]'::jsonb
WHERE hero_documents IS NULL;

ALTER TABLE public.sirketler
  DROP CONSTRAINT IF EXISTS sirketler_sirket_turu_check;

ALTER TABLE public.sirketler
  ADD CONSTRAINT sirketler_sirket_turu_check
  CHECK (sirket_turu IN ('anonim', 'limited', 'komandit', 'kolektif', 'adi_komandit', 'adi_sirket'));
