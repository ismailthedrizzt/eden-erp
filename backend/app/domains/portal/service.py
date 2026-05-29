# ruff: noqa: E501

from __future__ import annotations

import json
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.operations.service import table_exists

PORTAL_MODULE_KEY = "customerPortal"
PORTAL_EXTERNAL_USERS_TABLE = "public.portal_external_users"
PORTAL_INVITATIONS_TABLE = "public.portal_invitations"
PORTAL_ACTIVITY_TABLE = "public.portal_activity_logs"
PORTAL_SHARED_DOCUMENTS_TABLE = "public.portal_shared_documents"


def json_dumps(value: Any) -> str:
    return json.dumps(value if value is not None else {}, ensure_ascii=False, default=str)


def json_list_dumps(value: Any) -> str:
    return json.dumps(value if value is not None else [], ensure_ascii=False, default=str)


def row_to_dict(row: Any) -> dict[str, Any]:
    if not row:
        return {}
    return {key: normalize_value(value) for key, value in dict(row).items()}


def normalize_value(value: Any) -> Any:
    if isinstance(value, Decimal):
        return value
    if isinstance(value, (date, datetime)):
        return value
    return value


def list_meta(page: int, page_size: int, total: int) -> dict[str, int]:
    return {
        "page": page,
        "pageSize": page_size,
        "total": total,
        "totalPages": max(1, (total + page_size - 1) // page_size),
    }


async def portal_table_missing(session: AsyncSession, table_name: str) -> bool:
    return not await table_exists(session, table_name)


async def record_portal_activity(
    session: AsyncSession,
    portal_context: Any,
    *,
    action_type: str,
    entity_type: str,
    entity_id: str | None = None,
    request_id: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> None:
    if await portal_table_missing(session, PORTAL_ACTIVITY_TABLE):
        return
    await session.execute(
        text(
            """
            insert into public.portal_activity_logs (
              tenant_id, portal_user_id, action_type, entity_type, entity_id, request_id, metadata_json
            )
            values (
              :tenant_id, :portal_user_id, :action_type, :entity_type, :entity_id, :request_id, cast(:metadata_json as jsonb)
            )
            """
        ),
        {
            "tenant_id": portal_context.tenant_id,
            "portal_user_id": portal_context.portal_user_id,
            "action_type": action_type,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "request_id": request_id,
            "metadata_json": json_dumps(metadata or {}),
        },
    )


def portal_status_label(status_value: str | None) -> str:
    return {
        "new": "alindi",
        "triage": "inceleniyor",
        "assigned": "atandi",
        "scheduled": "planlandi",
        "in_progress": "islemde",
        "waiting_customer": "musteri_bekleniyor",
        "waiting_parts": "parca_bekleniyor",
        "resolved": "cozuldu",
        "closed": "kapandi",
        "cancelled": "iptal_edildi",
    }.get(str(status_value or ""), str(status_value or "bilinmiyor"))


def public_request_payload(row: dict[str, Any]) -> dict[str, Any]:
    hidden = {"notes", "required_skills", "required_parts_preview", "suggested_technician_user_id", "suggested_technician_employee_id", "project_task_id", "created_by", "updated_by", "is_deleted"}
    payload = {key: value for key, value in row.items() if key not in hidden}
    payload["portal_status"] = portal_status_label(str(row.get("status") or ""))
    return payload


def public_service_record_payload(row: dict[str, Any]) -> dict[str, Any]:
    hidden = {"notes", "metadata_json", "created_by", "updated_by", "is_deleted"}
    payload = {key: value for key, value in row.items() if key not in hidden}
    parts = []
    for item in row.get("parts_used") or []:
        if isinstance(item, dict):
            parts.append({key: value for key, value in item.items() if key not in {"internal_cost", "cost", "unit_cost", "margin"}})
    payload["parts_used"] = parts
    return payload
