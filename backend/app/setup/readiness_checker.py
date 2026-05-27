from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.setup.infrastructure_errors import SETUP_REQUIRED_MESSAGE
from app.setup.readiness_registry import (
    get_readiness_definition,
    list_readiness_definitions,
)
from app.setup.schemas import (
    ModuleReadinessDefinition,
    ModuleReadinessResult,
    TenantReadinessResult,
)

READY_MESSAGE = "Modul kullanima hazir."


async def check_table_exists(session: AsyncSession, table_name: str) -> bool:
    return await _regclass_exists(session, table_name)


async def check_view_exists(session: AsyncSession, view_name: str) -> bool:
    return await _regclass_exists(session, view_name)


async def check_rpc_exists(session: AsyncSession, rpc_name: str) -> bool:
    result = await session.execute(
        text(
            """
            select exists(
              select 1
              from pg_proc p
              join pg_namespace n on n.oid = p.pronamespace
              where p.proname = :rpc_name
                and n.nspname = 'public'
            ) as exists
            """
        ),
        {"rpc_name": rpc_name},
    )
    return bool(result.scalar_one())


async def check_module_readiness(
    session: AsyncSession,
    tenant_id: str,
    module_key: str,
) -> ModuleReadinessResult:
    _ = tenant_id
    definition = get_readiness_definition(module_key)
    if definition is None:
        return ModuleReadinessResult(
            module_key=module_key,
            ok=False,
            status="unknown_module",
            message="Bu modul tanimli degil.",
            missing_dependencies=[module_key],
        )

    return await _check_definition(session, tenant_id, definition, include_dependencies=True)


async def check_tenant_readiness(
    session: AsyncSession,
    tenant_id: str,
) -> TenantReadinessResult:
    modules: dict[str, ModuleReadinessResult] = {}
    warnings: list[str] = []

    for definition in list_readiness_definitions():
        result = await _check_definition(
            session,
            tenant_id,
            definition,
            include_dependencies=False,
        )
        modules[definition.module_key] = result
        warnings.extend(result.warnings)

    blocking_modules = [key for key, result in modules.items() if not result.ok]
    return TenantReadinessResult(
        tenant_id=tenant_id,
        ok=not blocking_modules,
        status="ready" if not blocking_modules else "setup_required",
        modules=modules,
        blocking_modules=blocking_modules,
        warnings=warnings,
    )


async def _check_definition(
    session: AsyncSession,
    tenant_id: str,
    definition: ModuleReadinessDefinition,
    *,
    include_dependencies: bool,
) -> ModuleReadinessResult:
    _ = tenant_id
    missing_tables: list[str] = []
    missing_views: list[str] = []
    missing_rpcs: list[str] = []
    missing_dependencies: list[str] = []
    warnings: list[str] = []

    for table_name in definition.required_tables:
        if not await check_table_exists(session, table_name):
            missing_tables.append(table_name)

    for view_name in definition.required_views:
        if not await check_view_exists(session, view_name):
            missing_views.append(view_name)

    for rpc_name in definition.required_rpcs:
        if not await check_rpc_exists(session, rpc_name):
            missing_rpcs.append(rpc_name)

    for table_name in definition.optional_tables:
        if not await check_table_exists(session, table_name):
            warnings.append(f"{table_name} optional altyapisi eksik.")

    for view_name in definition.optional_views:
        if not await check_view_exists(session, view_name):
            warnings.append(f"{view_name} optional projection eksik.")

    for rpc_name in definition.optional_rpcs:
        if not await check_rpc_exists(session, rpc_name):
            warnings.append(f"{rpc_name} optional RPC eksik.")

    if include_dependencies:
        for dependency in definition.required_dependencies:
            dependency_result = await check_module_readiness(session, tenant_id, dependency)
            if not dependency_result.ok:
                missing_dependencies.append(dependency)

    ok = not (missing_tables or missing_views or missing_rpcs or missing_dependencies)
    return ModuleReadinessResult(
        module_key=definition.module_key,
        ok=ok,
        status="ready" if ok else "setup_required",
        message=READY_MESSAGE if ok else SETUP_REQUIRED_MESSAGE,
        missing_tables=missing_tables,
        missing_views=missing_views,
        missing_rpcs=missing_rpcs,
        missing_dependencies=missing_dependencies,
        warnings=warnings,
        setup_steps=definition.setup_steps,
        details={
            "required_tables": definition.required_tables,
            "required_views": definition.required_views,
            "required_rpcs": definition.required_rpcs,
        },
    )


async def _regclass_exists(session: AsyncSession, name: str) -> bool:
    result = await session.execute(
        text("select to_regclass(:qualified_name) is not null as exists"),
        {"qualified_name": f"public.{name}"},
    )
    return bool(result.scalar_one())
