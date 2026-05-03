ALTER TABLE public.sirket_ortaklar
  ADD COLUMN IF NOT EXISTS photo_logo JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS partner_documents JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS partner_profile JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.sirket_ortaklar
SET
  photo_logo = COALESCE(photo_logo, '[]'::jsonb),
  partner_documents = COALESCE(partner_documents, '[]'::jsonb),
  partner_profile = COALESCE(partner_profile, '{}'::jsonb);
