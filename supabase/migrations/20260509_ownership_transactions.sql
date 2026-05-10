create extension if not exists "pgcrypto";

create table if not exists public.ownership_transactions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.sirketler(id),
  transaction_no text not null unique,
  transaction_type text not null,
  transaction_date date not null,
  effective_date date not null,
  from_partner_id uuid references public.sirket_ortaklar(id),
  to_partner_id uuid references public.sirket_ortaklar(id),
  affected_partner_id uuid references public.sirket_ortaklar(id),
  share_ratio numeric(8,4),
  voting_ratio numeric(8,4),
  profit_ratio numeric(8,4),
  share_units numeric(18,4),
  nominal_value numeric(18,4),
  capital_amount numeric(18,2),
  transfer_price numeric(18,2),
  currency text not null default 'TRY',
  has_control_right boolean not null default false,
  control_type text,
  has_veto_right boolean not null default false,
  has_board_nomination_right boolean not null default false,
  has_privileged_share boolean not null default false,
  privilege_type text,
  is_beneficial_owner boolean not null default false,
  beneficial_ratio numeric(8,4),
  document_status text not null default 'Belge Yok',
  document_reference_id text,
  decision_reference_id text,
  document_files jsonb not null default '[]'::jsonb,
  status text not null default 'draft',
  approval_status text not null default 'draft',
  workflow_status text not null default 'draft',
  description text,
  transaction_reason text,
  exit_reason text,
  justification text,
  notes text,
  warnings jsonb not null default '[]'::jsonb,
  history jsonb not null default '[]'::jsonb,
  approval_notes text,
  rejection_reason text,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid,
  version integer not null default 1,
  constraint ownership_transactions_type_check check (transaction_type in (
    'Yeni Ortak Girişi',
    'Pay Devri',
    'Kısmi Pay Devri',
    'Ortaklıktan Çıkış',
    'Sermaye Artırımı',
    'Sermaye Azaltımı',
    'Oy Hakkı Değişikliği',
    'Kar Payı Oranı Değişikliği',
    'İmtiyazlı Pay Tanımı',
    'İmtiyazlı Pay Kaldırma',
    'Kontrol Hakkı Tanımı',
    'Veto Hakkı Tanımı',
    'Yönetim Kurulu Aday Hakkı Tanımı',
    'Nihai Faydalanıcı Değişikliği',
    'Düzeltme Kaydı',
    'Ters Kayıt'
  )),
  constraint ownership_transactions_status_check check (status in ('draft', 'active', 'cancelled', 'reversed', 'passive')),
  constraint ownership_transactions_approval_check check (approval_status in ('draft', 'pending_approval', 'approved', 'rejected', 'cancelled')),
  constraint ownership_transactions_workflow_check check (workflow_status in ('draft', 'pending_approval', 'approved', 'rejected', 'cancelled')),
  constraint ownership_transactions_document_status_check check (document_status in ('Belge Yok', 'Bekleniyor', 'Yüklendi', 'Onaylandı', 'Eksik', 'Hatalı')),
  constraint ownership_transactions_share_check check (share_ratio is null or share_ratio >= 0),
  constraint ownership_transactions_voting_check check (voting_ratio is null or voting_ratio >= 0),
  constraint ownership_transactions_profit_check check (profit_ratio is null or profit_ratio >= 0)
);

create index if not exists idx_ownership_transactions_company
  on public.ownership_transactions(company_id, is_deleted, status, approval_status);

create index if not exists idx_ownership_transactions_effective
  on public.ownership_transactions(company_id, effective_date, approval_status)
  where is_deleted = false;

create index if not exists idx_ownership_transactions_partners
  on public.ownership_transactions(company_id, from_partner_id, to_partner_id, affected_partner_id);

create index if not exists idx_ownership_transactions_history
  on public.ownership_transactions using gin(history);

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
    share_units,
    has_control_right,
    control_type,
    has_veto_right,
    has_board_nomination_right,
    has_privileged_share,
    is_beneficial_owner,
    beneficial_ratio,
    transaction_date
  from approved
  where to_partner_id is not null
    and transaction_type in ('Yeni Ortak Girişi', 'Pay Devri', 'Kısmi Pay Devri', 'Sermaye Artırımı', 'Düzeltme Kaydı', 'Ters Kayıt')

  union all

  select
    company_id,
    from_partner_id as partner_id,
    -coalesce(share_ratio, 0),
    -coalesce(voting_ratio, 0),
    -coalesce(profit_ratio, 0),
    -coalesce(capital_amount, 0),
    -coalesce(share_units, 0),
    false,
    null,
    false,
    false,
    false,
    false,
    null,
    transaction_date
  from approved
  where from_partner_id is not null
    and transaction_type in ('Pay Devri', 'Kısmi Pay Devri', 'Ortaklıktan Çıkış', 'Sermaye Azaltımı')

  union all

  select
    company_id,
    affected_partner_id as partner_id,
    case when transaction_type in ('Sermaye Artırımı', 'Sermaye Azaltımı', 'Düzeltme Kaydı', 'Ters Kayıt') then share_ratio else null end,
    case when transaction_type in ('Oy Hakkı Değişikliği', 'Düzeltme Kaydı', 'Ters Kayıt') then voting_ratio else null end,
    case when transaction_type in ('Kar Payı Oranı Değişikliği', 'Düzeltme Kaydı', 'Ters Kayıt') then profit_ratio else null end,
    capital_amount,
    share_units,
    has_control_right,
    control_type,
    has_veto_right,
    has_board_nomination_right,
    has_privileged_share,
    is_beneficial_owner,
    beneficial_ratio,
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
    sum(coalesce(share_units, 0)) as current_share_units,
    bool_or(has_control_right) as has_control_right,
    max(control_type) filter (where control_type is not null) as control_type,
    bool_or(has_veto_right) as has_veto_right,
    bool_or(has_board_nomination_right) as has_board_nomination_right,
    bool_or(has_privileged_share) as has_privileged_share,
    bool_or(is_beneficial_owner) as is_beneficial_owner,
    max(beneficial_ratio) filter (where beneficial_ratio is not null) as beneficial_ratio,
    max(transaction_date) as last_transaction_date
  from partner_effects
  where partner_id is not null
  group by company_id, partner_id
),
company_totals as (
  select
    company_id,
    sum(current_share_ratio) as total_share_ratio,
    sum(current_voting_ratio) as total_voting_ratio,
    count(*) filter (where has_control_right) as controller_count
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
  greatest(r.current_share_units, 0) as current_share_units,
  r.has_control_right,
  r.control_type,
  r.has_veto_right,
  r.has_board_nomination_right,
  r.has_privileged_share,
  r.is_beneficial_owner,
  r.beneficial_ratio,
  r.last_transaction_date,
  (
    select jsonb_agg(warning)
    from (
      select 'Toplam hisse 100% değil'::text as warning
      where abs(coalesce(t.total_share_ratio, 0) - 100) > 0.01
      union all
      select 'Toplam oy hakkı 100% değil'
      where abs(coalesce(t.total_voting_ratio, 0) - 100) > 0.01
      union all
      select 'Birden fazla kontrol sahibi var'
      where coalesce(t.controller_count, 0) > 1
    ) warnings
  ) as warnings
from rollup r
join public.sirket_ortaklar p on p.id = r.partner_id
left join public.persons per on per.id = p.person_id
left join public.organizations org on org.id = p.organization_id
left join company_totals t on t.company_id = r.company_id
where coalesce(p.is_deleted, false) = false;

insert into public.permissions (permission_key, module_code, resource, action, description)
values
  ('ownership_transactions.view', 'sirket', 'ownership_transactions', 'view', 'Ortaklık işlemlerini görüntüleme'),
  ('ownership_transactions.insert', 'sirket', 'ownership_transactions', 'insert', 'Ortaklık işlemi oluşturma'),
  ('ownership_transactions.edit', 'sirket', 'ownership_transactions', 'edit', 'Ortaklık işlemi düzenleme'),
  ('ownership_transactions.approve', 'sirket', 'ownership_transactions', 'approve', 'Ortaklık işlemi onaylama'),
  ('ownership_transactions.cancel', 'sirket', 'ownership_transactions', 'passivate', 'Ortaklık işlemi iptal etme'),
  ('ownership_transactions.reverse', 'sirket', 'ownership_transactions', 'insert', 'Ters ortaklık işlemi oluşturma'),
  ('ownership_transactions.export', 'sirket', 'ownership_transactions', 'export', 'Ortaklık işlemi dışa aktarma'),
  ('ownership_transactions.view_sensitive', 'sirket', 'ownership_transactions', 'view', 'Hassas ortaklık verilerini görüntüleme')
on conflict (permission_key) do nothing;
