# ruff: noqa: E501

from __future__ import annotations

from sqlalchemy import text

from app.domains.reporting.schemas import DashboardPreferencesRequest
from app.domains.reporting.service import (
    ReportingQueryContext,
    ensure_advanced_reporting_tables,
    json_dumps,
    json_list_dumps,
    normalize_row,
    record_reporting_audit_best_effort,
    require_permission,
    require_user_id,
)


async def get_dashboard_preferences(ctx: ReportingQueryContext) -> dict[str, object]:
    await ensure_advanced_reporting_tables(ctx.session, dashboard_preferences=True)
    user_id = require_user_id(ctx)
    result = await ctx.session.execute(
        text(
            """
            select *
            from public.reporting_dashboard_preferences
            where tenant_id = :tenant_id and user_id = cast(:user_id as uuid)
            limit 1
            """
        ),
        {"tenant_id": ctx.tenant_id, "user_id": user_id},
    )
    row = result.mappings().one_or_none()
    if row:
        return normalize_row(row)
    return {
        "tenant_id": ctx.tenant_id,
        "user_id": user_id,
        "layout_json": [],
        "hidden_widgets": [],
        "pinned_reports": [],
        "default_filters": {},
        "version": 0,
    }


async def upsert_dashboard_preferences(ctx: ReportingQueryContext, request: DashboardPreferencesRequest) -> dict[str, object]:
    require_permission(ctx, "reporting.dashboardCustomize")
    await ensure_advanced_reporting_tables(ctx.session, dashboard_preferences=True)
    user_id = require_user_id(ctx)
    result = await ctx.session.execute(
        text(
            """
            insert into public.reporting_dashboard_preferences (
              tenant_id, user_id, layout_json, hidden_widgets, pinned_reports, default_filters
            )
            values (
              :tenant_id, cast(:user_id as uuid), cast(:layout_json as jsonb),
              cast(:hidden_widgets as jsonb), cast(:pinned_reports as jsonb), cast(:default_filters as jsonb)
            )
            on conflict (tenant_id, user_id)
            do update set
              layout_json = excluded.layout_json,
              hidden_widgets = excluded.hidden_widgets,
              pinned_reports = excluded.pinned_reports,
              default_filters = excluded.default_filters,
              updated_at = now(),
              version = reporting_dashboard_preferences.version + 1
            returning *
            """
        ),
        {
            "tenant_id": ctx.tenant_id,
            "user_id": user_id,
            "layout_json": json_list_dumps(request.layout_json),
            "hidden_widgets": json_list_dumps(request.hidden_widgets),
            "pinned_reports": json_list_dumps(request.pinned_reports),
            "default_filters": json_dumps(request.default_filters),
        },
    )
    preferences = normalize_row(result.mappings().one())
    await record_reporting_audit_best_effort(ctx, action_type="dashboard_preferences_updated", entity_type="reporting_dashboard_preferences", entity_id=str(preferences["id"]))
    return preferences
