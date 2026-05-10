alter table public.ownership_transactions
  add column if not exists committed_capital_amount numeric(18,2),
  add column if not exists new_capital_amount numeric(18,2),
  add column if not exists commitment_date date,
  add column if not exists old_voting_ratio numeric(8,4),
  add column if not exists new_voting_ratio numeric(8,4),
  add column if not exists old_profit_ratio numeric(8,4),
  add column if not exists new_profit_ratio numeric(8,4),
  add column if not exists privilege_description text,
  add column if not exists privilege_start_date date,
  add column if not exists privilege_end_date date,
  add column if not exists removed_privilege_type text,
  add column if not exists removal_date date,
  add column if not exists capital_distribution jsonb not null default '[]'::jsonb,
  add column if not exists correction_transaction_id uuid references public.ownership_transactions(id),
  add column if not exists correction_reason text,
  add column if not exists new_values jsonb,
  add column if not exists reversal_transaction_id uuid references public.ownership_transactions(id),
  add column if not exists reversal_reason text;

alter table public.ownership_transactions
  drop constraint if exists ownership_transactions_type_check;

alter table public.ownership_transactions
  add constraint ownership_transactions_type_check check (transaction_type in (
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
  ));

alter table if exists public.account_movements
  add column if not exists linked_ownership_transaction_id uuid references public.ownership_transactions(id),
  add column if not exists capital_relation_type text,
  add column if not exists offset_amount numeric(18,2) not null default 0;

do $$
begin
  if to_regclass('public.account_movements') is not null then
    create index if not exists idx_account_movements_ownership_link
    on public.account_movements (linked_ownership_transaction_id)
    where is_deleted = false;
  end if;
end $$;

drop view if exists public.v_current_ownership;

create or replace view public.v_current_ownership as
with approved as (
  select *
  from public.ownership_transactions
  where approval_status = 'approved'
    and status = 'active'
    and effective_date <= current_date
    and coalesce(is_deleted, false) = false
),
partner_effects as (
  select
    company_id,
    to_partner_id as partner_id,
    share_ratio,
    voting_ratio,
    profit_ratio,
    capital_amount,
    committed_capital_amount,
    share_units,
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
    -coalesce(capital_amount, 0),
    null,
    -coalesce(share_units, 0),
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
    case when transaction_type = 'Oy Hakkı Değişikliği' then coalesce(new_voting_ratio, voting_ratio) else null end,
    case when transaction_type = 'Kar Payı Oranı Değişikliği' then coalesce(new_profit_ratio, profit_ratio) else null end,
    capital_amount,
    committed_capital_amount,
    share_units,
    has_veto_right,
    has_board_nomination_right,
    has_privileged_share,
    transaction_date
  from approved
  where affected_partner_id is not null
),
rollup as (
  select
    company_id,
    partner_id,
    sum(coalesce(share_ratio, 0)) as current_share_ratio,
    sum(coalesce(voting_ratio, 0)) as current_voting_ratio,
    sum(coalesce(profit_ratio, 0)) as current_profit_ratio,
    sum(coalesce(capital_amount, 0)) as current_capital_amount,
    sum(coalesce(committed_capital_amount, 0)) as committed_capital_amount,
    sum(coalesce(share_units, 0)) as current_share_units,
    bool_or(has_veto_right) as has_veto_right,
    bool_or(has_board_nomination_right) as has_board_nomination_right,
    bool_or(has_privileged_share) as has_privileged_share,
    max(transaction_date) as last_transaction_date
  from partner_effects
  where partner_id is not null
  group by company_id, partner_id
),
company_totals as (
  select
    company_id,
    sum(current_share_ratio) as total_share_ratio,
    sum(current_voting_ratio) as total_voting_ratio
  from rollup
  group by company_id
)
select
  r.company_id,
  r.partner_id,
  p.owner_kind,
  p.person_id,
  p.organization_id,
  coalesce(p.display_name, p.ortak_adi, per.full_name, org.legal_name, 'Ortak') as display_name,
  greatest(r.current_share_ratio, 0) as current_share_ratio,
  greatest(r.current_voting_ratio, 0) as current_voting_ratio,
  greatest(r.current_profit_ratio, 0) as current_profit_ratio,
  greatest(r.current_capital_amount, 0) as current_capital_amount,
  greatest(r.committed_capital_amount, 0) as committed_capital_amount,
  greatest(r.current_share_units, 0) as current_share_units,
  r.has_veto_right,
  r.has_board_nomination_right,
  r.has_privileged_share,
  r.last_transaction_date,
  (
    select jsonb_agg(warning)
    from (
      select 'Toplam hisse 100% değil'::text as warning
      where abs(coalesce(t.total_share_ratio, 0) - 100) > 0.01
      union all
      select 'Toplam oy hakkı 100% değil'
      where abs(coalesce(t.total_voting_ratio, 0) - 100) > 0.01
    ) warnings
  ) as warnings
from rollup r
join public.sirket_ortaklar p on p.id = r.partner_id
left join public.persons per on per.id = p.person_id
left join public.organizations org on org.id = p.organization_id
left join company_totals t on t.company_id = r.company_id
where coalesce(p.is_deleted, false) = false;
