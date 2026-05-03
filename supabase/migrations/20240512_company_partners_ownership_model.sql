ALTER TABLE public.sirket_ortaklar
  ADD COLUMN IF NOT EXISTS owner_kind TEXT NOT NULL DEFAULT 'gercek_kisi',
  ADD COLUMN IF NOT EXISTS source_type TEXT,
  ADD COLUMN IF NOT EXISTS source_id TEXT,
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS identity_number TEXT,
  ADD COLUMN IF NOT EXISTS share_class TEXT NOT NULL DEFAULT 'Adi Pay',
  ADD COLUMN IF NOT EXISTS share_units NUMERIC(18,2),
  ADD COLUMN IF NOT EXISTS nominal_value NUMERIC(18,2),
  ADD COLUMN IF NOT EXISTS capital_amount NUMERIC(18,2),
  ADD COLUMN IF NOT EXISTS share_ratio NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS voting_ratio NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS profit_ratio NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS beneficial_owner BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS beneficial_ratio NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS beneficial_note TEXT,
  ADD COLUMN IF NOT EXISTS has_representation_right BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_board_nomination_right BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Aktif',
  ADD COLUMN IF NOT EXISTS document_reference_id TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS history JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by TEXT;

UPDATE public.sirket_ortaklar
SET
  owner_kind = CASE WHEN ortak_tipi = 'sirket' THEN 'tuzel_kisi' ELSE 'gercek_kisi' END,
  display_name = COALESCE(display_name, ortak_adi),
  identity_number = COALESCE(identity_number, tckn_vkn),
  share_ratio = COALESCE(share_ratio, hisse_orani),
  has_representation_right = COALESCE(has_representation_right, imza_yetkisi, false),
  status = COALESCE(status, 'Aktif')
WHERE display_name IS NULL
   OR identity_number IS NULL
   OR share_ratio IS NULL
   OR status IS NULL;

ALTER TABLE public.sirket_ortaklar
  DROP CONSTRAINT IF EXISTS sirket_ortaklar_owner_kind_check,
  DROP CONSTRAINT IF EXISTS sirket_ortaklar_status_check,
  DROP CONSTRAINT IF EXISTS sirket_ortaklar_share_class_check,
  DROP CONSTRAINT IF EXISTS sirket_ortaklar_share_ratio_check,
  DROP CONSTRAINT IF EXISTS sirket_ortaklar_voting_ratio_check,
  DROP CONSTRAINT IF EXISTS sirket_ortaklar_profit_ratio_check,
  DROP CONSTRAINT IF EXISTS sirket_ortaklar_beneficial_ratio_check;

ALTER TABLE public.sirket_ortaklar
  ADD CONSTRAINT sirket_ortaklar_owner_kind_check
  CHECK (owner_kind IN ('gercek_kisi', 'tuzel_kisi')),
  ADD CONSTRAINT sirket_ortaklar_status_check
  CHECK (status IN ('Aktif', 'Pasif', 'Devredildi', 'Askıda', 'Tasfiye Sürecinde')),
  ADD CONSTRAINT sirket_ortaklar_share_class_check
  CHECK (share_class IN ('Adi Pay', 'İmtiyazlı Pay', 'Nama Yazılı', 'Hamiline', 'Kurucu Payı', 'Yatırımcı Payı', 'Diğer')),
  ADD CONSTRAINT sirket_ortaklar_share_ratio_check
  CHECK (share_ratio IS NULL OR (share_ratio >= 0 AND share_ratio <= 100)),
  ADD CONSTRAINT sirket_ortaklar_voting_ratio_check
  CHECK (voting_ratio IS NULL OR (voting_ratio >= 0 AND voting_ratio <= 100)),
  ADD CONSTRAINT sirket_ortaklar_profit_ratio_check
  CHECK (profit_ratio IS NULL OR (profit_ratio >= 0 AND profit_ratio <= 100)),
  ADD CONSTRAINT sirket_ortaklar_beneficial_ratio_check
  CHECK (beneficial_ratio IS NULL OR (beneficial_ratio >= 0 AND beneficial_ratio <= 100));

CREATE INDEX IF NOT EXISTS idx_ortaklar_sirket_active
  ON public.sirket_ortaklar(sirket_id, is_deleted, status);

CREATE INDEX IF NOT EXISTS idx_ortaklar_source
  ON public.sirket_ortaklar(sirket_id, owner_kind, source_type, source_id);

CREATE INDEX IF NOT EXISTS idx_ortaklar_history
  ON public.sirket_ortaklar USING GIN(history);
