from __future__ import annotations

import json
from typing import Any
from uuid import uuid4

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.core.serialization import row_to_dict, rows_to_dicts
from app.domains.operations.service import table_exists
from app.domains.process.events import emit_process_event
from app.domains.process.registry import get_process_definition
from app.domains.process.schemas import (
    CancelProcessRequest,
    CompleteStepRequest,
    StartProcessRequest,
)
from app.domains.process.state_machine import (
    assert_process_can_transition,
    first_step_key,
    next_step_key,
    status_after_step_completion,
)


async def _require_process_tables(session: AsyncSession) -> None:
    if not await table_exists(session, "public.process_instances"):
        raise DomainError(
            "Surec altyapisi henuz hazir degil.",
            "PROCESS_INFRASTRUCTURE_MISSING",
            409,
        )


async def start_process(
    session: AsyncSession,
    context: dict[str, Any],
    request: StartProcessRequest,
) -> dict[str, Any]:
    await _require_process_tables(session)
    definition = get_process_definition(request.process_key, request.process_version)
    if not definition:
        raise DomainError("Surec tanimi bulunamadi.", "PROCESS_DEFINITION_NOT_FOUND", 404)
    process_id = str(uuid4())
    initial_step = first_step_key(definition)
    result = await session.execute(
        text(
            """
            insert into public.process_instances (
              id, tenant_id, company_id, module_key, process_key, process_version,
              entity_type, entity_id, operation_key, operation_id, status, current_step_key,
              payload_json, started_by
            )
            values (
              :id, :tenant_id, :company_id, :module_key, :process_key, :process_version,
              :entity_type, :entity_id, :operation_key, :operation_id, 'active', :current_step_key,
              cast(:payload_json as jsonb), :started_by
            )
            returning *
            """
        ),
        {
            "id": process_id,
            "tenant_id": context["tenant_id"],
            "company_id": request.company_id or context.get("company_id"),
            "module_key": request.module_key or definition.module_key,
            "process_key": request.process_key,
            "process_version": request.process_version,
            "entity_type": request.entity_type,
            "entity_id": request.entity_id,
            "operation_key": request.operation_key or definition.operation_key,
            "operation_id": request.operation_id,
            "current_step_key": initial_step,
            "payload_json": json.dumps(request.payload_json, ensure_ascii=False, default=str),
            "started_by": context.get("user_id"),
        },
    )
    process = row_to_dict(result.mappings().one()) or {}
    await emit_process_event(
        session,
        context,
        process_instance_id=process_id,
        event_type="started",
        module_key=str(process["module_key"]),
        company_id=process.get("company_id"),
        step_key=initial_step,
        new_status="active",
        payload={"process_key": request.process_key},
    )
    return process


async def get_process(
    session: AsyncSession,
    context: dict[str, Any],
    process_id: str,
) -> dict[str, Any] | None:
    await _require_process_tables(session)
    result = await session.execute(
        text(
            """
            select *
            from public.process_instances
            where id = :process_id
              and tenant_id = :tenant_id
              and coalesce(is_deleted, false) = false
            limit 1
            """
        ),
        {"process_id": process_id, "tenant_id": context["tenant_id"]},
    )
    return row_to_dict(result.mappings().one_or_none())


async def list_processes(
    session: AsyncSession,
    context: dict[str, Any],
    query: dict[str, Any],
) -> tuple[list[dict[str, Any]], int]:
    await _require_process_tables(session)
    limit = int(query.get("limit") or 50)
    offset = int(query.get("offset") or 0)
    status = query.get("status")
    company_id = query.get("company_id")
    filters = ["tenant_id = :tenant_id", "coalesce(is_deleted, false) = false"]
    params: dict[str, Any] = {"tenant_id": context["tenant_id"], "limit": limit, "offset": offset}
    if status:
        filters.append("status = :status")
        params["status"] = status
    if company_id:
        filters.append("company_id = :company_id")
        params["company_id"] = company_id
    where_clause = " and ".join(filters)
    rows = await session.execute(
        text(
            f"""
            select *
            from public.process_instances
            where {where_clause}
            order by created_at desc
            limit :limit offset :offset
            """
        ),
        params,
    )
    count = await session.execute(
        text(f"select count(*) as count from public.process_instances where {where_clause}"),
        params,
    )
    return rows_to_dicts(list(rows.mappings().all())), int(count.mappings().one()["count"] or 0)


async def activate_process(
    session: AsyncSession,
    context: dict[str, Any],
    process_id: str,
) -> dict[str, Any]:
    process = await get_process(session, context, process_id)
    if not process:
        raise DomainError("Surec kaydi bulunamadi.", "PROCESS_NOT_FOUND", 404)
    assert_process_can_transition(str(process["status"]))
    result = await session.execute(
        text(
            """
            update public.process_instances
            set status = 'active', updated_at = now(), version = version + 1
            where id = :process_id and tenant_id = :tenant_id
            returning *
            """
        ),
        {"process_id": process_id, "tenant_id": context["tenant_id"]},
    )
    row = row_to_dict(result.mappings().one()) or {}
    await emit_process_event(
        session,
        context,
        process_instance_id=process_id,
        event_type="started",
        module_key=str(row["module_key"]),
        company_id=row.get("company_id"),
        old_status=str(process["status"]),
        new_status="active",
        step_key=row.get("current_step_key"),
    )
    return row


async def complete_step(
    session: AsyncSession,
    context: dict[str, Any],
    process_id: str,
    step_key: str,
    request: CompleteStepRequest,
) -> dict[str, Any]:
    process = await get_process(session, context, process_id)
    if not process:
        raise DomainError("Surec kaydi bulunamadi.", "PROCESS_NOT_FOUND", 404)
    assert_process_can_transition(str(process["status"]))
    definition = get_process_definition(
        str(process["process_key"]),
        str(process["process_version"]),
    )
    if not definition:
        raise DomainError("Surec tanimi bulunamadi.", "PROCESS_DEFINITION_NOT_FOUND", 404)
    current_step = process.get("current_step_key")
    if current_step and current_step != step_key:
        raise DomainError(
            "Tamamlanmak istenen surec adimi guncel adim degil.",
            "PROCESS_STEP_MISMATCH",
            409,
        )
    following_step = next_step_key(definition, step_key)
    next_status = status_after_step_completion(following_step)
    result = await session.execute(
        text(
            """
            update public.process_instances
            set status = :status,
                current_step_key = :current_step_key,
                result_json = coalesce(result_json, '{}'::jsonb) || cast(:result_json as jsonb),
                completed_by = case
                  when :status = 'completed' then :completed_by
                  else completed_by
                end,
                completed_at = case when :status = 'completed' then now() else completed_at end,
                updated_at = now(),
                version = version + 1
            where id = :process_id and tenant_id = :tenant_id
            returning *
            """
        ),
        {
            "status": next_status,
            "current_step_key": following_step,
            "result_json": json.dumps(
                request.result_json or request.payload_json,
                ensure_ascii=False,
                default=str,
            ),
            "completed_by": context.get("user_id"),
            "process_id": process_id,
            "tenant_id": context["tenant_id"],
        },
    )
    row = row_to_dict(result.mappings().one()) or {}
    await emit_process_event(
        session,
        context,
        process_instance_id=process_id,
        event_type="step_completed" if next_status != "completed" else "completed",
        module_key=str(row["module_key"]),
        company_id=row.get("company_id"),
        old_status=str(process["status"]),
        new_status=next_status,
        step_key=step_key,
        payload={"next_step_key": following_step},
    )
    return row


async def cancel_process(
    session: AsyncSession,
    context: dict[str, Any],
    process_id: str,
    request: CancelProcessRequest,
) -> dict[str, Any]:
    process = await get_process(session, context, process_id)
    if not process:
        raise DomainError("Surec kaydi bulunamadi.", "PROCESS_NOT_FOUND", 404)
    assert_process_can_transition(str(process["status"]))
    result = await session.execute(
        text(
            """
            update public.process_instances
            set status = 'cancelled',
                result_json = coalesce(result_json, '{}'::jsonb) || cast(:result_json as jsonb),
                cancelled_at = now(),
                updated_at = now(),
                version = version + 1
            where id = :process_id and tenant_id = :tenant_id
            returning *
            """
        ),
        {
            "process_id": process_id,
            "tenant_id": context["tenant_id"],
            "result_json": json.dumps({"cancel_reason": request.reason}, ensure_ascii=False),
        },
    )
    row = row_to_dict(result.mappings().one()) or {}
    await emit_process_event(
        session,
        context,
        process_instance_id=process_id,
        event_type="cancelled",
        module_key=str(row["module_key"]),
        company_id=row.get("company_id"),
        old_status=str(process["status"]),
        new_status="cancelled",
        step_key=row.get("current_step_key"),
        payload={"reason": request.reason},
    )
    return row


async def fail_process(
    session: AsyncSession,
    context: dict[str, Any],
    process_id: str,
    error: dict[str, Any],
) -> dict[str, Any]:
    process = await get_process(session, context, process_id)
    if not process:
        raise DomainError("Surec kaydi bulunamadi.", "PROCESS_NOT_FOUND", 404)
    result = await session.execute(
        text(
            """
            update public.process_instances
            set status = 'failed',
                result_json = coalesce(result_json, '{}'::jsonb) || cast(:result_json as jsonb),
                updated_at = now(),
                version = version + 1
            where id = :process_id and tenant_id = :tenant_id
            returning *
            """
        ),
        {
            "process_id": process_id,
            "tenant_id": context["tenant_id"],
            "result_json": json.dumps({"error": error}, ensure_ascii=False, default=str),
        },
    )
    return row_to_dict(result.mappings().one()) or {}


async def complete_process(
    session: AsyncSession,
    context: dict[str, Any],
    process_id: str,
    result_payload: dict[str, Any],
) -> dict[str, Any]:
    process = await get_process(session, context, process_id)
    if not process:
        raise DomainError("Surec kaydi bulunamadi.", "PROCESS_NOT_FOUND", 404)
    result = await session.execute(
        text(
            """
            update public.process_instances
            set status = 'completed',
                current_step_key = 'completed',
                result_json = cast(:result_json as jsonb),
                completed_by = :completed_by,
                completed_at = now(),
                updated_at = now(),
                version = version + 1
            where id = :process_id and tenant_id = :tenant_id
            returning *
            """
        ),
        {
            "process_id": process_id,
            "tenant_id": context["tenant_id"],
            "result_json": json.dumps(result_payload, ensure_ascii=False, default=str),
            "completed_by": context.get("user_id"),
        },
    )
    return row_to_dict(result.mappings().one()) or {}


async def run_auto_steps(
    session: AsyncSession,
    context: dict[str, Any],
    process_id: str,
) -> dict[str, Any] | None:
    return await get_process(session, context, process_id)
