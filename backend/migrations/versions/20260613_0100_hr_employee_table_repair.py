# ruff: noqa: E501
"""repair missing HR employee lifecycle tables.

Revision ID: 20260613_0100
Revises: 20260610_0200
Create Date: 2026-06-13
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "20260613_0100"
down_revision: str | None = "20260610_0200"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute('create extension if not exists "pgcrypto"')
    op.execute(
        """
        create table if not exists public.hr_employees (
          id uuid primary key default gen_random_uuid(),
          tenant_id uuid not null,
          company_id uuid not null,
          person_id text,
          employee_no text not null,
          first_name text not null,
          last_name text not null,
          full_name text not null,
          identity_number text,
          passport_no text,
          nationality text,
          birth_date date,
          gender text,
          marital_status text,
          education_level text,
          phone text,
          email text,
          address text,
          city text,
          district text,
          country text,
          emergency_contact jsonb not null default '{}'::jsonb,
          photo_url text,
          record_status text not null default 'draft',
          employment_status text not null default 'draft',
          notes text,
          metadata_json jsonb not null default '{}'::jsonb,
          created_by uuid,
          updated_by uuid,
          created_at timestamp with time zone not null default now(),
          updated_at timestamp with time zone not null default now(),
          version integer not null default 1,
          is_deleted boolean not null default false
        )
        """
    )
    op.execute(
        """
        create table if not exists public.hr_employment_records (
          id uuid primary key default gen_random_uuid(),
          tenant_id uuid not null,
          employee_id uuid not null,
          company_id uuid not null,
          branch_id uuid,
          organization_unit_id uuid,
          position_id uuid,
          job_title text,
          employment_type text not null,
          employment_status text not null,
          start_date date not null,
          trial_period_end_date date,
          end_date date,
          termination_reason text,
          sgk_status text not null default 'pending',
          sgk_workplace_registry_no text,
          work_location_type text,
          manager_employee_id uuid,
          salary_type text,
          currency text,
          notes text,
          created_by uuid,
          updated_by uuid,
          created_at timestamp with time zone not null default now(),
          updated_at timestamp with time zone not null default now(),
          version integer not null default 1,
          is_deleted boolean not null default false
        )
        """
    )
    op.execute(
        """
        create table if not exists public.hr_employment_transactions (
          id uuid primary key default gen_random_uuid(),
          tenant_id uuid not null,
          employee_id uuid not null,
          company_id uuid not null,
          transaction_type text not null,
          transaction_date date not null,
          effective_date date not null,
          old_values jsonb not null default '{}'::jsonb,
          new_values jsonb not null default '{}'::jsonb,
          reason text,
          document_files jsonb not null default '[]'::jsonb,
          operation_id uuid,
          process_instance_id uuid,
          created_by uuid,
          created_at timestamp with time zone not null default now()
        )
        """
    )
    op.execute(
        """
        create table if not exists public.hr_employee_documents (
          id uuid primary key default gen_random_uuid(),
          tenant_id uuid not null,
          employee_id uuid not null,
          company_id uuid not null,
          document_type text not null,
          file_ref jsonb not null default '{}'::jsonb,
          issue_date date,
          expiry_date date,
          status text not null,
          required boolean not null default false,
          notes text,
          created_at timestamp with time zone not null default now(),
          updated_at timestamp with time zone not null default now()
        )
        """
    )
    op.execute(
        """
        create index if not exists ix_hr_employees_tenant_company_record_status
        on public.hr_employees (tenant_id, company_id, record_status)
        """
    )
    op.execute(
        """
        create index if not exists ix_hr_employees_tenant_company_employment_status
        on public.hr_employees (tenant_id, company_id, employment_status)
        """
    )
    op.execute(
        """
        create index if not exists ix_hr_employment_records_branch
        on public.hr_employment_records (tenant_id, branch_id)
        """
    )
    op.execute(
        """
        create index if not exists ix_hr_employment_records_unit
        on public.hr_employment_records (tenant_id, organization_unit_id)
        """
    )
    op.execute(
        """
        create index if not exists ix_hr_employment_records_position
        on public.hr_employment_records (tenant_id, position_id)
        """
    )
    op.execute(
        """
        create unique index if not exists ix_hr_employees_employee_no
        on public.hr_employees (tenant_id, employee_no)
        where coalesce(is_deleted, false) = false
        """
    )
    op.execute(
        """
        create index if not exists ix_hr_employees_identity
        on public.hr_employees (tenant_id, identity_number)
        """
    )
    op.execute(
        """
        create index if not exists ix_hr_employment_transactions_employee_date
        on public.hr_employment_transactions (tenant_id, employee_id, transaction_date desc)
        """
    )
    op.execute(
        """
        create index if not exists ix_hr_employee_documents_type
        on public.hr_employee_documents (tenant_id, employee_id, document_type)
        """
    )


def downgrade() -> None:
    raise RuntimeError("HR employee table repair migration is not safely downgradable.")
