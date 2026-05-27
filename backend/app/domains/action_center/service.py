from __future__ import annotations

from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.serialization import rows_to_dicts
from app.domains.operations.service import table_exists


def filter_record_items(
    items: list[dict[str, Any]],
    *,
    entity_type: str,
    entity_id: str,
) -> list[dict[str, Any]]:
    return [
        item
        for item in items
        if item.get("entity_type") == entity_type and item.get("entity_id") == entity_id
    ]


async def list_action_center_items(
    session: AsyncSession,
    context: dict[str, Any],
    query: dict[str, Any],
) -> dict[str, Any]:
    limit = int(query.get("limit") or 50)
    items: list[dict[str, Any]] = []
    if await table_exists(session, "public.process_tasks"):
        task_result = await session.execute(
            text(
                """
                select id, tenant_id, company_id, module_key, entity_type, entity_id,
                       title, description, status, assigned_to, due_at, created_at,
                       'task' as item_type
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
        items.extend(rows_to_dicts(list(task_result.mappings().all())))
    if await table_exists(session, "public.process_approvals"):
        approval_result = await session.execute(
            text(
                """
                select id, tenant_id, company_id, module_key, approval_type as title,
                       status, approver_id as assigned_to, requested_at as created_at,
                       'approval' as item_type
                from public.process_approvals
                where tenant_id = :tenant_id
                  and status = 'pending'
                order by requested_at desc
                limit :limit
                """
            ),
            {"tenant_id": context["tenant_id"], "limit": limit},
        )
        items.extend(rows_to_dicts(list(approval_result.mappings().all())))
    items.sort(key=lambda item: str(item.get("created_at") or ""))
    return {"items": items[:limit], "count": len(items)}


async def action_center_counts(session: AsyncSession, context: dict[str, Any]) -> dict[str, int]:
    result = await list_action_center_items(session, context, {"limit": 500})
    items = result["items"]
    return {
        "total": len(items),
        "tasks": len([item for item in items if item.get("item_type") == "task"]),
        "approvals": len([item for item in items if item.get("item_type") == "approval"]),
    }


async def action_center_summary(session: AsyncSession, context: dict[str, Any]) -> dict[str, Any]:
    counts = await action_center_counts(session, context)
    return {"counts": counts, "has_pending_work": counts["total"] > 0}


async def action_center_by_record(
    session: AsyncSession,
    context: dict[str, Any],
    *,
    entity_type: str,
    entity_id: str,
) -> dict[str, Any]:
    result = await list_action_center_items(session, context, {"limit": 500})
    items = filter_record_items(result["items"], entity_type=entity_type, entity_id=entity_id)
    return {"items": items, "count": len(items)}
