# ruff: noqa: E501

from __future__ import annotations

from time import perf_counter
from typing import Any

from fastapi import status
from sqlalchemy import text

from app.core.errors import DomainError
from app.domains.reporting.report_permissions import (
    assert_report_export_allowed,
    assert_report_view_allowed,
)
from app.domains.reporting.report_renderer import render_report
from app.domains.reporting.schemas import (
    ListResult,
    ScheduledReportCreateRequest,
    ScheduledReportListQuery,
    ScheduledReportUpdateRequest,
)
from app.domains.reporting.service import (
    ReportingQueryContext,
    assert_version,
    create_reporting_notification_best_effort,
    ensure_advanced_reporting_tables,
    json_dumps,
    json_list_dumps,
    meta,
    next_run_for_rule,
    normalize_row,
    record_reporting_audit_best_effort,
    require_permission,
    require_user_id,
)

SCHEDULE_MUTABLE = {
    "schedule_name",
    "description",
    "saved_view_id",
    "recipients_json",
    "schedule_rule",
    "timezone",
    "next_run_at",
    "status",
    "export_format",
    "email_enabled",
    "email_subject_template",
    "email_body_template",
}


async def list_scheduled_reports(ctx: ReportingQueryContext, query: ScheduledReportListQuery) -> ListResult:
    await ensure_advanced_reporting_tables(ctx.session, scheduled_reports=True)
    filters = ["tenant_id = :tenant_id"]
    params: dict[str, Any] = {"tenant_id": ctx.tenant_id, "limit": query.page_size, "offset": (query.page - 1) * query.page_size}
    if query.status:
        filters.append("status = :status")
        params["status"] = query.status
    if query.report_key:
        filters.append("report_key = :report_key")
        params["report_key"] = query.report_key
    if query.owner_user_id:
        filters.append("owner_user_id = cast(:owner_user_id as uuid)")
        params["owner_user_id"] = query.owner_user_id
    elif not _can_manage_schedules(ctx):
        filters.append("owner_user_id = cast(:owner_user_id as uuid)")
        params["owner_user_id"] = require_user_id(ctx)
    result = await ctx.session.execute(
        text(
            f"""
            select *, count(*) over() as total_count
            from public.reporting_scheduled_reports
            where {" and ".join(filters)}
            order by next_run_at asc, updated_at desc
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


async def get_scheduled_report(ctx: ReportingQueryContext, schedule_id: str, *, write: bool = False) -> dict[str, Any]:
    await ensure_advanced_reporting_tables(ctx.session, scheduled_reports=True)
    result = await ctx.session.execute(
        text("select * from public.reporting_scheduled_reports where tenant_id = :tenant_id and id = :schedule_id limit 1"),
        {"tenant_id": ctx.tenant_id, "schedule_id": schedule_id},
    )
    row = result.mappings().one_or_none()
    if not row:
        raise DomainError("Zamanlanmis rapor bulunamadi.", "SCHEDULED_REPORT_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    schedule = normalize_row(row)
    if not _can_manage_schedules(ctx) and str(schedule.get("owner_user_id")) != str(ctx.request_context.user_id):
        raise DomainError("Zamanlanmis rapor erisim kapsaminiz disinda.", "SCHEDULED_REPORT_SCOPE_DENIED", status.HTTP_403_FORBIDDEN)
    if write and not (_can_manage_schedules(ctx) or str(schedule.get("owner_user_id")) == str(ctx.request_context.user_id)):
        raise DomainError("Zamanlanmis raporu guncelleme yetkiniz yok.", "SCHEDULED_REPORT_WRITE_DENIED", status.HTTP_403_FORBIDDEN)
    return schedule


async def create_scheduled_report(ctx: ReportingQueryContext, request: ScheduledReportCreateRequest) -> dict[str, Any]:
    require_permission(ctx, "reporting.scheduledReportsManage")
    assert_report_view_allowed(ctx, request.report_key)
    assert_report_export_allowed(ctx, request.report_key)
    await ensure_advanced_reporting_tables(ctx.session, scheduled_reports=True)
    owner_user_id = require_user_id(ctx)
    next_run_at = request.next_run_at or next_run_for_rule(request.schedule_rule)
    inserted = await ctx.session.execute(
        text(
            """
            insert into public.reporting_scheduled_reports (
              tenant_id, report_key, saved_view_id, schedule_name, description,
              owner_user_id, recipients_json, schedule_rule, timezone, next_run_at,
              export_format, email_enabled, email_subject_template, email_body_template
            )
            values (
              :tenant_id, :report_key, :saved_view_id, :schedule_name, :description,
              :owner_user_id, cast(:recipients_json as jsonb), :schedule_rule, :timezone,
              :next_run_at, :export_format, :email_enabled, :email_subject_template,
              :email_body_template
            )
            returning *
            """
        ),
        {
            "tenant_id": ctx.tenant_id,
            "owner_user_id": owner_user_id,
            **request.model_dump(exclude={"recipients_json", "next_run_at"}),
            "recipients_json": json_list_dumps(request.recipients_json),
            "next_run_at": next_run_at,
        },
    )
    schedule = normalize_row(inserted.mappings().one())
    await record_reporting_audit_best_effort(ctx, action_type="scheduled_report_created", entity_type="reporting_scheduled_report", entity_id=str(schedule["id"]), metadata={"report_key": request.report_key})
    return schedule


async def update_scheduled_report(ctx: ReportingQueryContext, schedule_id: str, request: ScheduledReportUpdateRequest) -> dict[str, Any]:
    require_permission(ctx, "reporting.scheduledReportsManage")
    current = await get_scheduled_report(ctx, schedule_id, write=True)
    assert_version(current, request.base_version)
    data = request.model_dump(exclude_unset=True, exclude={"base_version"})
    set_parts: list[str] = []
    params: dict[str, Any] = {"tenant_id": ctx.tenant_id, "schedule_id": schedule_id}
    for key, value in data.items():
        if key not in SCHEDULE_MUTABLE:
            continue
        if key == "recipients_json":
            set_parts.append("recipients_json = cast(:recipients_json as jsonb)")
            params[key] = json_list_dumps(value)
        else:
            set_parts.append(f"{key} = :{key}")
            params[key] = value
    if not set_parts:
        return current
    set_parts.extend(["updated_at = now()", "version = version + 1"])
    result = await ctx.session.execute(
        text(f"update public.reporting_scheduled_reports set {', '.join(set_parts)} where tenant_id = :tenant_id and id = :schedule_id returning *"),
        params,
    )
    schedule = normalize_row(result.mappings().one())
    await record_reporting_audit_best_effort(ctx, action_type="scheduled_report_updated", entity_type="reporting_scheduled_report", entity_id=schedule_id)
    return schedule


async def set_scheduled_report_status(ctx: ReportingQueryContext, schedule_id: str, status_value: str) -> dict[str, Any]:
    require_permission(ctx, "reporting.scheduledReportsManage")
    await get_scheduled_report(ctx, schedule_id, write=True)
    await ctx.session.execute(
        text("update public.reporting_scheduled_reports set status = :status, updated_at = now(), version = version + 1 where tenant_id = :tenant_id and id = :schedule_id"),
        {"tenant_id": ctx.tenant_id, "schedule_id": schedule_id, "status": status_value},
    )
    return await get_scheduled_report(ctx, schedule_id)


async def run_scheduled_report_now(ctx: ReportingQueryContext, schedule_id: str) -> dict[str, Any]:
    schedule = await get_scheduled_report(ctx, schedule_id)
    return await run_scheduled_report(ctx, schedule)


async def run_scheduled_report(ctx: ReportingQueryContext, schedule: dict[str, Any]) -> dict[str, Any]:
    started = perf_counter()
    recipients = schedule.get("recipients_json") or []
    skipped: list[dict[str, Any]] = []
    delivered: list[dict[str, Any]] = []
    try:
        assert_report_view_allowed(ctx, str(schedule["report_key"]))
        result = await render_report(ctx, str(schedule["report_key"]), ctx.filters, saved_view_id=str(schedule["saved_view_id"]) if schedule.get("saved_view_id") else None)
        required_permissions = _required_permissions_for_schedule(schedule)
        for recipient in recipients:
            if _recipient_allowed(recipient, required_permissions):
                delivered.append(await _deliver_to_recipient(ctx, schedule, recipient, int(result.meta.get("total") or len(result.data))))
            else:
                skipped.append({"recipient": recipient, "reason": "permission_check_failed"})
        status_value = "completed_with_skips" if skipped else "completed"
        await _update_after_run(ctx, schedule, status_value, None, int(result.meta.get("total") or len(result.data)))
        await _record_run_log(ctx, schedule, "scheduled", status_value, row_count=int(result.meta.get("total") or len(result.data)), duration_ms=_duration_ms(started), metadata={"delivered": delivered, "skipped": skipped})
        if skipped:
            await create_reporting_notification_best_effort(ctx, user_id=str(schedule["owner_user_id"]), notification_type="report_run_skipped_recipients", title="Rapor alicilari atlandi", message=f"{schedule['schedule_name']} calismasinda {len(skipped)} alici atlandi.", related_entity_type="reporting_scheduled_report", related_entity_id=str(schedule["id"]), priority="high", severity="warning")
        return {"schedule": await get_scheduled_report(ctx, str(schedule["id"])), "delivered": delivered, "skipped": skipped, "row_count": int(result.meta.get("total") or len(result.data))}
    except DomainError as error:
        await _update_after_run(ctx, schedule, "failed", error.message, None)
        await _record_run_log(ctx, schedule, "scheduled", "failed", error_message=error.message, duration_ms=_duration_ms(started), metadata={"skipped": skipped})
        await create_reporting_notification_best_effort(ctx, user_id=str(schedule["owner_user_id"]), notification_type="scheduled_report_failed", title="Zamanlanmis rapor basarisiz", message=error.message, related_entity_type="reporting_scheduled_report", related_entity_id=str(schedule["id"]), priority="high", severity="error")
        raise


async def _update_after_run(ctx: ReportingQueryContext, schedule: dict[str, Any], status_value: str, error_message: str | None, row_count: int | None) -> None:
    next_run_at = next_run_for_rule(str(schedule.get("schedule_rule") or "weekly"))
    await ctx.session.execute(
        text(
            """
            update public.reporting_scheduled_reports
            set last_run_at = now(),
                next_run_at = :next_run_at,
                last_result_status = :last_result_status,
                last_error = :last_error,
                status = case when :failed then 'failed' else status end,
                updated_at = now(),
                version = version + 1
            where tenant_id = :tenant_id and id = :schedule_id
            """
        ),
        {"tenant_id": ctx.tenant_id, "schedule_id": schedule["id"], "next_run_at": next_run_at, "last_result_status": status_value, "last_error": error_message, "failed": status_value == "failed", "row_count": row_count},
    )


async def _record_run_log(ctx: ReportingQueryContext, schedule: dict[str, Any], run_type: str, status_value: str, *, row_count: int | None = None, duration_ms: int | None = None, error_message: str | None = None, metadata: dict[str, Any] | None = None) -> None:
    await ensure_advanced_reporting_tables(ctx.session, run_logs=True)
    await ctx.session.execute(
        text(
            """
            insert into public.reporting_report_run_logs (
              tenant_id, report_key, scheduled_report_id, run_type, status,
              row_count, duration_ms, error_message, run_by, metadata_json
            )
            values (
              :tenant_id, :report_key, :scheduled_report_id, :run_type, :status,
              :row_count, :duration_ms, :error_message, :run_by, cast(:metadata_json as jsonb)
            )
            """
        ),
        {"tenant_id": ctx.tenant_id, "report_key": schedule["report_key"], "scheduled_report_id": schedule["id"], "run_type": run_type, "status": status_value, "row_count": row_count, "duration_ms": duration_ms, "error_message": error_message, "run_by": ctx.request_context.user_id, "metadata_json": json_dumps(metadata or {})},
    )


async def _deliver_to_recipient(ctx: ReportingQueryContext, schedule: dict[str, Any], recipient: dict[str, Any], row_count: int) -> dict[str, Any]:
    if recipient.get("delivery_channel", "email") == "in_app" and recipient.get("user_id"):
        await create_reporting_notification_best_effort(ctx, user_id=str(recipient["user_id"]), notification_type="scheduled_report_sent", title=schedule["schedule_name"], message=f"{row_count} satirlik rapor hazirlandi.", related_entity_type="reporting_scheduled_report", related_entity_id=str(schedule["id"]))
        return {"recipient": recipient, "status": "in_app_queued"}
    if schedule.get("email_enabled") and recipient.get("email"):
        try:
            from app.domains.notifications.email import queue_email_message
            from app.domains.notifications.schemas import EmailMessageCreate

            await queue_email_message(
                ctx.session,
                {"tenant_id": ctx.tenant_id, "user_id": ctx.request_context.user_id},
                EmailMessageCreate(
                    user_id=recipient.get("user_id"),
                    to_email=str(recipient["email"]),
                    subject=str(schedule.get("email_subject_template") or f"{schedule['schedule_name']} raporu"),
                    body_text=str(schedule.get("email_body_template") or f"{schedule['report_key']} raporu {row_count} satir ile hazirlandi."),
                    related_entity_type="reporting_scheduled_report",
                    related_entity_id=str(schedule["id"]),
                    metadata_json={"source": "scheduled_report", "row_count": row_count},
                ),
            )
            return {"recipient": recipient, "status": "email_queued"}
        except Exception:
            await ctx.session.rollback()
            return {"recipient": recipient, "status": "email_best_effort_failed"}
    return {"recipient": recipient, "status": "skipped_no_channel"}


def _required_permissions_for_schedule(schedule: dict[str, Any]) -> list[str]:
    return [str(item) for item in (schedule.get("required_permissions") or []) if item]


def _recipient_allowed(recipient: dict[str, Any], required_permissions: list[str]) -> bool:
    if recipient.get("permission_check_required", True) is False:
        return True
    if not required_permissions:
        return True
    granted = {str(item) for item in recipient.get("permissions") or []}
    return set(required_permissions).issubset(granted)


def _duration_ms(started: float) -> int:
    return max(1, int((perf_counter() - started) * 1000))


def _can_manage_schedules(ctx: ReportingQueryContext) -> bool:
    return bool(ctx.request_context.user_id and ("reporting.admin" in ctx.request_context.permissions or "reporting.scheduledReportsManage" in ctx.request_context.permissions))
