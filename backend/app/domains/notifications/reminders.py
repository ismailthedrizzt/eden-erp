# ruff: noqa: E501

from __future__ import annotations

import json
from typing import Any
from uuid import uuid4

from fastapi import status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.core.metrics import increment_counter
from app.core.serialization import row_to_dict, rows_to_dicts
from app.domains.notifications.notifications import create_notification
from app.domains.notifications.schemas import (
    NotificationCreateRequest,
    ReminderCreateRequest,
    ReminderListQuery,
)
from app.domains.operations.service import table_exists


async def list_reminders(
    session: AsyncSession,
    context: dict[str, Any],
    query: ReminderListQuery,
) -> dict[str, Any]:
    _require_user(context)
    await _ensure_table(session)
    where = [
        "tenant_id = :tenant_id",
        "(target_user_id = :user_id or user_id = :user_id or created_by = :user_id)",
    ]
    params: dict[str, Any] = {
        "tenant_id": context["tenant_id"],
        "user_id": context["user_id"],
        "limit": query.page_size,
        "offset": (query.page - 1) * query.page_size,
    }
    if query.status:
        where.append("status = :status")
        params["status"] = query.status
    if query.module_key:
        where.append("module_key = :module_key")
        params["module_key"] = query.module_key
    if query.reminder_type:
        where.append("reminder_type = :reminder_type")
        params["reminder_type"] = query.reminder_type
    where_clause = " and ".join(where)
    result = await session.execute(
        text(
            f"""
            select *
            from public.reminders
            where {where_clause}
            order by remind_at asc, created_at desc
            limit :limit offset :offset
            """
        ),
        params,
    )
    count_result = await session.execute(
        text(f"select count(*) from public.reminders where {where_clause}"),
        params,
    )
    return {
        "data": rows_to_dicts(list(result.mappings().all())),
        "meta": {"page": query.page, "pageSize": query.page_size, "total": int(count_result.scalar_one() or 0)},
    }


async def create_reminder(
    session: AsyncSession,
    context: dict[str, Any],
    request: ReminderCreateRequest,
) -> dict[str, Any]:
    _require_user(context)
    await _ensure_table(session)
    target_user_id = request.target_user_id or request.user_id or context["user_id"]
    result = await session.execute(
        text(
            """
            insert into public.reminders (
              id, tenant_id, user_id, target_user_id, company_id, module_key,
              reminder_type, title, message, related_entity_type, related_entity_id,
              due_at, remind_at, recurrence_rule, status, channels, created_by,
              metadata_json
            )
            values (
              :id, :tenant_id, :user_id, :target_user_id, :company_id, :module_key,
              :reminder_type, :title, :message, :related_entity_type, :related_entity_id,
              :due_at, :remind_at, :recurrence_rule, 'scheduled', :channels, :created_by,
              cast(:metadata_json as jsonb)
            )
            returning *
            """
        ),
        {
            "id": str(uuid4()),
            "tenant_id": context["tenant_id"],
            "user_id": request.user_id,
            "target_user_id": target_user_id,
            "company_id": request.company_id,
            "module_key": request.module_key,
            "reminder_type": request.reminder_type,
            "title": request.title,
            "message": request.message,
            "related_entity_type": request.related_entity_type,
            "related_entity_id": request.related_entity_id,
            "due_at": request.due_at,
            "remind_at": request.remind_at,
            "recurrence_rule": request.recurrence_rule,
            "channels": request.channels,
            "created_by": context.get("user_id"),
            "metadata_json": json.dumps(request.metadata_json, ensure_ascii=False, default=str),
        },
    )
    row = row_to_dict(result.mappings().one()) or {}
    return row


async def dismiss_reminder(
    session: AsyncSession,
    context: dict[str, Any],
    reminder_id: str,
) -> dict[str, Any]:
    return await _update_reminder_status(session, context, reminder_id, "dismissed")


async def cancel_reminder(
    session: AsyncSession,
    context: dict[str, Any],
    reminder_id: str,
) -> dict[str, Any]:
    return await _update_reminder_status(session, context, reminder_id, "cancelled")


async def process_due_reminders(
    session: AsyncSession,
    context: dict[str, Any],
    *,
    batch_size: int,
) -> dict[str, int]:
    await _ensure_table(session)
    tenant_filter = "tenant_id = :tenant_id and" if context.get("tenant_id") else ""
    params: dict[str, Any] = {"limit": batch_size}
    if context.get("tenant_id"):
        params["tenant_id"] = context["tenant_id"]
    result = await session.execute(
        text(
            f"""
            select *
            from public.reminders
            where {tenant_filter}
              status = 'scheduled'
              and remind_at <= now()
            order by remind_at asc
            limit :limit
            """
        ),
        params,
    )
    rows = rows_to_dicts(list(result.mappings().all()))
    summary = {"processed": len(rows), "sent": 0, "failed": 0}
    for row in rows:
        try:
            await _send_reminder(session, {**context, "tenant_id": row["tenant_id"]}, row)
            summary["sent"] += 1
        except Exception:
            summary["failed"] += 1
            await session.execute(
                text(
                    """
                    update public.reminders
                    set status = 'failed'
                    where id = :id and tenant_id = :tenant_id
                    """
                ),
                {"id": row["id"], "tenant_id": row["tenant_id"]},
            )
    increment_counter("reminders_processed_count", summary["processed"])
    if summary["failed"]:
        increment_counter("reminder_failed_count", summary["failed"])
    return summary


async def _send_reminder(
    session: AsyncSession,
    context: dict[str, Any],
    row: dict[str, Any],
) -> None:
    notification = await create_notification(
        session,
        context,
        NotificationCreateRequest(
            user_id=str(row.get("target_user_id") or row.get("user_id") or context.get("user_id")),
            company_id=row.get("company_id"),
            module_key=str(row.get("module_key") or "platform"),
            notification_type=str(row.get("reminder_type") or "system_warning"),
            title=str(row.get("title") or "Hatirlatma"),
            message=str(row.get("message") or ""),
            severity="warning",
            priority="high" if row.get("due_at") else "normal",
            action_required=True,
            target_page=_target_page_for(row),
            related_entity_type=row.get("related_entity_type"),
            related_entity_id=row.get("related_entity_id"),
            related_record_label=row.get("title"),
            due_at=row.get("due_at"),
            delivered_channels=list(row.get("channels") or ["in_app"]),
            delivery_status="queued" if "email" in (row.get("channels") or []) else "delivered",
            metadata_json={"reminder_id": str(row.get("id"))},
        ),
    )
    await session.execute(
        text(
            """
            update public.reminders
            set status = 'sent', sent_at = now(),
                metadata_json = coalesce(metadata_json, '{}'::jsonb)
                  || cast(:metadata_json as jsonb)
            where id = :id and tenant_id = :tenant_id
            """
        ),
        {
            "id": row["id"],
            "tenant_id": row["tenant_id"],
            "metadata_json": json.dumps({"notification_id": notification.get("id")}, ensure_ascii=False),
        },
    )


async def _update_reminder_status(
    session: AsyncSession,
    context: dict[str, Any],
    reminder_id: str,
    next_status: str,
) -> dict[str, Any]:
    _require_user(context)
    await _ensure_table(session)
    result = await session.execute(
        text(
            """
            update public.reminders
            set status = :status
            where id = :id
              and tenant_id = :tenant_id
              and (target_user_id = :user_id or user_id = :user_id or created_by = :user_id)
            returning *
            """
        ),
        {
            "id": reminder_id,
            "tenant_id": context["tenant_id"],
            "user_id": context["user_id"],
            "status": next_status,
        },
    )
    row = row_to_dict(result.mappings().first())
    if not row:
        raise DomainError("Hatirlatma bulunamadi.", "REMINDER_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    return row


def _target_page_for(row: dict[str, Any]) -> str:
    module_key = str(row.get("module_key") or "")
    if module_key == "documents":
        return "/app/belgeler"
    if module_key == "project_management":
        return "/app/gorev-ve-proje-yonetimi/gorevler"
    if module_key == "after_sales":
        return "/app/satis-sonrasi"
    return "/app"


async def _ensure_table(session: AsyncSession) -> None:
    if not await table_exists(session, "public.reminders"):
        raise DomainError("Hatirlatma altyapisi hazir degil.", "REMINDERS_TABLE_MISSING", status.HTTP_503_SERVICE_UNAVAILABLE)


def _require_user(context: dict[str, Any]) -> None:
    if not context.get("user_id"):
        raise DomainError("Hatirlatmalar icin kullanici oturumu gerekir.", "REMINDER_USER_REQUIRED", status.HTTP_401_UNAUTHORIZED)
