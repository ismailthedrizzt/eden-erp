from __future__ import annotations

from typing import Any

from fastapi import status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.domains.branches.service import get_branch_by_id, is_branch_active
from app.domains.facilities.service import get_facility_by_id, is_facility_active
from app.domains.organization.service import get_unit_by_id, is_unit_active
from app.domains.representatives.schemas import RepresentativeAuthorityScope


def normalize_authority_scope(
    scope: RepresentativeAuthorityScope | dict[str, Any] | None,
) -> RepresentativeAuthorityScope:
    if isinstance(scope, RepresentativeAuthorityScope):
        return scope
    return RepresentativeAuthorityScope(**(scope or {}))


async def load_scope_target(
    session: AsyncSession,
    context: dict[str, Any],
    company_id: str,
    scope: RepresentativeAuthorityScope | dict[str, Any] | None,
) -> dict[str, Any] | None:
    normalized = normalize_authority_scope(scope)
    if normalized.scope_type == "company_wide":
        return None
    if normalized.scope_type == "branch" and normalized.branch_id:
        branch = await get_branch_by_id(session, context["tenant_id"], normalized.branch_id)
        if not branch or str(branch.get("company_id")) != company_id:
            raise DomainError(
                "Secilen sube bu sirkete bagli degil.",
                "BRANCH_SCOPE_INVALID",
                status.HTTP_409_CONFLICT,
            )
        return branch
    if normalized.scope_type == "organization_unit" and normalized.organization_unit_id:
        unit = await get_unit_by_id(session, context["tenant_id"], normalized.organization_unit_id)
        if not unit or str(unit.get("company_id")) != company_id:
            raise DomainError(
                "Secilen organizasyon birimi bu sirkete bagli degil.",
                "ORGANIZATION_SCOPE_INVALID",
                status.HTTP_409_CONFLICT,
            )
        return unit
    if normalized.scope_type == "facility" and normalized.facility_id:
        facility = await get_facility_by_id(session, context["tenant_id"], normalized.facility_id)
        if not facility or str(facility.get("company_id")) != company_id:
            raise DomainError(
                "Secilen tesis/lokasyon bu sirkete bagli degil.",
                "FACILITY_SCOPE_INVALID",
                status.HTTP_409_CONFLICT,
            )
        return facility
    return None


async def assert_scope_active(
    session: AsyncSession,
    context: dict[str, Any],
    company_id: str,
    scope: RepresentativeAuthorityScope | dict[str, Any] | None,
) -> None:
    normalized = normalize_authority_scope(scope)
    target = await load_scope_target(session, context, company_id, normalized)
    if normalized.scope_type == "branch" and not is_branch_active(target):
        raise DomainError(
            "Kapali veya pasif sube icin yeni aktif temsil yetkisi verilemez.",
            "BRANCH_SCOPE_CLOSED",
            status.HTTP_409_CONFLICT,
        )
    if normalized.scope_type == "organization_unit" and not is_unit_active(target):
        raise DomainError(
            "Kapali veya pasif organizasyon birimi icin yeni aktif temsil yetkisi verilemez.",
            "ORGANIZATION_SCOPE_CLOSED",
            status.HTTP_409_CONFLICT,
        )
    if normalized.scope_type == "facility" and not is_facility_active(target):
        raise DomainError(
            "Kapali veya pasif tesis/lokasyon icin yeni aktif temsil yetkisi verilemez.",
            "FACILITY_SCOPE_CLOSED",
            status.HTTP_409_CONFLICT,
        )


async def build_scope_label(
    session: AsyncSession,
    context: dict[str, Any],
    company_id: str,
    scope: RepresentativeAuthorityScope | dict[str, Any] | None,
) -> str:
    normalized = normalize_authority_scope(scope)
    if normalized.scope_label:
        return normalized.scope_label
    if normalized.scope_type == "company_wide":
        return "Sirket geneli"
    target = await load_scope_target(session, context, company_id, normalized)
    if normalized.scope_type == "branch":
        return (
            str(target.get("branch_name") or target.get("branch_short_name") or "Sube")
            if target
            else "Sube"
        )
    if normalized.scope_type == "organization_unit":
        return (
            str(target.get("name") or target.get("short_name") or "Organizasyon birimi")
            if target
            else "Organizasyon birimi"
        )
    if normalized.scope_type == "facility":
        return str(target.get("facility_name") or "Tesis/Lokasyon") if target else "Tesis/Lokasyon"
    return "Sirket geneli"


async def validate_authority_scope(
    session: AsyncSession,
    context: dict[str, Any],
    company_id: str,
    scope: RepresentativeAuthorityScope | dict[str, Any] | None,
) -> RepresentativeAuthorityScope:
    normalized = normalize_authority_scope(scope)
    await assert_scope_active(session, context, company_id, normalized)
    label = await build_scope_label(session, context, company_id, normalized)
    return RepresentativeAuthorityScope(
        **{
            **normalized.model_dump(),
            "scope_label": normalized.scope_label or label,
        }
    )
