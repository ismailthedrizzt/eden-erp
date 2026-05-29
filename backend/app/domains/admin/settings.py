# ruff: noqa: E501

from __future__ import annotations

import json
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.serialization import row_to_dict
from app.domains.admin.schemas import WorkspaceSettingsUpdate
from app.domains.operations.service import table_exists

DEFAULT_WORKSPACE_SETTINGS: dict[str, Any] = {
    "workspace_name": "Eden ERP Calisma Alani",
    "country": "TR",
    "default_language": "tr",
    "default_currency": "TRY",
    "timezone": "Europe/Istanbul",
    "date_format": "dd.MM.yyyy",
    "number_format": "tr-TR",
    "logo_document_id": None,
    "onboarding_version": "1",
    "metadata_json": {},
}


async def get_workspace_settings(session: AsyncSession, tenant_id: str) -> dict[str, Any]:
    if not await table_exists(session, "public.workspace_settings"):
        return {"tenant_id": tenant_id, **DEFAULT_WORKSPACE_SETTINGS, "source": "default"}
    result = await session.execute(
        text(
            """
            select *
            from public.workspace_settings
            where tenant_id = :tenant_id
            limit 1
            """
        ),
        {"tenant_id": tenant_id},
    )
    row = row_to_dict(result.mappings().one_or_none())
    if row:
        return row
    return {"tenant_id": tenant_id, **DEFAULT_WORKSPACE_SETTINGS, "source": "default"}


async def upsert_workspace_settings(
    session: AsyncSession,
    tenant_id: str,
    user_id: str | None,
    payload: WorkspaceSettingsUpdate,
) -> dict[str, Any]:
    updates = payload.model_dump(exclude_unset=True)
    current = await get_workspace_settings(session, tenant_id)
    next_values = {**DEFAULT_WORKSPACE_SETTINGS, **current, **updates}
    result = await session.execute(
        text(
            """
            insert into public.workspace_settings (
              tenant_id, workspace_name, country, default_language, default_currency,
              timezone, date_format, number_format, logo_document_id, onboarding_version,
              metadata_json, updated_by, updated_at
            )
            values (
              :tenant_id, :workspace_name, :country, :default_language, :default_currency,
              :timezone, :date_format, :number_format, :logo_document_id, :onboarding_version,
              cast(:metadata_json as jsonb), :updated_by, now()
            )
            on conflict (tenant_id) do update set
              workspace_name = excluded.workspace_name,
              country = excluded.country,
              default_language = excluded.default_language,
              default_currency = excluded.default_currency,
              timezone = excluded.timezone,
              date_format = excluded.date_format,
              number_format = excluded.number_format,
              logo_document_id = excluded.logo_document_id,
              onboarding_version = excluded.onboarding_version,
              metadata_json = excluded.metadata_json,
              updated_by = excluded.updated_by,
              updated_at = now()
            returning *
            """
        ),
        {
            "tenant_id": tenant_id,
            "workspace_name": next_values.get("workspace_name"),
            "country": next_values.get("country"),
            "default_language": next_values.get("default_language"),
            "default_currency": next_values.get("default_currency"),
            "timezone": next_values.get("timezone"),
            "date_format": next_values.get("date_format"),
            "number_format": next_values.get("number_format"),
            "logo_document_id": next_values.get("logo_document_id"),
            "onboarding_version": next_values.get("onboarding_version"),
            "metadata_json": json.dumps(next_values.get("metadata_json") or {}, default=str),
            "updated_by": user_id,
        },
    )
    return row_to_dict(result.mappings().one()) or {}

