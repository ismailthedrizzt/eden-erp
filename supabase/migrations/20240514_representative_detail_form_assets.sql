ALTER TABLE public.sirket_temsilciler
  ADD COLUMN IF NOT EXISTS photo_logo JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS authority_documents JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS representative_profile JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.sirket_temsilciler
SET
  photo_logo = COALESCE(photo_logo, '[]'::jsonb),
  authority_documents = COALESCE(authority_documents, '[]'::jsonb),
  representative_profile = COALESCE(representative_profile, '{}'::jsonb);
