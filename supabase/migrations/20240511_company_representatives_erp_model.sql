ALTER TABLE public.sirket_temsilciler
  ADD COLUMN IF NOT EXISTS authority_types TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS person_kind TEXT NOT NULL DEFAULT 'gercek_kisi',
  ADD COLUMN IF NOT EXISTS source_type TEXT,
  ADD COLUMN IF NOT EXISTS source_id TEXT,
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Aktif',
  ADD COLUMN IF NOT EXISTS document_reference_id TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS bank_authority_level TEXT,
  ADD COLUMN IF NOT EXISTS transaction_limit NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS payment_approval_limit NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS purchase_approval_limit NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'TRY',
  ADD COLUMN IF NOT EXISTS signature_type TEXT,
  ADD COLUMN IF NOT EXISTS signature_degree TEXT,
  ADD COLUMN IF NOT EXISTS requires_joint_signature BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_approve_alone BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS department_scope TEXT,
  ADD COLUMN IF NOT EXISTS gib_permissions TEXT,
  ADD COLUMN IF NOT EXISTS can_submit_declaration BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_process_e_invoice BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sgk_permissions TEXT,
  ADD COLUMN IF NOT EXISTS can_submit_hiring_notice BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_submit_termination_notice BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS history JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by TEXT;

UPDATE public.sirket_temsilciler
SET
  display_name = COALESCE(display_name, ad_soyad),
  notes = COALESCE(notes, gorev),
  status = COALESCE(status, 'Aktif'),
  authority_types = CASE
    WHEN authority_types = ARRAY[]::TEXT[] AND yetki_turu IS NOT NULL THEN ARRAY[yetki_turu]
    ELSE authority_types
  END
WHERE display_name IS NULL OR notes IS NULL OR authority_types = ARRAY[]::TEXT[];

ALTER TABLE public.sirket_temsilciler
  DROP CONSTRAINT IF EXISTS sirket_temsilciler_person_kind_check,
  DROP CONSTRAINT IF EXISTS sirket_temsilciler_status_check,
  DROP CONSTRAINT IF EXISTS sirket_temsilciler_currency_check,
  DROP CONSTRAINT IF EXISTS sirket_temsilciler_authority_types_check;

ALTER TABLE public.sirket_temsilciler
  ADD CONSTRAINT sirket_temsilciler_person_kind_check
  CHECK (person_kind IN ('gercek_kisi', 'tuzel_kisi')),
  ADD CONSTRAINT sirket_temsilciler_status_check
  CHECK (status IN ('Aktif', 'Pasif', 'Askıda', 'Süresi Dolmuş')),
  ADD CONSTRAINT sirket_temsilciler_currency_check
  CHECK (currency IN ('TRY', 'USD', 'EUR', 'GBP')),
  ADD CONSTRAINT sirket_temsilciler_authority_types_check
  CHECK (
    authority_types <@ ARRAY[
      'imza_yetkilisi',
      'banka_yetkilisi',
      'gib_yetkilisi',
      'sgk_yetkilisi',
      'sozlesme_yetkilisi',
      'satinalma_onay_yetkilisi',
      'odeme_onay_yetkilisi',
      'mesul_mudur',
      'kanuni_temsilci'
    ]::TEXT[]
  );

CREATE INDEX IF NOT EXISTS idx_temsilciler_sirket_active
  ON public.sirket_temsilciler(sirket_id, is_deleted, status);

CREATE INDEX IF NOT EXISTS idx_temsilciler_source
  ON public.sirket_temsilciler(sirket_id, source_type, source_id);

CREATE INDEX IF NOT EXISTS idx_temsilciler_authority_types
  ON public.sirket_temsilciler USING GIN(authority_types);
