from __future__ import annotations

from typing import Any

from fastapi import Request, status
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError, ProgrammingError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.errors import DomainError
from app.policies.permissions import resolve_permission_with_fallback
from app.policies.schemas import AccessContext

DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000000"


def _split_header(value: str | None) -> list[str]:
    if not value:
        return []
    return [item.strip() for item in value.split(",") if item.strip()]


def _is_missing_infra_error(error: Exception) -> bool:
    message = str(error).lower()
    return any(
        marker in message
        for marker in (
            "does not exist",
            "undefinedtable",
            "undefinedcolumn",
            "relation",
            "column",
        )
    )


async def get_user_active_tenant(
    session: AsyncSession,
    user_id: str,
) -> tuple[str | None, str | None]:
    try:
        result = await session.execute(
            text(
                """
                select tenant_id, role_key
                from public.tenant_memberships
                where user_id = :user_id
                  and status = 'active'
                order by is_default desc, created_at asc
                limit 1
                """
            ),
            {"user_id": user_id},
        )
    except (ProgrammingError, DBAPIError) as exc:
        if _is_missing_infra_error(exc) and get_settings().is_development:
            return DEFAULT_TENANT_ID, None
        raise DomainError(
            "Calisma alani uyelik altyapisi hazir degil.",
            "TENANT_MEMBERSHIP_INFRA_MISSING",
            status.HTTP_409_CONFLICT,
        ) from exc
    row = result.mappings().one_or_none()
    if not row:
        return None, None
    return str(row["tenant_id"]), str(row["role_key"]) if row.get("role_key") else None


async def assert_user_belongs_to_tenant(
    session: AsyncSession,
    user_id: str,
    tenant_id: str,
) -> str | None:
    try:
        result = await session.execute(
            text(
                """
                select role_key
                from public.tenant_memberships
                where user_id = :user_id
                  and tenant_id = :tenant_id
                  and status = 'active'
                limit 1
                """
            ),
            {"user_id": user_id, "tenant_id": tenant_id},
        )
    except (ProgrammingError, DBAPIError) as exc:
        if _is_missing_infra_error(exc) and get_settings().is_development:
            return None
        raise DomainError(
            "Calisma alani uyelik altyapisi hazir degil.",
            "TENANT_MEMBERSHIP_INFRA_MISSING",
            status.HTTP_409_CONFLICT,
        ) from exc
    row = result.mappings().one_or_none()
    if not row:
        raise DomainError(
            "Bu calisma alanina erisiminiz bulunmuyor.",
            "TENANT_ACCESS_DENIED",
            status.HTTP_403_FORBIDDEN,
        )
    return str(row["role_key"]) if row.get("role_key") else None


def get_tenant_from_header_if_allowed(request: Request, trusted_proxy: bool) -> str | None:
    if trusted_proxy:
        return request.headers.get("x-tenant-id")
    return None


async def resolve_tenant_id(
    request: Request,
    session: AsyncSession,
    *,
    user_id: str | None,
    requested_tenant_id: str | None = None,
    trusted_proxy: bool = False,
) -> str | None:
    settings = get_settings()
    requested = requested_tenant_id or request.query_params.get("tenant_id")
    trusted_header_tenant = get_tenant_from_header_if_allowed(request, trusted_proxy)
    candidate = requested or trusted_header_tenant

    if user_id:
        if candidate:
            await assert_user_belongs_to_tenant(session, user_id, candidate)
            return candidate
        tenant_id, _role_key = await get_user_active_tenant(session, user_id)
        if tenant_id:
            return tenant_id
        raise DomainError(
            "Calisma alani bilgisi dogrulanamadi.",
            "TENANT_CONTEXT_MISSING",
            status.HTTP_400_BAD_REQUEST,
        )

    if trusted_proxy and candidate:
        return candidate
    if not settings.effective_auth_required and settings.is_development:
        return candidate or DEFAULT_TENANT_ID
    return None


async def load_user_roles(session: AsyncSession, tenant_id: str, user_id: str) -> list[str]:
    try:
        result = await session.execute(
            text(
                """
                select distinct r.role_key
                from public.user_roles ur
                join public.roles r on r.id = ur.role_id
                where ur.user_id = :user_id
                  and ur.status = 'active'
                  and r.status = 'active'
                  and (
                    ur.instance_id = :tenant_id
                    or ur.instance_id = :default_tenant
                    or ur.instance_id is null
                  )
                """
            ),
            {"user_id": user_id, "tenant_id": tenant_id, "default_tenant": DEFAULT_TENANT_ID},
        )
    except (ProgrammingError, DBAPIError) as exc:
        if _is_missing_infra_error(exc) and get_settings().is_development:
            return []
        raise DomainError(
            "Kullanici rol altyapisi hazir degil.",
            "PERMISSION_INFRA_MISSING",
            status.HTTP_409_CONFLICT,
        ) from exc
    return [str(row["role_key"]) for row in result.mappings().all() if row.get("role_key")]


async def load_user_permissions(session: AsyncSession, tenant_id: str, user_id: str) -> list[str]:
    try:
        result = await session.execute(
            text(
                """
                select distinct p.permission_key
                from public.user_roles ur
                join public.role_permissions rp on rp.role_id = ur.role_id
                join public.permissions p on p.id = rp.permission_id
                where ur.user_id = :user_id
                  and ur.status = 'active'
                  and (
                    ur.instance_id = :tenant_id
                    or ur.instance_id = :default_tenant
                    or ur.instance_id is null
                  )
                """
            ),
            {"user_id": user_id, "tenant_id": tenant_id, "default_tenant": DEFAULT_TENANT_ID},
        )
    except (ProgrammingError, DBAPIError) as exc:
        if _is_missing_infra_error(exc) and get_settings().is_development:
            return []
        raise DomainError(
            "Yetki altyapisi hazir degil.",
            "PERMISSION_INFRA_MISSING",
            status.HTTP_409_CONFLICT,
        ) from exc
    return [
        str(row["permission_key"]) for row in result.mappings().all() if row.get("permission_key")
    ]


def merge_permission_fallbacks(permissions: list[str]) -> list[str]:
    merged: list[str] = []
    seen: set[str] = set()
    for permission in permissions:
        for resolved in resolve_permission_with_fallback(permission):
            if resolved not in seen:
                seen.add(resolved)
                merged.append(resolved)
    return merged


async def load_effective_permissions(
    session: AsyncSession,
    tenant_id: str,
    user_id: str,
) -> list[str]:
    permissions = await load_user_permissions(session, tenant_id, user_id)
    role_keys = await load_user_roles(session, tenant_id, user_id)
    if "admin" in role_keys or "system_admin" in role_keys:
        permissions.append("system.admin")
    settings = get_settings()
    if not permissions and not settings.effective_auth_required and settings.is_development:
        permissions.append("system.admin")
    return merge_permission_fallbacks(permissions)


async def load_company_scope(
    session: AsyncSession,
    tenant_id: str,
    _user_id: str,
) -> tuple[list[str], list[str]]:
    try:
        result = await session.execute(
            text(
                """
                select company_id, scope_type
                from public.tenant_company_scopes
                where tenant_id = :tenant_id
                  and status = 'active'
                """
            ),
            {"tenant_id": tenant_id},
        )
    except (ProgrammingError, DBAPIError) as exc:
        if _is_missing_infra_error(exc) and get_settings().is_development:
            return [], []
        raise DomainError(
            "Sirket erisim kapsami altyapisi hazir degil.",
            "COMPANY_SCOPE_INFRA_MISSING",
            status.HTTP_409_CONFLICT,
        ) from exc

    company_ids: list[str] = []
    writable_ids: list[str] = []
    for row in result.mappings().all():
        company_id = str(row["company_id"])
        company_ids.append(company_id)
        if str(row.get("scope_type") or "") != "readonly":
            writable_ids.append(company_id)
    return company_ids, writable_ids


async def load_branch_scope(
    _session: AsyncSession,
    _tenant_id: str,
    _user_id: str,
) -> list[str]:
    return []


def has_permission(context: AccessContext, permission_key: str) -> bool:
    permissions = set(context.permissions)
    if "*" in permissions or "system.admin" in permissions:
        return True
    return bool(permissions.intersection(resolve_permission_with_fallback(permission_key)))


def has_any_permission(context: AccessContext, permission_keys: list[str]) -> bool:
    return any(has_permission(context, permission_key) for permission_key in permission_keys)


def build_access_context_from_headers(request: Request) -> AccessContext:
    company_scope = _split_header(request.headers.get("x-company-scope"))
    branch_scope = _split_header(request.headers.get("x-branch-scope"))
    return AccessContext(
        tenant_id=request.headers.get("x-tenant-id") or "",
        user_id=request.headers.get("x-user-id"),
        permissions=_split_header(request.headers.get("x-user-permissions")),
        company_id=request.headers.get("x-company-id"),
        branch_id=request.headers.get("x-branch-id"),
        company_scope=company_scope or None,
        branch_scope=branch_scope or None,
    )


async def enrich_company_scope(
    session: AsyncSession,
    context: AccessContext,
    company_id: str,
) -> AccessContext:
    _ = session
    return context.model_copy(update={"company_id": company_id})


async def enrich_branch_scope(
    session: AsyncSession,
    context: AccessContext,
    branch_id: str,
) -> AccessContext:
    _ = session
    return context.model_copy(update={"branch_id": branch_id})


async def build_access_context(
    request: Request,
    session: AsyncSession,
    input_data: dict[str, Any] | None = None,
) -> AccessContext:
    from app.core.security import _build_request_context

    request_context = await _build_request_context(request, session)
    input_data = input_data or {}
    return AccessContext(
        tenant_id=request_context.tenant_id or "",
        user_id=request_context.user_id,
        permissions=request_context.permissions,
        company_id=input_data.get("company_id") or request.headers.get("x-company-id"),
        branch_id=input_data.get("branch_id") or request.headers.get("x-branch-id"),
        organization_unit_id=input_data.get("organization_unit_id"),
        facility_id=input_data.get("facility_id"),
        module_key=input_data.get("module_key"),
        action_key=input_data.get("action_key"),
        record_type=input_data.get("record_type"),
        record_id=input_data.get("record_id"),
        record_status=input_data.get("record_status"),
        company_scope=request_context.company_scope_ids,
        branch_scope=request_context.branch_scope_ids,
    )


def context_from_operation(
    context: dict[str, Any],
    *,
    module_key: str | None = None,
    action_key: str | None = None,
    permissions: list[str] | None = None,
) -> AccessContext:
    effective_permissions = permissions
    if effective_permissions is None:
        raw_permissions = context.get("permissions")
        if isinstance(raw_permissions, list):
            effective_permissions = [str(item) for item in raw_permissions]
        elif isinstance(raw_permissions, str):
            effective_permissions = _split_header(raw_permissions)
        else:
            effective_permissions = ["system.admin"]
    return AccessContext(
        tenant_id=str(context.get("tenant_id") or ""),
        user_id=context.get("user_id"),
        permissions=effective_permissions,
        company_id=context.get("company_id"),
        branch_id=context.get("branch_id"),
        organization_unit_id=context.get("organization_unit_id"),
        facility_id=context.get("facility_id"),
        module_key=module_key or context.get("module_key"),
        action_key=action_key or context.get("action_key"),
        company_scope=context.get("company_scope"),
        branch_scope=context.get("branch_scope"),
    )
