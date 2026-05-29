# ruff: noqa: E501, I001

from __future__ import annotations

from datetime import date, datetime
from typing import Any

from fastapi import status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.domains.crm.interactions import create_interaction_deep
from app.domains.crm.schemas import FollowupCompleteRequest, FollowupDueQuery, FollowupSnoozeRequest, InteractionCreateRequest
from app.domains.crm.service import assert_company_scope, ensure_crm_deepening_tables, json_dumps, row_to_dict


async def list_due_followups(session: AsyncSession, context: dict[str, Any], query: FollowupDueQuery) -> list[dict[str, Any]]:
    await ensure_crm_deepening_tables(session, leads=True, opportunities=True)
    due_until = query.due_until or date.today()
    params: dict[str, Any] = {"tenant_id": context["tenant_id"], "due_until": due_until, "limit": query.limit, "owner_user_id": query.owner_user_id}
    company_sql = ""
    if query.company_id:
        assert_company_scope(context, query.company_id)
        company_sql = "and company_id = :company_id"
        params["company_id"] = query.company_id
    elif context.get("company_scope_ids"):
        company_sql = "and company_id = any(cast(:company_scope_ids as uuid[]))"
        params["company_scope_ids"] = context["company_scope_ids"]
    owner_sql = "and assigned_owner_user_id = :owner_user_id" if query.owner_user_id else ""
    lead_sql = ""
    opportunity_sql = ""
    if query.entity_type == "lead":
        opportunity_sql = "and false"
    elif query.entity_type == "opportunity":
        lead_sql = "and false"
    result = await session.execute(
        text(
            f"""
            select 'lead' as entity_type, id, tenant_id, company_id, lead_name as title,
                   lead_status as status, assigned_owner_user_id, next_followup_date,
                   null::date as expected_close_date, estimated_value, currency,
                   case when next_followup_date < current_date then 'overdue' else 'due' end as followup_state,
                   created_at, updated_at
            from public.crm_leads
            where tenant_id = :tenant_id
              and coalesce(is_deleted, false) = false
              and lead_status not in ('converted','lost','unqualified')
              and next_followup_date is not null
              and next_followup_date <= :due_until
              {company_sql}
              {owner_sql}
              {lead_sql}
            union all
            select 'opportunity' as entity_type, id, tenant_id, company_id, opportunity_name as title,
                   status, assigned_owner_user_id, next_followup_date,
                   expected_close_date, estimated_value, currency,
                   case when next_followup_date < current_date then 'overdue' else 'due' end as followup_state,
                   created_at, updated_at
            from public.crm_opportunities
            where tenant_id = :tenant_id
              and coalesce(is_deleted, false) = false
              and status = 'open'
              and next_followup_date is not null
              and next_followup_date <= :due_until
              {company_sql}
              {owner_sql}
              {opportunity_sql}
            order by next_followup_date asc, created_at asc
            limit :limit
            """
        ),
        params,
    )
    return [row_to_dict(row) for row in result.mappings()]


async def complete_followup(session: AsyncSession, context: dict[str, Any], entity_type: str, entity_id: str, request: FollowupCompleteRequest) -> dict[str, Any]:
    parent = await _require_followup_parent(session, context, entity_type, entity_id)
    interaction = await create_interaction_deep(
        session,
        context,
        InteractionCreateRequest(
            interaction_type="followup_completed",
            subject=request.subject or f"{parent['title']} takibi tamamlandi",
            body=request.body,
            interaction_date=datetime.utcnow(),
            direction="outbound",
            next_followup_date=request.next_followup_date,
            related_task_id=request.related_task_id,
            outcome=request.outcome or "completed",
        ),
        lead_id=entity_id if entity_type == "lead" else None,
        opportunity_id=entity_id if entity_type == "opportunity" else None,
    )
    await _set_next_followup(session, context, entity_type, entity_id, request.next_followup_date)
    await _record_followup_event(session, context, parent, entity_type, "completed", request.next_followup_date, interaction_id=str(interaction["id"]), notes=request.outcome)
    return {"entity": await _require_followup_parent(session, context, entity_type, entity_id), "interaction": interaction}


async def snooze_followup(session: AsyncSession, context: dict[str, Any], entity_type: str, entity_id: str, request: FollowupSnoozeRequest) -> dict[str, Any]:
    parent = await _require_followup_parent(session, context, entity_type, entity_id)
    await _set_next_followup(session, context, entity_type, entity_id, request.next_followup_date)
    await _record_followup_event(session, context, parent, entity_type, "snoozed", request.next_followup_date, notes=request.notes)
    return {"entity": await _require_followup_parent(session, context, entity_type, entity_id)}


async def _require_followup_parent(session: AsyncSession, context: dict[str, Any], entity_type: str, entity_id: str) -> dict[str, Any]:
    await ensure_crm_deepening_tables(session, leads=True, opportunities=True)
    if entity_type not in {"lead", "opportunity"}:
        raise DomainError("Takip entity tipi lead veya opportunity olmalidir.", "CRM_FOLLOWUP_ENTITY_INVALID", status.HTTP_422_UNPROCESSABLE_ENTITY)
    table = "crm_leads" if entity_type == "lead" else "crm_opportunities"
    title_column = "lead_name" if entity_type == "lead" else "opportunity_name"
    result = await session.execute(
        text(
            f"""
            select id, tenant_id, company_id, {title_column} as title,
                   assigned_owner_user_id, next_followup_date
            from public.{table}
            where tenant_id = :tenant_id and id = :entity_id and coalesce(is_deleted, false) = false
            limit 1
            """
        ),
        {"tenant_id": context["tenant_id"], "entity_id": entity_id},
    )
    row = result.mappings().one_or_none()
    if not row:
        raise DomainError("Takip kaydi bulunamadi.", "CRM_FOLLOWUP_ENTITY_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    parent = row_to_dict(row)
    assert_company_scope(context, str(parent["company_id"]))
    return parent


async def _set_next_followup(session: AsyncSession, context: dict[str, Any], entity_type: str, entity_id: str, next_followup_date: date | None) -> None:
    table = "crm_leads" if entity_type == "lead" else "crm_opportunities"
    await session.execute(
        text(
            f"""
            update public.{table}
            set next_followup_date = :next_followup_date,
                updated_at = now(),
                version = version + 1
            where tenant_id = :tenant_id and id = :entity_id
            """
        ),
        {"tenant_id": context["tenant_id"], "entity_id": entity_id, "next_followup_date": next_followup_date},
    )


async def _record_followup_event(
    session: AsyncSession,
    context: dict[str, Any],
    parent: dict[str, Any],
    entity_type: str,
    event_type: str,
    due_date: date | None,
    *,
    interaction_id: str | None = None,
    notes: str | None = None,
) -> None:
    await ensure_crm_deepening_tables(session, followups=True)
    await session.execute(
        text(
            """
            insert into public.crm_followup_events (
              tenant_id, company_id, entity_type, entity_id, event_type,
              due_date, related_interaction_id, notes, metadata_json, created_by
            )
            values (
              :tenant_id, :company_id, :entity_type, :entity_id, :event_type,
              :due_date, :related_interaction_id, :notes, cast(:metadata_json as jsonb), :user_id
            )
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "company_id": parent["company_id"],
            "entity_type": entity_type,
            "entity_id": parent["id"],
            "event_type": event_type,
            "due_date": due_date,
            "related_interaction_id": interaction_id,
            "notes": notes,
            "metadata_json": json_dumps({"source": "crm_followup"}),
            "user_id": context.get("user_id"),
        },
    )
