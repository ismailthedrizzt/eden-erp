from __future__ import annotations

import json
from typing import Any
from uuid import uuid4

from fastapi import status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError

ACTIVE_VALUES = {"active", "aktif", "opened", "open"}
CLOSED_VALUES = {"closed", "passive", "pasif", "deregistered", "deleted"}


def build_branch_label(branch: dict[str, Any] | None) -> str:
    if not branch:
        return "Şube"
    return str(branch.get("branch_short_name") or branch.get("branch_name") or "Şube")


def is_branch_active(branch: dict[str, Any] | None) -> bool:
    if not branch or branch.get("is_deleted") is True:
        return False
    status_value = str(branch.get("record_status") or branch.get("status") or "").lower()
    return status_value in ACTIVE_VALUES


def assert_branch_active(branch: dict[str, Any] | None) -> None:
    if not is_branch_active(branch):
        raise DomainError(
            message="Kapalı veya pasif şube tekrar kapatılamaz.",
            code="BRANCH_ALREADY_CLOSED",
            status_code=status.HTTP_409_CONFLICT,
        )


def assert_branch_belongs_to_company(branch: dict[str, Any], company_id: str) -> None:
    if str(branch.get("company_id")) != company_id:
        raise DomainError(
            message="Seçilen şube bu şirkete bağlı değil.",
            code="BRANCH_COMPANY_MISMATCH",
            status_code=status.HTTP_409_CONFLICT,
        )


async def get_branch_by_id(
    session: AsyncSession,
    tenant_id: str,
    branch_id: str,
) -> dict[str, Any] | None:
    result = await session.execute(
        text(
            """
            select *
            from public.company_branches
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


async def list_branches_for_company(
    session: AsyncSession,
    tenant_id: str,
    company_id: str,
) -> list[dict[str, Any]]:
    result = await session.execute(
        text(
            """
            select *
            from public.company_branches
            where tenant_id = :tenant_id
              and company_id = :company_id
              and coalesce(is_deleted, false) = false
            order by created_at desc
            """
        ),
        {"tenant_id": tenant_id, "company_id": company_id},
    )
    return [dict(row) for row in result.mappings().all()]


async def list_branches(
    session: AsyncSession,
    tenant_id: str,
    *,
    company_id: str | None = None,
) -> list[dict[str, Any]]:
    where_company = "and company_id = :company_id" if company_id else ""
    result = await session.execute(
        text(
            f"""
            select *
            from public.company_branches
            where tenant_id = :tenant_id
              and coalesce(is_deleted, false) = false
              {where_company}
            order by updated_at desc, created_at desc
            limit 200
            """
        ),
        {"tenant_id": tenant_id, "company_id": company_id},
    )
    return [dict(row) for row in result.mappings().all()]


async def find_active_branch_by_name(
    session: AsyncSession,
    tenant_id: str,
    company_id: str,
    branch_name: str,
) -> dict[str, Any] | None:
    result = await session.execute(
        text(
            """
            select *
            from public.company_branches
            where tenant_id = :tenant_id
              and company_id = :company_id
              and lower(branch_name) = lower(:branch_name)
              and coalesce(is_deleted, false) = false
              and coalesce(record_status, status) = 'active'
            limit 1
            """
        ),
        {"tenant_id": tenant_id, "company_id": company_id, "branch_name": branch_name},
    )
    row = result.mappings().one_or_none()
    return dict(row) if row else None


async def create_branch(
    session: AsyncSession,
    context: dict[str, Any],
    payload: dict[str, Any],
) -> dict[str, Any]:
    branch_id = str(uuid4())
    document_files = json.dumps(payload.get("document_files") or [], ensure_ascii=False)
    metadata_json = json.dumps(payload.get("metadata_json") or {}, ensure_ascii=False)
    result = await session.execute(
        text(
            """
            insert into public.company_branches (
              id, tenant_id, company_id, organization_unit_id, facility_id,
              branch_name, branch_short_name, branch_type, is_official_branch,
              country, city, district, neighborhood, address, postal_code, phone, email,
              trade_registry_number, trade_registry_office, tax_office, sgk_workplace_registry_no,
              opening_decision_date, opening_registration_date, trade_registry_gazette_date,
              trade_registry_gazette_number, responsible_person_id, status, record_status,
              start_date, notes, document_files, metadata_json, created_by, updated_by, version,
              is_deleted
            )
            values (
              :id, :tenant_id, :company_id, :organization_unit_id, :facility_id,
              :branch_name, :branch_short_name, :branch_type, :is_official_branch,
              :country, :city, :district, :neighborhood, :address, :postal_code, :phone, :email,
              :trade_registry_number, :trade_registry_office, :tax_office,
              :sgk_workplace_registry_no,
              :opening_decision_date, :opening_registration_date, :trade_registry_gazette_date,
              :trade_registry_gazette_number, :responsible_person_id, 'active', 'active',
              :start_date, :notes, cast(:document_files as jsonb), cast(:metadata_json as jsonb),
              :user_id, :user_id, 1, false
            )
            returning *
            """
        ),
        {
            "id": branch_id,
            "tenant_id": context["tenant_id"],
            "company_id": payload["company_id"],
            "organization_unit_id": payload.get("organization_unit_id"),
            "facility_id": payload.get("facility_id"),
            "branch_name": payload["branch_name"],
            "branch_short_name": payload.get("branch_short_name"),
            "branch_type": payload.get("branch_type"),
            "is_official_branch": payload.get("is_official_branch", True),
            "country": payload.get("country"),
            "city": payload.get("city"),
            "district": payload.get("district"),
            "neighborhood": payload.get("neighborhood"),
            "address": payload.get("address"),
            "postal_code": payload.get("postal_code"),
            "phone": payload.get("phone"),
            "email": payload.get("email"),
            "trade_registry_number": payload.get("trade_registry_number"),
            "trade_registry_office": payload.get("trade_registry_office"),
            "tax_office": payload.get("tax_office"),
            "sgk_workplace_registry_no": payload.get("sgk_workplace_registry_no"),
            "opening_decision_date": payload.get("opening_decision_date"),
            "opening_registration_date": payload.get("opening_registration_date"),
            "trade_registry_gazette_date": payload.get("trade_registry_gazette_date"),
            "trade_registry_gazette_number": payload.get("trade_registry_gazette_number"),
            "responsible_person_id": payload.get("responsible_person_id"),
            "start_date": payload.get("start_date"),
            "notes": payload.get("notes"),
            "document_files": document_files,
            "metadata_json": metadata_json,
            "user_id": context.get("user_id"),
        },
    )
    return dict(result.mappings().one())


async def close_branch(
    session: AsyncSession,
    context: dict[str, Any],
    branch_id: str,
    payload: dict[str, Any],
) -> dict[str, Any]:
    branch = await get_branch_by_id(session, context["tenant_id"], branch_id)
    if not branch:
        raise DomainError("Şube kaydı bulunamadı.", "BRANCH_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    assert_branch_active(branch)

    base_version = payload.get("base_version")
    if base_version is not None and int(branch.get("version") or 0) != int(base_version):
        raise DomainError(
            message=(
                "Şube kaydı bu işlem hazırlanırken değişmiş. "
                "Lütfen kaydı yenileyip tekrar deneyin."
            ),
            code="VERSION_CONFLICT",
            status_code=status.HTTP_409_CONFLICT,
            details={"current_version": branch.get("version"), "base_version": base_version},
        )

    previous_documents = branch.get("document_files") or []
    document_files = previous_documents + (payload.get("document_files") or [])
    metadata = dict(branch.get("metadata_json") or {})
    metadata["closing"] = {
        "reason": payload.get("closing_reason"),
        "decision_date": payload.get("closing_decision_date"),
        "registration_date": payload.get("closing_registration_date"),
        "organization_unit_action": payload.get("organization_unit_action"),
        "facility_action": payload.get("facility_action"),
    }
    result = await session.execute(
        text(
            """
            update public.company_branches
            set status = 'closed',
                record_status = 'closed',
                closing_decision_date = :closing_decision_date,
                closing_registration_date = :closing_registration_date,
                trade_registry_gazette_date = :trade_registry_gazette_date,
                trade_registry_gazette_number = :trade_registry_gazette_number,
                end_date = coalesce(:closing_registration_date, :closing_decision_date),
                notes = coalesce(:notes, notes),
                document_files = cast(:document_files as jsonb),
                metadata_json = cast(:metadata_json as jsonb),
                updated_by = :user_id,
                updated_at = now(),
                version = coalesce(version, 0) + 1
            where id = :branch_id
              and tenant_id = :tenant_id
              and coalesce(is_deleted, false) = false
            returning *
            """
        ),
        {
            "branch_id": branch_id,
            "tenant_id": context["tenant_id"],
            "closing_decision_date": payload.get("closing_decision_date"),
            "closing_registration_date": payload.get("closing_registration_date"),
            "trade_registry_gazette_date": payload.get("trade_registry_gazette_date"),
            "trade_registry_gazette_number": payload.get("trade_registry_gazette_number"),
            "notes": payload.get("notes") or payload.get("closing_reason"),
            "document_files": json.dumps(document_files, ensure_ascii=False),
            "metadata_json": json.dumps(metadata, ensure_ascii=False),
            "user_id": context.get("user_id"),
        },
    )
    updated = dict(result.mappings().one())
    return {
        "old_values": branch,
        "new_values": updated,
        "branch": updated,
        "changed_fields": [
            "status",
            "record_status",
            "closing_decision_date",
            "closing_registration_date",
            "end_date",
            "document_files",
            "metadata_json",
        ],
    }


async def get_branch_summary_for_company(
    session: AsyncSession,
    tenant_id: str,
    company_id: str,
) -> dict[str, Any]:
    branches = await list_branches_for_company(session, tenant_id, company_id)
    active = [branch for branch in branches if is_branch_active(branch)]
    closed = [
        branch
        for branch in branches
        if str(branch.get("record_status") or "").lower() in CLOSED_VALUES
    ]
    official = [branch for branch in branches if branch.get("is_official_branch")]
    operation_points = [
        branch
        for branch in branches
        if branch.get("branch_type") in {"operation_point", "warehouse_facility"}
    ]
    return {
        "total_branch_count": len(branches),
        "active_branch_count": len(active),
        "official_branch_count": len(official),
        "operation_point_count": len(operation_points),
        "closed_branch_count": len(closed),
        "last_opened_branch": active[0] if active else None,
        "last_closed_branch": closed[0] if closed else None,
    }
