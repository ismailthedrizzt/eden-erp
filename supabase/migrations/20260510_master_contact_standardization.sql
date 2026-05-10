ALTER TABLE public.persons
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS district TEXT;

UPDATE public.persons
SET metadata_json = jsonb_set(
  COALESCE(metadata_json, '{}'::jsonb),
  '{contact}',
  jsonb_strip_nulls(jsonb_build_object(
    'telefonlar',
    CASE
      WHEN phone IS NULL OR btrim(phone) = '' THEN '[]'::jsonb
      ELSE jsonb_build_array(jsonb_build_object('etiket', 'Birincil', 'numara', phone))
    END,
    'epostalar',
    CASE
      WHEN email IS NULL OR btrim(email) = '' THEN '[]'::jsonb
      ELSE jsonb_build_array(jsonb_build_object('etiket', 'Birincil', 'adres', lower(email)))
    END
  )),
  true
)
WHERE NOT COALESCE(metadata_json, '{}'::jsonb) ? 'contact';

NOTIFY pgrst, 'reload schema';

UPDATE public.organizations
SET metadata_json = jsonb_set(
  COALESCE(metadata_json, '{}'::jsonb),
  '{contact}',
  jsonb_strip_nulls(jsonb_build_object(
    'telefonlar',
    CASE
      WHEN phone IS NULL OR btrim(phone) = '' THEN '[]'::jsonb
      ELSE jsonb_build_array(jsonb_build_object('etiket', 'Birincil', 'numara', phone))
    END,
    'epostalar',
    CASE
      WHEN email IS NULL OR btrim(email) = '' THEN '[]'::jsonb
      ELSE jsonb_build_array(jsonb_build_object('etiket', 'Birincil', 'adres', lower(email)))
    END
  )),
  true
)
WHERE NOT COALESCE(metadata_json, '{}'::jsonb) ? 'contact';
