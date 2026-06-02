from __future__ import annotations

import json
from typing import Any
from uuid import uuid4

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.core.serialization import row_to_dict, rows_to_dicts
from app.domains.notifications.notifications import (
    create_process_task_notifications,
    dismiss_work_notifications,
)
from app.domains.operations.service import table_exists
from app.domains.process.events import emit_process_event
from app.domains.process.schemas import (
    AddTaskCommentRequest,
    AssignTaskRequest,
    CompleteTaskRequest,
    CreateTaskRequest,
)


def completed_task_patch(user_id: str | None, result_json: dict[str, Any]) -> dict[str, Any]:
    return {
        "status": "completed",
        "completed_by": user_id,
        "result_json": result_json,
    }


async def _require_task_table(session: AsyncSession) -> None:
    if not await table_exists(session, "public.process_tasks"):
        raise DomainError(
            "Surec gorev altyapisi henuz hazir degil.",
            "TASK_INFRASTRUCTURE_MISSING",
            409,
        )


async def create_task(
    session: AsyncSession,
    context: dict[str, Any],
    payload: CreateTaskRequest,
) -> dict[str, Any]:
    await _require_task_table(session)
    task_id = str(uuid4())
    result = await session.execute(
        text(
            """
            insert into public.process_tasks (
              id, tenant_id, process_instance_id, company_id, module_key, entity_type,
              entity_id, step_key, title, description, assigned_to, assigned_role,
              assigned_permission, due_at, payload_json
            )
            values (
              :id, :tenant_id, :process_instance_id, :company_id, :module_key, :entity_type,
              :entity_id, :step_key, :title, :description, :assigned_to, :assigned_role,
              :assigned_permission, :due_at, cast(:payload_json as jsonb)
            )
            returning *
            """
        ),
        {
            "id": task_id,
            "tenant_id": context["tenant_id"],
            "process_instance_id": payload.process_instance_id,
            "company_id": payload.company_id or context.get("company_id"),
            "module_key": payload.module_key,
            "entity_type": payload.entity_type,
            "entity_id": payload.entity_id,
            "step_key": payload.step_key,
            "title": payload.title,
            "description": payload.description,
            "assigned_to": payload.assigned_to,
            "assigned_role": payload.assigned_role,
            "assigned_permission": payload.assigned_permission,
            "due_at": payload.due_at,
            "payload_json": json.dumps(payload.payload_json, ensure_ascii=False, default=str),
        },
    )
    row = row_to_dict(result.mappings().one()) or {}
    await emit_process_event(
        session,
        context,
        process_instance_id=payload.process_instance_id,
        event_type="task_created",
        module_key=payload.module_key,
        company_id=payload.company_id or context.get("company_id"),
        step_key=payload.step_key,
        payload={"task_id": task_id, "title": payload.title},
    )
    await create_process_task_notifications(session, context, row)
    return row


async def get_task(
    session: AsyncSession,
    context: dict[str, Any],
    task_id: str,
) -> dict[str, Any] | None:
    await _require_task_table(session)
    result = await session.execute(
        text(
            """
            select *
            from public.process_tasks
            where id = :task_id
              and tenant_id = :tenant_id
              and coalesce(is_deleted, false) = false
            limit 1
            """
        ),
        {"task_id": task_id, "tenant_id": context["tenant_id"]},
    )
    return row_to_dict(result.mappings().one_or_none())


async def list_my_tasks(
    session: AsyncSession,
    context: dict[str, Any],
    query: dict[str, Any],
) -> tuple[list[dict[str, Any]], int]:
    await _require_task_table(session)
    limit = int(query.get("limit") or 50)
    offset = int(query.get("offset") or 0)
    status = query.get("status")
    filters = ["tenant_id = :tenant_id", "coalesce(is_deleted, false) = false"]
    params: dict[str, Any] = {"tenant_id": context["tenant_id"], "limit": limit, "offset": offset}
    if context.get("user_id"):
        filters.append("(assigned_to = :user_id or assigned_to is null)")
        params["user_id"] = context["user_id"]
    if status:
        filters.append("status = :status")
        params["status"] = status
    where_clause = " and ".join(filters)
    rows = await session.execute(
        text(
            f"""
            select *
            from public.process_tasks
            where {where_clause}
            order by coalesce(due_at, created_at) asc
            limit :limit offset :offset
            """
        ),
        params,
    )
    count = await session.execute(
        text(f"select count(*) as count from public.process_tasks where {where_clause}"),
        params,
    )
    return rows_to_dicts(list(rows.mappings().all())), int(count.mappings().one()["count"] or 0)


async def list_process_tasks(
    session: AsyncSession,
    context: dict[str, Any],
    process_id: str,
) -> list[dict[str, Any]]:
    await _require_task_table(session)
    result = await session.execute(
        text(
            """
            select *
            from public.process_tasks
            where process_instance_id = :process_id
              and tenant_id = :tenant_id
              and coalesce(is_deleted, false) = false
            order by created_at asc
            """
        ),
        {"process_id": process_id, "tenant_id": context["tenant_id"]},
    )
    return rows_to_dicts(list(result.mappings().all()))


async def assign_task(
    session: AsyncSession,
    context: dict[str, Any],
    task_id: str,
    request: AssignTaskRequest,
) -> dict[str, Any]:
    task = await get_task(session, context, task_id)
    if not task:
        raise DomainError("Gorev kaydi bulunamadi.", "TASK_NOT_FOUND", 404)
    result = await session.execute(
        text(
            """
            update public.process_tasks
            set assigned_to = :assigned_to,
                assigned_role = :assigned_role,
                assigned_permission = :assigned_permission,
                updated_at = now()
            where id = :task_id and tenant_id = :tenant_id
            returning *
            """
        ),
        {
            "task_id": task_id,
            "tenant_id": context["tenant_id"],
            "assigned_to": request.assigned_to,
            "assigned_role": request.assigned_role,
            "assigned_permission": request.assigned_permission,
        },
    )
    return row_to_dict(result.mappings().one()) or {}


async def complete_task(
    session: AsyncSession,
    context: dict[str, Any],
    task_id: str,
    request: CompleteTaskRequest,
) -> dict[str, Any]:
    task = await get_task(session, context, task_id)
    if not task:
        raise DomainError("Gorev kaydi bulunamadi.", "TASK_NOT_FOUND", 404)
    if task.get("status") in {"completed", "cancelled"}:
        raise DomainError("Gorev zaten kapatilmis.", "TASK_CLOSED", 409)
    result = await session.execute(
        text(
            """
            update public.process_tasks
            set status = 'completed',
                result_json = cast(:result_json as jsonb),
                completed_by = :completed_by,
                completed_at = now(),
                updated_at = now()
            where id = :task_id and tenant_id = :tenant_id
            returning *
            """
        ),
        {
            "task_id": task_id,
            "tenant_id": context["tenant_id"],
            "result_json": json.dumps(request.result_json, ensure_ascii=False, default=str),
            "completed_by": context.get("user_id"),
        },
    )
    row = row_to_dict(result.mappings().one()) or {}
    await emit_process_event(
        session,
        context,
        process_instance_id=str(task["process_instance_id"]),
        event_type="task_completed",
        module_key=str(task["module_key"]),
        company_id=task.get("company_id"),
        step_key=task.get("step_key"),
        payload={"task_id": task_id},
    )
    await dismiss_work_notifications(
        session,
        context,
        task_id=task_id,
    )
    return row


async def add_task_comment(
    session: AsyncSession,
    context: dict[str, Any],
    task_id: str,
    request: AddTaskCommentRequest,
) -> dict[str, Any]:
    task = await get_task(session, context, task_id)
    if not task:
        raise DomainError("Gorev kaydi bulunamadi.", "TASK_NOT_FOUND", 404)
    comment = request.comment.strip()
    if not comment:
        raise DomainError("Yorum metni bos olamaz.", "TASK_COMMENT_REQUIRED", 400)
    existing_payload = task.get("payload_json") or {}
    comments = list(existing_payload.get("comments") or [])
    comments.append(
        {
            "comment": comment,
            "created_by": context.get("user_id"),
        }
    )
    result = await session.execute(
        text(
            """
            update public.process_tasks
            set payload_json = coalesce(payload_json, '{}'::jsonb) || cast(:payload_json as jsonb),
                updated_at = now()
            where id = :task_id and tenant_id = :tenant_id
            returning *
            """
        ),
        {
            "task_id": task_id,
            "tenant_id": context["tenant_id"],
            "payload_json": json.dumps({"comments": comments}, ensure_ascii=False, default=str),
        },
    )
    row = row_to_dict(result.mappings().one()) or {}
    await emit_process_event(
        session,
        context,
        process_instance_id=str(task["process_instance_id"]),
        event_type="task_commented",
        module_key=str(task["module_key"]),
        company_id=task.get("company_id"),
        step_key=task.get("step_key"),
        payload={"task_id": task_id},
    )
    return row


async def cancel_task(
    session: AsyncSession,
    context: dict[str, Any],
    task_id: str,
) -> dict[str, Any]:
    task = await get_task(session, context, task_id)
    if not task:
        raise DomainError("Gorev kaydi bulunamadi.", "TASK_NOT_FOUND", 404)
    result = await session.execute(
        text(
            """
            update public.process_tasks
            set status = 'cancelled', updated_at = now()
            where id = :task_id and tenant_id = :tenant_id
            returning *
            """
        ),
        {"task_id": task_id, "tenant_id": context["tenant_id"]},
    )
    return row_to_dict(result.mappings().one()) or {}


async def mark_overdue_tasks(session: AsyncSession, context: dict[str, Any]) -> int:
    await _require_task_table(session)
    result = await session.execute(
        text(
            """
            update public.process_tasks
            set status = 'overdue', updated_at = now()
            where tenant_id = :tenant_id
              and status in ('open', 'in_progress')
              and due_at is not null
              and due_at < now()
              and coalesce(is_deleted, false) = false
            """
        ),
        {"tenant_id": context["tenant_id"]},
    )
    return int(getattr(result, "rowcount", 0) or 0)
