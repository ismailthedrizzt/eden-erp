# ruff: noqa: E501

from __future__ import annotations

from typing import Any

from fastapi import status

from app.core.errors import DomainError
from app.domains.operations.service import table_exists

from .roles import DEFAULT_ROLES
from .schemas import UserPatch, UserProfile, UserRoleAssignment, UserRoleMutation
from .service import (
    SecurityServiceContext,
    current_user_label,
    execute,
    fetch_all,
    fetch_one,
    require_table,
)


def _user_from_row(row: dict[str, Any]) -> UserProfile:
    role_keys = row.get("role_keys") or []
    if not isinstance(role_keys, list):
        role_keys = []
    metadata_json = row.get("metadata_json")
    if not isinstance(metadata_json, dict):
        metadata_json = {}
    return UserProfile(
        id=str(row["id"]),
        tenant_id=str(row.get("tenant_id")) if row.get("tenant_id") else None,
        auth_user_id=str(row.get("auth_user_id")) if row.get("auth_user_id") else None,
        display_name=str(row.get("display_name") or row.get("email") or "Isimsiz kullanici"),
        email=str(row.get("email")) if row.get("email") else None,
        status=str(row.get("status") or "active"),
        last_login_at=row.get("last_login_at"),
        role_keys=[str(item) for item in role_keys],
        company_scope_summary=str(row.get("company_scope_summary") or "Kapsam tanimli degil"),
        branch_scope_summary=str(row.get("branch_scope_summary") or "Kapsam tanimli degil"),
        effective_permission_count=int(row.get("effective_permission_count") or 0),
        metadata_json=metadata_json,
        created_at=row.get("created_at"),
        updated_at=row.get("updated_at"),
    )


async def list_users(ctx: SecurityServiceContext) -> list[UserProfile]:
    if not await _profiles_available(ctx):
        role_keys = [role.role_key for role in DEFAULT_ROLES if role.role_key == "system_admin"]
        return [
            UserProfile(
                id=ctx.request_context.user_id or "dev-admin",
                tenant_id=ctx.tenant_id,
                auth_user_id=ctx.request_context.user_id,
                display_name=current_user_label(ctx),
                email=str(ctx.request_context.auth_claims.get("email")) if ctx.request_context.auth_claims.get("email") else None,
                status="active",
                role_keys=role_keys,
                company_scope_summary="Tum sirketler",
                branch_scope_summary="Tum subeler",
                effective_permission_count=len(ctx.request_context.permissions),
            )
        ]
    rows = await fetch_all(
        ctx,
        """
        select
          p.*,
          coalesce(array_remove(array_agg(distinct r.role_key), null), '{}') as role_keys,
          case when count(distinct cs.company_id) = 0 then 'Kapsam tanimli degil'
               else count(distinct cs.company_id)::text || ' sirket' end as company_scope_summary,
          case when count(distinct bs.branch_id) = 0 then 'Kapsam tanimli degil'
               else count(distinct bs.branch_id)::text || ' sube' end as branch_scope_summary,
          count(distinct rp.permission_key) as effective_permission_count
        from security_users_profile p
        left join security_user_roles ur on ur.user_id = p.id
        left join security_roles r on r.id = ur.role_id and r.status = 'active'
        left join security_role_permissions rp on rp.role_id = r.id and rp.granted = true
        left join security_user_company_scopes cs on cs.user_id = p.id
        left join security_user_branch_scopes bs on bs.user_id = p.id
        where p.tenant_id = :tenant_id and coalesce(p.is_deleted, false) = false
        group by p.id
        order by p.status asc, p.display_name asc
        """,
        {"tenant_id": ctx.tenant_id},
    )
    return [_user_from_row(row) for row in rows]


async def get_user(ctx: SecurityServiceContext, user_id: str) -> UserProfile:
    if not await _profiles_available(ctx):
        for user in await list_users(ctx):
            if user.id == user_id or user.auth_user_id == user_id:
                return user
        raise DomainError("Kullanici bulunamadi.", "SECURITY_USER_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    row = await fetch_one(
        ctx,
        """
        select
          p.*,
          coalesce(array_remove(array_agg(distinct r.role_key), null), '{}') as role_keys,
          'Kapsam tanimli' as company_scope_summary,
          'Kapsam tanimli' as branch_scope_summary,
          count(distinct rp.permission_key) as effective_permission_count
        from security_users_profile p
        left join security_user_roles ur on ur.user_id = p.id
        left join security_roles r on r.id = ur.role_id and r.status = 'active'
        left join security_role_permissions rp on rp.role_id = r.id and rp.granted = true
        where p.tenant_id = :tenant_id
          and coalesce(p.is_deleted, false) = false
          and (p.id::text = :user_id or p.auth_user_id::text = :user_id)
        group by p.id
        limit 1
        """,
        {"tenant_id": ctx.tenant_id, "user_id": user_id},
    )
    if not row:
        raise DomainError("Kullanici bulunamadi.", "SECURITY_USER_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    return _user_from_row(row)


async def patch_user(ctx: SecurityServiceContext, user_id: str, patch: UserPatch) -> UserProfile:
    await require_table(ctx, "security_users_profile")
    current = await get_user(ctx, user_id)
    payload = patch.model_dump(exclude_unset=True)
    if not payload:
        return current
    allowed = {key: value for key, value in payload.items() if key in {"display_name", "email", "status", "metadata_json"}}
    assignments = ", ".join([f"{key} = :{key}" for key in allowed])
    await execute(
        ctx,
        f"""
        update security_users_profile
           set {assignments}, updated_at = now()
         where tenant_id = :tenant_id and id::text = :user_id
        returning id
        """,
        {"tenant_id": ctx.tenant_id, "user_id": current.id, **allowed},
    )
    return await get_user(ctx, current.id)


async def get_user_roles(ctx: SecurityServiceContext, user_id: str) -> list[UserRoleAssignment]:
    if not await _profiles_available(ctx):
        return [
            UserRoleAssignment(
                id="default-system-admin-assignment",
                role_id="default-system-admin",
                role_key="system_admin",
                role_name="Sistem Yoneticisi",
                scope_mode="all_companies",
            )
        ]
    user = await get_user(ctx, user_id)
    rows = await fetch_all(
        ctx,
        """
        select ur.id, ur.role_id, r.role_key, r.role_name, ur.company_id, ur.branch_id, ur.scope_mode, ur.created_at
        from security_user_roles ur
        join security_roles r on r.id = ur.role_id
        where ur.tenant_id = :tenant_id and ur.user_id = :user_id
        order by r.role_name asc
        """,
        {"tenant_id": ctx.tenant_id, "user_id": user.id},
    )
    return [
        UserRoleAssignment(
            id=str(row["id"]),
            role_id=str(row["role_id"]),
            role_key=str(row["role_key"]),
            role_name=str(row["role_name"]),
            company_id=str(row.get("company_id")) if row.get("company_id") else None,
            branch_id=str(row.get("branch_id")) if row.get("branch_id") else None,
            scope_mode=row.get("scope_mode"),
            created_at=row.get("created_at"),
        )
        for row in rows
    ]


async def assign_user_role(ctx: SecurityServiceContext, user_id: str, request: UserRoleMutation) -> UserRoleAssignment:
    await require_table(ctx, "security_user_roles")
    user = await get_user(ctx, user_id)
    row = await execute(
        ctx,
        """
        insert into security_user_roles (tenant_id, user_id, role_id, company_id, branch_id, scope_mode)
        values (:tenant_id, :user_id, :role_id, :company_id, :branch_id, :scope_mode)
        returning id
        """,
        {
            "tenant_id": ctx.tenant_id,
            "user_id": user.id,
            "role_id": request.role_id,
            "company_id": request.company_id,
            "branch_id": request.branch_id,
            "scope_mode": request.scope_mode,
        },
    )
    if not row:
        raise DomainError("Rol atanamadi.", "SECURITY_ROLE_ASSIGN_FAILED", status.HTTP_409_CONFLICT)
    assignments = await get_user_roles(ctx, user.id)
    return next(item for item in assignments if item.id == str(row["id"]))


async def remove_user_role(ctx: SecurityServiceContext, user_id: str, role_id: str) -> None:
    await require_table(ctx, "security_user_roles")
    user = await get_user(ctx, user_id)
    await execute(
        ctx,
        """
        delete from security_user_roles
         where tenant_id = :tenant_id
           and user_id = :user_id
           and (role_id::text = :role_id or id::text = :role_id)
        returning id
        """,
        {"tenant_id": ctx.tenant_id, "user_id": user.id, "role_id": role_id},
    )


async def _profiles_available(ctx: SecurityServiceContext) -> bool:
    return await require_optional(ctx, "security_users_profile") and await require_optional(ctx, "security_roles")


async def require_optional(ctx: SecurityServiceContext, table_name: str) -> bool:
    return await table_exists(ctx.session, table_name)
