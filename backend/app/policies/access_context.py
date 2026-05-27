from __future__ import annotations

from typing import Any

from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.policies.schemas import AccessContext


def _split_header(value: str | None) -> list[str]:
    if not value:
        return []
    return [item.strip() for item in value.split(",") if item.strip()]


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


async def get_effective_permissions(
    session: AsyncSession,
    user_id: str | None,
    tenant_id: str,
) -> list[str]:
    _ = session, user_id, tenant_id
    # MVP: permissions arrive from the trusted Next BFF header.
    # Production: load from Supabase JWT claims and DB-backed role assignments.
    return []


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
    base = build_access_context_from_headers(request)
    input_data = input_data or {}
    permissions = base.permissions or await get_effective_permissions(
        session,
        base.user_id,
        base.tenant_id,
    )
    return base.model_copy(
        update={
            "permissions": permissions,
            "company_id": input_data.get("company_id") or base.company_id,
            "branch_id": input_data.get("branch_id") or base.branch_id,
            "organization_unit_id": input_data.get("organization_unit_id"),
            "facility_id": input_data.get("facility_id"),
            "module_key": input_data.get("module_key"),
            "action_key": input_data.get("action_key"),
            "record_type": input_data.get("record_type"),
            "record_id": input_data.get("record_id"),
            "record_status": input_data.get("record_status"),
        }
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
            # Migration bridge: existing Next proxy has not loaded DB permissions yet.
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
