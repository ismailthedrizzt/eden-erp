ALTER TABLE public.sirketler
  ADD COLUMN IF NOT EXISTS electronic_notification_address TEXT,
  ADD COLUMN IF NOT EXISTS trade_registry_office TEXT,
  ADD COLUMN IF NOT EXISTS company_status TEXT NOT NULL DEFAULT 'aktif';

ALTER TABLE public.sirketler
  DROP CONSTRAINT IF EXISTS sirketler_company_status_check;

ALTER TABLE public.sirketler
  ADD CONSTRAINT sirketler_company_status_check
  CHECK (company_status IN ('aktif', 'tasfiye_halinde', 'terkin_edilmis'));

UPDATE public.sirketler
SET company_status = CASE
  WHEN COALESCE(is_active, true) = true THEN 'aktif'
  ELSE 'terkin_edilmis'
END
WHERE company_status IS NULL;

CREATE INDEX IF NOT EXISTS idx_sirketler_company_status
  ON public.sirketler(company_status);

CREATE INDEX IF NOT EXISTS idx_sirketler_trade_registry_office
  ON public.sirketler(trade_registry_office);
