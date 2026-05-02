ALTER TABLE public.sirketler
  ADD COLUMN IF NOT EXISTS field_history JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.sirketler
SET field_history = '{}'::jsonb
WHERE field_history IS NULL;
