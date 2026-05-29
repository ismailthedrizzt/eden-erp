# ruff: noqa: E501,I001

from __future__ import annotations

import hashlib
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi import status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.domains.operations.service import table_exists
from app.domains.portal.schemas import PortalInvitationCreateRequest, PortalUserListQuery, PortalUserUpdateRequest
from app.domains.portal.service import PORTAL_EXTERNAL_USERS_TABLE, PORTAL_INVITATIONS_TABLE, json_dumps, list_meta, row_to_dict


async def create_portal_invitation(session: AsyncSession, context: dict[str, Any], request: PortalInvitationCreateRequest) -> dict[str, Any]:
    await ensure_admin_tables(session)
    stakeholder = await load_stakeholder(session, context["tenant_id"], request.stakeholder_id)
    token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    expires_at = request.expires_at or datetime.now(UTC) + timedelta(days=7)
    inserted = await session.execute(
        text(
            """
            insert into public.portal_invitations (
              tenant_id, stakeholder_id, email, portal_role, status, token_hash, expires_at, invited_by
            )
            values (
              :tenant_id, :stakeholder_id, :email, :portal_role, 'pending', :token_hash, :expires_at, :invited_by
            )
            returning *
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "stakeholder_id": request.stakeholder_id,
            "email": str(request.email),
            "portal_role": request.portal_role,
            "token_hash": token_hash,
            "expires_at": expires_at,
            "invited_by": context.get("user_id"),
        },
    )
    invitation = row_to_dict(inserted.mappings().one())
    if request.auth_user_id:
        await upsert_portal_external_user(session, context, request, stakeholder, status_value="invited")
    invitation["accept_token"] = token
    invitation["accept_url"] = f"/portal?invitation={token}"
    return invitation


async def list_portal_users(session: AsyncSession, context: dict[str, Any], query: PortalUserListQuery) -> dict[str, Any]:
    await ensure_admin_tables(session)
    filters = ["peu.tenant_id = :tenant_id"]
    params: dict[str, Any] = {"tenant_id": context["tenant_id"], "limit": query.page_size, "offset": (query.page - 1) * query.page_size}
    if query.stakeholder_id:
        filters.append("peu.stakeholder_id = :stakeholder_id")
        params["stakeholder_id"] = query.stakeholder_id
    if query.status:
        filters.append("peu.status = :status")
        params["status"] = query.status
    if query.search:
        filters.append("(s.display_name ilike :search or peu.auth_user_id::text ilike :search)")
        params["search"] = f"%{query.search}%"
    result = await session.execute(
        text(
            f"""
            select peu.*, s.display_name as stakeholder_name, count(*) over() as total_count
            from public.portal_external_users peu
            left join public.crm_stakeholders s on s.tenant_id = peu.tenant_id and s.id = peu.stakeholder_id
            where {" and ".join(filters)}
            order by peu.updated_at desc
            limit :limit offset :offset
            """
        ),
        params,
    )
    rows = [row_to_dict(row) for row in result.mappings()]
    total = int(rows[0].pop("total_count")) if rows else 0
    for row in rows[1:]:
        row.pop("total_count", None)
    return {"data": rows, "meta": list_meta(query.page, query.page_size, total)}


async def update_portal_user(session: AsyncSession, context: dict[str, Any], portal_user_id: str, request: PortalUserUpdateRequest) -> dict[str, Any]:
    await ensure_admin_tables(session)
    data = request.model_dump(exclude_unset=True)
    if not data:
        result = await session.execute(text("select * from public.portal_external_users where tenant_id = :tenant_id and id = :id"), {"tenant_id": context["tenant_id"], "id": portal_user_id})
        return row_to_dict(result.mappings().one())
    parts: list[str] = []
    params: dict[str, Any] = {"tenant_id": context["tenant_id"], "id": portal_user_id}
    for key, value in data.items():
        if key in {"access_scope_json", "preferences_json"}:
            parts.append(f"{key} = cast(:{key} as jsonb)")
            params[key] = json_dumps(value)
        else:
            parts.append(f"{key} = :{key}")
            params[key] = value
    parts.append("updated_at = now()")
    result = await session.execute(
        text(
            f"""
            update public.portal_external_users
            set {", ".join(parts)}
            where tenant_id = :tenant_id and id = :id
            returning *
            """
        ),
        params,
    )
    row = row_to_dict(result.mappings().one_or_none())
    if not row:
        raise DomainError("Portal kullanicisi bulunamadi.", "PORTAL_USER_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    return row


async def ensure_admin_tables(session: AsyncSession) -> None:
    missing = [table for table in [PORTAL_EXTERNAL_USERS_TABLE, PORTAL_INVITATIONS_TABLE, "public.crm_stakeholders"] if not await table_exists(session, table)]
    if missing:
        raise DomainError("Portal yonetim altyapisi hazir degil.", "PORTAL_TABLES_MISSING", status.HTTP_409_CONFLICT, {"missing": missing})


async def load_stakeholder(session: AsyncSession, tenant_id: str, stakeholder_id: str) -> dict[str, Any]:
    if not await table_exists(session, "public.crm_stakeholders"):
        raise DomainError("CRM paydas altyapisi hazir degil.", "CRM_STAKEHOLDERS_MISSING", status.HTTP_409_CONFLICT)
    result = await session.execute(
        text(
            """
            select *
            from public.crm_stakeholders
            where tenant_id = :tenant_id and id = :stakeholder_id and coalesce(is_deleted, false) = false
            limit 1
            """
        ),
        {"tenant_id": tenant_id, "stakeholder_id": stakeholder_id},
    )
    row = row_to_dict(result.mappings().one_or_none())
    if not row:
        raise DomainError("Paydas bulunamadi.", "STAKEHOLDER_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    return row


async def upsert_portal_external_user(session: AsyncSession, context: dict[str, Any], request: PortalInvitationCreateRequest, stakeholder: dict[str, Any], *, status_value: str) -> None:
    await session.execute(
        text(
            """
            insert into public.portal_external_users (
              tenant_id, auth_user_id, external_user_type, stakeholder_id, customer_account_id,
              master_person_id, master_organization_id, portal_role, status, invited_by,
              invited_at, access_scope_json
            )
            values (
              :tenant_id, :auth_user_id, 'customer', :stakeholder_id, :customer_account_id,
              :master_person_id, :master_organization_id, :portal_role, :status, :invited_by,
              now(), cast(:access_scope_json as jsonb)
            )
            on conflict (tenant_id, auth_user_id)
            do update set stakeholder_id = excluded.stakeholder_id,
                          customer_account_id = excluded.customer_account_id,
                          master_person_id = excluded.master_person_id,
                          master_organization_id = excluded.master_organization_id,
                          portal_role = excluded.portal_role,
                          status = excluded.status,
                          access_scope_json = excluded.access_scope_json,
                          updated_at = now()
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "auth_user_id": request.auth_user_id,
            "stakeholder_id": request.stakeholder_id,
            "customer_account_id": stakeholder.get("related_cari_account_id") or request.stakeholder_id,
            "master_person_id": stakeholder.get("master_entity_id") if stakeholder.get("master_entity_type") == "person" else None,
            "master_organization_id": stakeholder.get("master_entity_id") if stakeholder.get("master_entity_type") == "organization" else None,
            "portal_role": request.portal_role,
            "status": status_value,
            "invited_by": context.get("user_id"),
            "access_scope_json": json_dumps(request.access_scope_json),
        },
    )
