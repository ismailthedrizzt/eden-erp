from __future__ import annotations

# ruff: noqa: E501
from typing import Any, cast

from fastapi import status
from sqlalchemy import text

from app.core.errors import DomainError
from app.domains.integrations.event_subscriptions import (
    validate_event_types,
    validate_inbound_event_type,
)
from app.domains.integrations.schemas import (
    IntegrationAppCreateRequest,
    IntegrationAppListQuery,
    IntegrationAppUpdateRequest,
)
from app.domains.integrations.service import (
    IntegrationContext,
    assert_version,
    ensure_integration_tables,
    json_dumps,
    json_list_dumps,
    meta,
    normalize_row,
    record_integration_audit_best_effort,
    require_user_id,
    slugify_key,
)

APP_JSON_FIELDS = {"allowed_scopes", "allowed_event_types", "allowed_inbound_events", "ip_allowlist", "metadata_json"}
APP_MUTABLE = {"app_name", "description", "app_type", "status", "owner_user_id", "allowed_scopes", "allowed_event_types", "allowed_inbound_events", "rate_limit_per_minute", "ip_allowlist", "metadata_json"}


async def list_apps(ctx: IntegrationContext, query: IntegrationAppListQuery) -> dict[str, Any]:
    await ensure_integration_tables(ctx.session, apps=True)
    where = ["tenant_id = :tenant_id", "coalesce(is_deleted, false) = false"]
    params: dict[str, Any] = {"tenant_id": ctx.tenant_id, "limit": query.page_size, "offset": (query.page - 1) * query.page_size}
    if query.app_type:
        where.append("app_type = :app_type")
        params["app_type"] = query.app_type
    if query.status:
        where.append("status = :status")
        params["status"] = query.status
    if query.search:
        where.append("(app_key ilike :search or app_name ilike :search)")
        params["search"] = f"%{query.search}%"
    where_sql = " and ".join(where)
    count = await ctx.session.execute(text(f"select count(*) from public.integration_apps where {where_sql}"), params)
    total = int(count.scalar_one() or 0)
    result = await ctx.session.execute(
        text(
            f"""
            select *
            from public.integration_apps
            where {where_sql}
            order by case status when 'active' then 0 when 'draft' then 1 when 'suspended' then 2 else 3 end, updated_at desc
            limit :limit offset :offset
            """
        ),
        params,
    )
    return {"items": [normalize_row(row) for row in result.mappings()], "meta": meta(query.page, query.page_size, total)}


async def get_app(ctx: IntegrationContext, app_id: str) -> dict[str, Any]:
    await ensure_integration_tables(ctx.session, apps=True)
    result = await ctx.session.execute(
        text(
            """
            select *
            from public.integration_apps
            where tenant_id = :tenant_id and id = :app_id and coalesce(is_deleted, false) = false
            limit 1
            """
        ),
        {"tenant_id": ctx.tenant_id, "app_id": app_id},
    )
    row = result.mappings().one_or_none()
    if not row:
        raise DomainError("Entegrasyon uygulamasi bulunamadi.", "INTEGRATION_APP_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    return normalize_row(row)


async def create_app(ctx: IntegrationContext, request: IntegrationAppCreateRequest) -> dict[str, Any]:
    await ensure_integration_tables(ctx.session, apps=True)
    created_by = require_user_id(ctx)
    _validate_app_events(request.allowed_event_types, request.allowed_inbound_events)
    app_key = request.app_key or slugify_key(request.app_name)
    result = await ctx.session.execute(text("select id from public.integration_apps where tenant_id = :tenant_id and app_key = :app_key and coalesce(is_deleted, false) = false"), {"tenant_id": ctx.tenant_id, "app_key": app_key})
    if result.mappings().one_or_none():
        raise DomainError("Bu app_key zaten kullaniliyor.", "INTEGRATION_APP_KEY_EXISTS", status.HTTP_409_CONFLICT, {"app_key": app_key})
    inserted = await ctx.session.execute(
        text(
            """
            insert into public.integration_apps (
              tenant_id, app_key, app_name, description, app_type, status, owner_user_id,
              allowed_scopes, allowed_event_types, allowed_inbound_events, rate_limit_per_minute,
              ip_allowlist, metadata_json, created_by, updated_by
            )
            values (
              :tenant_id, :app_key, :app_name, :description, :app_type, :status, :owner_user_id,
              cast(:allowed_scopes as jsonb), cast(:allowed_event_types as jsonb), cast(:allowed_inbound_events as jsonb),
              :rate_limit_per_minute, cast(:ip_allowlist as jsonb), cast(:metadata_json as jsonb), :created_by, :created_by
            )
            returning *
            """
        ),
        {
            "tenant_id": ctx.tenant_id,
            "app_key": app_key,
            "app_name": request.app_name,
            "description": request.description,
            "app_type": request.app_type,
            "status": request.status,
            "owner_user_id": request.owner_user_id,
            "allowed_scopes": json_dumps(request.allowed_scopes),
            "allowed_event_types": json_list_dumps(request.allowed_event_types),
            "allowed_inbound_events": json_list_dumps(request.allowed_inbound_events),
            "rate_limit_per_minute": request.rate_limit_per_minute,
            "ip_allowlist": json_list_dumps(request.ip_allowlist),
            "metadata_json": json_dumps(request.metadata_json),
            "created_by": created_by,
        },
    )
    row = normalize_row(inserted.mappings().one())
    await record_integration_audit_best_effort(ctx, action_type="integration_app_created", entity_type="integration_app", entity_id=str(row["id"]))
    return row


async def update_app(ctx: IntegrationContext, app_id: str, request: IntegrationAppUpdateRequest) -> dict[str, Any]:
    current = await get_app(ctx, app_id)
    assert_version(current, request.base_version)
    data = request.model_dump(exclude_unset=True, exclude={"base_version"})
    allowed_event_types = data.get("allowed_event_types")
    if allowed_event_types is None:
        allowed_event_types = current.get("allowed_event_types") or []
    allowed_inbound_events = data.get("allowed_inbound_events")
    if allowed_inbound_events is None:
        allowed_inbound_events = current.get("allowed_inbound_events") or []
    _validate_app_events(
        cast(list[str], allowed_event_types),
        cast(list[str], allowed_inbound_events),
    )
    params: dict[str, Any] = {"tenant_id": ctx.tenant_id, "app_id": app_id, "updated_by": ctx.request_context.user_id}
    set_parts: list[str] = []
    for key, value in data.items():
        if key not in APP_MUTABLE:
            continue
        if key in {"allowed_scopes", "metadata_json"}:
            set_parts.append(f"{key} = cast(:{key} as jsonb)")
            params[key] = json_dumps(value)
        elif key in {"allowed_event_types", "allowed_inbound_events", "ip_allowlist"}:
            set_parts.append(f"{key} = cast(:{key} as jsonb)")
            params[key] = json_list_dumps(value)
        else:
            set_parts.append(f"{key} = :{key}")
            params[key] = value
    if not set_parts:
        return current
    set_parts.extend(["updated_by = :updated_by", "updated_at = now()", "version = version + 1"])
    result = await ctx.session.execute(
        text(
            f"""
            update public.integration_apps
            set {", ".join(set_parts)}
            where tenant_id = :tenant_id and id = :app_id and coalesce(is_deleted, false) = false
            returning *
            """
        ),
        params,
    )
    row = normalize_row(result.mappings().one())
    await record_integration_audit_best_effort(ctx, action_type="integration_app_updated", entity_type="integration_app", entity_id=app_id)
    return row


async def set_app_status(ctx: IntegrationContext, app_id: str, status_value: str) -> dict[str, Any]:
    if status_value not in {"suspended", "revoked"}:
        raise DomainError("Gecersiz entegrasyon uygulamasi durumu.", "INTEGRATION_APP_STATUS_INVALID", status.HTTP_422_UNPROCESSABLE_ENTITY)
    await get_app(ctx, app_id)
    result = await ctx.session.execute(
        text(
            """
            update public.integration_apps
            set status = :status, updated_by = :user_id, updated_at = now(), version = version + 1
            where tenant_id = :tenant_id and id = :app_id and coalesce(is_deleted, false) = false
            returning *
            """
        ),
        {"tenant_id": ctx.tenant_id, "app_id": app_id, "status": status_value, "user_id": ctx.request_context.user_id},
    )
    row = normalize_row(result.mappings().one())
    await record_integration_audit_best_effort(ctx, action_type=f"integration_app_{status_value}", entity_type="integration_app", entity_id=app_id)
    return row


def _validate_app_events(event_types: list[str], inbound_events: list[str]) -> None:
    validate_event_types([str(item) for item in event_types or []])
    for event_type in inbound_events or []:
        validate_inbound_event_type(str(event_type))
