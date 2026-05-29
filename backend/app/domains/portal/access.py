# ruff: noqa: E501,I001

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Annotated, Any

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_session
from app.core.security import get_current_user
from app.domains.operations.service import table_exists
from app.domains.portal.service import PORTAL_EXTERNAL_USERS_TABLE, PORTAL_MODULE_KEY, row_to_dict


@dataclass
class PortalAccessContext:
    tenant_id: str
    portal_user_id: str
    auth_user_id: str
    external_user_type: str
    stakeholder_id: str
    customer_account_id: str | None = None
    master_person_id: str | None = None
    master_organization_id: str | None = None
    portal_role: str = "customer_user"
    status: str = "active"
    access_scope: dict[str, Any] = field(default_factory=dict)
    preferences: dict[str, Any] = field(default_factory=dict)
    stakeholder: dict[str, Any] = field(default_factory=dict)


SessionDep = Annotated[AsyncSession, Depends(get_session)]


async def get_portal_access_context(request: Request, session: SessionDep) -> PortalAccessContext:
    tenant_id = request.headers.get("x-tenant-id")
    if not tenant_id:
        raise _portal_error("PORTAL_TENANT_REQUIRED", "Portal calisma alani dogrulanamadi.", status.HTTP_400_BAD_REQUEST)
    user = await get_current_user(request, session)
    auth_user_id = user.user_id if user else request.headers.get("x-user-id")
    if not auth_user_id and get_settings().is_development and not get_settings().effective_auth_required:
        auth_user_id = request.headers.get("x-portal-auth-user-id")
    if not auth_user_id:
        raise _portal_error("PORTAL_AUTH_REQUIRED", "Portal oturumu dogrulanamadi.", status.HTTP_401_UNAUTHORIZED)
    return await load_portal_context(session, tenant_id, auth_user_id)


async def load_portal_context(session: AsyncSession, tenant_id: str, auth_user_id: str) -> PortalAccessContext:
    if not await table_exists(session, PORTAL_EXTERNAL_USERS_TABLE):
        raise _portal_error("PORTAL_TABLES_MISSING", "Musteri portali altyapisi hazir degil.", status.HTTP_409_CONFLICT)
    result = await session.execute(
        text(
            """
            select peu.*,
                   s.display_name as stakeholder_name,
                   s.company_id as stakeholder_company_id,
                   s.related_cari_account_id as stakeholder_cari_account_id,
                   s.master_entity_type as stakeholder_master_entity_type,
                   s.master_entity_id as stakeholder_master_entity_id
            from public.portal_external_users peu
            left join public.crm_stakeholders s on s.tenant_id = peu.tenant_id and s.id = peu.stakeholder_id
            where peu.tenant_id = :tenant_id
              and peu.auth_user_id = :auth_user_id
            limit 1
            """
        ),
        {"tenant_id": tenant_id, "auth_user_id": auth_user_id},
    )
    row = row_to_dict(result.mappings().one_or_none())
    if not row:
        raise _portal_error("PORTAL_USER_NOT_FOUND", "Portal kullanicisi bulunamadi.", status.HTTP_403_FORBIDDEN)
    if row.get("status") != "active":
        raise _portal_error("PORTAL_USER_NOT_ACTIVE", "Portal kullanicisi aktif degil.", status.HTTP_403_FORBIDDEN)
    await session.execute(
        text("update public.portal_external_users set last_login_at = now(), updated_at = now() where tenant_id = :tenant_id and id = :id"),
        {"tenant_id": tenant_id, "id": row["id"]},
    )
    stakeholder = {
        "id": row.get("stakeholder_id"),
        "display_name": row.get("stakeholder_name"),
        "company_id": row.get("stakeholder_company_id"),
        "related_cari_account_id": row.get("stakeholder_cari_account_id"),
        "master_entity_type": row.get("stakeholder_master_entity_type"),
        "master_entity_id": row.get("stakeholder_master_entity_id"),
    }
    customer_account_id = str(row.get("customer_account_id") or row.get("stakeholder_cari_account_id") or row.get("stakeholder_id"))
    master_person_id = str(row["master_person_id"]) if row.get("master_person_id") else None
    master_organization_id = str(row["master_organization_id"]) if row.get("master_organization_id") else None
    if not master_person_id and row.get("stakeholder_master_entity_type") == "person":
        master_person_id = str(row.get("stakeholder_master_entity_id"))
    if not master_organization_id and row.get("stakeholder_master_entity_type") == "organization":
        master_organization_id = str(row.get("stakeholder_master_entity_id"))
    return PortalAccessContext(
        tenant_id=tenant_id,
        portal_user_id=str(row["id"]),
        auth_user_id=auth_user_id,
        external_user_type=str(row.get("external_user_type") or "customer"),
        stakeholder_id=str(row["stakeholder_id"]),
        customer_account_id=customer_account_id,
        master_person_id=master_person_id,
        master_organization_id=master_organization_id,
        portal_role=str(row.get("portal_role") or "customer_user"),
        status=str(row.get("status") or "active"),
        access_scope=dict(row.get("access_scope_json") or {}),
        preferences=dict(row.get("preferences_json") or {}),
        stakeholder=stakeholder,
    )


def can_create_service_request(ctx: PortalAccessContext) -> bool:
    configured = ctx.access_scope.get("can_create_service_request")
    if configured is not None:
        return bool(configured)
    return ctx.portal_role in {"customer_admin", "customer_user", "service_contact"}


def can_view_service_records(ctx: PortalAccessContext) -> bool:
    configured = ctx.access_scope.get("can_view_service_records")
    if configured is not None:
        return bool(configured)
    return True


def can_download_documents(ctx: PortalAccessContext) -> bool:
    configured = ctx.access_scope.get("can_download_documents")
    if configured is not None:
        return bool(configured)
    return True


def can_upload_documents(ctx: PortalAccessContext) -> bool:
    configured = ctx.access_scope.get("can_upload_documents")
    if configured is not None:
        return bool(configured)
    return ctx.portal_role in {"customer_admin", "customer_user", "service_contact"}


def allowed_asset_ids(ctx: PortalAccessContext) -> list[str]:
    values = ctx.access_scope.get("allowed_asset_ids") or []
    return [str(item) for item in values if item]


def allowed_service_request_ids(ctx: PortalAccessContext) -> list[str]:
    values = ctx.access_scope.get("allowed_service_request_ids") or []
    return [str(item) for item in values if item]


def customer_scope_values(ctx: PortalAccessContext) -> list[str]:
    values = {
        ctx.stakeholder_id,
        ctx.customer_account_id,
        ctx.master_person_id,
        ctx.master_organization_id,
        str(ctx.stakeholder.get("related_cari_account_id")) if ctx.stakeholder.get("related_cari_account_id") else None,
        str(ctx.stakeholder.get("master_entity_id")) if ctx.stakeholder.get("master_entity_id") else None,
    }
    return [item for item in values if item]


def ensure_scope_allowed(condition: bool, *, entity_type: str, entity_id: str | None = None) -> None:
    if condition:
        return
    raise _portal_error(
        "PORTAL_SCOPE_DENIED",
        "Bu kayit musteri portali erisim kapsaminizin disinda.",
        status.HTTP_403_FORBIDDEN,
        {"entity_type": entity_type, "entity_id": entity_id},
    )


def _portal_error(code: str, message: str, status_code: int, details: dict[str, Any] | None = None) -> HTTPException:
    return HTTPException(status_code=status_code, detail={"error": message, "code": code, "message": message, "details": details or {"module_key": PORTAL_MODULE_KEY}})
