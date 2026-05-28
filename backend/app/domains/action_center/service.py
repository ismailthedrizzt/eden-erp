from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.serialization import rows_to_dicts
from app.domains.operations.service import table_exists

DEFAULT_PAGE_SIZE = 50
STUCK_OPERATION_MINUTES = 10
STALE_OUTBOX_MINUTES = 15
SYSTEM_PERMISSIONS = {
    "__eden_demo_allow_all__",
    "settings.view",
    "settings.edit",
    "settings.modulesManage",
    "settings.usersManage",
    "audit.view",
    "admin",
}


def filter_record_items(
    items: list[dict[str, Any]],
    *,
    entity_type: str,
    entity_id: str,
    ) -> list[dict[str, Any]]:
    return [
        item
        for item in items
        if _same_entity_type(item.get("entity_type"), entity_type)
        and (
            item.get("entity_id") == entity_id
            or item.get("company_id") == entity_id
            or item.get("branch_id") == entity_id
        )
    ]


async def list_action_center_items(
    session: AsyncSession,
    context: dict[str, Any],
    query: dict[str, Any],
) -> dict[str, Any]:
    page = max(1, int(query.get("page") or 1))
    requested_page_size = int(query.get("pageSize") or query.get("limit") or DEFAULT_PAGE_SIZE)
    page_size = min(max(1, requested_page_size), 200)
    limit = max(page_size, int(query.get("limit") or page_size))
    items: list[dict[str, Any]] = []
    warnings: list[str] = []

    if await table_exists(session, "public.process_tasks"):
        task_result = await session.execute(
            text(
                """
                select id, tenant_id, process_instance_id, company_id, module_key,
                       entity_type, entity_id, step_key, title, description, status,
                       assigned_to, assigned_role, assigned_permission, due_at,
                       completed_at, updated_at, created_at
                from public.process_tasks
                where tenant_id = :tenant_id
                  and status in ('open', 'in_progress', 'overdue')
                  and coalesce(is_deleted, false) = false
                order by coalesce(due_at, created_at) asc
                limit :limit
                """
            ),
            {"tenant_id": context["tenant_id"], "limit": limit},
        )
        items.extend(
            _normalize_task(row, str(context["tenant_id"]))
            for row in rows_to_dicts(list(task_result.mappings().all()))
        )
    else:
        warnings.append("Gorev kaynagi hazir degil.")

    if await table_exists(session, "public.process_approvals"):
        approval_result = await session.execute(
            text(
                """
                select id, tenant_id, process_instance_id, task_id, company_id,
                       module_key, approval_type, status, requested_by, approver_id,
                       approver_role, approver_permission, requested_at, decided_at,
                       payload_json, created_at, updated_at
                from public.process_approvals
                where tenant_id = :tenant_id
                  and status = 'pending'
                order by requested_at desc
                limit :limit
                """
            ),
            {"tenant_id": context["tenant_id"], "limit": limit},
        )
        items.extend(
            _normalize_approval(row, str(context["tenant_id"]))
            for row in rows_to_dicts(list(approval_result.mappings().all()))
        )
    else:
        warnings.append("Onay kaynagi hazir degil.")

    if await table_exists(session, "public.operation_requests"):
        operation_result = await session.execute(
            text(
                """
                select id, tenant_id, company_id, module_key, entity_type, entity_id,
                       operation_type, operation_status, requested_by, error_json,
                       warning_json, created_at, started_at, completed_at, failed_at
                from public.operation_requests
                where tenant_id = :tenant_id
                  and operation_status in (
                    'failed', 'requires_action', 'accepted', 'processing', 'pending'
                  )
                order by created_at desc
                limit :limit
                """
            ),
            {"tenant_id": context["tenant_id"], "limit": limit},
        )
        for row in rows_to_dicts(list(operation_result.mappings().all())):
            if row.get("operation_status") in {"failed", "requires_action"} or _minutes_since(
                row.get("started_at") or row.get("created_at")
            ) >= STUCK_OPERATION_MINUTES:
                items.append(_normalize_operation(row, str(context["tenant_id"])))

    if _can_see_system_items(context) and await table_exists(session, "public.outbox_events"):
        outbox_result = await session.execute(
            text(
                """
                select id, tenant_id, company_id, module_key, event_type, aggregate_type,
                       aggregate_id, operation_id, process_instance_id, status,
                       retry_count, max_retries, last_error, locked_at, occurred_at,
                       created_at, updated_at
                from public.outbox_events
                where tenant_id = :tenant_id
                  and status in ('failed', 'skipped', 'pending', 'processing')
                order by created_at desc
                limit :limit
                """
            ),
            {"tenant_id": context["tenant_id"], "limit": limit},
        )
        for row in rows_to_dicts(list(outbox_result.mappings().all())):
            if row.get("status") in {"failed", "skipped"} or _minutes_since(
                row.get("locked_at") or row.get("created_at") or row.get("occurred_at")
            ) >= STALE_OUTBOX_MINUTES:
                items.append(_normalize_outbox(row, str(context["tenant_id"])))

    filtered = _filter_items(items, query)
    sorted_items = _sort_items(filtered)
    offset = (page - 1) * page_size
    data = sorted_items[offset : offset + page_size]
    return {
        "data": data,
        "items": data,
        "count": len(filtered),
        "meta": {
            "page": page,
            "pageSize": page_size,
            "total": len(filtered),
            "totalPages": max(1, (len(filtered) + page_size - 1) // page_size),
        },
        "summary": _summary(filtered),
        **({"warnings": warnings} if warnings else {}),
    }


async def action_center_counts(session: AsyncSession, context: dict[str, Any]) -> dict[str, int]:
    result = await list_action_center_items(session, context, {"limit": 500})
    summary = dict(result["summary"])
    summary["total"] = summary["total_open"]
    summary["tasks"] = summary["task_count"]
    summary["approvals"] = summary["approval_count"]
    return summary


async def action_center_summary(session: AsyncSession, context: dict[str, Any]) -> dict[str, Any]:
    summary = await action_center_counts(session, context)
    return {**summary, "has_pending_work": summary["total_open"] > 0}


async def action_center_by_record(
    session: AsyncSession,
    context: dict[str, Any],
    *,
    entity_type: str,
    entity_id: str,
) -> dict[str, Any]:
    result = await list_action_center_items(session, context, {"limit": 500})
    items = filter_record_items(result["items"], entity_type=entity_type, entity_id=entity_id)
    return {
        "data": items,
        "items": items,
        "count": len(items),
        "summary": _summary(items),
    }


def _normalize_task(row: dict[str, Any], tenant_id: str) -> dict[str, Any]:
    overdue = row.get("status") == "overdue" or _is_past_due(row.get("due_at"))
    entity_type = row.get("entity_type")
    entity_id = row.get("entity_id")
    process_id = row.get("process_instance_id")
    return {
        "id": f"process_task:{row.get('id')}",
        "tenant_id": row.get("tenant_id") or tenant_id,
        "company_id": row.get("company_id"),
        "branch_id": entity_id if _same_entity_type(entity_type, "branch") else None,
        "module_key": row.get("module_key") or "process",
        "source_type": "process_task",
        "source_id": str(row.get("id")),
        "title": row.get("title") or "Tamamlanacak gorev var",
        "description": row.get("description")
        or f"{_module_label(row.get('module_key'))} icin surec gorevi bekliyor.",
        "status": "in_progress" if row.get("status") == "in_progress" else "open",
        "severity": "warning" if overdue else "info",
        "priority": "high" if overdue else "normal",
        "process_instance_id": process_id,
        "task_id": row.get("id"),
        "entity_type": entity_type,
        "entity_id": entity_id,
        "record_label": _record_label(entity_type, entity_id),
        "due_at": row.get("due_at"),
        "created_at": row.get("created_at") or _now_iso(),
        "updated_at": row.get("updated_at"),
        "target_page": f"/app/surecler/{process_id}" if process_id else _record_target_page(
            entity_type,
            entity_id,
            row.get("company_id"),
        ),
        "suggested_actions": [
            {
                "label": "Sureci Ac",
                "action_type": "open_process",
                "target_page": f"/app/surecler/{process_id}" if process_id else "/app/surecler",
                "process_instance_id": process_id,
            },
            {
                "label": "Gorevi Tamamla",
                "action_type": "navigate",
                "target_page": f"/app/surecler/{process_id}" if process_id else "/app/surecler",
            },
        ],
    }


def _normalize_approval(row: dict[str, Any], tenant_id: str) -> dict[str, Any]:
    payload = row.get("payload_json") or {}
    entity_type = payload.get("entity_type")
    entity_id = payload.get("entity_id")
    process_id = row.get("process_instance_id")
    return {
        "id": f"approval:{row.get('id')}",
        "tenant_id": row.get("tenant_id") or tenant_id,
        "company_id": row.get("company_id"),
        "module_key": row.get("module_key") or "process",
        "source_type": "approval",
        "source_id": str(row.get("id")),
        "title": "Onay bekleyen islem var",
        "description": (
            f"{_module_label(row.get('module_key'))} icin "
            f"{_operation_label(row.get('approval_type'))} karari bekliyor."
        ),
        "status": "waiting",
        "severity": "warning",
        "priority": "high",
        "process_instance_id": process_id,
        "task_id": row.get("task_id"),
        "approval_id": row.get("id"),
        "entity_type": entity_type,
        "entity_id": entity_id,
        "record_label": _record_label(entity_type, entity_id),
        "created_at": row.get("requested_at") or row.get("created_at") or _now_iso(),
        "updated_at": row.get("updated_at"),
        "target_page": f"/app/surecler/{process_id}" if process_id else "/app/surecler",
        "suggested_actions": [
            {
                "label": "Sureci Ac",
                "action_type": "open_process",
                "target_page": f"/app/surecler/{process_id}" if process_id else "/app/surecler",
                "process_instance_id": process_id,
            },
            {
                "label": "Onayla",
                "action_type": "navigate",
                "target_page": f"/app/surecler/{process_id}" if process_id else "/app/surecler",
            },
            {
                "label": "Reddet",
                "action_type": "navigate",
                "target_page": f"/app/surecler/{process_id}" if process_id else "/app/surecler",
            },
        ],
    }


def _normalize_operation(row: dict[str, Any], tenant_id: str) -> dict[str, Any]:
    status = str(row.get("operation_status") or "")
    failed = status == "failed"
    requires_action = status == "requires_action"
    entity_type = row.get("entity_type")
    entity_id = row.get("entity_id")
    return {
        "id": f"operation:{row.get('id')}",
        "tenant_id": row.get("tenant_id") or tenant_id,
        "company_id": row.get("company_id"),
        "module_key": row.get("module_key") or "system",
        "source_type": "operation",
        "source_id": str(row.get("id")),
        "title": _operation_title(status),
        "description": (
            f"{_operation_label(row.get('operation_type'))} tamamlanamadi. Detayi acin."
            if failed
            else f"{_operation_label(row.get('operation_type'))} icin kullanici adimi bekleniyor."
            if requires_action
            else f"{_operation_label(row.get('operation_type'))} beklenenden uzun surdu."
        ),
        "status": "failed" if failed else "waiting" if requires_action else "in_progress",
        "severity": "error" if failed else "warning",
        "priority": "high" if failed else "normal",
        "action_key": row.get("operation_type"),
        "operation_id": row.get("id"),
        "entity_type": entity_type,
        "entity_id": entity_id,
        "record_label": _record_label(entity_type, entity_id),
        "created_at": row.get("created_at") or _now_iso(),
        "updated_at": row.get("failed_at") or row.get("completed_at") or row.get("started_at"),
        "target_page": _record_target_page(entity_type, entity_id, row.get("company_id")),
        "suggested_actions": [
            {
                "label": "Kaydi Gor",
                "action_type": "open_record",
                "target_page": _record_target_page(entity_type, entity_id, row.get("company_id")),
                "record_id": entity_id or row.get("company_id"),
                "operation_id": row.get("id"),
            },
            {
                "label": "Tekrar Dene",
                "action_type": "retry",
                "operation_id": row.get("id"),
                "disabled": True,
                "disabled_reason": "Bu islem otomatik tekrar denemeyi henuz desteklemiyor.",
            },
        ],
    }


def _normalize_outbox(row: dict[str, Any], tenant_id: str) -> dict[str, Any]:
    status = str(row.get("status") or "")
    return {
        "id": f"outbox:{row.get('id')}",
        "tenant_id": row.get("tenant_id") or tenant_id,
        "company_id": row.get("company_id"),
        "module_key": row.get("module_key") or "system",
        "source_type": "outbox",
        "source_id": str(row.get("id")),
        "title": (
            "Sistem guncellemesi tamamlanamadi"
            if status in {"failed", "skipped"}
            else "Sistem guncellemesi bekliyor"
        ),
        "description": "Kayitlar korunur; sistem guncellemesi arka planda tekrar denenebilir.",
        "status": "failed" if status in {"failed", "skipped"} else "waiting",
        "severity": "error" if status == "failed" else "warning",
        "priority": "high" if status == "failed" else "normal",
        "operation_id": row.get("operation_id"),
        "process_instance_id": row.get("process_instance_id"),
        "outbox_event_id": row.get("id"),
        "entity_type": row.get("aggregate_type"),
        "entity_id": row.get("aggregate_id"),
        "record_label": _record_label(row.get("aggregate_type"), row.get("aggregate_id")),
        "created_at": row.get("created_at") or row.get("occurred_at") or _now_iso(),
        "updated_at": row.get("updated_at") or row.get("locked_at"),
        "target_page": "/app/sistem/kurulum",
        "suggested_actions": [
            {
                "label": "Sistem Durumunu Ac",
                "action_type": "navigate",
                "target_page": "/app/sistem/kurulum",
            }
        ],
    }


def _filter_items(items: list[dict[str, Any]], query: dict[str, Any]) -> list[dict[str, Any]]:
    return [
        item
        for item in items
        if (not query.get("source_type") or item.get("source_type") == query["source_type"])
        and (not query.get("status") or item.get("status") == query["status"])
        and (not query.get("severity") or item.get("severity") == query["severity"])
        and (not query.get("priority") or item.get("priority") == query["priority"])
        and (not query.get("module_key") or item.get("module_key") == query["module_key"])
        and (not query.get("company_id") or item.get("company_id") == query["company_id"])
        and (
            not query.get("entity_type")
            or _same_entity_type(item.get("entity_type"), query["entity_type"])
        )
        and (
            not query.get("entity_id")
            or item.get("entity_id") == query["entity_id"]
            or item.get("company_id") == query["entity_id"]
            or item.get("branch_id") == query["entity_id"]
        )
    ]


def _sort_items(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    severity_rank = {"critical": 4, "error": 3, "warning": 2, "info": 1}
    priority_rank = {"urgent": 4, "high": 3, "normal": 2, "low": 1}
    return sorted(
        items,
        key=lambda item: (
            severity_rank.get(str(item.get("severity")), 0)
            + priority_rank.get(str(item.get("priority")), 0),
            str(item.get("created_at") or ""),
        ),
        reverse=True,
    )


def _summary(items: list[dict[str, Any]]) -> dict[str, Any]:
    by_module: dict[str, int] = {}
    by_severity: dict[str, int] = {}
    total_open = 0
    urgent_count = 0
    approval_count = 0
    task_count = 0
    failed_operation_count = 0
    system_warning_count = 0
    for item in items:
        if item.get("status") not in {"completed", "dismissed"}:
            total_open += 1
        if item.get("priority") == "urgent" or item.get("severity") == "critical":
            urgent_count += 1
        if item.get("source_type") == "approval":
            approval_count += 1
        if item.get("source_type") == "process_task":
            task_count += 1
        if item.get("source_type") == "operation" and item.get("status") == "failed":
            failed_operation_count += 1
        if item.get("source_type") in {
            "outbox",
            "projection",
            "integrity_warning",
            "module_readiness",
            "system",
        } and item.get("status") != "completed":
            system_warning_count += 1
        module_key = str(item.get("module_key") or "system")
        severity = str(item.get("severity") or "info")
        by_module[module_key] = by_module.get(module_key, 0) + 1
        by_severity[severity] = by_severity.get(severity, 0) + 1
    return {
        "total_open": total_open,
        "urgent_count": urgent_count,
        "approval_count": approval_count,
        "task_count": task_count,
        "failed_operation_count": failed_operation_count,
        "system_warning_count": system_warning_count,
        "by_module": by_module,
        "by_severity": by_severity,
    }


def _can_see_system_items(context: dict[str, Any]) -> bool:
    if context.get("is_internal"):
        return True
    permissions = set(context.get("permissions") or [])
    return bool(permissions.intersection(SYSTEM_PERMISSIONS))


def _same_entity_type(left: object, right: object) -> bool:
    left_value = str(left or "")
    right_value = str(right or "")
    if not left_value or not right_value:
        return False

    def normalize(value: str) -> str:
        return value.replace("company_", "").replace("_branch", "branch")

    return left_value == right_value or normalize(left_value) == normalize(right_value)


def _is_past_due(value: object) -> bool:
    date = _parse_datetime(value)
    return bool(date and date < datetime.now(UTC))


def _minutes_since(value: object) -> int:
    date = _parse_datetime(value)
    if not date:
        return 0
    return int((datetime.now(UTC) - date).total_seconds() // 60)


def _parse_datetime(value: object) -> datetime | None:
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=UTC)
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=UTC)
    except ValueError:
        return None


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


def _module_label(module_key: object) -> str:
    labels = {
        "companies": "Sirketlerimiz",
        "branches": "Subelerimiz",
        "partners": "Ortaklarimiz",
        "representatives": "Temsilcilerimiz",
        "organization": "Teskilat/Kadro",
        "facilities": "Tesisler/Lokasyonlar",
        "process": "Surecler",
        "system": "Sistem",
        "settings": "Sistem",
        "sirket": "Sirketlerimiz",
    }
    return labels.get(str(module_key or ""), "Eden ERP")


def _operation_label(operation_type: object) -> str:
    labels = {
        "branch_opening": "Sube Acilisi",
        "branch_closing": "Sube Kapanisi",
        "capital_increase": "Sermaye Artirimi",
        "representative_authority": "Temsil Yetkisi",
        "ownership_transaction": "Ortaklik Islemi",
        "opening": "Sirket Acilisi",
        "title_change": "Unvan Degisikligi",
        "address_change": "Adres Degisikligi",
        "nace_change": "NACE Guncelleme",
        "activity_subject_change": "Faaliyet Konusu Degisikligi",
    }
    key = str(operation_type or "")
    return labels.get(key, key.replace("_", " ") if key else "Islem")


def _operation_title(status: str) -> str:
    if status == "failed":
        return "Tamamlanamayan islem var"
    if status == "requires_action":
        return "Kullanici adimi bekleyen islem var"
    return "Islem hala isleniyor"


def _record_target_page(entity_type: object, entity_id: object, company_id: object) -> str:
    record_id = str(entity_id or company_id or "")
    entity = str(entity_type or "")
    if entity == "company":
        return f"/app/sirket/companies?id={record_id}" if record_id else "/app/sirket/companies"
    if entity in {"company_branch", "branch"}:
        return (
            f"/app/sirket/companies/branches?id={record_id}"
            if record_id
            else "/app/sirket/companies/branches"
        )
    if entity in {"company_partner", "partner"}:
        return (
            f"/app/sirket/companies/partners?id={record_id}"
            if record_id
            else "/app/sirket/companies/partners"
        )
    if entity in {"company_representative", "representative"}:
        return (
            f"/app/sirket/companies/representatives?id={record_id}"
            if record_id
            else "/app/sirket/companies/representatives"
        )
    return "/app"


def _record_label(entity_type: object, entity_id: object) -> str | None:
    if not entity_id:
        return None
    labels = {
        "company": "Sirket",
        "company_branch": "Sube",
        "branch": "Sube",
        "company_partner": "Ortak",
        "partner": "Ortak",
        "company_representative": "Temsilci",
        "representative": "Temsilci",
        "process_instance": "Surec",
    }
    return f"{labels.get(str(entity_type or ''), 'Kayit')}: {entity_id}"
