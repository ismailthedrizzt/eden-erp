from __future__ import annotations

from typing import Any
from uuid import uuid4

from fastapi import status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.domains.hr.schemas import (
    EmployeeCreateRequest,
    EmployeeListQuery,
    EmployeeSummary,
    EmployeeUpdateRequest,
    ListResult,
)
from app.domains.hr.service import (
    assert_company_exists,
    assert_company_scope,
    assert_version,
    ensure_hr_tables,
    json_dumps,
    list_meta,
    reject_controlled_employee_patch,
    row_to_dict,
)

EMPLOYEE_SORT_COLUMNS = {
    "employee_no": "e.employee_no",
    "full_name": "e.full_name",
    "record_status": "e.record_status",
    "employment_status": "e.employment_status",
    "start_date": "er.start_date",
    "sgk_status": "er.sgk_status",
    "updated_at": "e.updated_at",
    "created_at": "e.created_at",
}

EMPLOYEE_MUTABLE_COLUMNS = {
    "person_id",
    "employee_no",
    "first_name",
    "last_name",
    "full_name",
    "identity_number",
    "passport_no",
    "nationality",
    "birth_date",
    "gender",
    "marital_status",
    "education_level",
    "phone",
    "email",
    "address",
    "city",
    "district",
    "country",
    "emergency_contact",
    "photo_url",
    "notes",
    "record_status",
    "metadata_json",
}

JSON_COLUMNS = {"emergency_contact", "metadata_json"}


async def list_employees(
    session: AsyncSession,
    context: dict[str, Any],
    query: EmployeeListQuery,
) -> ListResult:
    await ensure_hr_tables(session, employment=True)
    where = ["e.tenant_id = :tenant_id", "coalesce(e.is_deleted, false) = false"]
    params: dict[str, Any] = {
        "tenant_id": context["tenant_id"],
        "limit": query.page_size,
        "offset": (query.page - 1) * query.page_size,
    }
    if query.company_id:
        assert_company_scope(context, query.company_id)
        where.append("e.company_id = :company_id")
        params["company_id"] = query.company_id
    elif context.get("company_scope_ids"):
        where.append("e.company_id = any(cast(:company_scope_ids as uuid[]))")
        params["company_scope_ids"] = context["company_scope_ids"]
    if query.branch_id:
        where.append("er.branch_id = :branch_id")
        params["branch_id"] = query.branch_id
    if query.organization_unit_id:
        where.append("er.organization_unit_id = :organization_unit_id")
        params["organization_unit_id"] = query.organization_unit_id
    if query.position_id:
        where.append("er.position_id = :position_id")
        params["position_id"] = query.position_id
    if query.employment_status:
        where.append("e.employment_status = :employment_status")
        params["employment_status"] = query.employment_status
    if query.employment_type:
        where.append("er.employment_type = :employment_type")
        params["employment_type"] = query.employment_type
    if query.sgk_status:
        where.append("er.sgk_status = :sgk_status")
        params["sgk_status"] = query.sgk_status
    if query.gender:
        where.append("e.gender = :gender")
        params["gender"] = query.gender
    if query.education_level:
        where.append("e.education_level = :education_level")
        params["education_level"] = query.education_level
    if query.record_status:
        where.append("e.record_status = :record_status")
        params["record_status"] = query.record_status
    if query.start_date_from:
        where.append("er.start_date >= :start_date_from")
        params["start_date_from"] = query.start_date_from
    if query.start_date_to:
        where.append("er.start_date <= :start_date_to")
        params["start_date_to"] = query.start_date_to
    if query.search:
        where.append(
            """
            (
              e.full_name ilike :search
              or e.employee_no ilike :search
              or e.identity_number ilike :search
              or e.email ilike :search
            )
            """
        )
        params["search"] = f"%{query.search}%"

    where_sql = " and ".join(where)
    sort_column = EMPLOYEE_SORT_COLUMNS.get(query.sort, "e.updated_at")
    direction = "asc" if query.direction.lower() == "asc" else "desc"
    count_result = await session.execute(
        text(
            f"""
            select count(*)
            from public.hr_employees e
            left join lateral ({current_employment_sql()}) er on true
            where {where_sql}
            """
        ),
        params,
    )
    total = int(count_result.scalar_one() or 0)
    result = await session.execute(
        text(
            f"""
            select e.*,
                   er.id as employment_record_id,
                   er.branch_id,
                   er.organization_unit_id,
                   er.position_id,
                   er.job_title,
                   er.employment_type,
                   er.start_date,
                   er.end_date,
                   er.sgk_status,
                   er.sgk_workplace_registry_no,
                   er.work_location_type,
                   er.manager_employee_id,
                   er.salary_type,
                   er.currency,
                   er.trial_period_end_date,
                   er.termination_reason,
                   er.notes as employment_notes,
                   (
                     select count(*)
                     from public.hr_employee_documents d
                     where d.tenant_id = e.tenant_id
                       and d.employee_id = e.id
                       and d.required = true
                       and d.status in ('missing', 'expired', 'rejected')
                   ) as document_missing_count
            from public.hr_employees e
            left join lateral ({current_employment_sql()}) er on true
            where {where_sql}
            order by {sort_column} {direction}, e.id desc
            limit :limit offset :offset
            """
        ),
        params,
    )
    return ListResult(
        data=[enrich_employee_row(row_to_dict(row)) for row in result.mappings().all()],
        meta=list_meta(query.page, query.page_size, total),
    )


async def get_employee(
    session: AsyncSession,
    tenant_id: str,
    employee_id: str,
) -> dict[str, Any] | None:
    await ensure_hr_tables(session, employment=True)
    result = await session.execute(
        text(
            f"""
            select e.*,
                   er.id as employment_record_id,
                   er.branch_id,
                   er.organization_unit_id,
                   er.position_id,
                   er.job_title,
                   er.employment_type,
                   er.start_date,
                   er.end_date,
                   er.sgk_status,
                   er.sgk_workplace_registry_no,
                   er.work_location_type,
                   er.manager_employee_id,
                   er.salary_type,
                   er.currency,
                   er.trial_period_end_date,
                   er.termination_reason,
                   er.notes as employment_notes,
                   (
                     select count(*)
                     from public.hr_employee_documents d
                     where d.tenant_id = e.tenant_id
                       and d.employee_id = e.id
                       and d.required = true
                       and d.status in ('missing', 'expired', 'rejected')
                   ) as document_missing_count
            from public.hr_employees e
            left join lateral ({current_employment_sql()}) er on true
            where e.tenant_id = :tenant_id
              and e.id = :employee_id
              and coalesce(e.is_deleted, false) = false
            limit 1
            """
        ),
        {"tenant_id": tenant_id, "employee_id": employee_id},
    )
    row = result.mappings().one_or_none()
    return enrich_employee_row(row_to_dict(row)) if row else None


async def create_employee(
    session: AsyncSession,
    context: dict[str, Any],
    request: EmployeeCreateRequest,
) -> dict[str, Any]:
    await ensure_hr_tables(session)
    payload = request.model_dump(exclude_none=True)
    company_id = str(payload["company_id"])
    assert_company_scope(context, company_id, write=True)
    await assert_company_exists(session, context, company_id)
    await assert_unique_employee(session, context, payload)
    employee_no = payload.get("employee_no") or await next_employee_no(
        session, context["tenant_id"], company_id
    )
    employee_id = str(uuid4())
    result = await session.execute(
        text(
            """
            insert into public.hr_employees (
              id, tenant_id, company_id, person_id, employee_no, first_name, last_name,
              full_name, identity_number, passport_no, nationality, birth_date, gender,
              marital_status, education_level, phone, email, address, city, district,
              country, emergency_contact, photo_url, record_status, employment_status,
              notes, metadata_json, created_by, updated_by, created_at, updated_at,
              version, is_deleted
            )
            values (
              :id, :tenant_id, :company_id, :person_id, :employee_no, :first_name,
              :last_name, :full_name, :identity_number, :passport_no, :nationality,
              :birth_date, :gender, :marital_status, :education_level, :phone, :email,
              :address, :city, :district, :country, cast(:emergency_contact as jsonb),
              :photo_url, :record_status, 'draft', :notes, cast(:metadata_json as jsonb),
              :created_by, :updated_by, now(), now(), 1, false
            )
            returning *
            """
        ),
        {
            **payload,
            "id": employee_id,
            "tenant_id": context["tenant_id"],
            "employee_no": employee_no,
            "emergency_contact": json_dumps(payload.get("emergency_contact")),
            "metadata_json": json_dumps(payload.get("metadata_json")),
            "created_by": context.get("user_id"),
            "updated_by": context.get("user_id"),
        },
    )
    return row_to_dict(result.mappings().one())


async def update_employee(
    session: AsyncSession,
    context: dict[str, Any],
    employee_id: str,
    request: EmployeeUpdateRequest,
) -> dict[str, Any]:
    current = await get_employee(session, context["tenant_id"], employee_id)
    if not current:
        raise DomainError("Calisan bulunamadi.", "EMPLOYEE_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    assert_company_scope(context, str(current["company_id"]), write=True)
    payload = request.model_dump(exclude_unset=True, exclude_none=True)
    reject_controlled_employee_patch(payload)
    assert_version(current, payload.pop("base_version", None))
    patch = {key: value for key, value in payload.items() if key in EMPLOYEE_MUTABLE_COLUMNS}
    if ("first_name" in patch or "last_name" in patch) and "full_name" not in patch:
        patch["full_name"] = (
            f"{patch.get('first_name', current.get('first_name'))} "
            f"{patch.get('last_name', current.get('last_name'))}"
        ).strip()
    if not patch:
        raise DomainError(
            "Guncellenecek calisan kart alani bulunamadi.",
            "NO_CHANGED_FIELDS",
            status.HTTP_400_BAD_REQUEST,
        )
    await assert_unique_employee(
        session,
        context,
        {**current, **patch},
        exclude_id=employee_id,
    )
    assignments: list[str] = []
    params: dict[str, Any] = {
        "tenant_id": context["tenant_id"],
        "employee_id": employee_id,
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
            update public.hr_employees
            set {", ".join(assignments)}
            where tenant_id = :tenant_id
              and id = :employee_id
              and coalesce(is_deleted, false) = false
            returning *
            """
        ),
        params,
    )
    row = result.mappings().one_or_none()
    if not row:
        raise DomainError("Calisan bulunamadi.", "EMPLOYEE_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    return row_to_dict(row)


async def delete_employee(
    session: AsyncSession,
    context: dict[str, Any],
    employee_id: str,
) -> dict[str, Any]:
    current = await get_employee(session, context["tenant_id"], employee_id)
    if not current:
        raise DomainError("Calisan bulunamadi.", "EMPLOYEE_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    assert_company_scope(context, str(current["company_id"]), write=True)
    if current.get("record_status") != "draft" or current.get("employment_status") != "draft":
        raise DomainError(
            "Istihdam gecmisi olan calisan karti silinemez. "
            "Pasife alma veya isten cikis islemi kullanin.",
            "EMPLOYEE_DELETE_NOT_ALLOWED",
            status.HTTP_409_CONFLICT,
        )
    count_result = await session.execute(
        text(
            """
            select count(*)
            from public.hr_employment_records
            where tenant_id = :tenant_id
              and employee_id = :employee_id
              and coalesce(is_deleted, false) = false
            """
        ),
        {"tenant_id": context["tenant_id"], "employee_id": employee_id},
    )
    if int(count_result.scalar_one() or 0) > 0:
        raise DomainError(
            "Istihdam kaydi olan calisan karti silinemez.",
            "EMPLOYEE_HAS_EMPLOYMENT_RECORDS",
            status.HTTP_409_CONFLICT,
        )
    await session.execute(
        text(
            """
            update public.hr_employees
            set is_deleted = true,
                record_status = 'passive',
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
    return {"id": employee_id, "deleted": True, "message": "Taslak calisan karti silindi."}


async def get_employee_summary(
    session: AsyncSession,
    context: dict[str, Any],
    company_id: str | None = None,
) -> EmployeeSummary:
    await ensure_hr_tables(session, employment=True)
    where = ["e.tenant_id = :tenant_id", "coalesce(e.is_deleted, false) = false"]
    params: dict[str, Any] = {"tenant_id": context["tenant_id"]}
    if company_id:
        assert_company_scope(context, company_id)
        where.append("e.company_id = :company_id")
        params["company_id"] = company_id
    elif context.get("company_scope_ids"):
        where.append("e.company_id = any(cast(:company_scope_ids as uuid[]))")
        params["company_scope_ids"] = context["company_scope_ids"]
    where_sql = " and ".join(where)
    result = await session.execute(
        text(
            f"""
            select
              count(*) as total_employees,
              count(*) filter (where e.employment_status = 'active') as active_employees,
              count(*) filter (where e.record_status = 'draft') as draft_employees,
              count(*) filter (where e.employment_status = 'terminated') as terminated_employees,
              count(*) filter (where er.sgk_status = 'pending') as pending_sgk
            from public.hr_employees e
            left join lateral ({current_employment_sql()}) er on true
            where {where_sql}
            """
        ),
        params,
    )
    row = result.mappings().one()
    return EmployeeSummary(
        total_employees=int(row["total_employees"] or 0),
        active_employees=int(row["active_employees"] or 0),
        draft_employees=int(row["draft_employees"] or 0),
        terminated_employees=int(row["terminated_employees"] or 0),
        pending_sgk=int(row["pending_sgk"] or 0),
        branch_distribution=await _distribution(session, params, where_sql, "er.branch_id"),
        gender_distribution=await _distribution(session, params, where_sql, "e.gender"),
        education_distribution=await _distribution(session, params, where_sql, "e.education_level"),
        employment_type_distribution=await _distribution(
            session, params, where_sql, "er.employment_type"
        ),
    )


async def assert_unique_employee(
    session: AsyncSession,
    context: dict[str, Any],
    payload: dict[str, Any],
    *,
    exclude_id: str | None = None,
) -> None:
    exclude = "and id <> :exclude_id" if exclude_id else ""
    if payload.get("employee_no"):
        result = await session.execute(
            text(
                f"""
                select id
                from public.hr_employees
                where tenant_id = :tenant_id
                  and company_id = :company_id
                  and employee_no = :employee_no
                  and coalesce(is_deleted, false) = false
                  {exclude}
                limit 1
                """
            ),
            {
                "tenant_id": context["tenant_id"],
                "company_id": payload.get("company_id"),
                "employee_no": payload.get("employee_no"),
                "exclude_id": exclude_id,
            },
        )
        row = result.mappings().one_or_none()
        if row:
            raise DomainError(
                "Bu calisan numarasi ayni sirket icin zaten kullaniliyor.",
                "DUPLICATE_EMPLOYEE_NO",
                status.HTTP_409_CONFLICT,
                {"employee_id": row["id"]},
            )
    if not payload.get("person_id"):
        return
    result = await session.execute(
        text(
            f"""
            select id
            from public.hr_employees
            where tenant_id = :tenant_id
              and company_id = :company_id
              and person_id = :person_id
              and employment_status = 'active'
              and coalesce(is_deleted, false) = false
              {exclude}
            limit 1
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "company_id": payload.get("company_id"),
            "person_id": payload.get("person_id"),
            "exclude_id": exclude_id,
        },
    )
    row = result.mappings().one_or_none()
    if row:
        raise DomainError(
            "Ayni kisi icin bu sirkette aktif calisan kaydi zaten var.",
            "DUPLICATE_ACTIVE_EMPLOYEE",
            status.HTTP_409_CONFLICT,
            {"employee_id": row["id"]},
        )


async def next_employee_no(session: AsyncSession, tenant_id: str, company_id: str) -> str:
    result = await session.execute(
        text(
            """
            select count(*)
            from public.hr_employees
            where tenant_id = :tenant_id
              and company_id = :company_id
            """
        ),
        {"tenant_id": tenant_id, "company_id": company_id},
    )
    next_number = int(result.scalar_one() or 0) + 1
    return f"EMP-{next_number:06d}"


def current_employment_sql() -> str:
    return """
        select *
        from public.hr_employment_records er
        where er.tenant_id = e.tenant_id
          and er.employee_id = e.id
          and coalesce(er.is_deleted, false) = false
        order by case when er.employment_status = 'active' then 0 else 1 end,
                 er.created_at desc
        limit 1
    """


def enrich_employee_row(row: dict[str, Any]) -> dict[str, Any]:
    row["masked_identity_number"] = mask_identity(row.get("identity_number"))
    row["display_name"] = row.get("full_name") or (
        f"{row.get('first_name') or ''} {row.get('last_name') or ''}"
    ).strip()
    return row


def mask_identity(value: Any) -> str | None:
    if not value:
        return None
    text_value = str(value)
    if len(text_value) <= 4:
        return "*" * len(text_value)
    return f"{text_value[:2]}{'*' * max(0, len(text_value) - 4)}{text_value[-2:]}"


async def _distribution(
    session: AsyncSession,
    params: dict[str, Any],
    where_sql: str,
    field_sql: str,
) -> dict[str, int]:
    result = await session.execute(
        text(
            f"""
            select coalesce({field_sql}::text, 'unassigned') as label, count(*) as count
            from public.hr_employees e
            left join lateral ({current_employment_sql()}) er on true
            where {where_sql}
            group by coalesce({field_sql}::text, 'unassigned')
            """
        ),
        params,
    )
    return {str(row["label"]): int(row["count"] or 0) for row in result.mappings().all()}
