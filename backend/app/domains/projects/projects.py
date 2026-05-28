# ruff: noqa: E501

from __future__ import annotations

from decimal import Decimal
from typing import Any
from uuid import uuid4

from fastapi import status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.domains.projects.schemas import (
    ListResult,
    ProjectCreateRequest,
    ProjectListQuery,
    ProjectsSummary,
    ProjectSummary,
    ProjectUpdateRequest,
)
from app.domains.projects.service import (
    FINAL_PROJECT_STATUSES,
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
)

PROJECT_SORT_COLUMNS = {
    "project_key": "p.project_key",
    "project_name": "p.project_name",
    "status": "p.status",
    "project_type": "p.project_type",
    "priority": "p.priority",
    "start_date": "p.start_date",
    "target_end_date": "p.target_end_date",
    "updated_at": "p.updated_at",
    "created_at": "p.created_at",
}

PROJECT_MUTABLE_COLUMNS = {
    "branch_id",
    "organization_unit_id",
    "facility_id",
    "project_key",
    "project_name",
    "project_type",
    "description",
    "project_owner_id",
    "project_manager_id",
    "start_date",
    "target_end_date",
    "actual_end_date",
    "status",
    "priority",
    "progress_percent",
    "budget_amount",
    "currency",
    "tags",
    "metadata_json",
}

JSON_COLUMNS = {"metadata_json"}


async def list_projects(
    session: AsyncSession,
    context: dict[str, Any],
    query: ProjectListQuery,
) -> ListResult:
    await ensure_project_tables(session, tasks=True)
    where = ["p.tenant_id = :tenant_id", "coalesce(p.is_deleted, false) = false"]
    params: dict[str, Any] = {
        "tenant_id": context["tenant_id"],
        "limit": query.page_size,
        "offset": (query.page - 1) * query.page_size,
    }
    if query.company_id:
        assert_company_scope(context, query.company_id)
        where.append("p.company_id = :company_id")
        params["company_id"] = query.company_id
    elif context.get("company_scope_ids"):
        where.append("p.company_id = any(cast(:company_scope_ids as uuid[]))")
        params["company_scope_ids"] = context["company_scope_ids"]
    if query.branch_id:
        where.append("p.branch_id = :branch_id")
        params["branch_id"] = query.branch_id
    if query.organization_unit_id:
        where.append("p.organization_unit_id = :organization_unit_id")
        params["organization_unit_id"] = query.organization_unit_id
    if query.status:
        where.append("p.status = :status")
        params["status"] = query.status
    if query.project_type:
        where.append("p.project_type = :project_type")
        params["project_type"] = query.project_type
    if query.priority:
        where.append("p.priority = :priority")
        params["priority"] = query.priority
    if query.manager_id:
        where.append("p.project_manager_id = :manager_id")
        params["manager_id"] = query.manager_id
    if query.date_from:
        where.append("coalesce(p.start_date, p.created_at::date) >= :date_from")
        params["date_from"] = query.date_from
    if query.date_to:
        where.append("coalesce(p.target_end_date, p.created_at::date) <= :date_to")
        params["date_to"] = query.date_to
    if query.search:
        where.append(
            """
            (
              p.project_key ilike :search
              or p.project_name ilike :search
              or coalesce(p.description, '') ilike :search
            )
            """
        )
        params["search"] = f"%{query.search}%"

    where_sql = " and ".join(where)
    count_result = await session.execute(
        text(f"select count(*) from public.project_projects p where {where_sql}"),
        params,
    )
    total = int(count_result.scalar_one() or 0)
    sort_column = PROJECT_SORT_COLUMNS.get(query.sort, "p.updated_at")
    direction = "asc" if query.direction.lower() == "asc" else "desc"
    result = await session.execute(
        text(
            f"""
            select p.*,
                   coalesce(t.total_tasks, 0) as total_tasks,
                   coalesce(t.open_tasks, 0) as open_tasks,
                   coalesce(t.done_tasks, 0) as done_tasks,
                   coalesce(t.overdue_tasks, 0) as overdue_tasks
            from public.project_projects p
            left join lateral (
              select count(*) as total_tasks,
                     count(*) filter (where status in ('backlog','todo','in_progress','blocked','review')) as open_tasks,
                     count(*) filter (where status = 'done') as done_tasks,
                     count(*) filter (
                       where status in ('backlog','todo','in_progress','blocked','review')
                         and due_date < current_date
                     ) as overdue_tasks
              from public.project_tasks t
              where t.tenant_id = p.tenant_id
                and t.project_id = p.id
                and coalesce(t.is_deleted, false) = false
            ) t on true
            where {where_sql}
            order by {sort_column} {direction}, p.id desc
            limit :limit offset :offset
            """
        ),
        params,
    )
    return ListResult(
        data=[row_to_dict(row) for row in result.mappings().all()],
        meta=list_meta(query.page, query.page_size, total),
    )


async def get_project(
    session: AsyncSession,
    tenant_id: str,
    project_id: str,
) -> dict[str, Any] | None:
    await ensure_project_tables(session, tasks=True)
    result = await session.execute(
        text(
            """
            select p.*,
                   coalesce(t.total_tasks, 0) as total_tasks,
                   coalesce(t.open_tasks, 0) as open_tasks,
                   coalesce(t.done_tasks, 0) as done_tasks,
                   coalesce(t.overdue_tasks, 0) as overdue_tasks
            from public.project_projects p
            left join lateral (
              select count(*) as total_tasks,
                     count(*) filter (where status in ('backlog','todo','in_progress','blocked','review')) as open_tasks,
                     count(*) filter (where status = 'done') as done_tasks,
                     count(*) filter (
                       where status in ('backlog','todo','in_progress','blocked','review')
                         and due_date < current_date
                     ) as overdue_tasks
              from public.project_tasks t
              where t.tenant_id = p.tenant_id
                and t.project_id = p.id
                and coalesce(t.is_deleted, false) = false
            ) t on true
            where p.tenant_id = :tenant_id
              and p.id = :project_id
              and coalesce(p.is_deleted, false) = false
            limit 1
            """
        ),
        {"tenant_id": tenant_id, "project_id": project_id},
    )
    row = result.mappings().one_or_none()
    return row_to_dict(row) if row else None


async def create_project(
    session: AsyncSession,
    context: dict[str, Any],
    request: ProjectCreateRequest,
) -> dict[str, Any]:
    await ensure_project_tables(session)
    payload = request.model_dump(exclude_none=True)
    company_id = str(payload["company_id"])
    assert_company_scope(context, company_id, write=True)
    await assert_company_exists(session, context, company_id)
    await assert_branch_valid(session, context, payload.get("branch_id"), company_id)
    await assert_organization_unit_valid(
        session, context, payload.get("organization_unit_id"), company_id
    )
    await assert_facility_valid(session, context, payload.get("facility_id"), company_id)
    project_key = payload.get("project_key") or await next_project_key(
        session, context["tenant_id"], company_id
    )
    await assert_unique_project_key(session, context, company_id, project_key)
    result = await session.execute(
        text(
            """
            insert into public.project_projects (
              id, tenant_id, company_id, branch_id, organization_unit_id, facility_id,
              project_key, project_name, project_type, description, project_owner_id,
              project_manager_id, start_date, target_end_date, actual_end_date, status,
              priority, progress_percent, budget_amount, currency, tags, metadata_json,
              created_by, updated_by, created_at, updated_at, version, is_deleted
            )
            values (
              :id, :tenant_id, :company_id, :branch_id, :organization_unit_id, :facility_id,
              :project_key, :project_name, :project_type, :description, :project_owner_id,
              :project_manager_id, :start_date, :target_end_date, :actual_end_date, :status,
              :priority, :progress_percent, :budget_amount, :currency, :tags,
              cast(:metadata_json as jsonb), :created_by, :updated_by, now(), now(), 1, false
            )
            returning *
            """
        ),
        {
            **project_defaults(payload),
            "id": str(uuid4()),
            "tenant_id": context["tenant_id"],
            "project_key": project_key,
            "tags": payload.get("tags") or [],
            "metadata_json": json_dumps(payload.get("metadata_json")),
            "created_by": context.get("user_id"),
            "updated_by": context.get("user_id"),
        },
    )
    return row_to_dict(result.mappings().one())


def project_defaults(payload: dict[str, Any]) -> dict[str, Any]:
    defaults = {
        "branch_id": None,
        "organization_unit_id": None,
        "facility_id": None,
        "description": None,
        "project_owner_id": None,
        "project_manager_id": None,
        "start_date": None,
        "target_end_date": None,
        "actual_end_date": None,
        "budget_amount": None,
        "currency": None,
    }
    return {**defaults, **payload}


async def update_project(
    session: AsyncSession,
    context: dict[str, Any],
    project_id: str,
    request: ProjectUpdateRequest,
) -> dict[str, Any]:
    current = await get_project(session, context["tenant_id"], project_id)
    if not current:
        raise DomainError("Proje bulunamadi.", "PROJECT_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    company_id = str(current["company_id"])
    assert_company_scope(context, company_id, write=True)
    payload = request.model_dump(exclude_unset=True, exclude_none=True)
    assert_version(current, payload.pop("base_version", None))
    patch = {key: value for key, value in payload.items() if key in PROJECT_MUTABLE_COLUMNS}
    if not patch:
        raise DomainError(
            "Guncellenecek proje alani bulunamadi.",
            "NO_CHANGED_FIELDS",
            status.HTTP_400_BAD_REQUEST,
        )
    await assert_branch_valid(session, context, patch.get("branch_id"), company_id)
    await assert_organization_unit_valid(
        session, context, patch.get("organization_unit_id"), company_id
    )
    await assert_facility_valid(session, context, patch.get("facility_id"), company_id)
    if patch.get("project_key") and patch["project_key"] != current.get("project_key"):
        await assert_unique_project_key(
            session, context, company_id, str(patch["project_key"]), exclude_id=project_id
        )
    assignments: list[str] = []
    params: dict[str, Any] = {
        "tenant_id": context["tenant_id"],
        "project_id": project_id,
        "updated_by": context.get("user_id"),
    }
    for key, value in patch.items():
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
            update public.project_projects
            set {", ".join(assignments)}
            where tenant_id = :tenant_id
              and id = :project_id
              and coalesce(is_deleted, false) = false
            returning *
            """
        ),
        params,
    )
    return row_to_dict(result.mappings().one())


async def delete_project(
    session: AsyncSession,
    context: dict[str, Any],
    project_id: str,
) -> dict[str, Any]:
    current = await get_project(session, context["tenant_id"], project_id)
    if not current:
        raise DomainError("Proje bulunamadi.", "PROJECT_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    assert_company_scope(context, str(current["company_id"]), write=True)
    open_tasks = int(current.get("open_tasks") or 0)
    if open_tasks > 0:
        raise DomainError(
            "Acik proje gorevi olan proje silinemez. Once gorevleri kapatin veya projeyi beklemeye alin.",
            "PROJECT_HAS_OPEN_TASKS",
            status.HTTP_409_CONFLICT,
            {"open_tasks": open_tasks},
        )
    await session.execute(
        text(
            """
            update public.project_projects
            set is_deleted = true,
                status = case when status in ('completed','cancelled') then status else 'cancelled' end,
                updated_by = :updated_by,
                updated_at = now(),
                version = version + 1
            where tenant_id = :tenant_id
              and id = :project_id
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "project_id": project_id,
            "updated_by": context.get("user_id"),
        },
    )
    return {"id": project_id, "deleted": True}


async def get_project_summary(
    session: AsyncSession,
    context: dict[str, Any],
    project_id: str,
) -> ProjectSummary:
    project = await get_project(session, context["tenant_id"], project_id)
    if not project:
        raise DomainError("Proje bulunamadi.", "PROJECT_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    assert_company_scope(context, str(project["company_id"]))
    result = await session.execute(
        text(
            """
            select count(*) as total_tasks,
                   count(*) filter (where status in ('backlog','todo','in_progress','blocked','review')) as open_tasks,
                   count(*) filter (where status = 'done') as done_tasks,
                   count(*) filter (
                     where status in ('backlog','todo','in_progress','blocked','review')
                       and due_date < current_date
                   ) as overdue_tasks
            from public.project_tasks
            where tenant_id = :tenant_id
              and project_id = :project_id
              and coalesce(is_deleted, false) = false
            """
        ),
        {"tenant_id": context["tenant_id"], "project_id": project_id},
    )
    row = result.mappings().one()
    return ProjectSummary(
        total_tasks=int(row["total_tasks"] or 0),
        open_tasks=int(row["open_tasks"] or 0),
        done_tasks=int(row["done_tasks"] or 0),
        overdue_tasks=int(row["overdue_tasks"] or 0),
        progress_percent=project.get("progress_percent") or Decimal("0"),
        workload_by_assignee=await _workload_by_assignee(session, context, project_id),
    )


async def get_projects_summary(
    session: AsyncSession,
    context: dict[str, Any],
) -> ProjectsSummary:
    await ensure_project_tables(session, tasks=True)
    where = ["p.tenant_id = :tenant_id", "coalesce(p.is_deleted, false) = false"]
    params: dict[str, Any] = {"tenant_id": context["tenant_id"]}
    if context.get("company_scope_ids"):
        where.append("p.company_id = any(cast(:company_scope_ids as uuid[]))")
        params["company_scope_ids"] = context["company_scope_ids"]
    where_sql = " and ".join(where)
    project_result = await session.execute(
        text(
            f"""
            select count(*) as total_projects,
                   count(*) filter (where status = 'active') as active_projects
            from public.project_projects p
            where {where_sql}
            """
        ),
        params,
    )
    task_result = await session.execute(
        text(
            f"""
            select count(*) filter (where t.status in ('backlog','todo','in_progress','blocked','review')) as open_tasks,
                   count(*) filter (
                     where t.status in ('backlog','todo','in_progress','blocked','review')
                       and t.due_date < current_date
                   ) as overdue_tasks,
                   count(*) filter (where t.priority = 'urgent') as urgent_tasks
            from public.project_tasks t
            join public.project_projects p
              on p.tenant_id = t.tenant_id and p.id = t.project_id
            where {where_sql.replace('p.', 'p.')}
              and coalesce(t.is_deleted, false) = false
            """
        ),
        params,
    )
    p_row = project_result.mappings().one()
    t_row = task_result.mappings().one()
    return ProjectsSummary(
        total_projects=int(p_row["total_projects"] or 0),
        active_projects=int(p_row["active_projects"] or 0),
        open_tasks=int(t_row["open_tasks"] or 0),
        overdue_tasks=int(t_row["overdue_tasks"] or 0),
        urgent_tasks=int(t_row["urgent_tasks"] or 0),
        tasks_by_status=await _tasks_by_status(session, params, where_sql),
    )


async def assert_project_can_accept_tasks(
    session: AsyncSession,
    context: dict[str, Any],
    project_id: str | None,
    company_id: str,
) -> dict[str, Any] | None:
    if not project_id:
        return None
    project = await get_project(session, context["tenant_id"], project_id)
    if not project:
        raise DomainError("Proje bulunamadi.", "PROJECT_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    if str(project["company_id"]) != str(company_id):
        raise DomainError(
            "Gorev sirketi ile proje sirketi ayni olmalidir.",
            "PROJECT_COMPANY_MISMATCH",
            status.HTTP_409_CONFLICT,
        )
    if str(project.get("status")) in FINAL_PROJECT_STATUSES:
        raise DomainError(
            "Tamamlanan veya iptal edilen projede yeni gorev acilamaz.",
            "PROJECT_CLOSED_FOR_NEW_TASKS",
            status.HTTP_409_CONFLICT,
        )
    return project


async def assert_unique_project_key(
    session: AsyncSession,
    context: dict[str, Any],
    company_id: str,
    project_key: str,
    *,
    exclude_id: str | None = None,
) -> None:
    exclude = "and id <> :exclude_id" if exclude_id else ""
    result = await session.execute(
        text(
            f"""
            select id
            from public.project_projects
            where tenant_id = :tenant_id
              and company_id = :company_id
              and project_key = :project_key
              and coalesce(is_deleted, false) = false
              {exclude}
            limit 1
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "company_id": company_id,
            "project_key": project_key,
            "exclude_id": exclude_id,
        },
    )
    if result.mappings().one_or_none():
        raise DomainError(
            "Bu proje anahtari ayni sirket icin zaten kullaniliyor.",
            "DUPLICATE_PROJECT_KEY",
            status.HTTP_409_CONFLICT,
            {"project_key": project_key},
        )


async def next_project_key(session: AsyncSession, tenant_id: str, company_id: str) -> str:
    result = await session.execute(
        text(
            """
            select count(*)
            from public.project_projects
            where tenant_id = :tenant_id
              and company_id = :company_id
            """
        ),
        {"tenant_id": tenant_id, "company_id": company_id},
    )
    return f"PRJ-{int(result.scalar_one() or 0) + 1:06d}"


async def _workload_by_assignee(
    session: AsyncSession,
    context: dict[str, Any],
    project_id: str,
) -> dict[str, int]:
    result = await session.execute(
        text(
            """
            select coalesce(assignee_employee_id::text, assignee_user_id::text, 'unassigned') as assignee,
                   count(*) as count
            from public.project_tasks
            where tenant_id = :tenant_id
              and project_id = :project_id
              and status in ('backlog','todo','in_progress','blocked','review')
              and coalesce(is_deleted, false) = false
            group by coalesce(assignee_employee_id::text, assignee_user_id::text, 'unassigned')
            """
        ),
        {"tenant_id": context["tenant_id"], "project_id": project_id},
    )
    return {str(row["assignee"]): int(row["count"] or 0) for row in result.mappings().all()}


async def _tasks_by_status(
    session: AsyncSession,
    params: dict[str, Any],
    where_sql: str,
) -> dict[str, int]:
    result = await session.execute(
        text(
            f"""
            select t.status, count(*) as count
            from public.project_tasks t
            join public.project_projects p
              on p.tenant_id = t.tenant_id and p.id = t.project_id
            where {where_sql}
              and coalesce(t.is_deleted, false) = false
            group by t.status
            """
        ),
        params,
    )
    return {str(row["status"]): int(row["count"] or 0) for row in result.mappings().all()}
