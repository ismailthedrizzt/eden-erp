# ruff: noqa: E501

"""representative authority scope columns

Revision ID: 20260608_0200
Revises: 20260607_0100
Create Date: 2026-06-08
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "20260608_0200"
down_revision: str | None = "20260607_0100"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


SCOPE_SCHEMA_SQL = r"""
alter table public.company_representative_authority_transactions
    add column if not exists scope_type text not null default 'company_wide',
    add column if not exists branch_id uuid,
    add column if not exists organization_unit_id uuid,
    add column if not exists facility_id uuid,
    add column if not exists scope_label text,
    add column if not exists scope_notes text;

update public.company_representative_authority_transactions
set scope_type = case
    when nullif(scope ->> 'scope_type', '') in ('company_wide', 'branch', 'organization_unit', 'facility')
        then nullif(scope ->> 'scope_type', '')
    else 'company_wide'
end
where scope_type is null
   or scope_type not in ('company_wide', 'branch', 'organization_unit', 'facility')
   or scope ? 'scope_type';

update public.company_representative_authority_transactions
set branch_id = case
    when (scope ->> 'branch_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then (scope ->> 'branch_id')::uuid
    else branch_id
end
where branch_id is null
  and scope ? 'branch_id';

update public.company_representative_authority_transactions
set organization_unit_id = case
    when (scope ->> 'organization_unit_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then (scope ->> 'organization_unit_id')::uuid
    else organization_unit_id
end
where organization_unit_id is null
  and scope ? 'organization_unit_id';

update public.company_representative_authority_transactions
set facility_id = case
    when (scope ->> 'facility_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then (scope ->> 'facility_id')::uuid
    else facility_id
end
where facility_id is null
  and scope ? 'facility_id';

update public.company_representative_authority_transactions
set scope_label = nullif(scope ->> 'scope_label', '')
where scope_label is null
  and scope ? 'scope_label';

update public.company_representative_authority_transactions
set scope_notes = nullif(scope ->> 'scope_notes', '')
where scope_notes is null
  and scope ? 'scope_notes';

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'representative_authority_tx_scope_type_check'
          and conrelid = 'public.company_representative_authority_transactions'::regclass
    ) then
        alter table public.company_representative_authority_transactions
            add constraint representative_authority_tx_scope_type_check
            check (scope_type in ('company_wide', 'branch', 'organization_unit', 'facility'))
            not valid;
    end if;
end $$;

alter table public.company_representative_authority_transactions
    validate constraint representative_authority_tx_scope_type_check;

create index if not exists ix_representative_authority_tx_scope
    on public.company_representative_authority_transactions
    (tenant_id, representative_id, scope_type, branch_id, organization_unit_id, facility_id);

create or replace view public.v_current_representative_authorities as
WITH RECURSIVE approved_transactions AS (
         SELECT tx.id,
            tx.tenant_id,
            tx.company_id,
            tx.representative_id,
            tx.person_id,
            tx.organization_id,
            tx.transaction_no,
            tx.transaction_type,
            tx.authority_types,
            tx.signature_type,
            tx.transaction_limit,
            tx.payment_approval_limit,
            tx.purchase_approval_limit,
            tx.bank_transaction_limit,
            tx.contract_signature_limit,
            tx.currency,
            tx.limits,
            tx.scope,
            tx.requires_joint_signature,
            tx.can_approve_alone,
            tx.document_files,
            tx.effective_date,
            tx.end_date,
            tx.approval_status,
            tx.workflow_status,
            tx.status,
            tx.notes,
            tx.warnings,
            tx.reversal_transaction_id,
            tx.new_values,
            tx.history,
            tx.approved_by,
            tx.approved_at,
            tx.created_at,
            tx.created_by,
            tx.updated_at,
            tx.updated_by,
            tx.is_deleted,
            tx.deleted_at,
            tx.deleted_by,
            tx.version,
            tx.transaction_status,
            tx.authority_effect_status,
            tx.authority_record_status,
            COALESCE(tx.authority_record_status, tx.authority_effect_status, representative_authority_effect_status(tx.transaction_type, tx.new_values)) AS tx_authority_record_status
           FROM company_representative_authority_transactions tx
          WHERE tx.approval_status = 'approved'::text AND tx.workflow_status = 'approved'::text AND COALESCE(tx.is_deleted, false) = false AND tx.effective_date <= CURRENT_DATE
        ), ordered_transactions AS (
         SELECT tx.id,
            tx.tenant_id,
            tx.company_id,
            tx.representative_id,
            tx.person_id,
            tx.organization_id,
            tx.transaction_no,
            tx.transaction_type,
            tx.authority_types,
            tx.signature_type,
            tx.transaction_limit,
            tx.payment_approval_limit,
            tx.purchase_approval_limit,
            tx.bank_transaction_limit,
            tx.contract_signature_limit,
            tx.currency,
            tx.limits,
            tx.scope,
            tx.requires_joint_signature,
            tx.can_approve_alone,
            tx.document_files,
            tx.effective_date,
            tx.end_date,
            tx.approval_status,
            tx.workflow_status,
            tx.status,
            tx.notes,
            tx.warnings,
            tx.reversal_transaction_id,
            tx.new_values,
            tx.history,
            tx.approved_by,
            tx.approved_at,
            tx.created_at,
            tx.created_by,
            tx.updated_at,
            tx.updated_by,
            tx.is_deleted,
            tx.deleted_at,
            tx.deleted_by,
            tx.version,
            tx.transaction_status,
            tx.authority_effect_status,
            tx.authority_record_status,
            tx.tx_authority_record_status,
            row_number() OVER (PARTITION BY tx.company_id, tx.representative_id ORDER BY tx.effective_date, (COALESCE("substring"(tx.transaction_no, '([0-9]+)$'::text)::integer, 0)), tx.created_at, tx.id) AS transaction_order,
            reversed.tx_authority_record_status AS reversed_authority_record_status
           FROM approved_transactions tx
             LEFT JOIN approved_transactions reversed ON reversed.id = tx.reversal_transaction_id
        ), participants AS (
         SELECT DISTINCT tx.company_id,
            tx.representative_id,
            COALESCE(rep.display_name, rep.full_name, 'Temsilci'::text) AS display_name,
            COALESCE(rep.person_id, tx.person_id) AS person_id,
            COALESCE(rep.organization_id, tx.organization_id) AS organization_id,
            COALESCE(rep.tenant_id, tx.tenant_id, company.tenant_id) AS tenant_id
           FROM approved_transactions tx
             LEFT JOIN company_representatives rep ON rep.id = tx.representative_id
             LEFT JOIN companies company ON company.id = tx.company_id
        ), authority_state AS (
         SELECT participants.company_id,
            participants.representative_id,
            participants.person_id,
            participants.organization_id,
            participants.display_name,
            participants.tenant_id,
            0::bigint AS transaction_order,
            NULL::uuid AS last_transaction_id,
            NULL::text AS last_transaction_type,
            'draft'::text AS authority_record_status,
            'draft'::text AS authority_status,
            'Taslak'::text AS authority_status_label,
            '[]'::jsonb AS authority_types,
            NULL::text AS signature_type,
            NULL::numeric AS transaction_limit,
            NULL::numeric AS payment_approval_limit,
            NULL::numeric AS purchase_approval_limit,
            NULL::numeric AS bank_transaction_limit,
            NULL::numeric AS contract_signature_limit,
            'TRY'::text AS currency,
            '{}'::jsonb AS limits,
            '{}'::jsonb AS scope,
            false AS requires_joint_signature,
            false AS can_approve_alone,
            NULL::date AS effective_date,
            NULL::date AS end_date,
            ARRAY[]::text[] AS warnings
           FROM participants
        UNION ALL
         SELECT state.company_id,
            state.representative_id,
            state.person_id,
            state.organization_id,
            state.display_name,
            state.tenant_id,
            tx.transaction_order,
            tx.id AS last_transaction_id,
            tx.transaction_type AS last_transaction_type,
                CASE
                    WHEN tx.transaction_type = 'Ters Kayıt'::text AND (tx.reversed_authority_record_status = ANY (ARRAY['suspended'::text, 'terminated'::text])) THEN 'active'::text
                    ELSE tx.tx_authority_record_status
                END AS authority_record_status,
                CASE
                    WHEN tx.transaction_type = 'Ters Kayıt'::text AND (tx.reversed_authority_record_status = ANY (ARRAY['suspended'::text, 'terminated'::text])) THEN 'active'::text
                    ELSE tx.tx_authority_record_status
                END AS authority_status,
                CASE
                    WHEN tx.transaction_type = 'Ters Kayıt'::text AND (tx.reversed_authority_record_status = ANY (ARRAY['suspended'::text, 'terminated'::text])) THEN 'Aktif'::text
                    WHEN tx.tx_authority_record_status = 'suspended'::text THEN 'Askıda'::text
                    WHEN tx.tx_authority_record_status = 'terminated'::text THEN 'Sonlandırılmış'::text
                    WHEN tx.tx_authority_record_status = 'expired'::text THEN 'Süresi Dolmuş'::text
                    WHEN tx.tx_authority_record_status = 'active'::text THEN 'Yetkili'::text
                    ELSE 'Taslak'::text
                END AS authority_status_label,
                CASE
                    WHEN tx.transaction_type = ANY (ARRAY['Temsilcilik Başlatma'::text, 'Yetki Yenileme'::text, 'Yetki Kapsamı Değişikliği'::text, 'Düzeltme Kaydı'::text]) THEN COALESCE(NULLIF(tx.authority_types, '[]'::jsonb), state.authority_types)
                    WHEN tx.transaction_type = 'Ters Kayıt'::text AND (tx.reversed_authority_record_status <> ALL (ARRAY['suspended'::text, 'terminated'::text])) THEN '[]'::jsonb
                    ELSE state.authority_types
                END AS authority_types,
                CASE
                    WHEN tx.transaction_type = ANY (ARRAY['Temsilcilik Başlatma'::text, 'Yetki Yenileme'::text, 'Yetki Kapsamı Değişikliği'::text, 'Düzeltme Kaydı'::text]) THEN COALESCE(tx.signature_type, state.signature_type)
                    WHEN tx.transaction_type = 'Ters Kayıt'::text AND (tx.reversed_authority_record_status <> ALL (ARRAY['suspended'::text, 'terminated'::text])) THEN NULL::text
                    ELSE state.signature_type
                END AS signature_type,
                CASE
                    WHEN tx.transaction_type = ANY (ARRAY['Temsilcilik Başlatma'::text, 'Yetki Yenileme'::text, 'Limit Değişikliği'::text, 'Düzeltme Kaydı'::text]) THEN COALESCE(tx.transaction_limit, try_jsonb_numeric(tx.limits, 'transaction_limit'::text), state.transaction_limit)
                    WHEN tx.transaction_type = 'Ters Kayıt'::text AND (tx.reversed_authority_record_status <> ALL (ARRAY['suspended'::text, 'terminated'::text])) THEN NULL::numeric
                    ELSE state.transaction_limit
                END AS transaction_limit,
                CASE
                    WHEN tx.transaction_type = ANY (ARRAY['Temsilcilik Başlatma'::text, 'Yetki Yenileme'::text, 'Limit Değişikliği'::text, 'Düzeltme Kaydı'::text]) THEN COALESCE(tx.payment_approval_limit, try_jsonb_numeric(tx.limits, 'payment_approval_limit'::text), state.payment_approval_limit)
                    ELSE state.payment_approval_limit
                END AS payment_approval_limit,
                CASE
                    WHEN tx.transaction_type = ANY (ARRAY['Temsilcilik Başlatma'::text, 'Yetki Yenileme'::text, 'Limit Değişikliği'::text, 'Düzeltme Kaydı'::text]) THEN COALESCE(tx.purchase_approval_limit, try_jsonb_numeric(tx.limits, 'purchase_approval_limit'::text), state.purchase_approval_limit)
                    ELSE state.purchase_approval_limit
                END AS purchase_approval_limit,
                CASE
                    WHEN tx.transaction_type = ANY (ARRAY['Temsilcilik Başlatma'::text, 'Yetki Yenileme'::text, 'Limit Değişikliği'::text, 'Düzeltme Kaydı'::text]) THEN COALESCE(tx.bank_transaction_limit, try_jsonb_numeric(tx.limits, 'bank_transaction_limit'::text), state.bank_transaction_limit)
                    ELSE state.bank_transaction_limit
                END AS bank_transaction_limit,
                CASE
                    WHEN tx.transaction_type = ANY (ARRAY['Temsilcilik Başlatma'::text, 'Yetki Yenileme'::text, 'Limit Değişikliği'::text, 'Düzeltme Kaydı'::text]) THEN COALESCE(tx.contract_signature_limit, try_jsonb_numeric(tx.limits, 'contract_signature_limit'::text), state.contract_signature_limit)
                    ELSE state.contract_signature_limit
                END AS contract_signature_limit,
            COALESCE(tx.currency, state.currency) AS currency,
                CASE
                    WHEN tx.transaction_type = ANY (ARRAY['Temsilcilik Başlatma'::text, 'Yetki Yenileme'::text, 'Limit Değişikliği'::text, 'Düzeltme Kaydı'::text]) THEN COALESCE(NULLIF(tx.limits, '{}'::jsonb), state.limits)
                    ELSE state.limits
                END AS limits,
                CASE
                    WHEN tx.transaction_type = ANY (ARRAY['Temsilcilik Başlatma'::text, 'Yetki Yenileme'::text, 'Yetki Kapsamı Değişikliği'::text, 'Düzeltme Kaydı'::text]) THEN COALESCE(NULLIF(tx.scope, '{}'::jsonb), state.scope)
                    ELSE state.scope
                END AS scope,
                CASE
                    WHEN tx.transaction_type = ANY (ARRAY['Temsilcilik Başlatma'::text, 'Yetki Yenileme'::text, 'Yetki Kapsamı Değişikliği'::text, 'Düzeltme Kaydı'::text]) THEN COALESCE(tx.requires_joint_signature, state.requires_joint_signature)
                    ELSE state.requires_joint_signature
                END AS requires_joint_signature,
                CASE
                    WHEN tx.transaction_type = ANY (ARRAY['Temsilcilik Başlatma'::text, 'Yetki Yenileme'::text, 'Yetki Kapsamı Değişikliği'::text, 'Düzeltme Kaydı'::text]) THEN COALESCE(tx.can_approve_alone, state.can_approve_alone)
                    ELSE state.can_approve_alone
                END AS can_approve_alone,
            COALESCE(tx.effective_date, state.effective_date) AS effective_date,
                CASE
                    WHEN tx.tx_authority_record_status = 'terminated'::text THEN COALESCE(tx.end_date, tx.effective_date)
                    WHEN tx.transaction_type = 'Yetki Yenileme'::text THEN tx.end_date
                    ELSE COALESCE(tx.end_date, state.end_date)
                END AS end_date,
            array_remove(ARRAY[
                CASE
                    WHEN (tx.transaction_type = ANY (ARRAY['Temsilcilik Başlatma'::text, 'Yetki Yenileme'::text])) AND tx.authority_types = '[]'::jsonb THEN 'Yetki tipi tanımlı değil'::text
                    ELSE NULL::text
                END,
                CASE
                    WHEN tx.end_date IS NOT NULL AND tx.end_date < tx.effective_date THEN 'Bitiş tarihi yürürlük tarihinden önce'::text
                    ELSE NULL::text
                END], NULL::text) AS warnings
           FROM authority_state state
             JOIN ordered_transactions tx ON tx.company_id = state.company_id AND tx.representative_id = state.representative_id AND tx.transaction_order = (state.transaction_order + 1)
        ), latest_state AS (
         SELECT DISTINCT ON (authority_state.company_id, authority_state.representative_id) authority_state.company_id,
            authority_state.representative_id,
            authority_state.person_id,
            authority_state.organization_id,
            authority_state.display_name,
            authority_state.tenant_id,
            authority_state.transaction_order,
            authority_state.last_transaction_id,
            authority_state.last_transaction_type,
            authority_state.authority_record_status,
            authority_state.authority_status,
            authority_state.authority_status_label,
            authority_state.authority_types,
            authority_state.signature_type,
            authority_state.transaction_limit,
            authority_state.payment_approval_limit,
            authority_state.purchase_approval_limit,
            authority_state.bank_transaction_limit,
            authority_state.contract_signature_limit,
            authority_state.currency,
            authority_state.limits,
            authority_state.scope,
            authority_state.requires_joint_signature,
            authority_state.can_approve_alone,
            authority_state.effective_date,
            authority_state.end_date,
            authority_state.warnings
           FROM authority_state
          ORDER BY authority_state.company_id, authority_state.representative_id, authority_state.transaction_order DESC
        )
 SELECT representative_id,
    company_id,
    tenant_id,
    authority_status,
    authority_record_status,
    authority_status_label,
    authority_types,
    signature_type,
    transaction_limit,
    payment_approval_limit,
    purchase_approval_limit,
    bank_transaction_limit,
    contract_signature_limit,
    currency,
    limits,
    scope,
    requires_joint_signature,
    can_approve_alone,
    effective_date,
    end_date,
    warnings,
    last_transaction_id,
    last_transaction_type,
    display_name,
    person_id,
    organization_id,
    case
        when nullif(scope ->> 'scope_type', '') in ('company_wide', 'branch', 'organization_unit', 'facility')
            then nullif(scope ->> 'scope_type', '')
        else 'company_wide'
    end as scope_type,
    case
        when (scope ->> 'branch_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            then (scope ->> 'branch_id')::uuid
        else null::uuid
    end as branch_id,
    case
        when (scope ->> 'organization_unit_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            then (scope ->> 'organization_unit_id')::uuid
        else null::uuid
    end as organization_unit_id,
    case
        when (scope ->> 'facility_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            then (scope ->> 'facility_id')::uuid
        else null::uuid
    end as facility_id,
    nullif(scope ->> 'scope_label', '') as scope_label,
    nullif(scope ->> 'scope_notes', '') as scope_notes
   FROM latest_state
  WHERE transaction_order > 0;
"""


def split_sql_statements(sql: str) -> list[str]:
    statements: list[str] = []
    start = 0
    index = 0
    in_single_quote = False
    in_double_quote = False
    dollar_quote: str | None = None

    while index < len(sql):
        if dollar_quote:
            if sql.startswith(dollar_quote, index):
                index += len(dollar_quote)
                dollar_quote = None
                continue
            index += 1
            continue

        char = sql[index]
        if in_single_quote:
            if char == "'" and index + 1 < len(sql) and sql[index + 1] == "'":
                index += 2
                continue
            if char == "'":
                in_single_quote = False
            index += 1
            continue

        if in_double_quote:
            if char == '"':
                in_double_quote = False
            index += 1
            continue

        if char == "'":
            in_single_quote = True
            index += 1
            continue

        if char == '"':
            in_double_quote = True
            index += 1
            continue

        if char == "$":
            end = sql.find("$", index + 1)
            if end != -1:
                tag = sql[index : end + 1]
                inner = tag[1:-1]
                if not inner or inner.replace("_", "a").isalnum():
                    dollar_quote = tag
                    index = end + 1
                    continue

        if char == ";":
            statement = sql[start:index].strip()
            if statement:
                statements.append(statement)
            start = index + 1

        index += 1

    trailing = sql[start:].strip()
    if trailing:
        statements.append(trailing)
    return statements


def upgrade() -> None:
    for statement in split_sql_statements(SCOPE_SCHEMA_SQL):
        op.execute(statement)


def downgrade() -> None:
    raise RuntimeError("Representative authority scope columns are production data columns and are not safely downgradable.")
