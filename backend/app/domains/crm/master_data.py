# ruff: noqa: E501

from __future__ import annotations

from typing import Any

from fastapi import status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.domains.crm.schemas import (
    MasterOrganizationCreateRequest,
    MasterOrganizationSearchQuery,
    MasterPersonCreateRequest,
    MasterPersonSearchQuery,
)
from app.domains.crm.service import (
    ensure_crm_tables,
    json_dumps,
    list_meta,
    mask_identity,
    row_to_dict,
)


async def search_master_persons(session: AsyncSession, context: dict[str, Any], query: MasterPersonSearchQuery) -> dict[str, Any]:
    await ensure_crm_tables(session, master=True)
    where = ["tenant_id = :tenant_id", "coalesce(is_deleted, false) = false"]
    params: dict[str, Any] = {"tenant_id": context["tenant_id"], "limit": query.page_size, "offset": (query.page - 1) * query.page_size}
    if query.identity_number:
        where.append("nationality = coalesce(:nationality, nationality)")
        where.append("identity_number = :identity_number")
        params.update({"nationality": query.nationality, "identity_number": query.identity_number})
    elif query.passport_no:
        where.append("nationality = coalesce(:nationality, nationality)")
        where.append("passport_no = :passport_no")
        params.update({"nationality": query.nationality, "passport_no": query.passport_no})
    elif query.full_name:
        where.append("full_name ilike :full_name")
        params["full_name"] = f"%{query.full_name}%"
    if query.phone:
        where.append("coalesce(phone, '') ilike :phone")
        params["phone"] = f"%{query.phone}%"
    if query.email:
        where.append("coalesce(email, '') ilike :email")
        params["email"] = f"%{query.email}%"
    if query.search:
        where.append("(full_name ilike :search or coalesce(phone, '') ilike :search or coalesce(email, '') ilike :search or coalesce(identity_number, '') ilike :search or coalesce(passport_no, '') ilike :search)")
        params["search"] = f"%{query.search}%"
    where_sql = " and ".join(where)
    count = await session.execute(text(f"select count(*) from public.master_persons where {where_sql}"), params)
    result = await session.execute(
        text(f"select *, count(*) over() as total_count from public.master_persons where {where_sql} order by updated_at desc, id desc limit :limit offset :offset"),
        params,
    )
    rows = [mask_person(row_to_dict(row)) for row in result.mappings()]
    return {"data": rows, "meta": list_meta(query.page, query.page_size, int(count.scalar_one() or 0))}


async def search_master_organizations(session: AsyncSession, context: dict[str, Any], query: MasterOrganizationSearchQuery) -> dict[str, Any]:
    await ensure_crm_tables(session, master=True)
    where = ["tenant_id = :tenant_id", "coalesce(is_deleted, false) = false"]
    params: dict[str, Any] = {"tenant_id": context["tenant_id"], "limit": query.page_size, "offset": (query.page - 1) * query.page_size}
    if query.tax_number:
        where.append("country = coalesce(:country, country)")
        where.append("tax_number = :tax_number")
        params.update({"country": query.country, "tax_number": query.tax_number})
    elif query.registry_number:
        where.append("country = coalesce(:country, country)")
        where.append("registry_number = :registry_number")
        params.update({"country": query.country, "registry_number": query.registry_number})
    elif query.trade_name:
        where.append("trade_name ilike :trade_name")
        params["trade_name"] = f"%{query.trade_name}%"
    if query.city:
        where.append("city = :city")
        params["city"] = query.city
    if query.search:
        where.append("(trade_name ilike :search or coalesce(short_name, '') ilike :search or coalesce(tax_number, '') ilike :search or coalesce(phone, '') ilike :search or coalesce(email, '') ilike :search)")
        params["search"] = f"%{query.search}%"
    where_sql = " and ".join(where)
    count = await session.execute(text(f"select count(*) from public.master_organizations where {where_sql}"), params)
    result = await session.execute(
        text(f"select * from public.master_organizations where {where_sql} order by updated_at desc, id desc limit :limit offset :offset"),
        params,
    )
    return {"data": [row_to_dict(row) for row in result.mappings()], "meta": list_meta(query.page, query.page_size, int(count.scalar_one() or 0))}


async def create_master_person(session: AsyncSession, context: dict[str, Any], request: MasterPersonCreateRequest) -> dict[str, Any]:
    await ensure_crm_tables(session, master=True)
    existing = await find_master_person_duplicate(session, context, request)
    if existing:
        raise DomainError("Bu kisi sistemde zaten kayitli olabilir. Mevcut kaydi kullanmak ister misiniz?", "MASTER_PERSON_DUPLICATE", status.HTTP_409_CONFLICT, {"existing": mask_person(existing)})
    result = await session.execute(
        text(
            """
            insert into public.master_persons (
              tenant_id, nationality, identity_number, passport_no, first_name, last_name, full_name,
              birth_date, gender, phone, email, address, city, district, country, notes, metadata_json
            )
            values (
              :tenant_id, :nationality, :identity_number, :passport_no, :first_name, :last_name, :full_name,
              :birth_date, :gender, :phone, :email, :address, :city, :district, :country, :notes, cast(:metadata_json as jsonb)
            )
            returning *
            """
        ),
        {"tenant_id": context["tenant_id"], **request.model_dump(), "metadata_json": json_dumps(request.metadata_json)},
    )
    return mask_person(row_to_dict(result.mappings().one()))


async def create_master_organization(session: AsyncSession, context: dict[str, Any], request: MasterOrganizationCreateRequest) -> dict[str, Any]:
    await ensure_crm_tables(session, master=True)
    existing = await find_master_organization_duplicate(session, context, request)
    if existing:
        raise DomainError("Bu kurum sistemde zaten kayitli olabilir. Mevcut kaydi kullanmak ister misiniz?", "MASTER_ORGANIZATION_DUPLICATE", status.HTTP_409_CONFLICT, {"existing": existing})
    result = await session.execute(
        text(
            """
            insert into public.master_organizations (
              tenant_id, country, tax_number, trade_name, short_name, tax_office, mersis_number,
              registry_number, phone, email, website, address, city, district, notes, metadata_json
            )
            values (
              :tenant_id, :country, :tax_number, :trade_name, :short_name, :tax_office, :mersis_number,
              :registry_number, :phone, :email, :website, :address, :city, :district, :notes, cast(:metadata_json as jsonb)
            )
            returning *
            """
        ),
        {"tenant_id": context["tenant_id"], **request.model_dump(), "metadata_json": json_dumps(request.metadata_json)},
    )
    return row_to_dict(result.mappings().one())


async def get_master_entity(session: AsyncSession, context: dict[str, Any], entity_type: str, entity_id: str) -> dict[str, Any] | None:
    await ensure_crm_tables(session, master=True)
    table = "master_persons" if entity_type == "person" else "master_organizations"
    result = await session.execute(
        text(f"select * from public.{table} where tenant_id = :tenant_id and id = :entity_id and coalesce(is_deleted, false) = false limit 1"),
        {"tenant_id": context["tenant_id"], "entity_id": entity_id},
    )
    row = result.mappings().one_or_none()
    if not row:
        return None
    data = row_to_dict(row)
    return mask_person(data) if entity_type == "person" else data


async def find_master_person_duplicate(session: AsyncSession, context: dict[str, Any], request: MasterPersonCreateRequest) -> dict[str, Any] | None:
    if request.identity_number:
        result = await session.execute(
            text("select * from public.master_persons where tenant_id = :tenant_id and nationality = :nationality and identity_number = :identity_number and coalesce(is_deleted, false) = false limit 1"),
            {"tenant_id": context["tenant_id"], "nationality": request.nationality, "identity_number": request.identity_number},
        )
    elif request.passport_no:
        result = await session.execute(
            text("select * from public.master_persons where tenant_id = :tenant_id and nationality = :nationality and passport_no = :passport_no and coalesce(is_deleted, false) = false limit 1"),
            {"tenant_id": context["tenant_id"], "nationality": request.nationality, "passport_no": request.passport_no},
        )
    else:
        result = await session.execute(
            text("select * from public.master_persons where tenant_id = :tenant_id and full_name ilike :full_name and (phone = :phone or email = :email) and coalesce(is_deleted, false) = false limit 1"),
            {"tenant_id": context["tenant_id"], "full_name": request.full_name or "", "phone": request.phone, "email": request.email},
        )
    row = result.mappings().one_or_none()
    return row_to_dict(row) if row else None


async def find_master_organization_duplicate(session: AsyncSession, context: dict[str, Any], request: MasterOrganizationCreateRequest) -> dict[str, Any] | None:
    if request.tax_number:
        result = await session.execute(
            text("select * from public.master_organizations where tenant_id = :tenant_id and country = :country and tax_number = :tax_number and coalesce(is_deleted, false) = false limit 1"),
            {"tenant_id": context["tenant_id"], "country": request.country, "tax_number": request.tax_number},
        )
    elif request.registry_number:
        result = await session.execute(
            text("select * from public.master_organizations where tenant_id = :tenant_id and country = :country and registry_number = :registry_number and coalesce(is_deleted, false) = false limit 1"),
            {"tenant_id": context["tenant_id"], "country": request.country, "registry_number": request.registry_number},
        )
    else:
        result = await session.execute(
            text("select * from public.master_organizations where tenant_id = :tenant_id and trade_name ilike :trade_name and coalesce(city, '') = coalesce(:city, '') and coalesce(is_deleted, false) = false limit 1"),
            {"tenant_id": context["tenant_id"], "trade_name": request.trade_name, "city": request.city},
        )
    row = result.mappings().one_or_none()
    return row_to_dict(row) if row else None


def mask_person(row: dict[str, Any]) -> dict[str, Any]:
    row["masked_identity_number"] = mask_identity(row.get("identity_number"))
    if row.get("identity_number"):
        row["identity_number"] = None
    return row
