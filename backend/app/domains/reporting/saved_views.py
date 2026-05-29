# ruff: noqa: E501

from __future__ import annotations

from typing import Any

from fastapi import status
from sqlalchemy import text

from app.core.errors import DomainError
from app.domains.reporting.report_permissions import (
    assert_report_view_allowed,
    assert_saved_view_access,
    can_access_saved_view,
)
from app.domains.reporting.schemas import (
    ListResult,
    SavedViewCreateRequest,
    SavedViewListQuery,
    SavedViewPinRequest,
    SavedViewUpdateRequest,
)
from app.domains.reporting.service import (
    ReportingQueryContext,
    assert_version,
    ensure_advanced_reporting_tables,
    json_dumps,
    json_list_dumps,
    meta,
    normalize_row,
    record_reporting_audit_best_effort,
    require_permission,
    require_user_id,
)

SAVED_VIEW_MUTABLE_JSON = {"filters_json", "columns_json", "sort_json", "group_by_json", "chart_config_json", "shared_role_ids", "shared_user_ids"}
SAVED_VIEW_MUTABLE = {
    "view_name",
    "description",
    "visibility",
    "filters_json",
    "columns_json",
    "sort_json",
    "group_by_json",
    "chart_config_json",
    "default_view",
    "pinned",
    "shared_role_ids",
    "shared_user_ids",
}


async def list_saved_views(ctx: ReportingQueryContext, query: SavedViewListQuery) -> ListResult:
    await ensure_advanced_reporting_tables(ctx.session, saved_views=True)
    user_id = require_user_id(ctx)
    filters = ["tenant_id = :tenant_id", "coalesce(is_deleted, false) = false"]
    params: dict[str, Any] = {"tenant_id": ctx.tenant_id, "limit": query.page_size, "offset": (query.page - 1) * query.page_size, "user_id": user_id}
    if query.module_key:
        filters.append("module_key = :module_key")
        params["module_key"] = query.module_key
    if query.entity_type:
        filters.append("entity_type = :entity_type")
        params["entity_type"] = query.entity_type
    if query.report_key:
        filters.append("report_key = :report_key")
        params["report_key"] = query.report_key
    if query.visibility:
        filters.append("visibility = :visibility")
        params["visibility"] = query.visibility
    if not query.include_shared:
        filters.append("owner_user_id = cast(:user_id as uuid)")
    result = await ctx.session.execute(
        text(
            f"""
            select *
            from public.reporting_saved_views
            where {" and ".join(filters)}
            order by pinned desc, default_view desc, updated_at desc
            limit :limit offset :offset
            """
        ),
        params,
    )
    rows = [normalize_row(row) for row in result.mappings()]
    visible_rows = [row for row in rows if can_access_saved_view(ctx, row)]
    return ListResult(data=visible_rows, meta=meta(query.page, query.page_size, len(visible_rows)))


async def get_saved_view(ctx: ReportingQueryContext, view_id: str, *, write: bool = False) -> dict[str, Any]:
    await ensure_advanced_reporting_tables(ctx.session, saved_views=True)
    result = await ctx.session.execute(
        text(
            """
            select *
            from public.reporting_saved_views
            where tenant_id = :tenant_id and id = :view_id and coalesce(is_deleted, false) = false
            limit 1
            """
        ),
        {"tenant_id": ctx.tenant_id, "view_id": view_id},
    )
    row = result.mappings().one_or_none()
    if not row:
        raise DomainError("Kayitli gorunum bulunamadi.", "SAVED_VIEW_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    view = normalize_row(row)
    assert_saved_view_access(ctx, view, write=write)
    if view.get("report_key"):
        assert_report_view_allowed(ctx, str(view["report_key"]))
    return view


async def create_saved_view(ctx: ReportingQueryContext, request: SavedViewCreateRequest) -> dict[str, Any]:
    await ensure_advanced_reporting_tables(ctx.session, saved_views=True)
    owner_user_id = require_user_id(ctx)
    if request.report_key:
        assert_report_view_allowed(ctx, request.report_key)
    _assert_share_permission(ctx, request.visibility)
    if request.default_view:
        await _clear_default(ctx, owner_user_id, request.module_key, request.entity_type, request.report_key)
    inserted = await ctx.session.execute(
        text(
            """
            insert into public.reporting_saved_views (
              tenant_id, owner_user_id, module_key, entity_type, report_key, view_name,
              description, visibility, filters_json, columns_json, sort_json,
              group_by_json, chart_config_json, default_view, pinned,
              shared_role_ids, shared_user_ids
            )
            values (
              :tenant_id, :owner_user_id, :module_key, :entity_type, :report_key, :view_name,
              :description, :visibility, cast(:filters_json as jsonb), cast(:columns_json as jsonb),
              cast(:sort_json as jsonb), cast(:group_by_json as jsonb), cast(:chart_config_json as jsonb),
              :default_view, :pinned, cast(:shared_role_ids as jsonb), cast(:shared_user_ids as jsonb)
            )
            returning *
            """
        ),
        {
            "tenant_id": ctx.tenant_id,
            "owner_user_id": owner_user_id,
            **request.model_dump(exclude={"filters_json", "columns_json", "sort_json", "group_by_json", "chart_config_json", "shared_role_ids", "shared_user_ids"}),
            "filters_json": json_dumps(request.filters_json),
            "columns_json": json_list_dumps(request.columns_json),
            "sort_json": json_dumps(request.sort_json),
            "group_by_json": json_list_dumps(request.group_by_json),
            "chart_config_json": json_dumps(request.chart_config_json),
            "shared_role_ids": json_list_dumps(request.shared_role_ids),
            "shared_user_ids": json_list_dumps(request.shared_user_ids),
        },
    )
    view = normalize_row(inserted.mappings().one())
    await record_reporting_audit_best_effort(ctx, action_type="saved_view_created", entity_type="reporting_saved_view", entity_id=str(view["id"]), metadata={"visibility": request.visibility})
    if request.visibility != "private":
        await record_reporting_audit_best_effort(ctx, action_type="saved_view_shared", entity_type="reporting_saved_view", entity_id=str(view["id"]), metadata={"visibility": request.visibility})
    return view


async def update_saved_view(ctx: ReportingQueryContext, view_id: str, request: SavedViewUpdateRequest) -> dict[str, Any]:
    current = await get_saved_view(ctx, view_id, write=True)
    assert_version(current, request.base_version)
    data = request.model_dump(exclude_unset=True, exclude={"base_version"})
    if "visibility" in data:
        _assert_share_permission(ctx, data["visibility"])
    if data.get("default_view"):
        await _clear_default(ctx, str(current["owner_user_id"]), str(current["module_key"]), current.get("entity_type"), current.get("report_key"))
    set_parts: list[str] = []
    params: dict[str, Any] = {"tenant_id": ctx.tenant_id, "view_id": view_id}
    for key, value in data.items():
        if key not in SAVED_VIEW_MUTABLE:
            continue
        if key in SAVED_VIEW_MUTABLE_JSON:
            set_parts.append(f"{key} = cast(:{key} as jsonb)")
            params[key] = json_list_dumps(value) if isinstance(value, list) else json_dumps(value)
        else:
            set_parts.append(f"{key} = :{key}")
            params[key] = value
    if not set_parts:
        return current
    set_parts.extend(["updated_at = now()", "version = version + 1"])
    result = await ctx.session.execute(
        text(
            f"""
            update public.reporting_saved_views
            set {", ".join(set_parts)}
            where tenant_id = :tenant_id and id = :view_id and coalesce(is_deleted, false) = false
            returning *
            """
        ),
        params,
    )
    view = normalize_row(result.mappings().one())
    await record_reporting_audit_best_effort(ctx, action_type="saved_view_updated", entity_type="reporting_saved_view", entity_id=view_id)
    return view


async def delete_saved_view(ctx: ReportingQueryContext, view_id: str) -> dict[str, Any]:
    await get_saved_view(ctx, view_id, write=True)
    await ctx.session.execute(
        text(
            """
            update public.reporting_saved_views
            set is_deleted = true, updated_at = now(), version = version + 1
            where tenant_id = :tenant_id and id = :view_id
            """
        ),
        {"tenant_id": ctx.tenant_id, "view_id": view_id},
    )
    await record_reporting_audit_best_effort(ctx, action_type="saved_view_deleted", entity_type="reporting_saved_view", entity_id=view_id)
    return {"id": view_id, "deleted": True}


async def set_default_saved_view(ctx: ReportingQueryContext, view_id: str) -> dict[str, Any]:
    current = await get_saved_view(ctx, view_id, write=True)
    await _clear_default(ctx, str(current["owner_user_id"]), str(current["module_key"]), current.get("entity_type"), current.get("report_key"))
    await ctx.session.execute(
        text("update public.reporting_saved_views set default_view = true, updated_at = now(), version = version + 1 where tenant_id = :tenant_id and id = :view_id"),
        {"tenant_id": ctx.tenant_id, "view_id": view_id},
    )
    return await get_saved_view(ctx, view_id)


async def pin_saved_view(ctx: ReportingQueryContext, view_id: str, request: SavedViewPinRequest) -> dict[str, Any]:
    await get_saved_view(ctx, view_id, write=True)
    await ctx.session.execute(
        text("update public.reporting_saved_views set pinned = :pinned, updated_at = now(), version = version + 1 where tenant_id = :tenant_id and id = :view_id"),
        {"tenant_id": ctx.tenant_id, "view_id": view_id, "pinned": request.pinned},
    )
    return await get_saved_view(ctx, view_id)


async def _clear_default(ctx: ReportingQueryContext, owner_user_id: str, module_key: str, entity_type: str | None, report_key: str | None) -> None:
    await ctx.session.execute(
        text(
            """
            update public.reporting_saved_views
            set default_view = false, updated_at = now()
            where tenant_id = :tenant_id
              and owner_user_id = cast(:owner_user_id as uuid)
              and module_key = :module_key
              and coalesce(entity_type, '') = coalesce(:entity_type, '')
              and coalesce(report_key, '') = coalesce(:report_key, '')
            """
        ),
        {"tenant_id": ctx.tenant_id, "owner_user_id": owner_user_id, "module_key": module_key, "entity_type": entity_type, "report_key": report_key},
    )


def _assert_share_permission(ctx: ReportingQueryContext, visibility: str | None) -> None:
    if visibility and visibility != "private":
        require_permission(ctx, "reporting.savedViewsManage")
