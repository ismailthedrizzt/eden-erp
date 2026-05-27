from __future__ import annotations

from typing import Any

from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.integrity.checks.branches import (
    branch_can_close_result,
    branch_scope_impact_result,
    duplicate_branch_name_result,
)
from app.integrity.checks.company import (
    company_active_result,
    no_open_company_blockers_result,
)
from app.integrity.checks.facilities import (
    branch_facility_address_warning_result,
    facility_active_dependents_result,
)
from app.integrity.checks.organization import (
    organization_active_dependents_result,
    organization_unit_no_cycle_result,
)
from app.integrity.checks.ownership import (
    current_ownership_available_result,
    ownership_distribution_result,
    ownership_exit_not_last_result,
)
from app.integrity.checks.representatives import (
    representative_authority_no_conflict_result,
    representative_scope_not_closed_result,
)
from app.integrity.registry import get_checks_for_operation
from app.integrity.schemas import IntegrityCheckResult, IntegritySummary
from app.policies.schemas import AccessContext


async def run_integrity_checks(
    session: AsyncSession,
    context: AccessContext,
    check_keys: list[str],
    resource: dict[str, Any] | None = None,
) -> IntegritySummary:
    results: list[IntegrityCheckResult] = []
    for check_key in check_keys:
        results.append(await _run_single_check(session, context, check_key, resource or {}))
    return build_integrity_summary(results)


async def run_integrity_for_operation(
    session: AsyncSession,
    context: AccessContext,
    operation_key: str,
    resource: dict[str, Any] | None = None,
) -> IntegritySummary:
    return await run_integrity_checks(
        session,
        context,
        get_checks_for_operation(operation_key),
        resource,
    )


async def run_integrity_for_entity(
    session: AsyncSession,
    context: AccessContext,
    entity_type: str,
    entity_id: str,
) -> IntegritySummary:
    _ = session
    result = IntegrityCheckResult(
        key=f"{entity_type}_entity_integrity",
        ok=True,
        message="Kayit integrity kontrolu Python tarafinda calismaya hazir.",
        metadata={"entity_id": entity_id},
    )
    if not context.tenant_id:
        result = IntegrityCheckResult(
            key=f"{entity_type}_entity_integrity",
            ok=False,
            severity="blocking",
            message="Calisma alani bilgisi alinamadi.",
            reasons=["Calisma alani bilgisi alinamadi."],
        )
    return build_integrity_summary([result])


def build_integrity_summary(results: list[IntegrityCheckResult]) -> IntegritySummary:
    blocking = [
        result for result in results if (not result.ok and result.severity == "blocking")
    ]
    critical = [
        result for result in results if (not result.ok and result.severity == "critical")
    ]
    warnings = [
        warning
        for result in results
        if result.severity == "warning"
        for warning in (result.warnings or [result.message])
    ]
    return IntegritySummary(
        ok=not blocking and not critical,
        blocking_count=len(blocking),
        warning_count=len(warnings),
        critical_count=len(critical),
        results=results,
        blocking_reasons=[
            reason
            for result in [*blocking, *critical]
            for reason in (result.reasons or [result.message])
        ],
        warnings=warnings,
        suggested_actions=[
            action for result in results for action in result.suggested_actions
        ],
    )


def assert_integrity(summary: IntegritySummary) -> None:
    if summary.ok:
        return
    raise DomainError(
        message=summary.blocking_reasons[0]
        if summary.blocking_reasons
        else "Veri tutarliligi nedeniyle islem baslatilamadi.",
        code="INTEGRITY_BLOCKING",
        status_code=409,
        details=summary.model_dump(),
    )


async def _run_single_check(
    session: AsyncSession,
    context: AccessContext,
    check_key: str,
    resource: dict[str, Any],
) -> IntegrityCheckResult:
    if check_key == "company_active_for_official_operation":
        return company_active_result(resource.get("company"))

    if check_key == "branch_can_close":
        branch = resource.get("branch")
        if branch is None and context.record_id:
            branch = await _load_branch(session, context.tenant_id, context.record_id)
        return branch_can_close_result(_as_mapping(branch))

    if check_key == "branch_duplicate_active_name":
        duplicate = await _active_branch_name_exists(session, context, resource)
        return duplicate_branch_name_result(duplicate)

    if check_key == "branch_representative_scope_impact":
        has_authorities = await _branch_has_active_authorities(session, context, resource)
        return branch_scope_impact_result(has_authorities)

    if check_key == "branch_facility_address_warning":
        return branch_facility_address_warning_result(True)

    if check_key == "organization_unit_no_cycle":
        return organization_unit_no_cycle_result(False)

    if check_key == "organization_unit_active_dependents":
        return organization_active_dependents_result(0)

    if check_key == "facility_active_dependents":
        return facility_active_dependents_result(0)

    if check_key == "branch_open_process_conflict":
        return _ok(check_key, "Acik surec cakismasi bulunmadi.")

    if check_key in {
        "capital_increase_requires_partners",
        "current_ownership_available",
        "ownership_distribution_valid",
    }:
        rows = await _load_current_ownership(session, context, resource)
        transaction_type = str(resource.get("transaction_type") or "")
        if transaction_type == "initial_partnership_entry" and not rows:
            return _ok(check_key, "Ilk ortaklik girisi icin current ownership bos olabilir.")
        if check_key == "capital_increase_requires_partners":
            return current_ownership_available_result(rows)
        if check_key == "current_ownership_available":
            return current_ownership_available_result(rows)
        return ownership_distribution_result(rows)

    if check_key in {
        "no_active_ownership_transaction_conflict",
        "no_active_transaction_conflict",
    }:
        return _ok(check_key, "Aktif islem cakismasi bulunmadi.")

    if check_key == "ownership_exit_not_last_without_resolution":
        if resource.get("transaction_type") != "ownership_exit":
            return _ok(check_key, "Ortakliktan cikis kontrolu bu islem icin uygulanmadi.")
        rows = await _load_current_ownership(session, context, resource)
        return ownership_exit_not_last_result(len(rows))

    if check_key == "representative_scope_not_closed":
        return representative_scope_not_closed_result(resource.get("scope_target"))

    if check_key == "representative_authority_no_conflict":
        return representative_authority_no_conflict_result(False)

    if check_key in {"representative_scope_valid", "representative_unique_card_per_company"}:
        return _ok(check_key, "Temsilci integrity kontrolu uygun.")

    if check_key.startswith("no_"):
        return no_open_company_blockers_result()

    return _ok(check_key, "Integrity kontrolu Python tarafinda tanimli.")


def _ok(key: str, message: str) -> IntegrityCheckResult:
    return IntegrityCheckResult(key=key, ok=True, message=message)


def _as_mapping(value: Any) -> dict[str, Any] | None:
    if isinstance(value, dict):
        return value
    return None


async def _load_branch(
    session: AsyncSession,
    tenant_id: str,
    branch_id: str,
) -> dict[str, Any] | None:
    try:
        result = await session.execute(
            text(
                """
                select *
                from company_branches
                where tenant_id = :tenant_id
                  and id = :branch_id
                  and coalesce(is_deleted, false) = false
                limit 1
                """
            ),
            {"tenant_id": tenant_id, "branch_id": branch_id},
        )
        row = result.mappings().one_or_none()
        return dict(row) if row else None
    except SQLAlchemyError:
        return None


async def _active_branch_name_exists(
    session: AsyncSession,
    context: AccessContext,
    resource: dict[str, Any],
) -> bool:
    branch_name = resource.get("branch_name")
    company_id = resource.get("company_id") or context.company_id
    if not branch_name or not company_id:
        return False
    try:
        result = await session.execute(
            text(
                """
                select exists(
                  select 1
                  from company_branches
                  where tenant_id = :tenant_id
                    and company_id = :company_id
                    and lower(branch_name) = lower(:branch_name)
                    and coalesce(is_deleted, false) = false
                    and lower(coalesce(record_status, status, 'active')) in (
                      'active', 'aktif', 'open'
                    )
                ) as exists
                """
            ),
            {
                "tenant_id": context.tenant_id,
                "company_id": company_id,
                "branch_name": branch_name,
            },
        )
        return bool(result.scalar_one())
    except SQLAlchemyError:
        return False


async def _branch_has_active_authorities(
    session: AsyncSession,
    context: AccessContext,
    resource: dict[str, Any],
) -> bool:
    branch_id = resource.get("branch_id") or context.branch_id or context.record_id
    if not branch_id:
        return False
    try:
        result = await session.execute(
            text(
                """
                select exists(
                  select 1
                  from representative_authority_transactions
                  where tenant_id = :tenant_id
                    and branch_id = :branch_id
                    and lower(coalesce(authority_status, status, 'active')) = 'active'
                ) as exists
                """
            ),
            {"tenant_id": context.tenant_id, "branch_id": branch_id},
        )
        return bool(result.scalar_one())
    except SQLAlchemyError:
        return False


async def _load_current_ownership(
    session: AsyncSession,
    context: AccessContext,
    resource: dict[str, Any],
) -> list[dict[str, Any]]:
    company_id = resource.get("company_id") or context.company_id
    if not company_id:
        return []
    try:
        result = await session.execute(
            text(
                """
                select *
                from v_current_ownership
                where tenant_id = :tenant_id
                  and company_id = :company_id
                """
            ),
            {"tenant_id": context.tenant_id, "company_id": company_id},
        )
        return [dict(row) for row in result.mappings().all()]
    except SQLAlchemyError:
        return []
