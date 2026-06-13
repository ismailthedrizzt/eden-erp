from __future__ import annotations

from typing import Any
from uuid import uuid4

from fastapi import status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.domains.hr.employees import get_employee
from app.domains.hr.lifecycle import insert_employee_lifecycle_event
from app.domains.hr.schemas import (
    AssignmentChangeRequest,
    EmploymentStartRequest,
    EmploymentTerminateRequest,
    SgkCompletedRequest,
)
from app.domains.hr.service import (
    assert_branch_valid,
    assert_company_exists,
    assert_company_scope,
    assert_organization_unit_valid,
    assert_position_valid,
    ensure_hr_tables,
    json_dumps,
    json_list_dumps,
    row_to_dict,
)
from app.domains.operations.service import (
    create_or_get_operation_request,
    duplicate_operation_response,
    mark_operation_completed,
    table_exists,
)

EMPLOYEE_OPERATION_TYPES = {
    "start_employment": "employee.employment_start",
    "terminate_employment": "employee.employment_termination",
    "assignment_change": "employee.assignment_change",
    "sgk_entry_completed": "employee.sgk_entry_completed",
    "sgk_exit_completed": "employee.sgk_exit_completed",
}


async def start_employment(
    session: AsyncSession,
    context: dict[str, Any],
    employee_id: str,
    request: EmploymentStartRequest,
) -> dict[str, Any]:
    await ensure_hr_tables(session, employment=True)
    employee = await require_employee(session, context, employee_id, write=True)
    if employee.get("record_status") != "draft" or employee.get("employment_status") != "draft":
        raise DomainError(
            "Ise giris yalnizca taslak calisan kartlari icin baslatilabilir.",
            "EMPLOYMENT_START_REQUIRES_DRAFT",
            status.HTTP_409_CONFLICT,
        )
    payload = request.model_dump(exclude_none=True)
    company_id = str(payload["company_id"])
    if str(employee["company_id"]) != company_id:
        raise DomainError(
            "Ise giris sirketi calisan karti ile uyumlu olmali.",
            "EMPLOYEE_COMPANY_MISMATCH",
            status.HTTP_409_CONFLICT,
        )
    assert_company_scope(context, company_id, write=True)
    await assert_company_exists(session, context, company_id, active_required=True)
    await assert_branch_valid(session, context, payload.get("branch_id"), company_id)
    await assert_organization_unit_valid(
        session, context, payload.get("organization_unit_id"), company_id
    )
    position = await assert_position_valid(
        session,
        context,
        payload.get("position_id"),
        company_id,
        payload.get("organization_unit_id"),
    )
    assert_identity_ready(employee)
    await assert_no_duplicate_active_person(session, context, employee)
    if payload.get("sgk_status") != "not_required" and not payload.get("sgk_workplace_registry_no"):
        raise DomainError(
            "SGK girişi icin isyeri sicil numarasi gereklidir.",
            "SGK_WORKPLACE_REGISTRY_REQUIRED",
            status.HTTP_400_BAD_REQUEST,
        )
    operation, operation_warnings = await begin_employee_operation(
        session,
        context,
        employee_id,
        EMPLOYEE_OPERATION_TYPES["start_employment"],
        payload,
        client_request_id=payload.get("client_request_id"),
    )
    record_id = str(uuid4())
    job_title = payload.get("job_title") or (position or {}).get("title")
    result = await session.execute(
        text(
            """
            insert into public.hr_employment_records (
              id, tenant_id, employee_id, company_id, branch_id, organization_unit_id,
              position_id, job_title, employment_type, employment_status, start_date,
              trial_period_end_date, end_date, termination_reason, sgk_status,
              sgk_workplace_registry_no, work_location_type, manager_employee_id,
              salary_type, currency, notes, created_by, updated_by, created_at,
              updated_at, version, is_deleted
            )
            values (
              :id, :tenant_id, :employee_id, :company_id, :branch_id,
              :organization_unit_id, :position_id, :job_title, :employment_type,
              'active', :start_date, :trial_period_end_date, null, null, :sgk_status,
              :sgk_workplace_registry_no, :work_location_type, :manager_employee_id,
              :salary_type, :currency, :notes, :created_by, :updated_by, now(), now(),
              1, false
            )
            returning *
            """
        ),
        {
            **payload,
            "id": record_id,
            "tenant_id": context["tenant_id"],
            "employee_id": employee_id,
            "job_title": job_title,
            "created_by": context.get("user_id"),
            "updated_by": context.get("user_id"),
        },
    )
    employment = row_to_dict(result.mappings().one())
    await insert_employment_transaction(
        session,
        context,
        employee,
        "start_employment",
        payload.get("start_date"),
        payload.get("start_date"),
        {},
        employment,
        payload.get("notes"),
        payload.get("document_files"),
    )
    await session.execute(
        text(
            """
            update public.hr_employees
            set record_status = 'active',
                employment_status = 'active',
                updated_by = :updated_by,
                updated_at = now(),
                version = version + 1
            where tenant_id = :tenant_id
              and id = :employee_id
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "employee_id": employee_id,
            "updated_by": context.get("user_id"),
        },
    )
    updated = await require_employee(session, context, employee_id)
    await mark_operation_completed(session, operation, updated, operation_warnings)
    return updated


async def terminate_employment(
    session: AsyncSession,
    context: dict[str, Any],
    employee_id: str,
    request: EmploymentTerminateRequest,
) -> dict[str, Any]:
    await ensure_hr_tables(session, employment=True)
    employee = await require_employee(session, context, employee_id, write=True)
    if employee.get("employment_status") != "active":
        raise DomainError(
            "Isten cikis yalnizca aktif calisanlar icin baslatilabilir.",
            "EMPLOYMENT_TERMINATE_REQUIRES_ACTIVE",
            status.HTTP_409_CONFLICT,
        )
    current = await require_current_employment(session, context, employee_id)
    payload = request.model_dump(exclude_none=True)
    if payload["end_date"] < current["start_date"]:
        raise DomainError(
            "Isten cikis tarihi ise giris tarihinden once olamaz.",
            "TERMINATION_DATE_BEFORE_START",
            status.HTTP_400_BAD_REQUEST,
        )
    old_values = dict(current)
    operation, operation_warnings = await begin_employee_operation(
        session,
        context,
        employee_id,
        EMPLOYEE_OPERATION_TYPES["terminate_employment"],
        payload,
        client_request_id=payload.get("client_request_id"),
    )
    await session.execute(
        text(
            """
            update public.hr_employment_records
            set employment_status = 'terminated',
                end_date = :end_date,
                termination_reason = :termination_reason,
                sgk_status = :sgk_status,
                notes = coalesce(:notes, notes),
                updated_by = :updated_by,
                updated_at = now(),
                version = version + 1
            where tenant_id = :tenant_id
              and id = :record_id
            returning *
            """
        ),
        {
            **payload,
            "tenant_id": context["tenant_id"],
            "record_id": current["id"],
            "updated_by": context.get("user_id"),
        },
    )
    await insert_employment_transaction(
        session,
        context,
        employee,
        "terminate_employment",
        payload.get("end_date"),
        payload.get("end_date"),
        old_values,
        payload,
        payload.get("termination_reason"),
        payload.get("document_files"),
    )
    await session.execute(
        text(
            """
            update public.hr_employees
            set record_status = 'passive',
                employment_status = 'terminated',
                updated_by = :updated_by,
                updated_at = now(),
                version = version + 1
            where tenant_id = :tenant_id
              and id = :employee_id
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "employee_id": employee_id,
            "updated_by": context.get("user_id"),
        },
    )
    updated = await require_employee(session, context, employee_id)
    updated["warnings"] = await representative_warnings(session, context, employee)
    await mark_operation_completed(session, operation, updated, operation_warnings)
    return updated


async def change_assignment(
    session: AsyncSession,
    context: dict[str, Any],
    employee_id: str,
    request: AssignmentChangeRequest,
) -> dict[str, Any]:
    await ensure_hr_tables(session, employment=True)
    employee = await require_employee(session, context, employee_id, write=True)
    if employee.get("employment_status") != "active":
        raise DomainError(
            "Pozisyon veya organizasyon degisikligi yalnizca aktif calisanlarda yapilabilir.",
            "ASSIGNMENT_CHANGE_REQUIRES_ACTIVE",
            status.HTTP_409_CONFLICT,
        )
    current = await require_current_employment(session, context, employee_id)
    payload = request.model_dump(exclude_unset=True, exclude_none=False)
    company_id = str(employee["company_id"])
    new_values = {
        "branch_id": payload["branch_id"] if "branch_id" in payload else current.get("branch_id"),
        "organization_unit_id": payload["organization_unit_id"]
        if "organization_unit_id" in payload
        else current.get("organization_unit_id"),
        "position_id": payload["position_id"]
        if "position_id" in payload
        else current.get("position_id"),
        "job_title": payload["job_title"] if "job_title" in payload else current.get("job_title"),
    }
    await assert_branch_valid(session, context, new_values.get("branch_id"), company_id)
    await assert_organization_unit_valid(
        session, context, new_values.get("organization_unit_id"), company_id
    )
    position = await assert_position_valid(
        session,
        context,
        new_values.get("position_id"),
        company_id,
        new_values.get("organization_unit_id"),
    )
    if not new_values.get("job_title") and position:
        new_values["job_title"] = position.get("title")
    if all(str(current.get(key) or "") == str(new_values.get(key) or "") for key in new_values):
        raise DomainError(
            "Eski ve yeni organizasyon/pozisyon bilgileri ayni.",
            "ASSIGNMENT_NO_CHANGED_FIELDS",
            status.HTTP_400_BAD_REQUEST,
        )
    operation, operation_warnings = await begin_employee_operation(
        session,
        context,
        employee_id,
        EMPLOYEE_OPERATION_TYPES["assignment_change"],
        payload,
        client_request_id=payload.get("client_request_id"),
    )
    await session.execute(
        text(
            """
            update public.hr_employment_records
            set branch_id = :branch_id,
                organization_unit_id = :organization_unit_id,
                position_id = :position_id,
                job_title = :job_title,
                updated_by = :updated_by,
                updated_at = now(),
                version = version + 1
            where tenant_id = :tenant_id
              and id = :record_id
            returning *
            """
        ),
        {
            **new_values,
            "tenant_id": context["tenant_id"],
            "record_id": current["id"],
            "updated_by": context.get("user_id"),
        },
    )
    await insert_employment_transaction(
        session,
        context,
        employee,
        "assignment_change",
        payload["effective_date"],
        payload["effective_date"],
        {
            "branch_id": current.get("branch_id"),
            "organization_unit_id": current.get("organization_unit_id"),
            "position_id": current.get("position_id"),
            "job_title": current.get("job_title"),
        },
        new_values,
        payload.get("reason"),
        payload.get("document_files"),
    )
    updated = await require_employee(session, context, employee_id)
    await mark_operation_completed(session, operation, updated, operation_warnings)
    return updated


async def mark_sgk_entry_completed(
    session: AsyncSession,
    context: dict[str, Any],
    employee_id: str,
    request: SgkCompletedRequest,
) -> dict[str, Any]:
    return await mark_sgk_completed(session, context, employee_id, request, "sgk_entry_completed")


async def mark_sgk_exit_completed(
    session: AsyncSession,
    context: dict[str, Any],
    employee_id: str,
    request: SgkCompletedRequest,
) -> dict[str, Any]:
    return await mark_sgk_completed(session, context, employee_id, request, "sgk_exit_completed")


async def mark_sgk_completed(
    session: AsyncSession,
    context: dict[str, Any],
    employee_id: str,
    request: SgkCompletedRequest,
    transaction_type: str,
) -> dict[str, Any]:
    await ensure_hr_tables(session, employment=True)
    employee = await require_employee(session, context, employee_id, write=True)
    current = await require_current_employment(session, context, employee_id)
    payload = request.model_dump(exclude_none=True)
    operation, operation_warnings = await begin_employee_operation(
        session,
        context,
        employee_id,
        EMPLOYEE_OPERATION_TYPES[transaction_type],
        payload,
        client_request_id=payload.get("client_request_id"),
    )
    await session.execute(
        text(
            """
            update public.hr_employment_records
            set sgk_status = 'completed',
                updated_by = :updated_by,
                updated_at = now(),
                version = version + 1
            where tenant_id = :tenant_id
              and id = :record_id
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "record_id": current["id"],
            "updated_by": context.get("user_id"),
        },
    )
    await insert_employment_transaction(
        session,
        context,
        employee,
        transaction_type,
        payload.get("completed_date"),
        payload.get("completed_date"),
        {"sgk_status": current.get("sgk_status")},
        {"sgk_status": "completed", **payload},
        payload.get("notes"),
        payload.get("document_files"),
    )
    updated = await require_employee(session, context, employee_id)
    await mark_operation_completed(session, operation, updated, operation_warnings)
    return updated


async def begin_employee_operation(
    session: AsyncSession,
    context: dict[str, Any],
    employee_id: str,
    operation_type: str,
    payload: dict[str, Any],
    *,
    client_request_id: str | None,
) -> tuple[dict[str, Any] | None, list[str]]:
    operation, warnings = await create_or_get_operation_request(
        session,
        context,
        operation_type=operation_type,
        client_request_id=client_request_id,
        payload=payload,
        entity_type="employee",
        entity_id=employee_id,
        module_key="hr",
    )
    duplicate = duplicate_operation_response(operation) if operation else None
    if duplicate:
        raise DomainError(
            duplicate.get("message") or "Bu islem daha once tamamlanmis.",
            "DUPLICATE_OPERATION",
            status.HTTP_409_CONFLICT,
            duplicate,
        )
    if operation:
        context["operation_id"] = str(operation["id"])
    return operation, warnings


async def require_employee(
    session: AsyncSession,
    context: dict[str, Any],
    employee_id: str,
    *,
    write: bool = False,
) -> dict[str, Any]:
    employee = await get_employee(session, context["tenant_id"], employee_id)
    if not employee:
        raise DomainError("Calisan bulunamadi.", "EMPLOYEE_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    assert_company_scope(context, str(employee["company_id"]), write=write)
    return employee


async def require_current_employment(
    session: AsyncSession,
    context: dict[str, Any],
    employee_id: str,
) -> dict[str, Any]:
    result = await session.execute(
        text(
            """
            select *
            from public.hr_employment_records
            where tenant_id = :tenant_id
              and employee_id = :employee_id
              and coalesce(is_deleted, false) = false
            order by case when employment_status = 'active' then 0 else 1 end,
                     created_at desc
            limit 1
            """
        ),
        {"tenant_id": context["tenant_id"], "employee_id": employee_id},
    )
    row = result.mappings().one_or_none()
    if not row:
        raise DomainError(
            "Aktif istihdam kaydi bulunamadi.",
            "EMPLOYMENT_RECORD_NOT_FOUND",
            status.HTTP_404_NOT_FOUND,
        )
    return row_to_dict(row)


async def insert_employment_transaction(
    session: AsyncSession,
    context: dict[str, Any],
    employee: dict[str, Any],
    transaction_type: str,
    transaction_date: Any,
    effective_date: Any,
    old_values: dict[str, Any],
    new_values: dict[str, Any],
    reason: str | None = None,
    document_files: list[dict[str, Any]] | None = None,
) -> None:
    operation_id = str(context.get("operation_id") or uuid4())
    await session.execute(
        text(
            """
            insert into public.hr_employment_transactions (
              id, tenant_id, employee_id, company_id, transaction_type,
              transaction_date, effective_date, old_values, new_values, reason,
              document_files, operation_id, process_instance_id, created_by, created_at
            )
            values (
              :id, :tenant_id, :employee_id, :company_id, :transaction_type,
              :transaction_date, :effective_date, cast(:old_values as jsonb),
              cast(:new_values as jsonb), :reason, cast(:document_files as jsonb),
              :operation_id, :process_instance_id, :created_by, now()
            )
            """
        ),
        {
            "id": str(uuid4()),
            "tenant_id": context["tenant_id"],
            "employee_id": employee["id"],
            "company_id": employee["company_id"],
            "transaction_type": transaction_type,
            "transaction_date": transaction_date,
            "effective_date": effective_date,
            "old_values": json_dumps(old_values),
            "new_values": json_dumps(new_values),
            "reason": reason,
            "document_files": json_list_dumps(document_files),
            "operation_id": operation_id,
            "process_instance_id": context.get("process_instance_id"),
            "created_by": context.get("user_id"),
        },
    )
    await insert_employee_lifecycle_event(
        session,
        tenant_id=str(context["tenant_id"]),
        employee_id=str(employee["id"]),
        operation_id=operation_id,
        process_instance_id=context.get("process_instance_id"),
        operation_type=transaction_type,
        payload={
            "transaction_type": transaction_type,
            "transaction_date": transaction_date,
            "effective_date": effective_date,
            "old_values": old_values,
            "new_values": new_values,
            "reason": reason,
            "document_files": document_files or [],
        },
    )


def assert_identity_ready(employee: dict[str, Any]) -> None:
    nationality = str(employee.get("nationality") or employee.get("country") or "TR").lower()
    is_turkey = nationality in {"tr", "tc", "turkiye", "turkey", "turkish"}
    if is_turkey and not employee.get("identity_number"):
        raise DomainError(
            "Ise giris icin TCKN bilgisi gereklidir.",
            "IDENTITY_NUMBER_REQUIRED",
            status.HTTP_400_BAD_REQUEST,
        )
    if not is_turkey and not (employee.get("passport_no") or employee.get("identity_number")):
        raise DomainError(
            "Yabanci uyruklu calisan icin pasaport veya kimlik bilgisi gereklidir.",
            "PASSPORT_OR_IDENTITY_REQUIRED",
            status.HTTP_400_BAD_REQUEST,
        )


async def assert_no_duplicate_active_person(
    session: AsyncSession,
    context: dict[str, Any],
    employee: dict[str, Any],
) -> None:
    if not employee.get("person_id"):
        return
    result = await session.execute(
        text(
            """
            select id
            from public.hr_employees
            where tenant_id = :tenant_id
              and company_id = :company_id
              and person_id = :person_id
              and employment_status = 'active'
              and id <> :employee_id
              and coalesce(is_deleted, false) = false
            limit 1
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "company_id": employee["company_id"],
            "person_id": employee["person_id"],
            "employee_id": employee["id"],
        },
    )
    if result.mappings().one_or_none():
        raise DomainError(
            "Ayni kisi icin bu sirkette aktif istihdam zaten var.",
            "DUPLICATE_ACTIVE_EMPLOYEE",
            status.HTTP_409_CONFLICT,
        )


async def representative_warnings(
    session: AsyncSession,
    context: dict[str, Any],
    employee: dict[str, Any],
) -> list[str]:
    if not employee.get("person_id"):
        return []
    if not await table_exists(session, "public.company_representatives"):
        return []
    result = await session.execute(
        text(
            """
            select id
            from public.company_representatives
            where tenant_id = :tenant_id
              and company_id = :company_id
              and person_id = :person_id
              and coalesce(is_deleted, false) = false
              and coalesce(record_status, status, '') in ('active', 'Aktif')
            limit 1
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "company_id": employee["company_id"],
            "person_id": employee["person_id"],
        },
    )
    if not result.mappings().one_or_none():
        return []
    return [
        "Bu kisi ayni zamanda temsilci yetkisine sahip olabilir. "
        "Temsilcilerimiz modulunden yetki durumunu kontrol edin."
    ]
