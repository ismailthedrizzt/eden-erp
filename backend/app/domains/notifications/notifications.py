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
from app.domains.audit.service import record_audit_required
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
    if query.status_values:
        status_placeholders = []
        for index, status_value in enumerate(query.status_values):
            key = f"status_value_{index}"
            status_placeholders.append(f":{key}")
            params[key] = status_value
        where.append(f"status in ({', '.join(status_placeholders)})")
    elif query.status:
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


async def create_process_task_notifications(
    session: AsyncSession,
    context: dict[str, Any],
    task: dict[str, Any],
) -> list[dict[str, Any]]:
    if not await table_exists(session, "public.notifications"):
        return []
    user_ids = await _resolve_notification_user_ids(
        session,
        context,
        direct_user_id=task.get("assigned_to"),
        role_key=task.get("assigned_role"),
        permission_key=task.get("assigned_permission"),
    )
    if not user_ids:
        return []

    payload = _process_task_notification_payload(task)
    return await create_notification_for_users(session, context, user_ids, payload)


async def create_process_approval_notifications(
    session: AsyncSession,
    context: dict[str, Any],
    approval: dict[str, Any],
) -> list[dict[str, Any]]:
    if not await table_exists(session, "public.notifications"):
        return []
    user_ids = await _resolve_notification_user_ids(
        session,
        context,
        direct_user_id=approval.get("approver_id"),
        role_key=approval.get("approver_role"),
        permission_key=approval.get("approver_permission"),
    )
    if not user_ids:
        return []

    payload = _process_approval_notification_payload(approval)
    return await create_notification_for_users(session, context, user_ids, payload)


async def dismiss_work_notifications(
    session: AsyncSession,
    context: dict[str, Any],
    *,
    task_id: str | None = None,
    approval_id: str | None = None,
    process_instance_id: str | None = None,
) -> dict[str, int]:
    if not await table_exists(session, "public.notifications"):
        return {"updated": 0}
    targets: list[str] = []
    params: dict[str, Any] = {"tenant_id": context["tenant_id"]}
    if task_id:
        targets.append("task_id = :task_id")
        params["task_id"] = task_id
    if approval_id:
        targets.append("approval_id = :approval_id")
        params["approval_id"] = approval_id
    if process_instance_id:
        targets.append("process_instance_id = :process_instance_id")
        params["process_instance_id"] = process_instance_id
    if not targets:
        return {"updated": 0}

    result = await session.execute(
        text(
            f"""
            update public.notifications
            set status = 'dismissed',
                dismissed_at = now()
            where tenant_id = :tenant_id
              and status in ('unread','read')
              and ({' or '.join(targets)})
            """
        ),
        params,
    )
    return {"updated": int(getattr(result, "rowcount", 0) or 0)}


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
              count(*) filter (where status = 'unread' and action_required) as action_required,
              count(*) filter (where status in ('unread','read')) as pending_total,
              count(*) filter (
                where status in ('unread','read')
                  and (
                    task_id is not null
                    or notification_type like 'task_%'
                    or notification_type like 'process_task%'
                  )
              ) as pending_tasks
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
              and status in ('unread','read')
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
                status = 'unread',
                read_at = null,
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


async def _resolve_notification_user_ids(
    session: AsyncSession,
    context: dict[str, Any],
    *,
    direct_user_id: Any = None,
    role_key: Any = None,
    permission_key: Any = None,
) -> list[str]:
    user_ids: set[str] = set()
    if direct_user_id:
        user_ids.add(str(direct_user_id))

    role = _string_or_none(role_key)
    permission = _string_or_none(permission_key)
    if role and await table_exists(session, "public.security_user_roles") and await table_exists(session, "public.security_roles"):
        await _add_security_role_users(session, context, user_ids, role)
    if permission and await table_exists(session, "public.security_user_roles") and await table_exists(session, "public.security_roles") and await table_exists(session, "public.security_role_permissions"):
        await _add_security_permission_users(session, context, user_ids, permission)
    if role and await table_exists(session, "public.user_roles") and await table_exists(session, "public.roles"):
        await _add_legacy_role_users(session, context, user_ids, role)
    if permission and await table_exists(session, "public.user_roles") and await table_exists(session, "public.role_permissions") and await table_exists(session, "public.permissions"):
        await _add_legacy_permission_users(session, context, user_ids, permission)
    return sorted(user_ids)


async def _add_security_role_users(
    session: AsyncSession,
    context: dict[str, Any],
    user_ids: set[str],
    role_key: str,
) -> None:
    profile_exists = await table_exists(session, "public.security_users_profile")
    user_select = "coalesce(p.auth_user_id::text, ur.user_id::text)" if profile_exists else "ur.user_id::text"
    profile_join = "left join public.security_users_profile p on p.id = ur.user_id" if profile_exists else ""
    result = await session.execute(
        text(
            f"""
            select distinct {user_select} as user_id
            from public.security_user_roles ur
            join public.security_roles r on r.id = ur.role_id
            {profile_join}
            where ur.tenant_id = :tenant_id
              and r.status = 'active'
              and r.role_key = :role_key
            """
        ),
        {"tenant_id": context["tenant_id"], "role_key": role_key},
    )
    user_ids.update(str(row["user_id"]) for row in result.mappings().all() if row.get("user_id"))


async def _add_security_permission_users(
    session: AsyncSession,
    context: dict[str, Any],
    user_ids: set[str],
    permission_key: str,
) -> None:
    profile_exists = await table_exists(session, "public.security_users_profile")
    user_select = "coalesce(p.auth_user_id::text, ur.user_id::text)" if profile_exists else "ur.user_id::text"
    profile_join = "left join public.security_users_profile p on p.id = ur.user_id" if profile_exists else ""
    result = await session.execute(
        text(
            f"""
            select distinct {user_select} as user_id
            from public.security_user_roles ur
            join public.security_roles r on r.id = ur.role_id
            join public.security_role_permissions rp on rp.role_id = r.id and rp.granted = true
            {profile_join}
            where ur.tenant_id = :tenant_id
              and r.status = 'active'
              and rp.permission_key = :permission_key
            """
        ),
        {"tenant_id": context["tenant_id"], "permission_key": permission_key},
    )
    user_ids.update(str(row["user_id"]) for row in result.mappings().all() if row.get("user_id"))


async def _add_legacy_role_users(
    session: AsyncSession,
    context: dict[str, Any],
    user_ids: set[str],
    role_key: str,
) -> None:
    result = await session.execute(
        text(
            """
            select distinct ur.user_id::text as user_id
            from public.user_roles ur
            join public.roles r on r.id = ur.role_id
            where ur.status = 'active'
              and r.status = 'active'
              and r.role_key = :role_key
              and (ur.instance_id = :tenant_id or ur.instance_id is null)
            """
        ),
        {"tenant_id": context["tenant_id"], "role_key": role_key},
    )
    user_ids.update(str(row["user_id"]) for row in result.mappings().all() if row.get("user_id"))


async def _add_legacy_permission_users(
    session: AsyncSession,
    context: dict[str, Any],
    user_ids: set[str],
    permission_key: str,
) -> None:
    result = await session.execute(
        text(
            """
            select distinct ur.user_id::text as user_id
            from public.user_roles ur
            join public.role_permissions rp on rp.role_id = ur.role_id
            join public.permissions p on p.id = rp.permission_id
            where ur.status = 'active'
              and p.permission_key = :permission_key
              and (ur.instance_id = :tenant_id or ur.instance_id is null)
            """
        ),
        {"tenant_id": context["tenant_id"], "permission_key": permission_key},
    )
    user_ids.update(str(row["user_id"]) for row in result.mappings().all() if row.get("user_id"))


def _process_task_notification_payload(task: dict[str, Any]) -> dict[str, Any]:
    metadata = _notification_card_metadata(task, default_action=_string_or_none(task.get("title")) or "İşlem bekliyor")
    return {
        "company_id": task.get("company_id"),
        "module_key": task.get("module_key") or "process",
        "notification_type": "process_task_created",
        "title": metadata["record_label"],
        "message": metadata["message"],
        "severity": "info",
        "priority": "normal",
        "action_required": True,
        "action_key": "open_process_task",
        "action_label": "Aç",
        "target_page": metadata["target_page"],
        "related_entity_type": metadata["entity_type"],
        "related_entity_id": metadata["entity_id"],
        "related_record_label": metadata["record_label"],
        "process_instance_id": task.get("process_instance_id"),
        "task_id": task.get("id"),
        "due_at": task.get("due_at"),
        "metadata_json": metadata,
    }


def _process_approval_notification_payload(approval: dict[str, Any]) -> dict[str, Any]:
    metadata = _notification_card_metadata(approval, default_action="Onay bekliyor")
    return {
        "company_id": approval.get("company_id"),
        "module_key": approval.get("module_key") or "process",
        "notification_type": "approval_requested",
        "title": metadata["record_label"],
        "message": metadata["message"],
        "severity": "warning",
        "priority": "high",
        "action_required": True,
        "action_key": "open_process_approval",
        "action_label": "Aç",
        "target_page": metadata["target_page"],
        "related_entity_type": metadata["entity_type"],
        "related_entity_id": metadata["entity_id"],
        "related_record_label": metadata["record_label"],
        "process_instance_id": approval.get("process_instance_id"),
        "task_id": approval.get("task_id"),
        "approval_id": approval.get("id"),
        "metadata_json": metadata,
    }


def _notification_card_metadata(row: dict[str, Any], *, default_action: str) -> dict[str, Any]:
    payload = _json_object(row.get("payload_json"))
    entity_type = _first_text(row.get("entity_type"), payload.get("entity_type"), row.get("related_entity_type"))
    entity_id = _first_text(row.get("entity_id"), payload.get("entity_id"), row.get("related_entity_id"))
    entity_label = _entity_type_label(entity_type)
    record_label = _first_text(
        payload.get("related_record_label"),
        payload.get("record_label"),
        payload.get("display_name"),
        payload.get("full_name"),
        row.get("related_record_label"),
        row.get("title"),
        entity_id,
        "Kayıt",
    )
    status_label = _record_status_label(_first_text(payload.get("record_status_label"), payload.get("status_label"), payload.get("record_status")))
    pending_action = _first_text(payload.get("pending_action_label"), payload.get("operation_label"), row.get("title"), default_action)
    card_type = " ".join(item for item in [status_label, entity_label] if item).strip() or entity_label or "Kayıt"
    target_page = _first_text(payload.get("target_page"), row.get("target_page"), _record_target_page(entity_type, entity_id), _process_target_page(row))
    message = f"{card_type}, {pending_action}"
    return {
        **payload,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "entity_type_label": entity_label,
        "record_status_label": status_label,
        "record_label": record_label,
        "card_type": card_type,
        "pending_action_label": pending_action,
        "target_page": target_page,
        "message": message,
    }


def _record_target_page(entity_type: str | None, entity_id: str | None) -> str | None:
    if not entity_type or not entity_id:
        return None
    target_map = {
        "company": "/app/sirket/companies",
        "branch": "/app/sirket/companies/branches",
        "company_branch": "/app/sirket/companies/branches",
        "partner": "/app/sirket/companies/partners",
        "company_partner": "/app/sirket/companies/partners",
        "representative": "/app/sirket/companies/representatives",
        "company_representative": "/app/sirket/companies/representatives",
        "employee": "/app/ik/personel",
        "hr_employee": "/app/ik/personel",
    }
    base = target_map.get(entity_type)
    if not base:
        return None
    return f"{base}?id={entity_id}&action=notification"


def _process_target_page(row: dict[str, Any]) -> str:
    process_id = _string_or_none(row.get("process_instance_id"))
    return f"/app/surecler/{process_id}" if process_id else "/app/surecler"


def _entity_type_label(entity_type: str | None) -> str:
    labels = {
        "company": "Şirket",
        "branch": "Şube",
        "company_branch": "Şube",
        "partner": "Ortak",
        "company_partner": "Ortak",
        "representative": "Temsilci",
        "company_representative": "Temsilci",
        "employee": "Çalışan",
        "hr_employee": "Çalışan",
        "person": "Gerçek Kişi",
    }
    return labels.get(str(entity_type or ""), "Kayıt")


def _record_status_label(value: str | None) -> str:
    labels = {
        "draft": "Taslak",
        "taslak": "Taslak",
        "active": "Aktif",
        "aktif": "Aktif",
        "passive": "Pasif",
        "pasif": "Pasif",
        "pending": "Onayda",
        "pending_approval": "Onayda",
        "waiting_approval": "Onayda",
    }
    return labels.get(str(value or "").strip().lower(), str(value or "").strip())


def _json_object(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
        except json.JSONDecodeError:
            return {}
        return parsed if isinstance(parsed, dict) else {}
    return {}


def _first_text(*values: Any) -> str:
    for value in values:
        text_value = _string_or_none(value)
        if text_value:
            return text_value
    return ""


def _string_or_none(value: Any) -> str | None:
    if value is None:
        return None
    text_value = str(value).strip()
    return text_value or None


async def _audit_if_critical(
    session: AsyncSession,
    context: dict[str, Any],
    row: dict[str, Any],
) -> None:
    if row.get("severity") not in {"critical", "error"} and row.get("priority") != "urgent":
        return
    await record_audit_required(
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
