from __future__ import annotations

from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.operations.service import table_exists
from app.features.registry import (
    feature_flag_payload,
    get_feature_flag,
    list_feature_flags,
    set_feature_enabled,
)


async def list_admin_features(
    session: AsyncSession,
    tenant_id: str,
    module_key: str | None = None,
) -> list[dict[str, Any]]:
    await _load_persisted_overrides(session, tenant_id)
    return [
        feature_flag_payload(flag, tenant_id=tenant_id)
        for flag in list_feature_flags(module_key)
    ]


async def update_admin_feature(
    session: AsyncSession,
    tenant_id: str,
    user_id: str | None,
    feature_key: str,
    enabled: bool,
    reason: str | None,
) -> dict[str, Any] | None:
    feature = get_feature_flag(feature_key)
    if feature is None:
        return None
    set_feature_enabled(tenant_id, feature_key, enabled)
    await session.execute(
        text(
            """
            insert into public.feature_flag_overrides (
              tenant_id, feature_key, enabled, reason, updated_by, updated_at
            )
            values (:tenant_id, :feature_key, :enabled, :reason, :updated_by, now())
            on conflict (tenant_id, feature_key) do update set
              enabled = excluded.enabled,
              reason = excluded.reason,
              updated_by = excluded.updated_by,
              updated_at = now()
            """
        ),
        {
            "tenant_id": tenant_id,
            "feature_key": feature_key,
            "enabled": enabled,
            "reason": reason,
            "updated_by": user_id,
        },
    )
    return feature_flag_payload(feature, tenant_id=tenant_id)


async def _load_persisted_overrides(session: AsyncSession, tenant_id: str) -> None:
    if not await table_exists(session, "public.feature_flag_overrides"):
        return
    result = await session.execute(
        text(
            """
            select feature_key, enabled
            from public.feature_flag_overrides
            where tenant_id = :tenant_id
            """
        ),
        {"tenant_id": tenant_id},
    )
    for row in result.mappings().all():
        set_feature_enabled(tenant_id, str(row["feature_key"]), bool(row["enabled"]))
