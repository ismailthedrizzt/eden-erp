drop view if exists public.v_current_ownership;
drop view if exists public.v_account_cards;

alter table if exists public.employees
  drop column if exists is_deleted,
  drop column if exists deleted_at,
  drop column if exists deleted_by;

alter table if exists public.employee_work_relations
  drop column if exists is_deleted,
  drop column if exists deleted_at,
  drop column if exists deleted_by;

alter table if exists public.sirket_ortaklar
  drop column if exists is_deleted,
  drop column if exists deleted_at,
  drop column if exists deleted_by;

create index if not exists idx_employees_record_status_fast
  on public.employees(record_status, soyad, ad, id);

create index if not exists idx_employee_work_relations_status
  on public.employee_work_relations(employee_id, status);

create index if not exists idx_sirket_ortaklar_record_status_fast
  on public.sirket_ortaklar(company_id, record_status, created_at desc);

create or replace view public.v_current_ownership as
with approved as (
  select *
  from public.ownership_transactions
  where approval_status = 'approved'
    and status = 'active'
    and coalesce(effective_date, transaction_date) <= current_date
),
partner_effects as (
  select
    company_id,
    to_partner_id as partner_id,
    share_ratio,
    voting_ratio,
    profit_ratio,
    has_veto_right,
    has_board_nomination_right,
    has_privileged_share,
    transaction_date
  from approved
  where to_partner_id is not null
    and transaction_type in ('Yeni Ortaklık Girişi', 'Pay Devri', 'Kısmi Pay Devri', 'Düzeltme Kaydı', 'Ters Kayıt')
  union all
  select
    company_id,
    from_partner_id as partner_id,
    -coalesce(share_ratio, 0),
    -coalesce(voting_ratio, 0),
    -coalesce(profit_ratio, 0),
    false,
    false,
    false,
    transaction_date
  from approved
  where from_partner_id is not null
    and transaction_type in ('Pay Devri', 'Kısmi Pay Devri', 'Ortaklıktan Çıkış')
  union all
  select
    company_id,
    affected_partner_id as partner_id,
    case when transaction_type in ('Düzeltme Kaydı', 'Ters Kayıt') then share_ratio else null end,
    coalesce(new_voting_ratio, voting_ratio),
    coalesce(new_profit_ratio, profit_ratio),
    has_veto_right,
    has_board_nomination_right,
    has_privileged_share,
    transaction_date
  from approved
  where affected_partner_id is not null
)
select
  p.company_id,
  p.partner_id,
  coalesce(sp.display_name, sp.ortak_adi, 'Ortak') as display_name,
  sum(coalesce(p.share_ratio, 0)) as current_share_ratio,
  sum(coalesce(p.voting_ratio, 0)) as current_voting_ratio,
  sum(coalesce(p.profit_ratio, 0)) as current_profit_ratio,
  0::numeric as current_capital_amount,
  0::numeric as current_share_units,
  bool_or(coalesce(p.has_veto_right, false)) as has_veto_right,
  bool_or(coalesce(p.has_board_nomination_right, false)) as has_board_nomination_right,
  bool_or(coalesce(p.has_privileged_share, false)) as has_privileged_share,
  max(p.transaction_date) as last_transaction_date
from partner_effects p
left join public.sirket_ortaklar sp on sp.id = p.partner_id
where coalesce(sp.record_status, 'active') <> 'passive'
group by p.company_id, p.partner_id, coalesce(sp.display_name, sp.ortak_adi, 'Ortak');

create or replace view public.v_account_cards as
select
  acs.company_id,
  acs.entity_kind,
  acs.person_id,
  acs.organization_id,
  coalesce(p.full_name, o.legal_name) as display_name,
  p.national_id as identity_no,
  o.tax_number as tax_no,
  array[]::text[] as roles,
  acs.account_code,
  0::numeric as official_balance,
  0::numeric as pending_balance,
  0::numeric as projected_balance,
  coalesce(acs.default_currency, 'TRY') as currency,
  null::date as last_movement_date,
  'normal'::text as risk_status,
  coalesce(acs.status, 'passive') as status
from public.account_card_settings acs
left join public.persons p on acs.person_id = p.id
left join public.organizations o on acs.organization_id = o.id
where coalesce(acs.status, 'active') <> 'passive';

notify pgrst, 'reload schema';
