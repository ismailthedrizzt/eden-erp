from __future__ import annotations

import json
from typing import Any
from uuid import uuid4

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.core.serialization import row_to_dict, rows_to_dicts
from app.domains.notifications.notifications import (
    create_process_approval_notifications,
    dismiss_work_notifications,
)
from app.domains.operations.service import table_exists
from app.domains.process.events import emit_process_event
from app.domains.process.schemas import ApprovalDecisionRequest, CreateApprovalRequest


def approval_decision_patch(
    status: str,
    approver_id: str | None,
    decision_note: str | None,
) -> dict[str, Any]:
    return {
        "status": status,
        "approver_id": approver_id,
        "decision_note": decision_note,
    }


async def _require_approval_table(session: AsyncSession) -> None:
    if not await table_exists(session, "public.process_approvals"):
        raise DomainError(
            "Surec onay altyapisi henuz hazir degil.",
            "APPROVAL_INFRASTRUCTURE_MISSING",
            409,
        )


async def create_approval(
    session: AsyncSession,
    context: dict[str, Any],
    payload: CreateApprovalRequest,
) -> dict[str, Any]:
    await _require_approval_table(session)
    approval_id = str(uuid4())
    result = await session.execute(
        text(
            """
            insert into public.process_approvals (
              id, tenant_id, process_instance_id, task_id, company_id, module_key,
              approval_type, requested_by, approver_id, approver_role, approver_permission,
              payload_json
            )
            values (
              :id, :tenant_id, :process_instance_id, :task_id, :company_id, :module_key,
              :approval_type, :requested_by, :approver_id, :approver_role, :approver_permission,
              cast(:payload_json as jsonb)
            )
            returning *
            """
        ),
        {
            "id": approval_id,
            "tenant_id": context["tenant_id"],
            "process_instance_id": payload.process_instance_id,
            "task_id": payload.task_id,
            "company_id": payload.company_id or context.get("company_id"),
            "module_key": payload.module_key,
            "approval_type": payload.approval_type,
            "requested_by": context.get("user_id"),
            "approver_id": payload.approver_id,
            "approver_role": payload.approver_role,
            "approver_permission": payload.approver_permission,
            "payload_json": json.dumps(payload.payload_json, ensure_ascii=False, default=str),
        },
    )
    row = row_to_dict(result.mappings().one()) or {}
    await emit_process_event(
        session,
        context,
        process_instance_id=payload.process_instance_id,
        event_type="approval_requested",
        module_key=payload.module_key,
        company_id=payload.company_id or context.get("company_id"),
        payload={"approval_id": approval_id, "approval_type": payload.approval_type},
    )
    await create_process_approval_notifications(session, context, row)
    return row


async def get_approval(
    session: AsyncSession,
    context: dict[str, Any],
    approval_id: str,
) -> dict[str, Any] | None:
    await _require_approval_table(session)
    result = await session.execute(
        text(
            """
            select *
            from public.process_approvals
            where id = :approval_id and tenant_id = :tenant_id
            limit 1
            """
        ),
        {"approval_id": approval_id, "tenant_id": context["tenant_id"]},
    )
    return row_to_dict(result.mappings().one_or_none())


async def list_pending_approvals(
    session: AsyncSession,
    context: dict[str, Any],
    query: dict[str, Any],
) -> tuple[list[dict[str, Any]], int]:
    await _require_approval_table(session)
    limit = int(query.get("limit") or 50)
    offset = int(query.get("offset") or 0)
    status = query.get("status") or "pending"
    result = await session.execute(
        text(
            """
            select *
            from public.process_approvals
            where tenant_id = :tenant_id
              and status = :status
            order by requested_at desc
            limit :limit offset :offset
            """
        ),
        {"tenant_id": context["tenant_id"], "status": status, "limit": limit, "offset": offset},
    )
    count = await session.execute(
        text(
            """
            select count(*) as count
            from public.process_approvals
            where tenant_id = :tenant_id and status = :status
            """
        ),
        {"tenant_id": context["tenant_id"], "status": status},
    )
    return rows_to_dicts(list(result.mappings().all())), int(count.mappings().one()["count"] or 0)


async def list_process_approvals(
    session: AsyncSession,
    context: dict[str, Any],
    process_id: str,
) -> list[dict[str, Any]]:
    await _require_approval_table(session)
    result = await session.execute(
        text(
            """
            select *
            from public.process_approvals
            where tenant_id = :tenant_id
              and process_instance_id = :process_id
            order by requested_at asc, created_at asc
            """
        ),
        {"tenant_id": context["tenant_id"], "process_id": process_id},
    )
    return rows_to_dicts(list(result.mappings().all()))


async def _decide(
    session: AsyncSession,
    context: dict[str, Any],
    approval_id: str,
    status: str,
    request: ApprovalDecisionRequest,
) -> dict[str, Any]:
    approval = await get_approval(session, context, approval_id)
    if not approval:
        raise DomainError("Onay kaydi bulunamadi.", "APPROVAL_NOT_FOUND", 404)
    if approval.get("status") != "pending":
        raise DomainError("Onay kaydi zaten sonuclanmis.", "APPROVAL_CLOSED", 409)
    result = await session.execute(
        text(
            """
            update public.process_approvals
            set status = :status,
                approver_id = coalesce(:approver_id, approver_id),
                decision_note = :decision_note,
                decided_at = now(),
                updated_at = now()
            where id = :approval_id and tenant_id = :tenant_id
            returning *
            """
        ),
        {
            "approval_id": approval_id,
            "tenant_id": context["tenant_id"],
            "status": status,
            "approver_id": context.get("user_id"),
            "decision_note": request.decision_note,
        },
    )
    row = row_to_dict(result.mappings().one()) or {}
    await emit_process_event(
        session,
        context,
        process_instance_id=str(approval["process_instance_id"]),
        event_type=f"approval_{status}",
        module_key=str(approval["module_key"]),
        company_id=approval.get("company_id"),
        payload={"approval_id": approval_id, "decision_note": request.decision_note},
    )
    await dismiss_work_notifications(
        session,
        context,
        approval_id=approval_id,
        task_id=approval.get("task_id"),
    )
    return row


async def approve(
    session: AsyncSession,
    context: dict[str, Any],
    approval_id: str,
    request: ApprovalDecisionRequest,
) -> dict[str, Any]:
    return await _decide(session, context, approval_id, "approved", request)


async def reject(
    session: AsyncSession,
    context: dict[str, Any],
    approval_id: str,
    request: ApprovalDecisionRequest,
) -> dict[str, Any]:
    return await _decide(session, context, approval_id, "rejected", request)


async def cancel_approval(
    session: AsyncSession,
    context: dict[str, Any],
    approval_id: str,
) -> dict[str, Any]:
    approval = await get_approval(session, context, approval_id)
    if not approval:
        raise DomainError("Onay kaydi bulunamadi.", "APPROVAL_NOT_FOUND", 404)
    result = await session.execute(
        text(
            """
            update public.process_approvals
            set status = 'cancelled', updated_at = now()
            where id = :approval_id and tenant_id = :tenant_id
            returning *
            """
        ),
        {"approval_id": approval_id, "tenant_id": context["tenant_id"]},
    )
    row = row_to_dict(result.mappings().one()) or {}
    await dismiss_work_notifications(
        session,
        context,
        approval_id=approval_id,
        task_id=approval.get("task_id"),
    )
    return row
