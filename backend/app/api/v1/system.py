from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import database_pool_summary, get_session, get_session_factory
from app.core.metrics import snapshot_metrics
from app.core.security import require_internal_token
from app.domains.outbox.service import dispatch_pending_events

router = APIRouter()

SessionDep = Annotated[AsyncSession, Depends(get_session)]


@router.post("/outbox/dispatch")
async def dispatch_outbox(
    session: SessionDep,
    request: Request,
    secret: str | None = Query(default=None),
    limit: int | None = Query(default=None),
) -> dict[str, int | list[str]]:
    _ = secret
    require_internal_token(request)
    settings = get_settings()
    batch_size = limit or settings.outbox_batch_size
    async with session.begin():
        return await dispatch_pending_events(
            session,
            batch_size=max(1, min(batch_size, 100)),
            locked_by=settings.worker_id,
        )


@router.get("/metrics")
async def metrics(request: Request) -> dict[str, object]:
    settings = get_settings()
    if settings.effective_auth_required:
        require_internal_token(request)
    if not settings.metrics_enabled:
        return {
            "data": {},
            "message": "Metrics endpoint is disabled for this environment.",
        }
    return {"data": snapshot_metrics(), "message": "Metrics snapshot generated."}


@router.get("/health/deep")
async def deep_health(request: Request) -> dict[str, object]:
    settings = get_settings()
    if settings.effective_auth_required:
        require_internal_token(request)

    checks: dict[str, dict[str, str]] = {}
    status_value = "ok"
    try:
        session_factory = get_session_factory()
    except Exception:
        return {
            "status": "error",
            "service": settings.service_name,
            "version": settings.version,
            "environment": settings.app_env,
            "checks": {
                "database": {
                    "status": "error",
                    "message": "Veri servisi yapilandirilmamis.",
                }
            },
        }

    async with session_factory() as session:
        try:
            await session.execute(text("select 1"))
            checks["database"] = {"status": "ok"}
        except Exception:
            checks["database"] = {"status": "error", "message": "Veri servisi kontrol edilemedi."}
            status_value = "error"

        for table_name in ("outbox_events", "audit_logs", "process_instances"):
            try:
                result = await session.execute(
                    text("select to_regclass(:table_name)"),
                    {"table_name": f"public.{table_name}"},
                )
                if result.scalar_one_or_none():
                    checks[table_name] = {"status": "ok"}
                else:
                    checks[table_name] = {"status": "degraded"}
                    if status_value == "ok":
                        status_value = "degraded"
            except Exception:
                checks[table_name] = {"status": "degraded"}
                if status_value == "ok":
                    status_value = "degraded"

    return {
        "status": status_value,
        "service": settings.service_name,
        "version": settings.version,
        "environment": settings.app_env,
        "pool": database_pool_summary(),
        "checks": checks,
    }


@router.get("/performance/smoke")
async def performance_smoke(request: Request) -> dict[str, object]:
    settings = get_settings()
    if settings.effective_auth_required:
        require_internal_token(request)

    checks: dict[str, object] = {"pool": database_pool_summary()}
    try:
        session_factory = get_session_factory()
    except Exception:
        return {
            "status": "error",
            "service": settings.service_name,
            "environment": settings.app_env,
            "checks": {
                **checks,
                "database": {"status": "error", "message": "Veri servisi yapilandirilmamis."},
            },
        }

    async with session_factory() as session:
        checks["database"] = await _timed_scalar(session, "select 1")
        checks["outbox_pending"] = await _table_count(
            session,
            "outbox_events",
            "status = 'pending'",
        )
        checks["audit_recent"] = await _table_count(
            session,
            "audit_logs",
            "created_at >= now() - interval '1 day'",
        )
        checks["process_open_tasks"] = await _table_count(
            session,
            "process_tasks",
            "status in ('open', 'in_progress', 'overdue')",
        )

    statuses = [
        value.get("status")
        for value in checks.values()
        if isinstance(value, dict) and value.get("status")
    ]
    status_value = (
        "error" if "error" in statuses else "degraded" if "degraded" in statuses else "ok"
    )
    return {
        "status": status_value,
        "service": settings.service_name,
        "environment": settings.app_env,
        "checks": checks,
    }


async def _timed_scalar(session: AsyncSession, sql: str) -> dict[str, object]:
    import time

    started = time.perf_counter()
    try:
        result = await session.execute(text(sql))
        return {
            "status": "ok",
            "value": result.scalar_one_or_none(),
            "duration_ms": round((time.perf_counter() - started) * 1000, 2),
        }
    except Exception:
        return {
            "status": "error",
            "duration_ms": round((time.perf_counter() - started) * 1000, 2),
        }


async def _table_count(
    session: AsyncSession,
    table_name: str,
    where_sql: str,
) -> dict[str, object]:
    exists = await session.execute(
        text("select to_regclass(:table_name)"),
        {"table_name": f"public.{table_name}"},
    )
    if not exists.scalar_one_or_none():
        return {"status": "degraded", "message": "Kaynak tablo hazir degil."}
    return await _timed_scalar(
        session,
        f"select count(*) from public.{table_name} where {where_sql}",
    )
