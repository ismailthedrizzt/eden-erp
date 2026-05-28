# ruff: noqa: E501

from __future__ import annotations

import json
from typing import Any
from uuid import uuid4

from fastapi import status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.core.metrics import increment_counter, set_gauge
from app.core.serialization import row_to_dict, rows_to_dicts
from app.domains.audit.service import record_audit_best_effort
from app.domains.notifications.preferences import get_preferences, preference_allows_channel
from app.domains.notifications.schemas import NotificationCreateRequest, NotificationListQuery
from app.domains.operations.service import table_exists


async def list_notifications(
    session: AsyncSession,
    context: dict[str, Any],
    query: NotificationListQuery,
) -> dict[str, Any]:
    _require_user(context)
    await _ensure_table(session)
    where = ["tenant_id = :tenant_id", "user_id = :user_id"]
    params: dict[str, Any] = {
        "tenant_id": context["tenant_id"],
        "user_id": context["user_id"],
        "limit": query.page_size,
        "offset": (query.page - 1) * query.page_size,
    }
    if query.status:
        where.append("status = :status")
        params["status"] = query.status
    if query.notification_type:
        where.append("notification_type = :notification_type")
        params["notification_type"] = query.notification_type
    if query.module_key:
        where.append("module_key = :module_key")
        params["module_key"] = query.module_key
    if query.severity:
        where.append("severity = :severity")
        params["severity"] = query.severity
    if query.priority:
        where.append("priority = :priority")
        params["priority"] = query.priority
    if query.action_required is not None:
        where.append("action_required = :action_required")
        params["action_required"] = query.action_required
    if query.related_entity_type:
        where.append("related_entity_type = :related_entity_type")
        params["related_entity_type"] = query.related_entity_type
    if query.related_entity_id:
        where.append("related_entity_id = :related_entity_id")
        params["related_entity_id"] = query.related_entity_id
    if query.search:
        where.append("(title ilike :search or message ilike :search or related_record_label ilike :search)")
        params["search"] = f"%{query.search}%"

    where_clause = " and ".join(where)
    result = await session.execute(
        text(
            f"""
            select *
            from public.notifications
            where {where_clause}
            order by created_at desc
            limit :limit offset :offset
            """
        ),
        params,
    )
    count_result = await session.execute(
        text(f"select count(*) as count from public.notifications where {where_clause}"),
        params,
    )
    rows = [_public_notification(row) for row in rows_to_dicts(list(result.mappings().all()))]
    total = int(count_result.scalar_one() or 0)
    return {"data": rows, "meta": {"page": query.page, "pageSize": query.page_size, "total": total}}


async def get_notification(
    session: AsyncSession,
    context: dict[str, Any],
    notification_id: str,
) -> dict[str, Any]:
    _require_user(context)
    await _ensure_table(session)
    result = await session.execute(
        text(
            """
            select *
            from public.notifications
            where id = :id and tenant_id = :tenant_id and user_id = :user_id
            """
        ),
        {"id": notification_id, "tenant_id": context["tenant_id"], "user_id": context["user_id"]},
    )
    row = row_to_dict(result.mappings().first())
    if not row:
        raise DomainError("Bildirim bulunamadi.", "NOTIFICATION_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    return _public_notification(row)


async def create_notification(
    session: AsyncSession,
    context: dict[str, Any],
    request: NotificationCreateRequest,
    *,
    queue_email: bool = True,
) -> dict[str, Any]:
    await _ensure_table(session)
    _assert_company_scope(context, request.company_id)
    preferences = await _preferences_for_user(session, context, request.user_id)
    if not preference_allows_channel(
        preferences,
        notification_type=request.notification_type,
        channel="in_app",
        priority=request.priority,
        severity=request.severity,
    ):
        return {
            "status": "skipped",
            "reason": "in_app_disabled",
            "user_id": request.user_id,
            "notification_type": request.notification_type,
        }
    existing = await _find_duplicate_unread(session, context, request)
    if existing:
        row = await _merge_duplicate(session, existing, request)
    else:
        row = await _insert_notification(session, context, request)

    increment_counter("notifications_created_count")
    await _audit_if_critical(session, context, row)
    if queue_email and "email" in request.delivered_channels:
        from app.domains.notifications.email import queue_email_for_notification

        await queue_email_for_notification(session, context, row, preferences=preferences)
    return _public_notification(row)


async def create_notification_for_users(
    session: AsyncSession,
    context: dict[str, Any],
    user_ids: list[str],
    payload: dict[str, Any],
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for user_id in sorted({str(item) for item in user_ids if item}):
        rows.append(
            await create_notification(
                session,
                context,
                NotificationCreateRequest(user_id=user_id, **payload),
            )
        )
    return rows


async def mark_read(
    session: AsyncSession,
    context: dict[str, Any],
    notification_id: str,
) -> dict[str, Any]:
    return await _update_status(session, context, notification_id, "read")


async def mark_all_read(session: AsyncSession, context: dict[str, Any]) -> dict[str, Any]:
    _require_user(context)
    await _ensure_table(session)
    result = await session.execute(
        text(
            """
            update public.notifications
            set status = 'read', read_at = now()
            where tenant_id = :tenant_id and user_id = :user_id and status = 'unread'
            """
        ),
        {"tenant_id": context["tenant_id"], "user_id": context["user_id"]},
    )
    return {"updated": int(getattr(result, "rowcount", 0) or 0)}


async def dismiss_notification(
    session: AsyncSession,
    context: dict[str, Any],
    notification_id: str,
) -> dict[str, Any]:
    return await _update_status(session, context, notification_id, "dismissed")


async def archive_notification(
    session: AsyncSession,
    context: dict[str, Any],
    notification_id: str,
) -> dict[str, Any]:
    return await _update_status(session, context, notification_id, "archived")


async def get_unread_counts(session: AsyncSession, context: dict[str, Any]) -> dict[str, Any]:
    _require_user(context)
    await _ensure_table(session)
    result = await session.execute(
        text(
            """
            select
              count(*) filter (where status = 'unread') as unread,
              count(*) filter (where status = 'unread' and priority in ('high','urgent')) as high_priority,
              count(*) filter (where status = 'unread' and severity in ('error','critical')) as critical,
              count(*) filter (where status = 'unread' and action_required) as action_required
            from public.notifications
            where tenant_id = :tenant_id and user_id = :user_id
            """
        ),
        {"tenant_id": context["tenant_id"], "user_id": context["user_id"]},
    )
    row = row_to_dict(result.mappings().one()) or {}
    set_gauge("unread_count", float(row.get("unread") or 0))
    return {key: int(row.get(key) or 0) for key in row}


async def _insert_notification(
    session: AsyncSession,
    context: dict[str, Any],
    request: NotificationCreateRequest,
) -> dict[str, Any]:
    result = await session.execute(
        text(
            """
            insert into public.notifications (
              id, tenant_id, user_id, company_id, branch_id, module_key, notification_type,
              title, message, severity, priority, status, action_required, action_key,
              action_label, target_page, related_entity_type, related_entity_id,
              related_record_label, process_instance_id, task_id, approval_id, operation_id,
              outbox_event_id, due_at, expires_at, delivered_channels, delivery_status,
              metadata_json
            )
            values (
              :id, :tenant_id, :user_id, :company_id, :branch_id, :module_key, :notification_type,
              :title, :message, :severity, :priority, 'unread', :action_required, :action_key,
              :action_label, :target_page, :related_entity_type, :related_entity_id,
              :related_record_label, :process_instance_id, :task_id, :approval_id, :operation_id,
              :outbox_event_id, :due_at, :expires_at, cast(:delivered_channels as jsonb),
              :delivery_status, cast(:metadata_json as jsonb)
            )
            returning *
            """
        ),
        _notification_params(context, request, str(uuid4())),
    )
    return row_to_dict(result.mappings().one()) or {}


async def _find_duplicate_unread(
    session: AsyncSession,
    context: dict[str, Any],
    request: NotificationCreateRequest,
) -> dict[str, Any] | None:
    if not request.related_entity_type or not request.related_entity_id:
        return None
    result = await session.execute(
        text(
            """
            select *
            from public.notifications
            where tenant_id = :tenant_id
              and user_id = :user_id
              and notification_type = :notification_type
              and related_entity_type = :related_entity_type
              and related_entity_id = :related_entity_id
              and status = 'unread'
            order by created_at desc
            limit 1
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "user_id": request.user_id,
            "notification_type": request.notification_type,
            "related_entity_type": request.related_entity_type,
            "related_entity_id": request.related_entity_id,
        },
    )
    return row_to_dict(result.mappings().first())


async def _merge_duplicate(
    session: AsyncSession,
    existing: dict[str, Any],
    request: NotificationCreateRequest,
) -> dict[str, Any]:
    metadata = dict(existing.get("metadata_json") or {})
    metadata["merged_count"] = int(metadata.get("merged_count") or 1) + 1
    result = await session.execute(
        text(
            """
            update public.notifications
            set title = :title,
                message = :message,
                severity = :severity,
                priority = :priority,
                due_at = :due_at,
                expires_at = :expires_at,
                delivered_channels = cast(:delivered_channels as jsonb),
                delivery_status = :delivery_status,
                metadata_json = cast(:metadata_json as jsonb),
                created_at = now()
            where id = :id
            returning *
            """
        ),
        {
            "id": existing["id"],
            "title": request.title,
            "message": request.message,
            "severity": request.severity,
            "priority": request.priority,
            "due_at": request.due_at,
            "expires_at": request.expires_at,
            "delivered_channels": json.dumps(request.delivered_channels, ensure_ascii=False),
            "delivery_status": request.delivery_status,
            "metadata_json": json.dumps({**metadata, **request.metadata_json}, ensure_ascii=False, default=str),
        },
    )
    return row_to_dict(result.mappings().one()) or {}


async def _update_status(
    session: AsyncSession,
    context: dict[str, Any],
    notification_id: str,
    next_status: str,
) -> dict[str, Any]:
    _require_user(context)
    await _ensure_table(session)
    read_expr = "now()" if next_status == "read" else "read_at"
    dismiss_expr = "now()" if next_status == "dismissed" else "dismissed_at"
    result = await session.execute(
        text(
            f"""
            update public.notifications
            set status = :status,
                read_at = {read_expr},
                dismissed_at = {dismiss_expr}
            where id = :id and tenant_id = :tenant_id and user_id = :user_id
            returning *
            """
        ),
        {
            "id": notification_id,
            "tenant_id": context["tenant_id"],
            "user_id": context["user_id"],
            "status": next_status,
        },
    )
    row = row_to_dict(result.mappings().first())
    if not row:
        raise DomainError("Bildirim bulunamadi.", "NOTIFICATION_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    return _public_notification(row)


async def _preferences_for_user(
    session: AsyncSession,
    context: dict[str, Any],
    user_id: str,
) -> dict[str, Any]:
    preference_context = {**context, "user_id": user_id}
    return await get_preferences(session, preference_context)


def _notification_params(
    context: dict[str, Any],
    request: NotificationCreateRequest,
    notification_id: str,
) -> dict[str, Any]:
    return {
        "id": notification_id,
        "tenant_id": context["tenant_id"],
        "user_id": request.user_id,
        "company_id": request.company_id,
        "branch_id": request.branch_id,
        "module_key": request.module_key,
        "notification_type": request.notification_type,
        "title": request.title,
        "message": _sanitize_message(request.message),
        "severity": request.severity,
        "priority": request.priority,
        "action_required": request.action_required,
        "action_key": request.action_key,
        "action_label": request.action_label,
        "target_page": request.target_page,
        "related_entity_type": request.related_entity_type,
        "related_entity_id": request.related_entity_id,
        "related_record_label": request.related_record_label,
        "process_instance_id": request.process_instance_id,
        "task_id": request.task_id,
        "approval_id": request.approval_id,
        "operation_id": request.operation_id,
        "outbox_event_id": request.outbox_event_id,
        "due_at": request.due_at,
        "expires_at": request.expires_at,
        "delivered_channels": json.dumps(request.delivered_channels, ensure_ascii=False),
        "delivery_status": request.delivery_status,
        "metadata_json": json.dumps(request.metadata_json, ensure_ascii=False, default=str),
    }


def _public_notification(row: dict[str, Any]) -> dict[str, Any]:
    return {
        key: value
        for key, value in row.items()
        if key not in {"tenant_id"}
    }


async def _audit_if_critical(
    session: AsyncSession,
    context: dict[str, Any],
    row: dict[str, Any],
) -> None:
    if row.get("severity") not in {"critical", "error"} and row.get("priority") != "urgent":
        return
    await record_audit_best_effort(
        session,
        {**context, "module_key": "notifications"},
        action_type="critical_notification_created",
        action_key="notifications.critical.create",
        summary=str(row.get("title") or "Kritik bildirim olusturuldu."),
        severity=str(row.get("severity") or "warning"),
        entity_type="notification",
        entity_id=str(row.get("id")),
        new_values={
            "notification_type": row.get("notification_type"),
            "priority": row.get("priority"),
            "severity": row.get("severity"),
            "user_id": row.get("user_id"),
        },
    )


async def _ensure_table(session: AsyncSession) -> None:
    if not await table_exists(session, "public.notifications"):
        raise DomainError(
            "Bildirim altyapisi hazir degil.",
            "NOTIFICATIONS_TABLE_MISSING",
            status.HTTP_503_SERVICE_UNAVAILABLE,
        )


def _require_user(context: dict[str, Any]) -> None:
    if not context.get("user_id"):
        raise DomainError("Bildirimler icin kullanici oturumu gerekir.", "NOTIFICATION_USER_REQUIRED", status.HTTP_401_UNAUTHORIZED)


def _assert_company_scope(context: dict[str, Any], company_id: str | None) -> None:
    if not company_id:
        return
    scope = context.get("company_scope_ids")
    if scope is None:
        return
    if str(company_id) not in {str(item) for item in scope}:
        raise DomainError("Bildirim erisim kapsaminiz disinda.", "NOTIFICATION_SCOPE_DENIED", status.HTTP_403_FORBIDDEN)


def _sanitize_message(message: str) -> str:
    sensitive_tokens = ["tckn", "vkn", "iban", "password", "token", "signed_url"]
    sanitized = message
    for token in sensitive_tokens:
        sanitized = sanitized.replace(token, "[masked]")
        sanitized = sanitized.replace(token.upper(), "[masked]")
    return sanitized
