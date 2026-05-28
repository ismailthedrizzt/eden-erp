# ruff: noqa: E501

"""Notification, reminder and email delivery hardening.

Revision ID: 20260528_1800
Revises: 20260528_1700
Create Date: 2026-05-28 18:00:00.000000
"""

from __future__ import annotations

from alembic import op

revision = "20260528_1800"
down_revision = "20260528_1700"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        create table if not exists public.notifications (
          id uuid primary key,
          tenant_id uuid not null,
          user_id uuid not null,
          company_id uuid null,
          branch_id uuid null,
          module_key text not null,
          notification_type text not null,
          title text not null,
          message text not null,
          severity text not null default 'info',
          priority text not null default 'normal',
          status text not null default 'unread',
          action_required boolean not null default false,
          action_key text null,
          action_label text null,
          target_page text null,
          related_entity_type text null,
          related_entity_id text null,
          related_record_label text null,
          process_instance_id uuid null,
          task_id uuid null,
          approval_id uuid null,
          operation_id uuid null,
          outbox_event_id uuid null,
          due_at timestamptz null,
          expires_at timestamptz null,
          delivered_channels jsonb not null default '[]'::jsonb,
          delivery_status text null,
          metadata_json jsonb not null default '{}'::jsonb,
          created_at timestamptz not null default now(),
          read_at timestamptz null,
          dismissed_at timestamptz null,
          constraint notifications_severity_check
            check (severity in ('info','success','warning','error','critical')),
          constraint notifications_priority_check
            check (priority in ('low','normal','high','urgent')),
          constraint notifications_status_check
            check (status in ('unread','read','dismissed','archived'))
        );
        """
    )
    op.execute(
        """
        create table if not exists public.notification_preferences (
          id uuid primary key,
          tenant_id uuid not null,
          user_id uuid not null,
          in_app_enabled boolean not null default true,
          email_enabled boolean not null default true,
          task_notifications boolean not null default true,
          approval_notifications boolean not null default true,
          system_warnings boolean not null default true,
          document_expiry boolean not null default true,
          service_reminders boolean not null default true,
          hr_reminders boolean not null default true,
          security_notifications boolean not null default true,
          quiet_hours jsonb not null default '{}'::jsonb,
          digest_frequency text not null default 'never',
          language text not null default 'tr',
          timezone text not null default 'Europe/Istanbul',
          updated_at timestamptz not null default now(),
          constraint notification_preferences_digest_check
            check (digest_frequency in ('never','daily','weekly')),
          unique (tenant_id, user_id)
        );
        """
    )
    op.execute(
        """
        create table if not exists public.reminders (
          id uuid primary key,
          tenant_id uuid not null,
          user_id uuid null,
          target_user_id uuid null,
          company_id uuid null,
          module_key text not null,
          reminder_type text not null,
          title text not null,
          message text not null,
          related_entity_type text null,
          related_entity_id text null,
          due_at timestamptz null,
          remind_at timestamptz not null,
          recurrence_rule text null,
          status text not null default 'scheduled',
          channels text[] not null default '{in_app}',
          created_by uuid null,
          created_at timestamptz not null default now(),
          sent_at timestamptz null,
          metadata_json jsonb not null default '{}'::jsonb,
          constraint reminders_status_check
            check (status in ('scheduled','sent','dismissed','cancelled','failed'))
        );
        """
    )
    op.execute(
        """
        create table if not exists public.email_messages (
          id uuid primary key,
          tenant_id uuid not null,
          user_id uuid null,
          to_email text not null,
          to_name text null,
          subject text not null,
          body_text text not null,
          body_html text null,
          template_key text null,
          status text not null default 'queued',
          provider text null,
          provider_message_id text null,
          retry_count integer not null default 0,
          last_error text null,
          related_notification_id uuid null,
          related_entity_type text null,
          related_entity_id text null,
          created_at timestamptz not null default now(),
          sent_at timestamptz null,
          metadata_json jsonb not null default '{}'::jsonb,
          constraint email_messages_status_check
            check (status in ('queued','sending','sent','failed','skipped'))
        );
        """
    )
    op.execute(
        """
        create table if not exists public.notification_templates (
          id uuid primary key,
          tenant_id uuid null,
          template_key text not null,
          language text not null default 'tr',
          subject_template text not null,
          body_text_template text not null,
          body_html_template text null,
          variables jsonb not null default '[]'::jsonb,
          active boolean not null default true,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now(),
          unique (tenant_id, template_key, language)
        );
        """
    )
    op.execute("create index if not exists idx_notifications_user_status_created on public.notifications (tenant_id, user_id, status, created_at desc);")
    op.execute("create index if not exists idx_notifications_user_type on public.notifications (tenant_id, user_id, notification_type);")
    op.execute("create index if not exists idx_notifications_module_created on public.notifications (tenant_id, module_key, created_at desc);")
    op.execute("create index if not exists idx_notifications_due on public.notifications (tenant_id, due_at);")
    op.execute("create index if not exists idx_notifications_related on public.notifications (tenant_id, related_entity_type, related_entity_id);")
    op.execute("create index if not exists idx_reminders_due on public.reminders (tenant_id, remind_at, status);")
    op.execute("create index if not exists idx_reminders_user_status on public.reminders (tenant_id, target_user_id, status);")
    op.execute("create index if not exists idx_email_messages_status_created on public.email_messages (tenant_id, status, created_at desc);")
    op.execute("create index if not exists idx_email_messages_related on public.email_messages (tenant_id, related_entity_type, related_entity_id);")


def downgrade() -> None:
    op.execute("drop table if exists public.notification_templates;")
    op.execute("drop table if exists public.email_messages;")
    op.execute("drop table if exists public.reminders;")
    op.execute("drop table if exists public.notification_preferences;")
    op.execute("drop table if exists public.notifications;")
