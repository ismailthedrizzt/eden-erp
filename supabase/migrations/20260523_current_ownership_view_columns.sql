CREATE OR REPLACE VIEW public.v_current_ownership AS
SELECT
  company_id,
  id AS partner_id,
  display_name,
  COALESCE(share_ratio, 0) AS current_share_ratio,
  COALESCE(voting_ratio, 0) AS current_voting_ratio,
  COALESCE(profit_ratio, 0) AS current_profit_ratio,
  COALESCE(capital_amount, 0) AS current_capital_amount,
  COALESCE(share_units, 0) AS current_share_units,
  COALESCE(has_control_right, false) AS has_control_right,
  control_type,
  COALESCE(has_veto_right, false) AS has_veto_right,
  COALESCE(has_board_nomination_right, false) AS has_board_nomination_right,
  COALESCE(has_privileged_share, false) AS has_privileged_share,
  COALESCE(is_beneficial_owner, false) AS is_beneficial_owner,
  COALESCE(beneficial_ratio, 0) AS beneficial_ratio,
  ARRAY[]::text[] AS warnings
FROM public.company_partners
WHERE is_deleted = false;
