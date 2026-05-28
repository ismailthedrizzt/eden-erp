# ruff: noqa: E501

from __future__ import annotations

import json
from typing import Any
from uuid import uuid4

from fastapi import status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.core.serialization import row_to_dict
from app.domains.audit.service import record_audit_best_effort
from app.domains.notifications.schemas import NotificationPreferencePatch
from app.domains.operations.service import table_exists

DEFAULT_PREFERENCES: dict[str, Any] = {
    "in_app_enabled": True,
    "email_enabled": True,
    "task_notifications": True,
    "approval_notifications": True,
    "system_warnings": True,
    "document_expiry": True,
    "service_reminders": True,
    "hr_reminders": True,
    "security_notifications": True,
    "quiet_hours": {},
    "digest_frequency": "never",
    "language": "tr",
    "timezone": "Europe/Istanbul",
}


async def get_preferences(session: AsyncSession, context: dict[str, Any]) -> dict[str, Any]:
    _require_user(context)
    await _ensure_table(session)
    row = await _fetch_preferences(session, context)
    if row:
        return row
    return await _insert_default_preferences(session, context)


async def patch_preferences(
    session: AsyncSession,
    context: dict[str, Any],
    request: NotificationPreferencePatch,
) -> dict[str, Any]:
    _require_user(context)
    await _ensure_table(session)
    old_row = await get_preferences(session, context)
    values = request.model_dump(exclude_unset=True)
    allowed = {key: value for key, value in values.items() if value is not None}
    if not allowed:
        return old_row

    assignments: list[str] = []
    params: dict[str, Any] = {
        "tenant_id": context["tenant_id"],
        "user_id": context["user_id"],
    }
    for key, value in allowed.items():
        if key == "quiet_hours":
            assignments.append("quiet_hours = cast(:quiet_hours as jsonb)")
            params["quiet_hours"] = json.dumps(value, ensure_ascii=False, default=str)
        else:
            assignments.append(f"{key} = :{key}")
            params[key] = value
    result = await session.execute(
        text(
            f"""
            update public.notification_preferences
            set {", ".join(assignments)}, updated_at = now()
            where tenant_id = :tenant_id and user_id = :user_id
            returning *
            """
        ),
        params,
    )
    row = row_to_dict(result.mappings().one()) or {}
    await record_audit_best_effort(
        session,
        {**context, "module_key": "notifications"},
        action_type="notification_preference_changed",
        action_key="notifications.preferences.update",
        summary="Bildirim tercihleri guncellendi.",
        entity_type="notification_preference",
        entity_id=str(row.get("id")),
        old_values=old_row,
        new_values=row,
    )
    return row


def preference_allows_channel(
    preferences: dict[str, Any],
    *,
    notification_type: str,
    channel: str,
    priority: str = "normal",
    severity: str = "info",
) -> bool:
    if channel == "in_app" and not preferences.get("in_app_enabled", True):
        return severity == "critical" or priority == "urgent"
    if channel == "email" and not preferences.get("email_enabled", True):
        return severity == "critical" or priority == "urgent"

    if notification_type.startswith("task_"):
        return bool(preferences.get("task_notifications", True))
    if notification_type.startswith("approval_"):
        return bool(preferences.get("approval_notifications", True))
    if notification_type.startswith("document_"):
        return bool(preferences.get("document_expiry", True))
    if notification_type.startswith("service_") or notification_type == "maintenance_due":
        return bool(preferences.get("service_reminders", True))
    if notification_type.startswith("sgk_"):
        return bool(preferences.get("hr_reminders", True))
    if notification_type.startswith("security_"):
        return True
    if notification_type.startswith("system_") or notification_type == "module_setup_required":
        return severity in {"critical", "error"} or bool(preferences.get("system_warnings", True))
    return True


async def _fetch_preferences(session: AsyncSession, context: dict[str, Any]) -> dict[str, Any] | None:
    result = await session.execute(
        text(
            """
            select *
            from public.notification_preferences
            where tenant_id = :tenant_id and user_id = :user_id
            """
        ),
        {"tenant_id": context["tenant_id"], "user_id": context["user_id"]},
    )
    return row_to_dict(result.mappings().first())


async def _insert_default_preferences(session: AsyncSession, context: dict[str, Any]) -> dict[str, Any]:
    result = await session.execute(
        text(
            """
            insert into public.notification_preferences (
              id, tenant_id, user_id, in_app_enabled, email_enabled, task_notifications,
              approval_notifications, system_warnings, document_expiry, service_reminders,
              hr_reminders, security_notifications, quiet_hours, digest_frequency,
              language, timezone
            )
            values (
              :id, :tenant_id, :user_id, :in_app_enabled, :email_enabled, :task_notifications,
              :approval_notifications, :system_warnings, :document_expiry, :service_reminders,
              :hr_reminders, :security_notifications, cast(:quiet_hours as jsonb),
              :digest_frequency, :language, :timezone
            )
            returning *
            """
        ),
        {
            "id": str(uuid4()),
            "tenant_id": context["tenant_id"],
            "user_id": context["user_id"],
            **{key: value for key, value in DEFAULT_PREFERENCES.items() if key != "quiet_hours"},
            "quiet_hours": json.dumps(DEFAULT_PREFERENCES["quiet_hours"], ensure_ascii=False),
        },
    )
    return row_to_dict(result.mappings().one()) or {}


async def _ensure_table(session: AsyncSession) -> None:
    if not await table_exists(session, "public.notification_preferences"):
        raise DomainError(
            "Bildirim tercihleri altyapisi hazir degil.",
            "NOTIFICATION_PREFERENCES_TABLE_MISSING",
            status.HTTP_503_SERVICE_UNAVAILABLE,
        )


def _require_user(context: dict[str, Any]) -> None:
    if not context.get("user_id"):
        raise DomainError(
            "Bildirim tercihleri icin kullanici oturumu gerekir.",
            "NOTIFICATION_USER_REQUIRED",
            status.HTTP_401_UNAUTHORIZED,
        )
