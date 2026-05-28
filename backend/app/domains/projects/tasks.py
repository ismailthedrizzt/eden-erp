# ruff: noqa: E501

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from fastapi import status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.domains.operations.service import table_exists
from app.domains.projects.projects import assert_project_can_accept_tasks
from app.domains.projects.schemas import (
    ListResult,
    ProjectTaskCreateRequest,
    ProjectTaskListQuery,
    ProjectTaskUpdateRequest,
    TaskAssignRequest,
    TaskTransitionRequest,
)
from app.domains.projects.service import (
    OPEN_TASK_STATUSES,
    assert_branch_valid,
    assert_company_exists,
    assert_company_scope,
    assert_facility_valid,
    assert_organization_unit_valid,
    assert_version,
    ensure_project_tables,
    json_dumps,
    list_meta,
    row_to_dict,
    status_is_final,
)

TASK_SORT_COLUMNS = {
    "issue_key": "t.issue_key",
    "title": "t.title",
    "status": "t.status",
    "priority": "t.priority",
    "issue_type": "t.issue_type",
    "due_date": "t.due_date",
    "updated_at": "t.updated_at",
    "created_at": "t.created_at",
}

TASK_MUTABLE_COLUMNS = {
    "project_id",
    "branch_id",
    "organization_unit_id",
    "facility_id",
    "issue_key",
    "title",
    "description",
    "issue_type",
    "status",
    "priority",
    "assignee_user_id",
    "assignee_employee_id",
    "reporter_user_id",
    "due_date",
    "start_date",
    "estimated_hours",
    "spent_hours",
    "labels",
    "related_module",
    "related_entity_type",
    "related_entity_id",
    "parent_task_id",
    "metadata_json",
}

JSON_COLUMNS = {"metadata_json"}

ALLOWED_TRANSITIONS = {
    "backlog": {"todo", "in_progress", "blocked", "cancelled"},
    "todo": {"in_progress", "blocked", "cancelled"},
    "in_progress": {"review", "done", "blocked", "cancelled"},
    "blocked": {"todo", "in_progress", "cancelled"},
    "review": {"in_progress", "done", "blocked", "cancelled"},
    "done": set(),
    "cancelled": set(),
}


async def list_project_tasks(
    session: AsyncSession,
    context: dict[str, Any],
    query: ProjectTaskListQuery,
) -> ListResult:
    await ensure_project_tables(session, tasks=True)
    where = ["t.tenant_id = :tenant_id", "coalesce(t.is_deleted, false) = false"]
    params: dict[str, Any] = {
        "tenant_id": context["tenant_id"],
        "limit": query.page_size,
        "offset": (query.page - 1) * query.page_size,
    }
    if query.company_id:
        assert_company_scope(context, query.company_id)
        where.append("t.company_id = :company_id")
        params["company_id"] = query.company_id
    elif context.get("company_scope_ids"):
        where.append("t.company_id = any(cast(:company_scope_ids as uuid[]))")
        params["company_scope_ids"] = context["company_scope_ids"]
    if query.project_id:
        where.append("t.project_id = :project_id")
        params["project_id"] = query.project_id
    if query.branch_id:
        where.append("t.branch_id = :branch_id")
        params["branch_id"] = query.branch_id
    if query.organization_unit_id:
        where.append("t.organization_unit_id = :organization_unit_id")
        params["organization_unit_id"] = query.organization_unit_id
    if query.facility_id:
        where.append("t.facility_id = :facility_id")
        params["facility_id"] = query.facility_id
    if query.status:
        where.append("t.status = :status")
        params["status"] = query.status
    if query.priority:
        where.append("t.priority = :priority")
        params["priority"] = query.priority
    if query.issue_type:
        where.append("t.issue_type = :issue_type")
        params["issue_type"] = query.issue_type
    if query.assignee_user_id:
        where.append("t.assignee_user_id = :assignee_user_id")
        params["assignee_user_id"] = query.assignee_user_id
    if query.assignee_employee_id:
        where.append("t.assignee_employee_id = :assignee_employee_id")
        params["assignee_employee_id"] = query.assignee_employee_id
    if query.related_module:
        where.append("t.related_module = :related_module")
        params["related_module"] = query.related_module
    if query.related_entity_type:
        where.append("t.related_entity_type = :related_entity_type")
        params["related_entity_type"] = query.related_entity_type
    if query.related_entity_id:
        where.append("t.related_entity_id = :related_entity_id")
        params["related_entity_id"] = query.related_entity_id
    if query.due_from:
        where.append("t.due_date >= :due_from")
        params["due_from"] = query.due_from
    if query.due_to:
        where.append("t.due_date <= :due_to")
        params["due_to"] = query.due_to
    if query.overdue is True:
        where.append("t.status in ('backlog','todo','in_progress','blocked','review')")
        where.append("t.due_date < current_date")
    if query.label:
        where.append(":label = any(t.labels)")
        params["label"] = query.label
    if query.search:
        where.append(
            """
            (
              t.issue_key ilike :search
              or t.title ilike :search
              or coalesce(t.description, '') ilike :search
              or coalesce(t.related_entity_type, '') ilike :search
            )
            """
        )
        params["search"] = f"%{query.search}%"

    where_sql = " and ".join(where)
    count_result = await session.execute(
        text(f"select count(*) from public.project_tasks t where {where_sql}"),
        params,
    )
    total = int(count_result.scalar_one() or 0)
    sort_column = TASK_SORT_COLUMNS.get(query.sort, "t.updated_at")
    direction = "asc" if query.direction.lower() == "asc" else "desc"
    result = await session.execute(
        text(
            f"""
            select t.*,
                   p.project_key,
                   p.project_name,
                   coalesce(c.comment_count, 0) as comment_count,
                   coalesce(a.attachment_count, 0) as attachment_count
            from public.project_tasks t
            left join public.project_projects p
              on p.tenant_id = t.tenant_id and p.id = t.project_id
            left join lateral (
              select count(*) as comment_count
              from public.project_task_comments c
              where c.tenant_id = t.tenant_id
                and c.task_id = t.id
                and coalesce(c.is_deleted, false) = false
            ) c on true
            left join lateral (
              select count(*) as attachment_count
              from public.project_task_attachments a
              where a.tenant_id = t.tenant_id
                and a.task_id = t.id
            ) a on true
            where {where_sql}
            order by {sort_column} {direction}, t.id desc
            limit :limit offset :offset
            """
        ),
        params,
    )
    return ListResult(
        data=[row_to_dict(row) for row in result.mappings().all()],
        meta=list_meta(query.page, query.page_size, total),
    )


async def list_my_project_tasks(
    session: AsyncSession,
    context: dict[str, Any],
    query: ProjectTaskListQuery,
) -> ListResult:
    if context.get("user_id") and not query.assignee_user_id:
        query.assignee_user_id = str(context["user_id"])
    if not query.status:
        query.status = None
    result = await list_project_tasks(session, context, query)
    result.data = [
        row for row in result.data if str(row.get("status") or "") in OPEN_TASK_STATUSES
    ]
    result.meta["total"] = len(result.data)
    return result


async def get_project_task(
    session: AsyncSession,
    tenant_id: str,
    task_id: str,
) -> dict[str, Any] | None:
    await ensure_project_tables(session, tasks=True)
    result = await session.execute(
        text(
            """
            select t.*,
                   p.project_key,
                   p.project_name,
                   coalesce(c.comment_count, 0) as comment_count,
                   coalesce(a.attachment_count, 0) as attachment_count
            from public.project_tasks t
            left join public.project_projects p
              on p.tenant_id = t.tenant_id and p.id = t.project_id
            left join lateral (
              select count(*) as comment_count
              from public.project_task_comments c
              where c.tenant_id = t.tenant_id
                and c.task_id = t.id
                and coalesce(c.is_deleted, false) = false
            ) c on true
            left join lateral (
              select count(*) as attachment_count
              from public.project_task_attachments a
              where a.tenant_id = t.tenant_id
                and a.task_id = t.id
            ) a on true
            where t.tenant_id = :tenant_id
              and t.id = :task_id
              and coalesce(t.is_deleted, false) = false
            limit 1
            """
        ),
        {"tenant_id": tenant_id, "task_id": task_id},
    )
    row = result.mappings().one_or_none()
    return row_to_dict(row) if row else None


async def create_project_task(
    session: AsyncSession,
    context: dict[str, Any],
    request: ProjectTaskCreateRequest,
) -> dict[str, Any]:
    await ensure_project_tables(session, tasks=True)
    payload = request.model_dump(exclude_none=True)
    company_id = str(payload["company_id"])
    await validate_task_scope(session, context, payload, write=True)
    project = await assert_project_can_accept_tasks(
        session, context, payload.get("project_id"), company_id
    )
    issue_key = payload.get("issue_key") or await next_issue_key(
        session, context["tenant_id"], company_id, project
    )
    await assert_unique_issue_key(session, context, company_id, issue_key)
    await assert_parent_task_valid(session, context, payload.get("parent_task_id"), company_id)
    await assert_assignee_employee_valid(
        session, context, payload.get("assignee_employee_id"), company_id
    )
    task_id = str(uuid4())
    status_value = str(payload.get("status") or "todo")
    result = await session.execute(
        text(
            """
            insert into public.project_tasks (
              id, tenant_id, company_id, project_id, branch_id, organization_unit_id,
              facility_id, issue_key, title, description, issue_type, status, priority,
              assignee_user_id, assignee_employee_id, reporter_user_id, due_date,
              start_date, completed_at, estimated_hours, spent_hours, labels,
              related_module, related_entity_type, related_entity_id, parent_task_id,
              metadata_json, created_by, updated_by, created_at, updated_at, version, is_deleted
            )
            values (
              :id, :tenant_id, :company_id, :project_id, :branch_id, :organization_unit_id,
              :facility_id, :issue_key, :title, :description, :issue_type, :status, :priority,
              :assignee_user_id, :assignee_employee_id, :reporter_user_id, :due_date,
              :start_date, :completed_at, :estimated_hours, :spent_hours, :labels,
              :related_module, :related_entity_type, :related_entity_id, :parent_task_id,
              cast(:metadata_json as jsonb), :created_by, :updated_by, now(), now(), 1, false
            )
            returning *
            """
        ),
        {
            **task_defaults(payload),
            "id": task_id,
            "tenant_id": context["tenant_id"],
            "issue_key": issue_key,
            "labels": payload.get("labels") or [],
            "completed_at": _now() if status_value == "done" else None,
            "metadata_json": json_dumps(payload.get("metadata_json")),
            "created_by": context.get("user_id"),
            "updated_by": context.get("user_id"),
        },
    )
    task = row_to_dict(result.mappings().one())
    await add_task_history(
        session,
        context,
        task_id,
        "task.created",
        {},
        {"status": task.get("status"), "assignee_user_id": task.get("assignee_user_id")},
    )
    return task


def task_defaults(payload: dict[str, Any]) -> dict[str, Any]:
    defaults = {
        "project_id": None,
        "branch_id": None,
        "organization_unit_id": None,
        "facility_id": None,
        "description": None,
        "assignee_user_id": None,
        "assignee_employee_id": None,
        "reporter_user_id": None,
        "due_date": None,
        "start_date": None,
        "estimated_hours": None,
        "spent_hours": None,
        "related_module": None,
        "related_entity_type": None,
        "related_entity_id": None,
        "parent_task_id": None,
    }
    return {**defaults, **payload}


async def update_project_task(
    session: AsyncSession,
    context: dict[str, Any],
    task_id: str,
    request: ProjectTaskUpdateRequest,
) -> dict[str, Any]:
    current = await get_project_task(session, context["tenant_id"], task_id)
    if not current:
        raise DomainError("Proje gorevi bulunamadi.", "PROJECT_TASK_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    company_id = str(current["company_id"])
    assert_company_scope(context, company_id, write=True)
    if status_is_final(current.get("status")):
        raise DomainError(
            "Tamamlanan veya iptal edilen gorevler normal edit ile degistirilemez.",
            "PROJECT_TASK_FINAL_EDIT_BLOCKED",
            status.HTTP_409_CONFLICT,
        )
    payload = request.model_dump(exclude_unset=True, exclude_none=True)
    assert_version(current, payload.pop("base_version", None))
    patch = {key: value for key, value in payload.items() if key in TASK_MUTABLE_COLUMNS}
    if not patch:
        raise DomainError(
            "Guncellenecek gorev alani bulunamadi.",
            "NO_CHANGED_FIELDS",
            status.HTTP_400_BAD_REQUEST,
        )
    merged = {**current, **patch}
    await validate_task_scope(session, context, merged, write=True)
    await assert_project_can_accept_tasks(session, context, merged.get("project_id"), company_id)
    if patch.get("issue_key") and patch["issue_key"] != current.get("issue_key"):
        await assert_unique_issue_key(
            session, context, company_id, str(patch["issue_key"]), exclude_id=task_id
        )
    await assert_parent_task_valid(session, context, merged.get("parent_task_id"), company_id)
    await assert_assignee_employee_valid(
        session, context, merged.get("assignee_employee_id"), company_id
    )
    assignments: list[str] = []
    params: dict[str, Any] = {
        "tenant_id": context["tenant_id"],
        "task_id": task_id,
        "updated_by": context.get("user_id"),
    }
    if "status" in patch:
        patch["completed_at"] = _now() if patch["status"] == "done" else None
        assignments.append("completed_at = :completed_at")
        params["completed_at"] = patch["completed_at"]
    for key, value in patch.items():
        if key == "completed_at":
            continue
        if key in JSON_COLUMNS:
            assignments.append(f"{key} = cast(:{key} as jsonb)")
            params[key] = json_dumps(value)
        else:
            assignments.append(f"{key} = :{key}")
            params[key] = value
    assignments.extend(["updated_by = :updated_by", "updated_at = now()", "version = version + 1"])
    result = await session.execute(
        text(
            f"""
            update public.project_tasks
            set {", ".join(assignments)}
            where tenant_id = :tenant_id
              and id = :task_id
              and coalesce(is_deleted, false) = false
            returning *
            """
        ),
        params,
    )
    updated = row_to_dict(result.mappings().one())
    await add_task_history(session, context, task_id, "task.updated", current, patch)
    return updated


async def delete_project_task(
    session: AsyncSession,
    context: dict[str, Any],
    task_id: str,
) -> dict[str, Any]:
    current = await get_project_task(session, context["tenant_id"], task_id)
    if not current:
        raise DomainError("Proje gorevi bulunamadi.", "PROJECT_TASK_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    assert_company_scope(context, str(current["company_id"]), write=True)
    await session.execute(
        text(
            """
            update public.project_tasks
            set is_deleted = true,
                status = case when status = 'done' then status else 'cancelled' end,
                updated_by = :updated_by,
                updated_at = now(),
                version = version + 1
            where tenant_id = :tenant_id
              and id = :task_id
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "task_id": task_id,
            "updated_by": context.get("user_id"),
        },
    )
    await add_task_history(session, context, task_id, "task.deleted", current, {"is_deleted": True})
    return {"id": task_id, "deleted": True}


async def transition_project_task(
    session: AsyncSession,
    context: dict[str, Any],
    task_id: str,
    request: TaskTransitionRequest,
) -> dict[str, Any]:
    current = await get_project_task(session, context["tenant_id"], task_id)
    if not current:
        raise DomainError("Proje gorevi bulunamadi.", "PROJECT_TASK_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    assert_company_scope(context, str(current["company_id"]), write=True)
    old_status = str(current.get("status") or "")
    new_status = request.status
    if old_status == new_status:
        raise DomainError("Gorev zaten bu durumda.", "TASK_STATUS_UNCHANGED", status.HTTP_400_BAD_REQUEST)
    if new_status not in ALLOWED_TRANSITIONS.get(old_status, set()):
        raise DomainError(
            "Bu gorev durumu gecisi desteklenmiyor.",
            "TASK_STATUS_TRANSITION_NOT_ALLOWED",
            status.HTTP_409_CONFLICT,
            {"from_status": old_status, "to_status": new_status},
        )
    if new_status == "blocked" and not request.reason:
        raise DomainError(
            "Bloke gorev icin neden girilmelidir.",
            "TASK_BLOCK_REASON_REQUIRED",
            status.HTTP_400_BAD_REQUEST,
        )
    result = await session.execute(
        text(
            """
            update public.project_tasks
            set status = :status,
                completed_at = :completed_at,
                updated_by = :updated_by,
                updated_at = now(),
                version = version + 1
            where tenant_id = :tenant_id
              and id = :task_id
              and coalesce(is_deleted, false) = false
            returning *
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "task_id": task_id,
            "status": new_status,
            "completed_at": _now() if new_status == "done" else None,
            "updated_by": context.get("user_id"),
        },
    )
    updated = row_to_dict(result.mappings().one())
    await add_task_history(
        session,
        context,
        task_id,
        "task.transitioned",
        {"status": old_status},
        {"status": new_status, "reason": request.reason},
    )
    return updated


async def assign_project_task(
    session: AsyncSession,
    context: dict[str, Any],
    task_id: str,
    request: TaskAssignRequest,
) -> dict[str, Any]:
    current = await get_project_task(session, context["tenant_id"], task_id)
    if not current:
        raise DomainError("Proje gorevi bulunamadi.", "PROJECT_TASK_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    assert_company_scope(context, str(current["company_id"]), write=True)
    if not request.assignee_user_id and not request.assignee_employee_id:
        raise DomainError(
            "Atanan kullanici veya calisan secilmelidir.",
            "TASK_ASSIGNEE_REQUIRED",
            status.HTTP_400_BAD_REQUEST,
        )
    await assert_assignee_employee_valid(
        session, context, request.assignee_employee_id, str(current["company_id"])
    )
    result = await session.execute(
        text(
            """
            update public.project_tasks
            set assignee_user_id = :assignee_user_id,
                assignee_employee_id = :assignee_employee_id,
                updated_by = :updated_by,
                updated_at = now(),
                version = version + 1
            where tenant_id = :tenant_id
              and id = :task_id
              and coalesce(is_deleted, false) = false
            returning *
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "task_id": task_id,
            "assignee_user_id": request.assignee_user_id,
            "assignee_employee_id": request.assignee_employee_id,
            "updated_by": context.get("user_id"),
        },
    )
    updated = row_to_dict(result.mappings().one())
    await add_task_history(
        session,
        context,
        task_id,
        "task.assigned",
        {
            "assignee_user_id": current.get("assignee_user_id"),
            "assignee_employee_id": current.get("assignee_employee_id"),
        },
        request.model_dump(exclude_none=True),
    )
    return updated


async def add_task_history(
    session: AsyncSession,
    context: dict[str, Any],
    task_id: str,
    action_type: str,
    old_values: dict[str, Any],
    new_values: dict[str, Any],
) -> None:
    if not await table_exists(session, "public.project_task_history"):
        return
    await session.execute(
        text(
            """
            insert into public.project_task_history (
              id, tenant_id, task_id, action_type, old_values, new_values, created_by, created_at
            )
            values (
              :id, :tenant_id, :task_id, :action_type,
              cast(:old_values as jsonb), cast(:new_values as jsonb), :created_by, now()
            )
            """
        ),
        {
            "id": str(uuid4()),
            "tenant_id": context["tenant_id"],
            "task_id": task_id,
            "action_type": action_type,
            "old_values": json_dumps(old_values),
            "new_values": json_dumps(new_values),
            "created_by": context.get("user_id"),
        },
    )


async def validate_task_scope(
    session: AsyncSession,
    context: dict[str, Any],
    payload: dict[str, Any],
    *,
    write: bool = False,
) -> None:
    company_id = str(payload["company_id"])
    assert_company_scope(context, company_id, write=write)
    await assert_company_exists(session, context, company_id)
    await assert_branch_valid(session, context, payload.get("branch_id"), company_id)
    await assert_organization_unit_valid(
        session, context, payload.get("organization_unit_id"), company_id
    )
    await assert_facility_valid(session, context, payload.get("facility_id"), company_id)
    await assert_related_entity_valid(session, context, payload, company_id)


async def assert_related_entity_valid(
    session: AsyncSession,
    context: dict[str, Any],
    payload: dict[str, Any],
    company_id: str,
) -> None:
    entity_type = str(payload.get("related_entity_type") or "")
    entity_id = payload.get("related_entity_id")
    if not entity_type or not entity_id:
        return
    if entity_type == "company":
        if str(entity_id) != company_id:
            await assert_company_exists(session, context, str(entity_id))
        return
    if entity_type == "branch":
        await assert_branch_valid(session, context, str(entity_id), company_id)
        return
    if entity_type == "organization_unit":
        await assert_organization_unit_valid(session, context, str(entity_id), company_id)
        return
    if entity_type == "facility":
        await assert_facility_valid(session, context, str(entity_id), company_id)
        return
    if entity_type == "employee":
        await assert_assignee_employee_valid(session, context, str(entity_id), company_id)


async def assert_parent_task_valid(
    session: AsyncSession,
    context: dict[str, Any],
    parent_task_id: str | None,
    company_id: str,
) -> None:
    if not parent_task_id:
        return
    parent = await get_project_task(session, context["tenant_id"], parent_task_id)
    if not parent:
        raise DomainError("Ust gorev bulunamadi.", "PARENT_TASK_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    if str(parent["company_id"]) != str(company_id):
        raise DomainError(
            "Alt gorev ve ust gorev ayni sirket kapsaminda olmalidir.",
            "PARENT_TASK_COMPANY_MISMATCH",
            status.HTTP_409_CONFLICT,
        )


async def assert_assignee_employee_valid(
    session: AsyncSession,
    context: dict[str, Any],
    employee_id: str | None,
    company_id: str,
) -> None:
    if not employee_id or not await table_exists(session, "public.hr_employees"):
        return
    result = await session.execute(
        text(
            """
            select id, company_id, record_status, employment_status
            from public.hr_employees
            where tenant_id = :tenant_id
              and id = :employee_id
              and coalesce(is_deleted, false) = false
            limit 1
            """
        ),
        {"tenant_id": context["tenant_id"], "employee_id": employee_id},
    )
    row = result.mappings().one_or_none()
    if not row:
        raise DomainError("Atanacak calisan bulunamadi.", "ASSIGNEE_EMPLOYEE_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    if str(row["company_id"]) != str(company_id):
        raise DomainError(
            "Atanacak calisan gorev sirketi disinda.",
            "ASSIGNEE_COMPANY_MISMATCH",
            status.HTTP_409_CONFLICT,
        )


async def assert_unique_issue_key(
    session: AsyncSession,
    context: dict[str, Any],
    company_id: str,
    issue_key: str,
    *,
    exclude_id: str | None = None,
) -> None:
    exclude = "and id <> :exclude_id" if exclude_id else ""
    result = await session.execute(
        text(
            f"""
            select id
            from public.project_tasks
            where tenant_id = :tenant_id
              and company_id = :company_id
              and issue_key = :issue_key
              and coalesce(is_deleted, false) = false
              {exclude}
            limit 1
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "company_id": company_id,
            "issue_key": issue_key,
            "exclude_id": exclude_id,
        },
    )
    if result.mappings().one_or_none():
        raise DomainError(
            "Bu gorev anahtari ayni sirket icin zaten kullaniliyor.",
            "DUPLICATE_ISSUE_KEY",
            status.HTTP_409_CONFLICT,
            {"issue_key": issue_key},
        )


async def next_issue_key(
    session: AsyncSession,
    tenant_id: str,
    company_id: str,
    project: dict[str, Any] | None,
) -> str:
    if project:
        result = await session.execute(
            text(
                """
                select count(*)
                from public.project_tasks
                where tenant_id = :tenant_id
                  and project_id = :project_id
                """
            ),
            {"tenant_id": tenant_id, "project_id": project["id"]},
        )
        return f"{project['project_key']}-{int(result.scalar_one() or 0) + 1}"
    result = await session.execute(
        text(
            """
            select count(*)
            from public.project_tasks
            where tenant_id = :tenant_id
              and company_id = :company_id
            """
        ),
        {"tenant_id": tenant_id, "company_id": company_id},
    )
    return f"TSK-{int(result.scalar_one() or 0) + 1:06d}"


def _now() -> datetime:
    return datetime.now(UTC)
