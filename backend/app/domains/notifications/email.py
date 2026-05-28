# ruff: noqa: E501

from __future__ import annotations

import json
import logging
import smtplib
from email.message import EmailMessage
from typing import Any
from uuid import uuid4

from fastapi import status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.errors import DomainError
from app.core.logging import log_info, log_warning
from app.core.metrics import increment_counter
from app.core.serialization import row_to_dict, rows_to_dicts
from app.domains.audit.service import record_audit_best_effort
from app.domains.notifications.preferences import preference_allows_channel
from app.domains.notifications.schemas import EmailListQuery, EmailMessageCreate, EmailTestRequest
from app.domains.notifications.templates import render_template
from app.domains.operations.service import table_exists

logger = logging.getLogger(__name__)


async def list_email_messages(
    session: AsyncSession,
    context: dict[str, Any],
    query: EmailListQuery,
) -> dict[str, Any]:
    await _ensure_table(session)
    where = ["tenant_id = :tenant_id"]
    params: dict[str, Any] = {
        "tenant_id": context["tenant_id"],
        "limit": query.page_size,
        "offset": (query.page - 1) * query.page_size,
    }
    if query.status:
        where.append("status = :status")
        params["status"] = query.status
    if query.template_key:
        where.append("template_key = :template_key")
        params["template_key"] = query.template_key
    if query.related_entity_type:
        where.append("related_entity_type = :related_entity_type")
        params["related_entity_type"] = query.related_entity_type
    if query.related_entity_id:
        where.append("related_entity_id = :related_entity_id")
        params["related_entity_id"] = query.related_entity_id
    if query.search:
        where.append("(to_email ilike :search or subject ilike :search)")
        params["search"] = f"%{query.search}%"
    where_clause = " and ".join(where)
    result = await session.execute(
        text(
            f"""
            select id, user_id, to_email, to_name, subject, template_key, status,
                   provider, provider_message_id, retry_count, last_error,
                   related_notification_id, related_entity_type, related_entity_id,
                   created_at, sent_at, metadata_json
            from public.email_messages
            where {where_clause}
            order by created_at desc
            limit :limit offset :offset
            """
        ),
        params,
    )
    count_result = await session.execute(
        text(f"select count(*) from public.email_messages where {where_clause}"),
        params,
    )
    return {
        "data": rows_to_dicts(list(result.mappings().all())),
        "meta": {"page": query.page, "pageSize": query.page_size, "total": int(count_result.scalar_one() or 0)},
    }


async def queue_email_message(
    session: AsyncSession,
    context: dict[str, Any],
    request: EmailMessageCreate,
) -> dict[str, Any]:
    await _ensure_table(session)
    settings = get_settings()
    status_value = "queued" if settings.email_enabled else "skipped"
    result = await session.execute(
        text(
            """
            insert into public.email_messages (
              id, tenant_id, user_id, to_email, to_name, subject, body_text, body_html,
              template_key, status, provider, related_notification_id, related_entity_type,
              related_entity_id, metadata_json
            )
            values (
              :id, :tenant_id, :user_id, :to_email, :to_name, :subject, :body_text, :body_html,
              :template_key, :status, :provider, :related_notification_id, :related_entity_type,
              :related_entity_id, cast(:metadata_json as jsonb)
            )
            returning *
            """
        ),
        {
            "id": str(uuid4()),
            "tenant_id": context["tenant_id"],
            "user_id": request.user_id,
            "to_email": request.to_email,
            "to_name": request.to_name,
            "subject": _sanitize(request.subject),
            "body_text": _sanitize(request.body_text),
            "body_html": request.body_html,
            "template_key": request.template_key,
            "status": status_value,
            "provider": "smtp",
            "related_notification_id": request.related_notification_id,
            "related_entity_type": request.related_entity_type,
            "related_entity_id": request.related_entity_id,
            "metadata_json": json.dumps(request.metadata_json, ensure_ascii=False, default=str),
        },
    )
    row = row_to_dict(result.mappings().one()) or {}
    increment_counter("emails_queued_count" if status_value == "queued" else "emails_skipped_count")
    return _public_email(row)


async def queue_email_for_notification(
    session: AsyncSession,
    context: dict[str, Any],
    notification: dict[str, Any],
    *,
    preferences: dict[str, Any],
) -> dict[str, Any] | None:
    if not preference_allows_channel(
        preferences,
        notification_type=str(notification.get("notification_type") or ""),
        channel="email",
        priority=str(notification.get("priority") or "normal"),
        severity=str(notification.get("severity") or "info"),
    ):
        return None
    email = await _resolve_user_email(session, context, str(notification.get("user_id") or ""))
    if not email:
        return None
    template_key = str(notification.get("notification_type") or "system_warning")
    rendered = render_template(
        template_key,
        {
            "user_name": notification.get("user_id"),
            "title": notification.get("title"),
            "message": notification.get("message"),
            "record_label": notification.get("related_record_label") or notification.get("title"),
            "target_url": notification.get("target_page") or "/app",
            "due_date": notification.get("due_at") or notification.get("expires_at") or "",
        },
    )
    return await queue_email_message(
        session,
        context,
        EmailMessageCreate(
            user_id=str(notification.get("user_id")),
            to_email=email,
            subject=rendered["subject"],
            body_text=rendered["body_text"] or str(notification.get("message") or ""),
            body_html=rendered["body_html"] or None,
            template_key=template_key,
            related_notification_id=str(notification.get("id")),
            related_entity_type=notification.get("related_entity_type"),
            related_entity_id=notification.get("related_entity_id"),
            metadata_json={"source": "notification"},
        ),
    )


async def retry_email_message(
    session: AsyncSession,
    context: dict[str, Any],
    message_id: str,
) -> dict[str, Any]:
    await _ensure_table(session)
    result = await session.execute(
        text(
            """
            update public.email_messages
            set status = 'queued', last_error = null
            where id = :id and tenant_id = :tenant_id and status in ('failed','skipped')
            returning id, user_id, to_email, to_name, subject, template_key, status,
                      provider, provider_message_id, retry_count, last_error,
                      related_notification_id, related_entity_type, related_entity_id,
                      created_at, sent_at, metadata_json
            """
        ),
        {"id": message_id, "tenant_id": context["tenant_id"]},
    )
    row = row_to_dict(result.mappings().first())
    if not row:
        raise DomainError("E-posta mesaji bulunamadi veya retry icin uygun degil.", "EMAIL_MESSAGE_NOT_RETRYABLE", status.HTTP_404_NOT_FOUND)
    await record_audit_best_effort(
        session,
        {**context, "module_key": "notifications"},
        action_type="email_retry",
        action_key="notifications.email.retry",
        summary="E-posta mesaji tekrar kuyruga alindi.",
        entity_type="email_message",
        entity_id=message_id,
        new_values={"status": "queued"},
    )
    return row


async def queue_test_email(
    session: AsyncSession,
    context: dict[str, Any],
    request: EmailTestRequest,
) -> dict[str, Any]:
    row = await queue_email_message(
        session,
        context,
        EmailMessageCreate(
            user_id=context.get("user_id"),
            to_email=request.to_email,
            to_name=request.to_name,
            subject=request.subject,
            body_text=request.message,
            template_key="system_test",
            metadata_json={"source": "admin_test"},
        ),
    )
    await record_audit_best_effort(
        session,
        {**context, "module_key": "notifications"},
        action_type="email_test_queued",
        action_key="notifications.email.test",
        summary="Test e-postasi kuyruga alindi.",
        entity_type="email_message",
        entity_id=str(row.get("id")),
        new_values={"to_email": row.get("to_email"), "status": row.get("status")},
    )
    return row


async def process_queued_emails(
    session: AsyncSession,
    context: dict[str, Any],
    *,
    batch_size: int | None = None,
) -> dict[str, Any]:
    await _ensure_table(session)
    settings = get_settings()
    limit = batch_size or settings.email_batch_size
    tenant_filter = "tenant_id = :tenant_id and" if context.get("tenant_id") else ""
    params: dict[str, Any] = {"limit": limit, "max_retries": settings.email_max_retries}
    if context.get("tenant_id"):
        params["tenant_id"] = context["tenant_id"]
    result = await session.execute(
        text(
            f"""
            select *
            from public.email_messages
            where {tenant_filter}
              status in ('queued','failed')
              and retry_count < :max_retries
            order by created_at asc
            limit :limit
            """
        ),
        params,
    )
    rows = rows_to_dicts(list(result.mappings().all()))
    summary = {"processed": len(rows), "sent": 0, "failed": 0, "skipped": 0}
    for row in rows:
        status_value = await send_email_message(session, {**context, "tenant_id": row["tenant_id"]}, row)
        summary[status_value] = int(summary.get(status_value, 0)) + 1
    return summary


async def send_email_message(
    session: AsyncSession,
    context: dict[str, Any],
    row: dict[str, Any],
) -> str:
    settings = get_settings()
    if not settings.email_enabled:
        await _mark_email(session, row, "skipped", error="EMAIL_DISABLED")
        increment_counter("emails_skipped_count")
        return "skipped"
    try:
        await _mark_email(session, row, "sending")
        provider_message_id = _send_smtp(settings, row)
        await _mark_email(session, row, "sent", provider_message_id=provider_message_id)
        increment_counter("emails_sent_count")
        await record_audit_best_effort(
            session,
            {**context, "module_key": "notifications"},
            action_type="email_sent",
            action_key="notifications.email.sent",
            summary="E-posta gonderildi.",
            entity_type="email_message",
            entity_id=str(row.get("id")),
            new_values={"to_email": row.get("to_email"), "status": "sent"},
        )
        return "sent"
    except Exception as error:  # pragma: no cover - SMTP environment dependent
        sanitized = _sanitize_error(str(error))
        await _mark_email(session, row, "failed", error=sanitized)
        increment_counter("emails_failed_count")
        log_warning(
            "Email send failed.",
            logger_name="eden.notifications",
            exception_type=error.__class__.__name__,
            email_message_id=str(row.get("id")),
        )
        return "failed"


async def _mark_email(
    session: AsyncSession,
    row: dict[str, Any],
    status_value: str,
    *,
    error: str | None = None,
    provider_message_id: str | None = None,
) -> None:
    await session.execute(
        text(
            """
            update public.email_messages
            set status = :status,
                retry_count = case when :status = 'failed' then retry_count + 1 else retry_count end,
                last_error = :last_error,
                provider_message_id = coalesce(:provider_message_id, provider_message_id),
                sent_at = case when :status = 'sent' then now() else sent_at end
            where id = :id and tenant_id = :tenant_id
            """
        ),
        {
            "id": row["id"],
            "tenant_id": row["tenant_id"],
            "status": status_value,
            "last_error": error,
            "provider_message_id": provider_message_id,
        },
    )


def _send_smtp(settings: Any, row: dict[str, Any]) -> str:
    if not settings.smtp_host or not settings.smtp_from_email:
        raise RuntimeError("SMTP_NOT_CONFIGURED")
    message = EmailMessage()
    message["Subject"] = str(row.get("subject") or "")
    message["From"] = _format_address(settings.smtp_from_name, settings.smtp_from_email)
    message["To"] = _format_address(row.get("to_name"), row.get("to_email"))
    message.set_content(str(row.get("body_text") or ""))
    if row.get("body_html"):
        message.add_alternative(str(row["body_html"]), subtype="html")
    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as smtp:
        if settings.smtp_tls:
            smtp.starttls()
        if settings.smtp_user and settings.smtp_password:
            smtp.login(settings.smtp_user, settings.smtp_password)
        smtp.send_message(message)
    log_info("Email sent.", logger_name="eden.notifications", template_key=row.get("template_key"))
    return str(row.get("id"))


async def _resolve_user_email(session: AsyncSession, context: dict[str, Any], user_id: str) -> str | None:
    if not user_id:
        return None
    if await table_exists(session, "public.user_profiles"):
        result = await session.execute(
            text(
                """
                select email
                from public.user_profiles
                where tenant_id = :tenant_id and user_id = :user_id
                limit 1
                """
            ),
            {"tenant_id": context["tenant_id"], "user_id": user_id},
        )
        value = result.scalar_one_or_none()
        if value:
            return str(value)
    if context.get("user_id") == user_id and context.get("user_email"):
        return str(context["user_email"])
    return None


async def _ensure_table(session: AsyncSession) -> None:
    if not await table_exists(session, "public.email_messages"):
        raise DomainError("E-posta kuyrugu altyapisi hazir degil.", "EMAIL_MESSAGES_TABLE_MISSING", status.HTTP_503_SERVICE_UNAVAILABLE)


def _public_email(row: dict[str, Any]) -> dict[str, Any]:
    return {
        key: value
        for key, value in row.items()
        if key not in {"tenant_id", "body_text", "body_html"}
    }


def _format_address(name: object | None, email: object | None) -> str:
    address = str(email or "")
    label = _sanitize(str(name or "")).strip()
    return f"{label} <{address}>" if label else address


def _sanitize(value: str) -> str:
    return value.replace("\r", " ").replace("\n", " ").strip()


def _sanitize_error(value: str) -> str:
    sanitized = _sanitize(value)
    for marker in ("password", "token", "secret", "authorization"):
        sanitized = sanitized.replace(marker, "[masked]").replace(marker.upper(), "[masked]")
    return sanitized[:500]
