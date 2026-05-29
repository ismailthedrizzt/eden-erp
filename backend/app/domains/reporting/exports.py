# ruff: noqa: E501

from __future__ import annotations

from time import perf_counter
from typing import Any

from fastapi import status
from sqlalchemy import text

from app.core.errors import DomainError
from app.domains.reporting.report_permissions import assert_report_export_allowed
from app.domains.reporting.report_renderer import render_report
from app.domains.reporting.schemas import (
    ExportJobListQuery,
    ExportRequest,
    ListResult,
    ReportingFilter,
)
from app.domains.reporting.service import (
    ReportingQueryContext,
    create_reporting_notification_best_effort,
    ensure_advanced_reporting_tables,
    export_expiry,
    json_dumps,
    json_list_dumps,
    max_export_rows,
    meta,
    normalize_row,
    record_reporting_audit_best_effort,
    require_user_id,
)


async def prepare_report_export(ctx: ReportingQueryContext, report_key: str, request: ExportRequest) -> dict[str, Any]:
    assert_report_export_allowed(ctx, report_key)
    await ensure_advanced_reporting_tables(ctx.session, export_jobs=True, run_logs=True)
    user_id = require_user_id(ctx)
    inserted = await ctx.session.execute(
        text(
            """
            insert into public.reporting_export_jobs (
              tenant_id, report_key, saved_view_id, requested_by, export_format,
              filters_json, columns_json, status, expires_at
            )
            values (
              :tenant_id, :report_key, :saved_view_id, :requested_by, :export_format,
              cast(:filters_json as jsonb), cast(:columns_json as jsonb), 'queued', :expires_at
            )
            returning *
            """
        ),
        {
            "tenant_id": ctx.tenant_id,
            "report_key": report_key,
            "saved_view_id": request.saved_view_id,
            "requested_by": user_id,
            "export_format": request.format,
            "filters_json": json_dumps(request.filters.model_dump(mode="json")),
            "columns_json": json_list_dumps(request.columns),
            "expires_at": export_expiry(),
        },
    )
    job = normalize_row(inserted.mappings().one())
    await record_reporting_audit_best_effort(ctx, action_type="report_export_requested", entity_type="reporting_export_job", entity_id=str(job["id"]), metadata={"report_key": report_key, "format": request.format})
    return await run_export_job(ctx, str(job["id"]))


async def run_export_job(ctx: ReportingQueryContext, export_id: str) -> dict[str, Any]:
    job = await get_export_job(ctx, export_id)
    started = perf_counter()
    await ctx.session.execute(text("update public.reporting_export_jobs set status = 'running' where tenant_id = :tenant_id and id = :export_id"), {"tenant_id": ctx.tenant_id, "export_id": export_id})
    try:
        filters = ReportingFilter(**(job.get("filters_json") or {}))
        result = await render_report(ctx, str(job["report_key"]), filters, saved_view_id=str(job["saved_view_id"]) if job.get("saved_view_id") else None, columns=[str(item) for item in job.get("columns_json") or []])
        row_count = int(result.meta.get("total") or len(result.data))
        if row_count > max_export_rows():
            raise DomainError("Bu rapor cok buyuk. Filtreleri daraltin.", "REPORT_EXPORT_ROW_LIMIT_EXCEEDED", status.HTTP_422_UNPROCESSABLE_ENTITY, {"max_rows": max_export_rows(), "row_count": row_count})
        file_ref = {
            "type": "generated_preview",
            "format": job["export_format"],
            "row_count": row_count,
            "columns": result.columns,
            "download_ready": True,
        }
        await ctx.session.execute(
            text(
                """
                update public.reporting_export_jobs
                set status = 'completed',
                    row_count = :row_count,
                    file_ref = cast(:file_ref as jsonb),
                    completed_at = now()
                where tenant_id = :tenant_id and id = :export_id
                """
            ),
            {"tenant_id": ctx.tenant_id, "export_id": export_id, "row_count": row_count, "file_ref": json_dumps(file_ref)},
        )
        await _record_run_log(ctx, report_key=str(job["report_key"]), export_id=export_id, run_type="export", status_value="completed", row_count=row_count, duration_ms=_duration_ms(started))
        await create_reporting_notification_best_effort(ctx, user_id=str(job["requested_by"]), notification_type="export_ready", title="Rapor export hazir", message=f"{job['report_key']} export hazir.", related_entity_type="reporting_export_job", related_entity_id=export_id)
    except DomainError as error:
        await ctx.session.execute(
            text(
                """
                update public.reporting_export_jobs
                set status = 'failed',
                    error_message = :error_message,
                    completed_at = now()
                where tenant_id = :tenant_id and id = :export_id
                """
            ),
            {"tenant_id": ctx.tenant_id, "export_id": export_id, "error_message": error.message},
        )
        await _record_run_log(ctx, report_key=str(job["report_key"]), export_id=export_id, run_type="export", status_value="failed", error_message=error.message, duration_ms=_duration_ms(started))
    return await get_export_job(ctx, export_id)


async def list_export_jobs(ctx: ReportingQueryContext, query: ExportJobListQuery) -> ListResult:
    await ensure_advanced_reporting_tables(ctx.session, export_jobs=True)
    filters = ["tenant_id = :tenant_id"]
    params: dict[str, Any] = {"tenant_id": ctx.tenant_id, "limit": query.page_size, "offset": (query.page - 1) * query.page_size}
    if query.status:
        filters.append("status = :status")
        params["status"] = query.status
    if query.report_key:
        filters.append("report_key = :report_key")
        params["report_key"] = query.report_key
    if query.requested_by:
        filters.append("requested_by = cast(:requested_by as uuid)")
        params["requested_by"] = query.requested_by
    elif not _can_manage_exports(ctx):
        filters.append("requested_by = cast(:requested_by as uuid)")
        params["requested_by"] = require_user_id(ctx)
    result = await ctx.session.execute(
        text(
            f"""
            select *, count(*) over() as total_count
            from public.reporting_export_jobs
            where {" and ".join(filters)}
            order by created_at desc
            limit :limit offset :offset
            """
        ),
        params,
    )
    rows = [normalize_row(row) for row in result.mappings()]
    total = int(rows[0].pop("total_count")) if rows else 0
    for row in rows[1:]:
        row.pop("total_count", None)
    return ListResult(data=rows, meta=meta(query.page, query.page_size, total))


async def get_export_job(ctx: ReportingQueryContext, export_id: str) -> dict[str, Any]:
    await ensure_advanced_reporting_tables(ctx.session, export_jobs=True)
    result = await ctx.session.execute(
        text("select * from public.reporting_export_jobs where tenant_id = :tenant_id and id = :export_id limit 1"),
        {"tenant_id": ctx.tenant_id, "export_id": export_id},
    )
    row = result.mappings().one_or_none()
    if not row:
        raise DomainError("Export job bulunamadi.", "EXPORT_JOB_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    job = normalize_row(row)
    if not _can_manage_exports(ctx) and str(job.get("requested_by")) != str(ctx.request_context.user_id):
        raise DomainError("Export job erisim kapsaminiz disinda.", "EXPORT_JOB_SCOPE_DENIED", status.HTTP_403_FORBIDDEN)
    return job


async def get_export_download_url(ctx: ReportingQueryContext, export_id: str) -> dict[str, Any]:
    job = await get_export_job(ctx, export_id)
    if job.get("status") != "completed":
        raise DomainError("Export dosyasi henuz hazir degil.", "EXPORT_JOB_NOT_READY", status.HTTP_409_CONFLICT)
    await record_reporting_audit_best_effort(ctx, action_type="report_export_downloaded", entity_type="reporting_export_job", entity_id=export_id, metadata={"report_key": job.get("report_key")})
    return {
        "export_id": export_id,
        "download_url": f"/api/reporting/exports/{export_id}/download-url?prepared=true",
        "expires_at": job.get("expires_at"),
        "file_ref": job.get("file_ref"),
    }


async def _record_run_log(
    ctx: ReportingQueryContext,
    *,
    report_key: str,
    export_id: str | None,
    run_type: str,
    status_value: str,
    row_count: int | None = None,
    duration_ms: int | None = None,
    error_message: str | None = None,
) -> None:
    await ensure_advanced_reporting_tables(ctx.session, run_logs=True)
    await ctx.session.execute(
        text(
            """
            insert into public.reporting_report_run_logs (
              tenant_id, report_key, export_job_id, run_type, status,
              row_count, duration_ms, error_message, run_by, metadata_json
            )
            values (
              :tenant_id, :report_key, :export_job_id, :run_type, :status,
              :row_count, :duration_ms, :error_message, :run_by, cast(:metadata_json as jsonb)
            )
            """
        ),
        {
            "tenant_id": ctx.tenant_id,
            "report_key": report_key,
            "export_job_id": export_id,
            "run_type": run_type,
            "status": status_value,
            "row_count": row_count,
            "duration_ms": duration_ms,
            "error_message": error_message,
            "run_by": ctx.request_context.user_id,
            "metadata_json": json_dumps({"source": "report_export"}),
        },
    )


def _duration_ms(started: float) -> int:
    return max(1, int((perf_counter() - started) * 1000))


def _can_manage_exports(ctx: ReportingQueryContext) -> bool:
    return bool(ctx.request_context.user_id and ("reporting.admin" in ctx.request_context.permissions or "reporting.exportManage" in ctx.request_context.permissions))
