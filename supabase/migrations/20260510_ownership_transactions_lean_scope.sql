ALTER TABLE public.ownership_transactions
  DROP CONSTRAINT IF EXISTS ownership_transactions_type_check;

UPDATE public.ownership_transactions
SET transaction_type = 'Yeni Ortaklık Girişi'
WHERE transaction_type = 'Yeni Ortak Girişi';

ALTER TABLE public.ownership_transactions
  ADD CONSTRAINT ownership_transactions_type_check CHECK (transaction_type IN (
    'Yeni Ortaklık Girişi',
    'Pay Devri',
    'Kısmi Pay Devri',
    'Ortaklıktan Çıkış',
    'Oy Hakkı Değişikliği',
    'Kar Payı Oranı Değişikliği',
    'İmtiyazlı Pay Tanımı',
    'İmtiyazlı Pay Kaldırma',
    'Düzeltme Kaydı',
    'Ters Kayıt'
  )) NOT VALID;

DROP VIEW IF EXISTS public.v_current_ownership;

CREATE OR REPLACE VIEW public.v_current_ownership AS
WITH approved AS (
  SELECT *
  FROM public.ownership_transactions
  WHERE approval_status = 'approved'
    AND status = 'active'
    AND COALESCE(effective_date, transaction_date) <= CURRENT_DATE
    AND COALESCE(is_deleted, false) = false
),
partner_effects AS (
  SELECT
    company_id,
    to_partner_id AS partner_id,
    share_ratio,
    voting_ratio,
    profit_ratio,
    has_veto_right,
    has_board_nomination_right,
    has_privileged_share,
    transaction_date
  FROM approved
  WHERE to_partner_id IS NOT NULL
    AND transaction_type IN ('Yeni Ortaklık Girişi', 'Pay Devri', 'Kısmi Pay Devri', 'Düzeltme Kaydı', 'Ters Kayıt')

  UNION ALL

  SELECT
    company_id,
    from_partner_id AS partner_id,
    -COALESCE(share_ratio, 0),
    -COALESCE(voting_ratio, 0),
    -COALESCE(profit_ratio, 0),
    false,
    false,
    false,
    transaction_date
  FROM approved
  WHERE from_partner_id IS NOT NULL
    AND transaction_type IN ('Pay Devri', 'Kısmi Pay Devri', 'Ortaklıktan Çıkış')

  UNION ALL

  SELECT
    company_id,
    affected_partner_id AS partner_id,
    CASE WHEN transaction_type IN ('Düzeltme Kaydı', 'Ters Kayıt') THEN share_ratio ELSE NULL END,
    COALESCE(new_voting_ratio, voting_ratio),
    COALESCE(new_profit_ratio, profit_ratio),
    has_veto_right,
    has_board_nomination_right,
    has_privileged_share,
    transaction_date
  FROM approved
  WHERE affected_partner_id IS NOT NULL
    AND transaction_type IN (
      'Oy Hakkı Değişikliği',
      'Kar Payı Oranı Değişikliği',
      'İmtiyazlı Pay Tanımı',
      'İmtiyazlı Pay Kaldırma',
      'Düzeltme Kaydı',
      'Ters Kayıt'
    )
)
SELECT
  p.company_id,
  p.partner_id,
  COALESCE(sp.display_name, sp.ortak_adi, 'Ortak') AS display_name,
  SUM(COALESCE(p.share_ratio, 0)) AS current_share_ratio,
  SUM(COALESCE(p.voting_ratio, 0)) AS current_voting_ratio,
  SUM(COALESCE(p.profit_ratio, 0)) AS current_profit_ratio,
  0::numeric AS current_capital_amount,
  0::numeric AS current_share_units,
  BOOL_OR(COALESCE(p.has_veto_right, false)) AS has_veto_right,
  BOOL_OR(COALESCE(p.has_board_nomination_right, false)) AS has_board_nomination_right,
  BOOL_OR(COALESCE(p.has_privileged_share, false)) AS has_privileged_share,
  MAX(p.transaction_date) AS last_transaction_date
FROM partner_effects p
LEFT JOIN public.sirket_ortaklar sp ON sp.id = p.partner_id
GROUP BY p.company_id, p.partner_id, COALESCE(sp.display_name, sp.ortak_adi, 'Ortak');

NOTIFY pgrst, 'reload schema';
