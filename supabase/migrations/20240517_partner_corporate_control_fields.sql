ALTER TABLE public.sirket_ortaklar
  ADD COLUMN IF NOT EXISTS has_control_right BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS control_type TEXT,
  ADD COLUMN IF NOT EXISTS has_veto_right BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_privileged_share BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_beneficial_owner BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_ultimate_controller BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_by TEXT,
  ADD COLUMN IF NOT EXISTS updated_by TEXT;

UPDATE public.sirket_ortaklar
SET
  is_beneficial_owner = COALESCE(is_beneficial_owner, beneficial_owner, false),
  has_privileged_share = COALESCE(has_privileged_share, share_class = 'İmtiyazlı Pay', false)
WHERE is_beneficial_owner IS DISTINCT FROM COALESCE(beneficial_owner, false)
   OR has_privileged_share IS DISTINCT FROM COALESCE(share_class = 'İmtiyazlı Pay', false);

ALTER TABLE public.sirket_ortaklar
  DROP CONSTRAINT IF EXISTS sirket_ortaklar_status_check,
  DROP CONSTRAINT IF EXISTS sirket_ortaklar_control_type_check;

ALTER TABLE public.sirket_ortaklar
  ADD CONSTRAINT sirket_ortaklar_status_check
  CHECK (status IN ('Aktif', 'Pasif', 'Devredildi', 'Askıda', 'Askıda', 'Tarihsel', 'Tasfiye Sürecinde', 'Tasfiye Sürecinde')),
  ADD CONSTRAINT sirket_ortaklar_control_type_check
  CHECK (
    control_type IS NULL OR
    control_type IN ('Hisse Çoğunluğu', 'Oy Çoğunluğu', 'Sözleşmesel Kontrol', 'Yönetim Kontrolü', 'Altın Hisse', 'Diğer')
  );

CREATE INDEX IF NOT EXISTS idx_ortaklar_group_source
  ON public.sirket_ortaklar(source_type, source_id)
  WHERE is_deleted = false AND status = 'Aktif';

CREATE INDEX IF NOT EXISTS idx_ortaklar_control
  ON public.sirket_ortaklar(sirket_id, has_control_right, control_type)
  WHERE is_deleted = false;
