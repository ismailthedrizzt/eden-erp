# ruff: noqa: E501

from __future__ import annotations

from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import database_pool_summary
from app.core.metrics import snapshot_metrics
from app.domains.operations.service import table_exists
from app.setup.readiness_checker import check_tenant_readiness


async def admin_health(session: AsyncSession, tenant_id: str) -> dict[str, Any]:
    settings = get_settings()
    checks: dict[str, Any] = {
        "next_app": {"status": "ok", "label": "Next app"},
        "fastapi": {"status": "ok", "label": "FastAPI"},
        "database": await _database_check(session),
        "storage": {"status": "configured" if settings.supabase_url else "missing", "label": "Storage"},
        "auth": {"status": "configured" if settings.supabase_url else "missing", "label": "Auth"},
        "audit": await _table_check(session, "audit_logs"),
        "outbox": await _outbox_check(session, tenant_id),
        "email_queue": await _email_check(session),
    }
    readiness = await check_tenant_readiness(session, tenant_id)
    statuses = [str(value.get("status")) for value in checks.values() if isinstance(value, dict)]
    status_value = "error" if "error" in statuses else "warning" if {"missing", "degraded"} & set(statuses) else "ok"
    return {
        "status": status_value,
        "environment": settings.app_env,
        "service": settings.service_name,
        "version": settings.version,
        "pool": database_pool_summary(),
        "checks": checks,
        "module_readiness": {
            "total": len(readiness.modules),
            "ready": sum(1 for module in readiness.modules.values() if module.ok),
            "setup_required": sum(1 for module in readiness.modules.values() if not module.ok),
            "warnings": readiness.warnings[:5],
        },
        "metrics": snapshot_metrics(),
    }


async def deep_admin_health(session: AsyncSession, tenant_id: str) -> dict[str, Any]:
    health = await admin_health(session, tenant_id)
    health["technical"] = {
        "feature_flag_count": len(snapshot_metrics().get("counters", {})),
        "secrets_exposed": False,
        "details_are_admin_only": True,
    }
    return health


async def outbox_summary(session: AsyncSession, tenant_id: str) -> dict[str, Any]:
    if not await table_exists(session, "public.outbox_events"):
        return {"available": False, "counts": {}, "recent_failed": [], "oldest_pending_age_minutes": None}
    counts = await session.execute(
        text(
            """
            select status, count(*)::int as count
            from public.outbox_events
            where tenant_id = :tenant_id
            group by status
            """
        ),
        {"tenant_id": tenant_id},
    )
    failed = await session.execute(
        text(
            """
            select id, event_type, aggregate_type, aggregate_id, status, retry_count,
                   created_at, updated_at, error_json
            from public.outbox_events
            where tenant_id = :tenant_id and status in ('failed', 'dead_letter')
            order by updated_at desc nulls last, created_at desc
            limit 20
            """
        ),
        {"tenant_id": tenant_id},
    )
    oldest = await session.execute(
        text(
            """
            select extract(epoch from (now() - min(created_at))) / 60
            from public.outbox_events
            where tenant_id = :tenant_id and status = 'pending'
            """
        ),
        {"tenant_id": tenant_id},
    )
    counts_map = {
        str(row["status"]): int(row["count"])
        for row in counts.mappings().all()
    }
    failed_rows = [dict(row) for row in failed.mappings().all()]
    return {
        "available": True,
        "counts": counts_map,
        "recent_failed": failed_rows,
        "oldest_pending_age_minutes": oldest.scalar_one_or_none(),
    }


async def _database_check(session: AsyncSession) -> dict[str, Any]:
    try:
        await session.execute(text("select 1"))
        return {"status": "ok", "label": "Database"}
    except Exception:
        return {"status": "error", "label": "Database", "message": "DB kontrol edilemedi."}


async def _table_check(session: AsyncSession, table_name: str) -> dict[str, Any]:
    exists = await table_exists(session, f"public.{table_name}")
    return {"status": "ok" if exists else "missing", "label": table_name}


async def _outbox_check(session: AsyncSession, tenant_id: str) -> dict[str, Any]:
    summary = await outbox_summary(session, tenant_id)
    if not summary.get("available"):
        return {"status": "missing", "label": "Outbox"}
    failed = int(summary.get("counts", {}).get("failed", 0)) + int(
        summary.get("counts", {}).get("dead_letter", 0)
    )
    return {"status": "degraded" if failed else "ok", "label": "Outbox", "failed": failed}


async def _email_check(session: AsyncSession) -> dict[str, Any]:
    if not await table_exists(session, "public.email_messages"):
        return {"status": "missing", "label": "Email queue"}
    return {"status": "ok", "label": "Email queue"}
