from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.integrity.checker import run_integrity_for_operation
from app.policies.access_context import context_from_operation
from app.policies.policy_engine import evaluate_policy
from app.policies.schemas import PolicyInput
from app.setup.readiness_checker import check_module_readiness


async def guard_operation(
    session: AsyncSession,
    operation_context: dict[str, Any],
    *,
    operation_key: str,
    module_key: str,
    required_permissions: list[str],
    readiness_modules: list[str],
    integrity_operation_key: str,
    resource: dict[str, Any] | None = None,
) -> list[str]:
    access_context = context_from_operation(
        operation_context,
        module_key=module_key,
        action_key=operation_key,
        permissions=operation_context.get("permissions")
        if isinstance(operation_context.get("permissions"), list)
        else None,
    )
    warnings: list[str] = []

    for readiness_module in readiness_modules:
        readiness = await check_module_readiness(
            session,
            access_context.tenant_id,
            readiness_module,
        )
        if not readiness.ok:
            raise DomainError(
                message=readiness.message,
                code="MODULE_SETUP_REQUIRED",
                status_code=409,
                details=readiness.model_dump(),
            )
        warnings.extend(readiness.warnings)

    decision = evaluate_policy(
        PolicyInput(
            context=access_context,
            action_key=operation_key,
            module_key=module_key,
            resource=resource or {},
            required_permissions=required_permissions,
        )
    )
    if not decision.allowed:
        raise DomainError(
            message=decision.message,
            code=decision.code,
            status_code=403 if decision.code == "PERMISSION_DENIED" else 409,
            details=decision.model_dump(),
        )

    integrity = await run_integrity_for_operation(
        session,
        access_context,
        integrity_operation_key,
        resource or {},
    )
    if not integrity.ok:
        raise DomainError(
            message=integrity.blocking_reasons[0]
            if integrity.blocking_reasons
            else "Veri tutarliligi nedeniyle islem baslatilamadi.",
            code="INTEGRITY_BLOCKING",
            status_code=409,
            details=integrity.model_dump(),
        )
    warnings.extend(integrity.warnings)
    return warnings
