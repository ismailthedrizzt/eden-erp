# ruff: noqa: E501

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from fastapi import status
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError, ProgrammingError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.core.security import RequestContext
from app.domains.operations.service import table_exists

from .permissions import RISKY_PERMISSION_KEYS
from .schemas import AccessSummary, PermissionDenialRecord


@dataclass
class SecurityServiceContext:
    session: AsyncSession
    request_context: RequestContext
    tenant_id: str
    warnings: list[str] = field(default_factory=list)


def service_context(session: AsyncSession, request_context: RequestContext, tenant_id: str) -> SecurityServiceContext:
    return SecurityServiceContext(session=session, request_context=request_context, tenant_id=tenant_id)


async def ensure_table(ctx: SecurityServiceContext, table_name: str) -> bool:
    return await table_exists(ctx.session, table_name)


async def require_table(ctx: SecurityServiceContext, table_name: str) -> None:
    if not await ensure_table(ctx, table_name):
        raise DomainError(
            "Guvenlik/RBAC altyapisi henuz kurulmamis.",
            "SECURITY_INFRA_MISSING",
            status.HTTP_409_CONFLICT,
        )


def infra_error(exc: Exception) -> DomainError:
    return DomainError(
        "Guvenlik/RBAC verisi su anda islenemedi.",
        "SECURITY_INFRA_ERROR",
        status.HTTP_409_CONFLICT,
    )


async def fetch_all(ctx: SecurityServiceContext, sql: str, params: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    try:
        result = await ctx.session.execute(text(sql), params or {})
        return [dict(row) for row in result.mappings().all()]
    except (ProgrammingError, DBAPIError) as exc:
        await ctx.session.rollback()
        raise infra_error(exc) from exc


async def fetch_one(ctx: SecurityServiceContext, sql: str, params: dict[str, Any] | None = None) -> dict[str, Any] | None:
    try:
        result = await ctx.session.execute(text(sql), params or {})
        row = result.mappings().one_or_none()
        return dict(row) if row else None
    except (ProgrammingError, DBAPIError) as exc:
        await ctx.session.rollback()
        raise infra_error(exc) from exc


async def execute(ctx: SecurityServiceContext, sql: str, params: dict[str, Any] | None = None) -> dict[str, Any] | None:
    try:
        result = await ctx.session.execute(text(sql), params or {})
        row = result.mappings().one_or_none()
        await ctx.session.commit()
        return dict(row) if row else None
    except (ProgrammingError, DBAPIError) as exc:
        await ctx.session.rollback()
        raise infra_error(exc) from exc


def current_user_label(ctx: SecurityServiceContext) -> str:
    claims = ctx.request_context.auth_claims or {}
    return str(claims.get("email") or ctx.request_context.user_id or "Gelistirme yoneticisi")


async def get_access_summary(ctx: SecurityServiceContext) -> AccessSummary:
    summary = AccessSummary(risky_permissions=len(RISKY_PERMISSION_KEYS))
    if await table_exists(ctx.session, "security_users_profile"):
        row = await fetch_one(
            ctx,
            """
            select
              count(*) as users,
              count(*) filter (where status = 'active') as active_users
            from security_users_profile
            where tenant_id = :tenant_id and coalesce(is_deleted, false) = false
            """,
            {"tenant_id": ctx.tenant_id},
        )
        if row:
            summary.users = int(row.get("users") or 0)
            summary.active_users = int(row.get("active_users") or 0)
    else:
        summary.warnings.append("Kullanici profil tablosu hazir degil; Supabase Auth profilleri uygulama seviyesine senkronlanmali.")

    if await table_exists(ctx.session, "security_roles"):
        row = await fetch_one(
            ctx,
            """
            select
              count(*) as roles,
              count(*) filter (where system_role = true) as system_roles
            from security_roles
            where tenant_id = :tenant_id and status <> 'deleted'
            """,
            {"tenant_id": ctx.tenant_id},
        )
        if row:
            summary.roles = int(row.get("roles") or 0)
            summary.system_roles = int(row.get("system_roles") or 0)
    else:
        summary.warnings.append("Rol tablosu hazir degil; varsayilan rol matrisi gosteriliyor.")

    if await table_exists(ctx.session, "audit_logs"):
        row = await fetch_one(
            ctx,
            """
            select
              count(*) filter (where action_type ilike '%permission%' or action_type = 'permission_denied') as permission_denials,
              count(*) filter (where action_type ilike '%scope%' or action_type = 'scope_denied') as scope_denials
            from audit_logs
            where tenant_id = :tenant_id
              and created_at >= now() - interval '30 days'
            """,
            {"tenant_id": ctx.tenant_id},
        )
        if row:
            summary.permission_denials_30d = int(row.get("permission_denials") or 0)
            summary.scope_denials_30d = int(row.get("scope_denials") or 0)
    return summary


async def list_permission_denials(ctx: SecurityServiceContext) -> list[PermissionDenialRecord]:
    if not await table_exists(ctx.session, "audit_logs"):
        return []
    rows = await fetch_all(
        ctx,
        """
        select id, user_id as actor_user_id, action_type, entity_type as record_type, entity_id as record_id, coalesce(reason, summary, action_type) as reason, created_at
        from audit_logs
        where tenant_id = :tenant_id
          and (
            action_type ilike '%permission%'
            or action_type ilike '%scope%'
            or action_type in ('permission_denied', 'scope_denied')
          )
        order by created_at desc
        limit 100
        """,
        {"tenant_id": ctx.tenant_id},
    )
    return [
        PermissionDenialRecord(
            id=str(row["id"]),
            actor_user_id=str(row.get("actor_user_id")) if row.get("actor_user_id") else None,
            action_type=str(row.get("action_type") or "permission_denied"),
            record_type=str(row.get("record_type")) if row.get("record_type") else None,
            record_id=str(row.get("record_id")) if row.get("record_id") else None,
            reason=str(row.get("reason") or "Yetki veya kapsam reddi."),
            created_at=row.get("created_at"),
        )
        for row in rows
    ]
