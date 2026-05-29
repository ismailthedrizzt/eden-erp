# ruff: noqa: E501

from __future__ import annotations

from typing import Any

from fastapi import status
from sqlalchemy import text

from app.core.errors import DomainError
from app.domains.reporting.report_permissions import assert_report_view_allowed
from app.domains.reporting.reports import REPORT_DEFINITIONS, to_definition
from app.domains.reporting.saved_views import get_saved_view
from app.domains.reporting.schemas import (
    CustomReportCreateRequest,
    CustomReportListQuery,
    CustomReportUpdateRequest,
    ListResult,
    ReportDefinition,
)
from app.domains.reporting.service import (
    ReportingQueryContext,
    assert_version,
    can,
    ensure_advanced_reporting_tables,
    json_dumps,
    json_list_dumps,
    meta,
    normalize_row,
    record_reporting_audit_best_effort,
    require_permission,
    require_user_id,
)

CUSTOM_REPORT_JSON_COLUMNS = {"allowed_filters_json", "default_filters_json", "columns_json", "default_sort_json", "chart_config_json", "required_permissions"}
CUSTOM_REPORT_MUTABLE = {
    "report_name",
    "description",
    "report_type",
    "source_type",
    "source_key",
    "allowed_filters_json",
    "default_filters_json",
    "columns_json",
    "default_sort_json",
    "chart_config_json",
    "required_permissions",
    "export_enabled",
    "schedule_enabled",
    "active",
}


async def list_custom_reports(ctx: ReportingQueryContext, query: CustomReportListQuery) -> ListResult:
    await ensure_advanced_reporting_tables(ctx.session, custom_reports=True)
    filters = ["tenant_id = :tenant_id"]
    params: dict[str, Any] = {"tenant_id": ctx.tenant_id, "limit": query.page_size, "offset": (query.page - 1) * query.page_size}
    if query.module_key:
        filters.append("module_key = :module_key")
        params["module_key"] = query.module_key
    if query.source_type:
        filters.append("source_type = :source_type")
        params["source_type"] = query.source_type
    if query.active is not None:
        filters.append("active = :active")
        params["active"] = query.active
    if query.mine:
        filters.append("created_by = cast(:created_by as uuid)")
        params["created_by"] = require_user_id(ctx)
    result = await ctx.session.execute(
        text(
            f"""
            select *
            from public.reporting_custom_reports
            where {" and ".join(filters)}
            order by updated_at desc
            limit :limit offset :offset
            """
        ),
        params,
    )
    rows = [normalize_row(row) for row in result.mappings()]
    visible = [row for row in rows if _custom_report_visible(ctx, row)]
    return ListResult(data=visible, meta=meta(query.page, query.page_size, len(visible)))


async def get_custom_report(ctx: ReportingQueryContext, report_id: str) -> dict[str, Any]:
    await ensure_advanced_reporting_tables(ctx.session, custom_reports=True)
    result = await ctx.session.execute(
        text("select * from public.reporting_custom_reports where tenant_id = :tenant_id and id = :report_id limit 1"),
        {"tenant_id": ctx.tenant_id, "report_id": report_id},
    )
    row = result.mappings().one_or_none()
    if not row:
        raise DomainError("Ozel rapor bulunamadi.", "CUSTOM_REPORT_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    custom = normalize_row(row)
    if not _custom_report_visible(ctx, custom):
        raise DomainError("Ozel rapor icin yetkiniz bulunmuyor.", "CUSTOM_REPORT_PERMISSION_DENIED", status.HTTP_403_FORBIDDEN)
    return custom


async def get_custom_report_by_key(ctx: ReportingQueryContext, report_key: str) -> dict[str, Any] | None:
    await ensure_advanced_reporting_tables(ctx.session, custom_reports=True)
    result = await ctx.session.execute(
        text(
            """
            select *
            from public.reporting_custom_reports
            where tenant_id = :tenant_id and report_key = :report_key and active = true
            limit 1
            """
        ),
        {"tenant_id": ctx.tenant_id, "report_key": report_key},
    )
    row = result.mappings().one_or_none()
    if not row:
        return None
    custom = normalize_row(row)
    if not _custom_report_visible(ctx, custom):
        raise DomainError("Ozel rapor icin yetkiniz bulunmuyor.", "CUSTOM_REPORT_PERMISSION_DENIED", status.HTTP_403_FORBIDDEN)
    return custom


async def create_custom_report(ctx: ReportingQueryContext, request: CustomReportCreateRequest) -> dict[str, Any]:
    require_permission(ctx, "reporting.customReportsManage")
    await ensure_advanced_reporting_tables(ctx.session, custom_reports=True, saved_views=True)
    await _validate_source(ctx, request.source_type, request.source_key)
    if request.report_key in REPORT_DEFINITIONS:
        raise DomainError("Bu report_key sistem raporu tarafindan kullaniliyor.", "CUSTOM_REPORT_KEY_RESERVED", status.HTTP_409_CONFLICT)
    inserted = await ctx.session.execute(
        text(
            """
            insert into public.reporting_custom_reports (
              tenant_id, report_key, report_name, description, module_key, report_type,
              source_type, source_key, allowed_filters_json, default_filters_json,
              columns_json, default_sort_json, chart_config_json, required_permissions,
              export_enabled, schedule_enabled, active, created_by
            )
            values (
              :tenant_id, :report_key, :report_name, :description, :module_key, :report_type,
              :source_type, :source_key, cast(:allowed_filters_json as jsonb),
              cast(:default_filters_json as jsonb), cast(:columns_json as jsonb),
              cast(:default_sort_json as jsonb), cast(:chart_config_json as jsonb),
              cast(:required_permissions as jsonb), :export_enabled, :schedule_enabled,
              :active, :created_by
            )
            returning *
            """
        ),
        {
            "tenant_id": ctx.tenant_id,
            "created_by": require_user_id(ctx),
            **request.model_dump(exclude=CUSTOM_REPORT_JSON_COLUMNS),
            "allowed_filters_json": json_dumps(request.allowed_filters_json),
            "default_filters_json": json_dumps(request.default_filters_json),
            "columns_json": json_list_dumps(request.columns_json),
            "default_sort_json": json_dumps(request.default_sort_json),
            "chart_config_json": json_dumps(request.chart_config_json),
            "required_permissions": json_list_dumps(request.required_permissions),
        },
    )
    custom = normalize_row(inserted.mappings().one())
    await record_reporting_audit_best_effort(ctx, action_type="custom_report_created", entity_type="reporting_custom_report", entity_id=str(custom["id"]), metadata={"report_key": custom["report_key"]})
    return custom


async def update_custom_report(ctx: ReportingQueryContext, report_id: str, request: CustomReportUpdateRequest) -> dict[str, Any]:
    require_permission(ctx, "reporting.customReportsManage")
    current = await get_custom_report(ctx, report_id)
    assert_version(current, request.base_version)
    data = request.model_dump(exclude_unset=True, exclude={"base_version"})
    source_type = data.get("source_type") or current.get("source_type")
    source_key = data.get("source_key") or current.get("source_key")
    if source_type and source_key:
        await _validate_source(ctx, str(source_type), str(source_key))
    set_parts: list[str] = []
    params: dict[str, Any] = {"tenant_id": ctx.tenant_id, "report_id": report_id}
    for key, value in data.items():
        if key not in CUSTOM_REPORT_MUTABLE:
            continue
        if key in CUSTOM_REPORT_JSON_COLUMNS:
            set_parts.append(f"{key} = cast(:{key} as jsonb)")
            params[key] = json_list_dumps(value) if isinstance(value, list) else json_dumps(value)
        else:
            set_parts.append(f"{key} = :{key}")
            params[key] = value
    if not set_parts:
        return current
    set_parts.extend(["updated_at = now()", "version = version + 1"])
    result = await ctx.session.execute(
        text(f"update public.reporting_custom_reports set {', '.join(set_parts)} where tenant_id = :tenant_id and id = :report_id returning *"),
        params,
    )
    custom = normalize_row(result.mappings().one())
    await record_reporting_audit_best_effort(ctx, action_type="custom_report_updated", entity_type="reporting_custom_report", entity_id=report_id)
    return custom


async def delete_custom_report(ctx: ReportingQueryContext, report_id: str) -> dict[str, Any]:
    require_permission(ctx, "reporting.customReportsManage")
    await get_custom_report(ctx, report_id)
    await ctx.session.execute(
        text("update public.reporting_custom_reports set active = false, updated_at = now(), version = version + 1 where tenant_id = :tenant_id and id = :report_id"),
        {"tenant_id": ctx.tenant_id, "report_id": report_id},
    )
    await record_reporting_audit_best_effort(ctx, action_type="custom_report_deleted", entity_type="reporting_custom_report", entity_id=report_id)
    return {"id": report_id, "deleted": True}


async def list_report_catalog(ctx: ReportingQueryContext) -> list[dict[str, Any]]:
    system_reports = [definition.model_dump(mode="json") | {"custom": False} for definition in _system_report_definitions(ctx)]
    custom = await list_custom_reports(ctx, CustomReportListQuery(active=True, page_size=200))
    custom_reports = [_custom_definition(row).model_dump(mode="json") | {"custom": True, "id": row["id"], "source_key": row["source_key"]} for row in custom.data]
    return system_reports + custom_reports


def _system_report_definitions(ctx: ReportingQueryContext) -> list[ReportDefinition]:
    return [
        to_definition(key, item)
        for key, item in REPORT_DEFINITIONS.items()
        if can(ctx.request_context, item["permission"]) or can(ctx.request_context, "reporting.admin")
    ]


def _custom_definition(row: dict[str, Any]) -> ReportDefinition:
    columns = row.get("columns_json") or []
    if not columns and row.get("source_key") in REPORT_DEFINITIONS:
        columns = [{"key": key, "label": key.replace("_", " ").title()} for key in REPORT_DEFINITIONS[str(row["source_key"])]["columns"]]
    return ReportDefinition(
        report_key=str(row["report_key"]),
        title=str(row["report_name"]),
        description=str(row.get("description") or "Ozel rapor tanimi."),
        module_key=str(row["module_key"]),
        required_permission=", ".join(row.get("required_permissions") or ["reporting.view"]),
        filters=list((row.get("allowed_filters_json") or {}).keys()) or ["company_id", "date_from", "date_to", "status"],
        columns=columns,
        default_sort=(row.get("default_sort_json") or {}).get("key"),
        export_enabled=bool(row.get("export_enabled")),
    )


async def _validate_source(ctx: ReportingQueryContext, source_type: str, source_key: str) -> None:
    if source_type in {"predefined_projection", "predefined_report"}:
        if source_key not in REPORT_DEFINITIONS:
            raise DomainError("Rapor kaynagi whitelist icinde degil.", "REPORT_SOURCE_NOT_ALLOWED", status.HTTP_422_UNPROCESSABLE_ENTITY)
        assert_report_view_allowed(ctx, source_key)
        return
    if source_type == "saved_view":
        await get_saved_view(ctx, source_key)
        return
    raise DomainError("Desteklenmeyen rapor kaynagi.", "REPORT_SOURCE_TYPE_INVALID", status.HTTP_422_UNPROCESSABLE_ENTITY)


def _custom_report_visible(ctx: ReportingQueryContext, row: dict[str, Any]) -> bool:
    if can(ctx.request_context, "reporting.admin"):
        return True
    required = [str(item) for item in row.get("required_permissions") or []]
    if not required:
        required = ["reporting.view"]
    return all(can(ctx.request_context, permission) for permission in required)
