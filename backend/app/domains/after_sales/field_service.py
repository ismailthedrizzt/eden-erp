# ruff: noqa: E501

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from fastapi import status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.domains.after_sales.schemas import ServiceRecordPhotosRequest, ServiceRecordStartRequest
from app.domains.after_sales.service import ensure_after_sales_tables, json_list_dumps, row_to_dict
from app.domains.after_sales.service_records import get_service_record


async def start_service_record(session: AsyncSession, context: dict[str, Any], service_id: str, request: ServiceRecordStartRequest) -> dict[str, Any]:
    await ensure_after_sales_tables(session, records=True, requests=True)
    current = await get_service_record(session, context["tenant_id"], service_id)
    if not current:
        raise DomainError("Servis kaydi bulunamadi.", "SERVICE_RECORD_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    start_time = request.start_time or datetime.now(UTC)
    result = await session.execute(
        text(
            """
            update public.after_sales_service_records
            set status = 'in_progress',
                start_time = coalesce(start_time, :start_time),
                notes = coalesce(:notes, notes),
                updated_by = :user_id,
                updated_at = now(),
                version = version + 1
            where tenant_id = :tenant_id and id = :service_id and coalesce(is_deleted, false) = false
            returning *
            """
        ),
        {"tenant_id": context["tenant_id"], "service_id": service_id, "start_time": start_time, "notes": request.notes, "user_id": context.get("user_id")},
    )
    row = row_to_dict(result.mappings().one())
    if row.get("service_request_id"):
        await session.execute(
            text(
                """
                update public.after_sales_service_requests
                set status = 'in_progress', updated_by = :user_id, updated_at = now(), version = version + 1
                where tenant_id = :tenant_id and id = :request_id
                """
            ),
            {"tenant_id": context["tenant_id"], "request_id": row["service_request_id"], "user_id": context.get("user_id")},
        )
    return row


async def append_service_photos(session: AsyncSession, context: dict[str, Any], service_id: str, request: ServiceRecordPhotosRequest) -> dict[str, Any]:
    current = await get_service_record(session, context["tenant_id"], service_id)
    if not current:
        raise DomainError("Servis kaydi bulunamadi.", "SERVICE_RECORD_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    photos = list(current.get("photos") or [])
    photos.extend(request.photos)
    result = await session.execute(
        text(
            """
            update public.after_sales_service_records
            set photos = cast(:photos as jsonb),
                updated_by = :user_id,
                updated_at = now(),
                version = version + 1
            where tenant_id = :tenant_id and id = :service_id and coalesce(is_deleted, false) = false
            returning *
            """
        ),
        {"tenant_id": context["tenant_id"], "service_id": service_id, "photos": json_list_dumps(photos), "user_id": context.get("user_id")},
    )
    return row_to_dict(result.mappings().one())
