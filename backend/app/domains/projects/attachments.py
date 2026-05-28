# ruff: noqa: E501

from __future__ import annotations

from typing import Any
from uuid import uuid4

from fastapi import status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.domains.projects.schemas import TaskAttachmentCreateRequest
from app.domains.projects.service import (
    assert_company_scope,
    ensure_project_tables,
    json_dumps,
    row_to_dict,
)
from app.domains.projects.tasks import add_task_history, get_project_task


async def list_task_attachments(
    session: AsyncSession,
    context: dict[str, Any],
    task_id: str,
) -> list[dict[str, Any]]:
    await ensure_project_tables(session, tasks=True, attachments=True)
    task = await get_project_task(session, context["tenant_id"], task_id)
    if not task:
        raise DomainError("Proje gorevi bulunamadi.", "PROJECT_TASK_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    assert_company_scope(context, str(task["company_id"]))
    result = await session.execute(
        text(
            """
            select *
            from public.project_task_attachments
            where tenant_id = :tenant_id
              and task_id = :task_id
            order by created_at desc
            """
        ),
        {"tenant_id": context["tenant_id"], "task_id": task_id},
    )
    return [row_to_dict(row) for row in result.mappings().all()]


async def create_task_attachment(
    session: AsyncSession,
    context: dict[str, Any],
    task_id: str,
    request: TaskAttachmentCreateRequest,
) -> dict[str, Any]:
    await ensure_project_tables(session, tasks=True, attachments=True)
    task = await get_project_task(session, context["tenant_id"], task_id)
    if not task:
        raise DomainError("Proje gorevi bulunamadi.", "PROJECT_TASK_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    assert_company_scope(context, str(task["company_id"]), write=True)
    result = await session.execute(
        text(
            """
            insert into public.project_task_attachments (
              id, tenant_id, task_id, file_ref, file_name, file_type, uploaded_by, created_at
            )
            values (
              :id, :tenant_id, :task_id, cast(:file_ref as jsonb),
              :file_name, :file_type, :uploaded_by, now()
            )
            returning *
            """
        ),
        {
            "id": str(uuid4()),
            "tenant_id": context["tenant_id"],
            "task_id": task_id,
            "file_ref": json_dumps(request.file_ref),
            "file_name": request.file_name,
            "file_type": request.file_type,
            "uploaded_by": context.get("user_id"),
        },
    )
    attachment = row_to_dict(result.mappings().one())
    await add_task_history(
        session,
        context,
        task_id,
        "task.attachment_added",
        {},
        {"attachment_id": attachment["id"], "file_name": attachment["file_name"]},
    )
    return attachment
