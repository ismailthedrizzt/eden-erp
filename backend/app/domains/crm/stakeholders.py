# ruff: noqa: E501

from __future__ import annotations

from typing import Any, cast

from fastapi import status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.domains.accounting.cari_accounts import create_cari_account
from app.domains.accounting.schemas import CariAccountCreateRequest
from app.domains.crm.master_data import (
    create_master_organization,
    create_master_person,
    find_master_organization_duplicate,
    find_master_person_duplicate,
    get_master_entity,
)
from app.domains.crm.schemas import (
    CreateCariAccountFromStakeholderRequest,
    CreateFollowupTaskRequest,
    StakeholderCreateRequest,
    StakeholderListQuery,
    StakeholderSummary,
    StakeholderUpdateRequest,
)
from app.domains.crm.service import (
    assert_company_exists,
    assert_company_scope,
    assert_version,
    ensure_crm_tables,
    json_dumps,
    list_meta,
    row_to_dict,
    stakeholder_account_type,
    stakeholder_cari_role,
)
from app.domains.operations.service import table_exists
from app.domains.projects.schemas import ProjectTaskCreateRequest
from app.domains.projects.tasks import create_project_task

STAKEHOLDER_SORT_COLUMNS = {
    "display_name": "s.display_name",
    "stakeholder_type": "s.stakeholder_type",
    "relationship_status": "s.relationship_status",
    "customer_status": "s.customer_status",
    "supplier_status": "s.supplier_status",
    "city": "master_city",
    "updated_at": "s.updated_at",
    "created_at": "s.created_at",
}

STAKEHOLDER_MUTABLE_COLUMNS = {
    "display_name",
    "stakeholder_type",
    "relationship_status",
    "customer_status",
    "supplier_status",
    "related_cari_account_id",
    "primary_contact_person_id",
    "assigned_owner_user_id",
    "source",
    "sector",
    "tags",
    "lead_status",
    "lead_source",
    "potential_value",
    "expected_close_date",
    "next_followup_date",
    "lost_reason",
    "notes",
    "metadata_json",
}


async def list_stakeholders(session: AsyncSession, context: dict[str, Any], query: StakeholderListQuery) -> dict[str, Any]:
    await ensure_crm_tables(session, master=True, stakeholders=True)
    where = ["s.tenant_id = :tenant_id", "coalesce(s.is_deleted, false) = false"]
    params: dict[str, Any] = {"tenant_id": context["tenant_id"], "limit": query.page_size, "offset": (query.page - 1) * query.page_size}
    if query.company_id:
        assert_company_scope(context, query.company_id)
        where.append("s.company_id = :company_id")
        params["company_id"] = query.company_id
    elif context.get("company_scope_ids"):
        where.append("s.company_id = any(cast(:company_scope_ids as uuid[]))")
        params["company_scope_ids"] = context["company_scope_ids"]
    for field in ["stakeholder_type", "relationship_status", "customer_status", "supplier_status", "sector"]:
        value = getattr(query, field)
        if value:
            where.append(f"s.{field} = :{field}")
            params[field] = value
    if query.city:
        where.append("coalesce(p.city, o.city) = :city")
        params["city"] = query.city
    if query.owner_user_id:
        where.append("s.assigned_owner_user_id = :owner_user_id")
        params["owner_user_id"] = query.owner_user_id
    if query.has_cari_account is True:
        where.append("s.related_cari_account_id is not null")
    elif query.has_cari_account is False:
        where.append("s.related_cari_account_id is null")
    if query.tag:
        where.append(":tag = any(s.tags)")
        params["tag"] = query.tag
    if query.search:
        where.append("(s.display_name ilike :search or coalesce(p.full_name, '') ilike :search or coalesce(o.trade_name, '') ilike :search or coalesce(o.tax_number, '') ilike :search or coalesce(p.phone, o.phone, '') ilike :search or coalesce(p.email, o.email, '') ilike :search)")
        params["search"] = f"%{query.search}%"
    where_sql = " and ".join(where)
    count_result = await session.execute(
        text(
            f"""
            select count(*)
            from public.crm_stakeholders s
            left join public.master_persons p on s.master_entity_type = 'person' and p.tenant_id = s.tenant_id and p.id = s.master_entity_id
            left join public.master_organizations o on s.master_entity_type = 'organization' and o.tenant_id = s.tenant_id and o.id = s.master_entity_id
            where {where_sql}
            """
        ),
        params,
    )
    total = int(count_result.scalar_one() or 0)
    sort_column = STAKEHOLDER_SORT_COLUMNS.get(query.sort, "s.updated_at")
    direction = "asc" if query.direction.lower() == "asc" else "desc"
    result = await session.execute(
        text(
            f"""
            select s.*,
                   coalesce(p.full_name, o.trade_name, s.display_name) as master_display_name,
                   coalesce(p.phone, o.phone) as phone,
                   coalesce(p.email, o.email) as email,
                   coalesce(p.city, o.city) as master_city,
                   o.tax_number,
                   p.identity_number,
                   p.passport_no,
                   case when s.related_cari_account_id is null then false else true end as has_cari_account
            from public.crm_stakeholders s
            left join public.master_persons p on s.master_entity_type = 'person' and p.tenant_id = s.tenant_id and p.id = s.master_entity_id
            left join public.master_organizations o on s.master_entity_type = 'organization' and o.tenant_id = s.tenant_id and o.id = s.master_entity_id
            where {where_sql}
            order by {sort_column} {direction}, s.id desc
            limit :limit offset :offset
            """
        ),
        params,
    )
    rows = [mask_stakeholder_row(row_to_dict(row)) for row in result.mappings()]
    return {"data": rows, "meta": list_meta(query.page, query.page_size, total)}


async def get_stakeholder(session: AsyncSession, context: dict[str, Any], stakeholder_id: str) -> dict[str, Any] | None:
    await ensure_crm_tables(session, master=True, stakeholders=True)
    result = await session.execute(
        text(
            """
            select s.*,
                   coalesce(p.full_name, o.trade_name, s.display_name) as master_display_name,
                   coalesce(p.phone, o.phone) as phone,
                   coalesce(p.email, o.email) as email,
                   coalesce(p.city, o.city) as master_city,
                   coalesce(p.country, o.country) as master_country,
                   coalesce(p.address, o.address) as master_address,
                   o.tax_number,
                   o.tax_office,
                   p.identity_number,
                   p.passport_no
            from public.crm_stakeholders s
            left join public.master_persons p on s.master_entity_type = 'person' and p.tenant_id = s.tenant_id and p.id = s.master_entity_id
            left join public.master_organizations o on s.master_entity_type = 'organization' and o.tenant_id = s.tenant_id and o.id = s.master_entity_id
            where s.tenant_id = :tenant_id
              and s.id = :stakeholder_id
              and coalesce(s.is_deleted, false) = false
            limit 1
            """
        ),
        {"tenant_id": context["tenant_id"], "stakeholder_id": stakeholder_id},
    )
    row = result.mappings().one_or_none()
    return mask_stakeholder_row(row_to_dict(row)) if row else None


async def create_stakeholder(session: AsyncSession, context: dict[str, Any], request: StakeholderCreateRequest) -> dict[str, Any]:
    await ensure_crm_tables(session, master=True, stakeholders=True)
    assert_company_scope(context, request.company_id, write=True)
    await assert_company_exists(session, context, request.company_id)
    master = await resolve_master_for_create(session, context, request)
    display_name = request.display_name or master.get("full_name") or master.get("trade_name") or master.get("short_name")
    if not display_name:
        raise DomainError("Paydas adi/unvani belirlenemedi.", "STAKEHOLDER_DISPLAY_NAME_REQUIRED", status.HTTP_422_UNPROCESSABLE_ENTITY)
    await assert_unique_stakeholder_role(session, context, request.company_id, request.master_entity_type, str(master["id"]), request.stakeholder_type)
    result = await session.execute(
        text(
            """
            insert into public.crm_stakeholders (
              tenant_id, company_id, master_entity_type, master_entity_id, display_name, stakeholder_type,
              relationship_status, customer_status, supplier_status, related_cari_account_id,
              primary_contact_person_id, assigned_owner_user_id, source, sector, tags, lead_status,
              lead_source, potential_value, expected_close_date, next_followup_date, lost_reason,
              notes, metadata_json, created_by, updated_by
            )
            values (
              :tenant_id, :company_id, :master_entity_type, :master_entity_id, :display_name, :stakeholder_type,
              :relationship_status, :customer_status, :supplier_status, :related_cari_account_id,
              :primary_contact_person_id, :assigned_owner_user_id, :source, :sector, :tags, :lead_status,
              :lead_source, :potential_value, :expected_close_date, :next_followup_date, :lost_reason,
              :notes, cast(:metadata_json as jsonb), :user_id, :user_id
            )
            returning id
            """
        ),
        {
            **request.model_dump(exclude={"master_person", "master_organization", "master_entity_id", "display_name"}),
            "tenant_id": context["tenant_id"],
            "user_id": context.get("user_id"),
            "master_entity_id": master["id"],
            "display_name": display_name,
            "metadata_json": json_dumps(request.metadata_json),
        },
    )
    return await require_stakeholder(session, context, str(result.scalar_one()))


async def update_stakeholder(session: AsyncSession, context: dict[str, Any], stakeholder_id: str, request: StakeholderUpdateRequest) -> dict[str, Any]:
    current = await require_stakeholder(session, context, stakeholder_id)
    assert_company_scope(context, str(current["company_id"]), write=True)
    assert_version(current, request.base_version)
    data = request.model_dump(exclude_unset=True, exclude={"base_version"})
    if not data:
        return current
    if data.get("stakeholder_type") and data["stakeholder_type"] != current["stakeholder_type"]:
        await assert_unique_stakeholder_role(session, context, str(current["company_id"]), str(current["master_entity_type"]), str(current["master_entity_id"]), data["stakeholder_type"], exclude_id=stakeholder_id)
    set_parts: list[str] = []
    params: dict[str, Any] = {"tenant_id": context["tenant_id"], "stakeholder_id": stakeholder_id, "user_id": context.get("user_id")}
    for key, value in data.items():
        if key not in STAKEHOLDER_MUTABLE_COLUMNS:
            continue
        if key == "metadata_json":
            set_parts.append("metadata_json = cast(:metadata_json as jsonb)")
            params[key] = json_dumps(value)
        else:
            set_parts.append(f"{key} = :{key}")
            params[key] = value
    if not set_parts:
        return current
    set_parts.extend(["updated_by = :user_id", "updated_at = now()", "version = version + 1"])
    await session.execute(
        text(f"update public.crm_stakeholders set {', '.join(set_parts)} where tenant_id = :tenant_id and id = :stakeholder_id and coalesce(is_deleted, false) = false"),
        params,
    )
    return await require_stakeholder(session, context, stakeholder_id)


async def delete_stakeholder(session: AsyncSession, context: dict[str, Any], stakeholder_id: str) -> dict[str, Any]:
    current = await require_stakeholder(session, context, stakeholder_id)
    assert_company_scope(context, str(current["company_id"]), write=True)
    await session.execute(
        text(
            """
            update public.crm_stakeholders
            set is_deleted = true, relationship_status = 'archived', updated_by = :user_id, updated_at = now(), version = version + 1
            where tenant_id = :tenant_id and id = :stakeholder_id
            """
        ),
        {"tenant_id": context["tenant_id"], "stakeholder_id": stakeholder_id, "user_id": context.get("user_id")},
    )
    return {"id": stakeholder_id, "message": "Paydas arsivlendi."}


async def create_cari_account_for_stakeholder(session: AsyncSession, context: dict[str, Any], stakeholder_id: str, request: CreateCariAccountFromStakeholderRequest) -> dict[str, Any]:
    stakeholder = await require_stakeholder(session, context, stakeholder_id)
    assert_company_scope(context, str(stakeholder["company_id"]), write=True)
    if stakeholder.get("related_cari_account_id"):
        raise DomainError("Bu paydas zaten bir cari karta bagli.", "STAKEHOLDER_CARI_ALREADY_LINKED", status.HTTP_409_CONFLICT)
    master = await get_master_entity_raw(session, context, str(stakeholder["master_entity_type"]), str(stakeholder["master_entity_id"]))
    account = await create_cari_account(
        session,
        context,
        CariAccountCreateRequest(
            company_id=str(stakeholder["company_id"]),
            account_code=request.account_code,
            account_name=str(stakeholder["display_name"]),
            account_type=cast(Any, stakeholder_account_type(str(stakeholder["stakeholder_type"]))),
            cari_role=cast(Any, stakeholder_cari_role(str(stakeholder["stakeholder_type"]))),
            linked_entity_type="stakeholder",
            linked_entity_id=stakeholder_id,
            tax_number=master.get("tax_number") if stakeholder["master_entity_type"] == "organization" else None,
            tax_office=master.get("tax_office") if stakeholder["master_entity_type"] == "organization" else None,
            identity_number=master.get("identity_number") if stakeholder["master_entity_type"] == "person" else None,
            country=master.get("country"),
            city=master.get("city"),
            district=master.get("district"),
            address=master.get("address"),
            phone=master.get("phone"),
            email=master.get("email"),
            currency=request.currency,
            opening_balance=request.opening_balance,
            risk_limit=request.risk_limit,
            payment_terms=request.payment_terms,
            record_status="active",
            metadata_json={"source": "crm_stakeholder", "stakeholder_id": stakeholder_id, "master_entity_type": stakeholder["master_entity_type"], "master_entity_id": str(stakeholder["master_entity_id"])},
        ),
    )
    await session.execute(
        text("update public.crm_stakeholders set related_cari_account_id = :account_id, updated_by = :user_id, updated_at = now(), version = version + 1 where tenant_id = :tenant_id and id = :stakeholder_id"),
        {"tenant_id": context["tenant_id"], "stakeholder_id": stakeholder_id, "account_id": account["id"], "user_id": context.get("user_id")},
    )
    return {"stakeholder": await require_stakeholder(session, context, stakeholder_id), "cari_account": account}


async def create_followup_task_for_stakeholder(session: AsyncSession, context: dict[str, Any], stakeholder_id: str, request: CreateFollowupTaskRequest) -> dict[str, Any]:
    stakeholder = await require_stakeholder(session, context, stakeholder_id)
    assert_company_scope(context, str(stakeholder["company_id"]), write=True)
    task = await create_project_task(
        session,
        context,
        ProjectTaskCreateRequest(
            company_id=str(stakeholder["company_id"]),
            title=request.title or f"{stakeholder['display_name']} takip gorevi",
            description=request.description or "CRM paydas kaydindan olusturulan takip gorevi.",
            issue_type="task",
            priority=request.priority,
            assignee_user_id=request.assignee_user_id or stakeholder.get("assigned_owner_user_id"),
            assignee_employee_id=request.assignee_employee_id,
            due_date=request.due_date or stakeholder.get("next_followup_date"),
            labels=["crm", str(stakeholder["stakeholder_type"])],
            related_module="crm",
            related_entity_type="stakeholder",
            related_entity_id=stakeholder_id,
            metadata_json={"source": "crm_stakeholder_followup", "stakeholder_id": stakeholder_id},
        ),
    )
    return {"task": task, "stakeholder": stakeholder}


async def related_records(session: AsyncSession, context: dict[str, Any], stakeholder_id: str) -> dict[str, Any]:
    stakeholder = await require_stakeholder(session, context, stakeholder_id)
    tenant_id = context["tenant_id"]
    master_id = str(stakeholder["master_entity_id"])
    master_type = str(stakeholder["master_entity_type"])
    data: dict[str, Any] = {"stakeholder": stakeholder, "roles": {}, "counts": {}}
    data["roles"]["cari_account"] = bool(stakeholder.get("related_cari_account_id"))
    data["roles"]["partner_count"] = await count_if_table(session, "public.company_partners", "tenant_id = :tenant_id and coalesce(is_deleted, false) = false and " + ("person_id = :master_id" if master_type == "person" else "organization_id = :master_id"), {"tenant_id": tenant_id, "master_id": master_id})
    data["roles"]["representative_count"] = await count_if_table(session, "public.company_representatives", "tenant_id = :tenant_id and coalesce(is_deleted, false) = false and " + ("person_id = :master_id" if master_type == "person" else "organization_id = :master_id"), {"tenant_id": tenant_id, "master_id": master_id})
    data["roles"]["employee_count"] = await count_if_table(session, "public.hr_employees", "tenant_id = :tenant_id and coalesce(is_deleted, false) = false and person_id = :master_id", {"tenant_id": tenant_id, "master_id": master_id})
    data["counts"]["installed_assets"] = await count_if_table(session, "public.after_sales_installed_assets", "tenant_id = :tenant_id and coalesce(is_deleted, false) = false and (customer_account_id = :account_id or customer_name = :display_name)", {"tenant_id": tenant_id, "account_id": stakeholder.get("related_cari_account_id"), "display_name": stakeholder.get("display_name")})
    data["counts"]["open_service_requests"] = await count_if_table(session, "public.after_sales_service_requests", "tenant_id = :tenant_id and coalesce(is_deleted, false) = false and status in ('new','triage','assigned','in_progress','waiting_customer') and (customer_account_id = :account_id or customer_name = :display_name)", {"tenant_id": tenant_id, "account_id": stakeholder.get("related_cari_account_id"), "display_name": stakeholder.get("display_name")})
    data["counts"]["open_tasks"] = await count_if_table(session, "public.project_tasks", "tenant_id = :tenant_id and coalesce(is_deleted, false) = false and related_module = 'crm' and related_entity_type = 'stakeholder' and related_entity_id = :stakeholder_id and status in ('backlog','todo','in_progress','blocked','review')", {"tenant_id": tenant_id, "stakeholder_id": stakeholder_id})
    return data


async def stakeholder_summary(session: AsyncSession, context: dict[str, Any], stakeholder_id: str) -> StakeholderSummary:
    stakeholder = await require_stakeholder(session, context, stakeholder_id)
    tenant_id = context["tenant_id"]
    related = await related_records(session, context, stakeholder_id)
    return StakeholderSummary(
        interaction_count=await count_if_table(session, "public.crm_interactions", "tenant_id = :tenant_id and stakeholder_id = :stakeholder_id and coalesce(is_deleted, false) = false", {"tenant_id": tenant_id, "stakeholder_id": stakeholder_id}),
        open_task_count=related["counts"].get("open_tasks", 0),
        completed_task_count=await count_if_table(session, "public.project_tasks", "tenant_id = :tenant_id and coalesce(is_deleted, false) = false and related_module = 'crm' and related_entity_type = 'stakeholder' and related_entity_id = :stakeholder_id and status = 'done'", {"tenant_id": tenant_id, "stakeholder_id": stakeholder_id}),
        overdue_task_count=await count_if_table(session, "public.project_tasks", "tenant_id = :tenant_id and coalesce(is_deleted, false) = false and related_module = 'crm' and related_entity_type = 'stakeholder' and related_entity_id = :stakeholder_id and status in ('backlog','todo','in_progress','blocked','review') and due_date < current_date", {"tenant_id": tenant_id, "stakeholder_id": stakeholder_id}),
        cari_account_linked=bool(stakeholder.get("related_cari_account_id")),
        installed_asset_count=related["counts"].get("installed_assets", 0),
        open_service_request_count=related["counts"].get("open_service_requests", 0),
        related_partner_count=related["roles"].get("partner_count", 0),
        related_representative_count=related["roles"].get("representative_count", 0),
        related_employee_count=related["roles"].get("employee_count", 0),
    )


async def require_stakeholder(session: AsyncSession, context: dict[str, Any], stakeholder_id: str) -> dict[str, Any]:
    stakeholder = await get_stakeholder(session, context, stakeholder_id)
    if not stakeholder:
        raise DomainError("Paydas kaydi bulunamadi.", "STAKEHOLDER_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    assert_company_scope(context, str(stakeholder["company_id"]))
    return stakeholder


async def resolve_master_for_create(session: AsyncSession, context: dict[str, Any], request: StakeholderCreateRequest) -> dict[str, Any]:
    if request.master_entity_id:
        master = await get_master_entity(session, context, request.master_entity_type, request.master_entity_id)
        if not master:
            raise DomainError("Master kisi/kurum kaydi bulunamadi.", "MASTER_ENTITY_NOT_FOUND", status.HTTP_404_NOT_FOUND)
        return master
    if request.master_entity_type == "person" and request.master_person:
        existing = await find_master_person_duplicate(session, context, request.master_person)
        return existing or await create_master_person(session, context, request.master_person)
    if request.master_entity_type == "organization" and request.master_organization:
        existing = await find_master_organization_duplicate(session, context, request.master_organization)
        return existing or await create_master_organization(session, context, request.master_organization)
    raise DomainError("Master kayit secilmeli veya yeni master kayit bilgisi girilmelidir.", "MASTER_ENTITY_REQUIRED", status.HTTP_422_UNPROCESSABLE_ENTITY)


async def assert_unique_stakeholder_role(session: AsyncSession, context: dict[str, Any], company_id: str, master_entity_type: str, master_entity_id: str, stakeholder_type: str, *, exclude_id: str | None = None) -> None:
    params = {"tenant_id": context["tenant_id"], "company_id": company_id, "master_entity_type": master_entity_type, "master_entity_id": master_entity_id, "stakeholder_type": stakeholder_type, "exclude_id": exclude_id}
    result = await session.execute(
        text(
            """
            select id
            from public.crm_stakeholders
            where tenant_id = :tenant_id
              and company_id = :company_id
              and master_entity_type = :master_entity_type
              and master_entity_id = :master_entity_id
              and stakeholder_type = :stakeholder_type
              and relationship_status in ('draft','active')
              and coalesce(is_deleted, false) = false
              and (:exclude_id is null or id <> cast(:exclude_id as uuid))
            limit 1
            """
        ),
        params,
    )
    if result.mappings().one_or_none():
        raise DomainError("Bu kisi/kurum bu sirket altinda ayni paydas roluyla zaten kayitli.", "STAKEHOLDER_ROLE_DUPLICATE", status.HTTP_409_CONFLICT)


async def get_master_entity_raw(session: AsyncSession, context: dict[str, Any], entity_type: str, entity_id: str) -> dict[str, Any]:
    table = "master_persons" if entity_type == "person" else "master_organizations"
    result = await session.execute(
        text(f"select * from public.{table} where tenant_id = :tenant_id and id = :entity_id and coalesce(is_deleted, false) = false limit 1"),
        {"tenant_id": context["tenant_id"], "entity_id": entity_id},
    )
    row = result.mappings().one_or_none()
    if not row:
        raise DomainError("Master kisi/kurum kaydi bulunamadi.", "MASTER_ENTITY_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    return row_to_dict(row)


async def count_if_table(session: AsyncSession, table: str, where_sql: str, params: dict[str, Any]) -> int:
    if not await table_exists(session, table):
        return 0
    result = await session.execute(text(f"select count(*) from {table} where {where_sql}"), params)
    return int(result.scalar_one() or 0)


def mask_stakeholder_row(row: dict[str, Any]) -> dict[str, Any]:
    identity = row.get("identity_number")
    if identity:
        text_value = str(identity)
        row["masked_identity_number"] = f"{text_value[:2]}{'*' * max(2, len(text_value) - 4)}{text_value[-2:]}"
        row["identity_number"] = None
    return row
