# ruff: noqa: E501

from __future__ import annotations

from app.domains.operations.service import table_exists

from .schemas import BranchScopeRecord, CompanyScopeRecord, UserScopeResponse, UserScopesPatch
from .service import SecurityServiceContext, execute, fetch_all, require_table
from .users import get_user


async def get_user_scopes(ctx: SecurityServiceContext, user_id: str) -> UserScopeResponse:
    user = await get_user(ctx, user_id)
    company_rows = await _company_scope_rows(ctx, user.id)
    branch_rows = await _branch_scope_rows(ctx, user.id)
    company_scopes = [
        CompanyScopeRecord(
            id=str(row["id"]),
            company_id=str(row["company_id"]),
            company_name=str(row.get("company_name")) if row.get("company_name") else None,
            can_view=bool(row.get("can_view", True)),
            can_edit=bool(row.get("can_edit", False)),
            can_operate=bool(row.get("can_operate", False)),
        )
        for row in company_rows
    ]
    branch_scopes = [
        BranchScopeRecord(
            id=str(row["id"]),
            branch_id=str(row["branch_id"]),
            branch_name=str(row.get("branch_name")) if row.get("branch_name") else None,
            company_id=str(row.get("company_id")) if row.get("company_id") else None,
            can_view=bool(row.get("can_view", True)),
            can_edit=bool(row.get("can_edit", False)),
            can_operate=bool(row.get("can_operate", False)),
        )
        for row in branch_rows
    ]
    summary: list[str] = []
    if company_scopes:
        summary.append(f"{len(company_scopes)} sirket kapsami")
    if branch_scopes:
        summary.append(f"{len(branch_scopes)} sube kapsami")
    if not summary:
        summary.append("Kapsam tanimli degil; backend policy kullaniciyi sinirli kabul eder.")
    return UserScopeResponse(
        user_id=user.id,
        scope_modes=[],
        company_scopes=company_scopes,
        branch_scopes=branch_scopes,
        effective_summary=summary,
    )


async def patch_user_scopes(ctx: SecurityServiceContext, user_id: str, patch: UserScopesPatch) -> UserScopeResponse:
    await require_table(ctx, "security_user_company_scopes")
    await require_table(ctx, "security_user_branch_scopes")
    user = await get_user(ctx, user_id)
    await execute(
        ctx,
        "delete from security_user_company_scopes where tenant_id = :tenant_id and user_id = :user_id returning id",
        {"tenant_id": ctx.tenant_id, "user_id": user.id},
    )
    for scope in patch.company_scopes:
        await execute(
            ctx,
            """
            insert into security_user_company_scopes (tenant_id, user_id, company_id, can_view, can_edit, can_operate)
            values (:tenant_id, :user_id, :company_id, :can_view, :can_edit, :can_operate)
            returning id
            """,
            {
                "tenant_id": ctx.tenant_id,
                "user_id": user.id,
                "company_id": scope.company_id,
                "can_view": scope.can_view,
                "can_edit": scope.can_edit,
                "can_operate": scope.can_operate,
            },
        )
    await execute(
        ctx,
        "delete from security_user_branch_scopes where tenant_id = :tenant_id and user_id = :user_id returning id",
        {"tenant_id": ctx.tenant_id, "user_id": user.id},
    )
    for branch_scope in patch.branch_scopes:
        await execute(
            ctx,
            """
            insert into security_user_branch_scopes (tenant_id, user_id, branch_id, can_view, can_edit, can_operate)
            values (:tenant_id, :user_id, :branch_id, :can_view, :can_edit, :can_operate)
            returning id
            """,
            {
                "tenant_id": ctx.tenant_id,
                "user_id": user.id,
                "branch_id": branch_scope.branch_id,
                "can_view": branch_scope.can_view,
                "can_edit": branch_scope.can_edit,
                "can_operate": branch_scope.can_operate,
            },
        )
    return await get_user_scopes(ctx, user.id)


async def _company_scope_rows(ctx: SecurityServiceContext, user_id: str) -> list[dict[str, object]]:
    if not await table_exists(ctx.session, "security_user_company_scopes"):
        return []
    return await fetch_all(
        ctx,
        """
        select s.*, null::text as company_name
        from security_user_company_scopes s
        where s.tenant_id = :tenant_id and s.user_id::text = :user_id
        order by s.company_id
        """,
        {"tenant_id": ctx.tenant_id, "user_id": user_id},
    )


async def _branch_scope_rows(ctx: SecurityServiceContext, user_id: str) -> list[dict[str, object]]:
    if not await table_exists(ctx.session, "security_user_branch_scopes"):
        return []
    return await fetch_all(
        ctx,
        """
        select s.*, null::text as branch_name, null::uuid as company_id
        from security_user_branch_scopes s
        where s.tenant_id = :tenant_id and s.user_id::text = :user_id
        order by s.branch_id
        """,
        {"tenant_id": ctx.tenant_id, "user_id": user_id},
    )
