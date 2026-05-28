# ruff: noqa: E501

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.crm.schemas import InteractionCreateRequest
from app.domains.crm.service import ensure_crm_tables, json_list_dumps, row_to_dict
from app.domains.crm.stakeholders import require_stakeholder


async def list_interactions(session: AsyncSession, context: dict[str, Any], stakeholder_id: str) -> list[dict[str, Any]]:
    await ensure_crm_tables(session, stakeholders=True, interactions=True)
    await require_stakeholder(session, context, stakeholder_id)
    result = await session.execute(
        text(
            """
            select *
            from public.crm_interactions
            where tenant_id = :tenant_id
              and stakeholder_id = :stakeholder_id
              and coalesce(is_deleted, false) = false
            order by interaction_date desc, created_at desc
            """
        ),
        {"tenant_id": context["tenant_id"], "stakeholder_id": stakeholder_id},
    )
    return [row_to_dict(row) for row in result.mappings()]


async def create_interaction(session: AsyncSession, context: dict[str, Any], stakeholder_id: str, request: InteractionCreateRequest) -> dict[str, Any]:
    await ensure_crm_tables(session, stakeholders=True, interactions=True)
    await require_stakeholder(session, context, stakeholder_id)
    result = await session.execute(
        text(
            """
            insert into public.crm_interactions (
              tenant_id, stakeholder_id, interaction_type, subject, body, interaction_date,
              next_followup_date, related_task_id, attachments, created_by
            )
            values (
              :tenant_id, :stakeholder_id, :interaction_type, :subject, :body, :interaction_date,
              :next_followup_date, :related_task_id, cast(:attachments as jsonb), :created_by
            )
            returning *
            """
        ),
        {
            **request.model_dump(),
            "tenant_id": context["tenant_id"],
            "stakeholder_id": stakeholder_id,
            "interaction_date": request.interaction_date or datetime.now(UTC),
            "attachments": json_list_dumps(request.attachments),
            "created_by": context.get("user_id"),
        },
    )
    return row_to_dict(result.mappings().one())
