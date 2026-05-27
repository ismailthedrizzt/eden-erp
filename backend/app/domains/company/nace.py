from __future__ import annotations

from typing import Any

from fastapi import status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.domains.company.service import sync_public_sgk_row
from app.domains.operations.service import table_exists


def _row_dict(row: Any) -> dict[str, Any]:
    if hasattr(row, "model_dump"):
        return dict(row.model_dump(mode="json"))
    if isinstance(row, dict):
        return dict(row)
    return {}


async def load_company_nace_codes(
    session: AsyncSession,
    tenant_id: str,
    company_id: str,
) -> list[dict[str, Any]]:
    if not await table_exists(session, "public.company_nace_codes"):
        return []
    result = await session.execute(
        text(
            """
            select
              company_nace.*,
              nace.nace_code,
              nace.description,
              nace.hazard_class
            from public.company_nace_codes company_nace
            join public.nace_codes nace on nace.id = company_nace.nace_code_id
            where company_nace.tenant_id = :tenant_id
              and company_nace.company_id = :company_id
              and coalesce(company_nace.is_deleted, false) = false
            order by company_nace.is_primary desc, nace.nace_code asc
            """
        ),
        {"tenant_id": tenant_id, "company_id": company_id},
    )
    return [dict(row) for row in result.mappings().all()]


def active_nace_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        row
        for row in rows
        if str(row.get("status") or "active").lower() == "active" and not row.get("is_deleted")
    ]


def validate_nace_selection(rows: list[dict[str, Any]]) -> None:
    if not rows:
        raise DomainError(
            "En az bir NACE kodu seçilmelidir.",
            "NACE_REQUIRED",
            status.HTTP_400_BAD_REQUEST,
        )
    primary_count = sum(1 for row in rows if row.get("is_primary"))
    if primary_count != 1:
        raise DomainError(
            "Tam olarak bir birincil NACE kodu seçilmelidir.",
            "PRIMARY_NACE_REQUIRED",
            status.HTTP_400_BAD_REQUEST,
        )
    seen: set[str] = set()
    for row in rows:
        key = str(row.get("nace_code_id") or row.get("nace_code") or "").strip().lower()
        if not key:
            raise DomainError(
                "NACE kodu seçimi eksik.",
                "NACE_CODE_REQUIRED",
                status.HTTP_400_BAD_REQUEST,
            )
        if key in seen:
            raise DomainError(
                "Aynı NACE kodu birden fazla kez seçilemez.",
                "NACE_DUPLICATE",
                status.HTTP_400_BAD_REQUEST,
            )
        seen.add(key)


async def _resolve_single_nace(session: AsyncSession, row: dict[str, Any]) -> dict[str, Any]:
    if not await table_exists(session, "public.nace_codes"):
        raise DomainError(
            "NACE referans kayıtları hazır değil.",
            "NACE_REFERENCE_MISSING",
            status.HTTP_409_CONFLICT,
        )
    nace_code_id = row.get("nace_code_id") or row.get("id")
    nace_code = row.get("nace_code")
    result = await session.execute(
        text(
            """
            select id, nace_code, description, hazard_class
            from public.nace_codes
            where coalesce(is_active, true) = true
              and (
                (:nace_code_id is not null and id::text = :nace_code_id)
                or (:nace_code is not null and nace_code = :nace_code)
              )
            limit 1
            """
        ),
        {
            "nace_code_id": str(nace_code_id) if nace_code_id else None,
            "nace_code": str(nace_code).strip() if nace_code else None,
        },
    )
    resolved = result.mappings().one_or_none()
    if not resolved:
        raise DomainError(
            "Seçilen NACE kodu aktif referans kayıtlarında bulunamadı.",
            "NACE_REFERENCE_INVALID",
            status.HTTP_400_BAD_REQUEST,
            {"nace_code_id": nace_code_id, "nace_code": nace_code},
        )
    resolved_dict = dict(resolved)
    return {
        "nace_code_id": str(resolved_dict["id"]),
        "nace_code": resolved_dict.get("nace_code"),
        "description": resolved_dict.get("description"),
        "hazard_class": resolved_dict.get("hazard_class"),
        "is_primary": bool(row.get("is_primary")),
        "notes": row.get("notes"),
    }


async def resolve_nace_rows(session: AsyncSession, rows: list[Any]) -> list[dict[str, Any]]:
    raw_rows = [_row_dict(row) for row in rows]
    validate_nace_selection(raw_rows)
    resolved = [await _resolve_single_nace(session, row) for row in raw_rows]
    validate_nace_selection(resolved)
    unique_ids: set[str] = set()
    for row in resolved:
        if row["nace_code_id"] in unique_ids:
            raise DomainError(
                "Aynı NACE kodu birden fazla kez seçilemez.",
                "NACE_DUPLICATE",
                status.HTTP_400_BAD_REQUEST,
            )
        unique_ids.add(row["nace_code_id"])
    return resolved


def same_nace_selection(
    current_rows: list[dict[str, Any]],
    next_rows: list[dict[str, Any]],
) -> bool:
    def signature(rows: list[dict[str, Any]]) -> set[tuple[str, bool]]:
        return {
            (str(row.get("nace_code_id") or row.get("id")), bool(row.get("is_primary")))
            for row in rows
            if str(row.get("status") or "active").lower() == "active"
        }

    return signature(current_rows) == signature(next_rows)


def summarize_nace_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        {
            "nace_code_id": row.get("nace_code_id") or row.get("id"),
            "nace_code": row.get("nace_code"),
            "description": row.get("description"),
            "hazard_class": row.get("hazard_class"),
            "is_primary": bool(row.get("is_primary")),
        }
        for row in rows
    ]


async def sync_company_nace_codes(
    session: AsyncSession,
    context: dict[str, Any],
    company_id: str,
    rows: list[dict[str, Any]],
    effective_date: str | None,
) -> list[dict[str, Any]]:
    if not await table_exists(session, "public.company_nace_codes"):
        raise DomainError(
            "NACE kayıt altyapısı hazır değil.",
            "NACE_INFRASTRUCTURE_MISSING",
            status.HTTP_409_CONFLICT,
        )

    selected_ids = {row["nace_code_id"] for row in rows}
    current = await session.execute(
        text(
            """
            select id, nace_code_id::text as nace_code_id
            from public.company_nace_codes
            where tenant_id = :tenant_id
              and company_id = :company_id
              and coalesce(is_deleted, false) = false
              and status = 'active'
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "company_id": company_id,
        },
    )
    for current_row in current.mappings().all():
        if current_row["nace_code_id"] in selected_ids:
            continue
        await session.execute(
            text(
                """
                update public.company_nace_codes
                set status = 'passive',
                    end_date = coalesce(cast(:effective_date as date), current_date),
                    updated_at = now(),
                    updated_by = :user_id,
                    version = coalesce(version, 0) + 1
                where id = :id
                """
            ),
            {
                "id": current_row["id"],
                "effective_date": effective_date,
                "user_id": context.get("user_id"),
            },
        )

    synced: list[dict[str, Any]] = []
    for row in rows:
        existing = await session.execute(
            text(
                """
                select id
                from public.company_nace_codes
                where tenant_id = :tenant_id
                  and company_id = :company_id
                  and nace_code_id::text = :nace_code_id
                  and coalesce(is_deleted, false) = false
                limit 1
                """
            ),
            {
                "tenant_id": context["tenant_id"],
                "company_id": company_id,
                "nace_code_id": row["nace_code_id"],
            },
        )
        existing_row = existing.mappings().one_or_none()
        if existing_row:
            result = await session.execute(
                text(
                    """
                    update public.company_nace_codes
                    set is_primary = :is_primary,
                        status = 'active',
                        start_date = coalesce(
                            cast(:effective_date as date),
                            start_date,
                            current_date
                        ),
                        end_date = null,
                        notes = :notes,
                        updated_by = :user_id,
                        updated_at = now(),
                        version = coalesce(version, 0) + 1
                    where id = :id
                    returning *
                    """
                ),
                {
                    "id": existing_row["id"],
                    "is_primary": row["is_primary"],
                    "effective_date": effective_date,
                    "notes": row.get("notes"),
                    "user_id": context.get("user_id"),
                },
            )
            synced_row = dict(result.mappings().one())
            synced.append({**row, **synced_row})
            continue

        result = await session.execute(
            text(
                """
                insert into public.company_nace_codes (
                  tenant_id, company_id, nace_code_id, is_primary, status, start_date,
                  notes, created_by, updated_by
                )
                values (
                  :tenant_id, :company_id, :nace_code_id, :is_primary, 'active',
                  coalesce(cast(:effective_date as date), current_date), :notes, :user_id, :user_id
                )
                returning *
                """
            ),
            {
                "tenant_id": context["tenant_id"],
                "company_id": company_id,
                "nace_code_id": row["nace_code_id"],
                "is_primary": row["is_primary"],
                "effective_date": effective_date,
                "notes": row.get("notes"),
                "user_id": context.get("user_id"),
            },
        )
        synced_row = dict(result.mappings().one())
        synced.append({**row, **synced_row})
    return synced


async def sync_sgk_risk_class_from_primary_nace(
    session: AsyncSession,
    context: dict[str, Any],
    company_id: str,
    primary_nace: dict[str, Any],
) -> list[str]:
    hazard_class = primary_nace.get("hazard_class")
    if not hazard_class:
        return [
            "Birincil NACE için tehlike sınıfı bulunamadı; SGK risk sınıfını ayrıca kontrol edin."
        ]
    _, warnings = await sync_public_sgk_row(
        session,
        context,
        company_id,
        {"risk_class": hazard_class, "nace_code": primary_nace.get("nace_code")},
    )
    return warnings
