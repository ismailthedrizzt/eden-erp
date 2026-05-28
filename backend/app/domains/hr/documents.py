from __future__ import annotations

from typing import Any
from uuid import uuid4

from fastapi import status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.domains.hr.employment import require_employee
from app.domains.hr.schemas import EmployeeDocumentCreateRequest, EmployeeDocumentUpdateRequest
from app.domains.hr.service import ensure_hr_tables, json_dumps, row_to_dict

DOCUMENT_MUTABLE_COLUMNS = {
    "file_ref",
    "issue_date",
    "expiry_date",
    "status",
    "required",
    "notes",
}

JSON_COLUMNS = {"file_ref"}


async def list_employee_documents(
    session: AsyncSession,
    context: dict[str, Any],
    employee_id: str,
) -> list[dict[str, Any]]:
    await ensure_hr_tables(session, documents=True)
    await require_employee(session, context, employee_id)
    result = await session.execute(
        text(
            """
            select *
            from public.hr_employee_documents
            where tenant_id = :tenant_id
              and employee_id = :employee_id
            order by required desc, document_type asc, created_at desc
            """
        ),
        {"tenant_id": context["tenant_id"], "employee_id": employee_id},
    )
    return [row_to_dict(row) for row in result.mappings().all()]


async def create_employee_document(
    session: AsyncSession,
    context: dict[str, Any],
    employee_id: str,
    request: EmployeeDocumentCreateRequest,
) -> dict[str, Any]:
    await ensure_hr_tables(session, documents=True)
    employee = await require_employee(session, context, employee_id, write=True)
    payload = request.model_dump(exclude_none=True)
    document_id = str(uuid4())
    result = await session.execute(
        text(
            """
            insert into public.hr_employee_documents (
              id, tenant_id, employee_id, company_id, document_type, file_ref,
              issue_date, expiry_date, status, required, notes, created_at, updated_at
            )
            values (
              :id, :tenant_id, :employee_id, :company_id, :document_type,
              cast(:file_ref as jsonb), :issue_date, :expiry_date, :status,
              :required, :notes, now(), now()
            )
            returning *
            """
        ),
        {
            **payload,
            "id": document_id,
            "tenant_id": context["tenant_id"],
            "employee_id": employee_id,
            "company_id": employee["company_id"],
            "file_ref": json_dumps(payload.get("file_ref")),
        },
    )
    return row_to_dict(result.mappings().one())


async def update_employee_document(
    session: AsyncSession,
    context: dict[str, Any],
    employee_id: str,
    document_id: str,
    request: EmployeeDocumentUpdateRequest,
) -> dict[str, Any]:
    await ensure_hr_tables(session, documents=True)
    await require_employee(session, context, employee_id, write=True)
    payload = request.model_dump(exclude_unset=True, exclude_none=True)
    patch = {key: value for key, value in payload.items() if key in DOCUMENT_MUTABLE_COLUMNS}
    if not patch:
        raise DomainError(
            "Guncellenecek belge alani bulunamadi.",
            "NO_CHANGED_FIELDS",
            status.HTTP_400_BAD_REQUEST,
        )
    assignments: list[str] = []
    params: dict[str, Any] = {
        "tenant_id": context["tenant_id"],
        "employee_id": employee_id,
        "document_id": document_id,
    }
    for key, value in patch.items():
        if key in JSON_COLUMNS:
            assignments.append(f"{key} = cast(:{key} as jsonb)")
            params[key] = json_dumps(value)
        else:
            assignments.append(f"{key} = :{key}")
            params[key] = value
    assignments.append("updated_at = now()")
    result = await session.execute(
        text(
            f"""
            update public.hr_employee_documents
            set {", ".join(assignments)}
            where tenant_id = :tenant_id
              and employee_id = :employee_id
              and id = :document_id
            returning *
            """
        ),
        params,
    )
    row = result.mappings().one_or_none()
    if not row:
        raise DomainError(
            "Calisan belgesi bulunamadi.",
            "EMPLOYEE_DOCUMENT_NOT_FOUND",
            status.HTTP_404_NOT_FOUND,
        )
    return row_to_dict(row)
