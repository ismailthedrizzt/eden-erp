# ruff: noqa: E501

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from fastapi import status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.domains.crm.leads import require_lead
from app.domains.crm.opportunities import require_opportunity
from app.domains.crm.schemas import InteractionCreateRequest, InteractionListQuery, ListResult
from app.domains.crm.service import (
    ensure_crm_deepening_tables,
    ensure_crm_tables,
    json_list_dumps,
    list_meta,
    record_crm_audit_best_effort,
    row_to_dict,
)
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


async def list_interactions_deep(session: AsyncSession, context: dict[str, Any], query: InteractionListQuery) -> ListResult:
    await ensure_crm_deepening_tables(session, interactions=True)
    if query.stakeholder_id:
        await require_stakeholder(session, context, query.stakeholder_id)
    if query.lead_id:
        await require_lead(session, context, query.lead_id)
    if query.opportunity_id:
        await require_opportunity(session, context, query.opportunity_id)
    filters = ["i.tenant_id = :tenant_id", "coalesce(i.is_deleted, false) = false"]
    params: dict[str, Any] = {"tenant_id": context["tenant_id"], "limit": query.page_size, "offset": (query.page - 1) * query.page_size}
    for field in ["stakeholder_id", "lead_id", "opportunity_id", "interaction_type"]:
        value = getattr(query, field)
        if value:
            filters.append(f"i.{field} = :{field}")
            params[field] = value
    if context.get("company_scope_ids") and not (query.stakeholder_id or query.lead_id or query.opportunity_id):
        filters.append(
            """
            (
              s.company_id = any(cast(:company_scope_ids as uuid[]))
              or l.company_id = any(cast(:company_scope_ids as uuid[]))
              or o.company_id = any(cast(:company_scope_ids as uuid[]))
            )
            """
        )
        params["company_scope_ids"] = context["company_scope_ids"]
    result = await session.execute(
        text(
            f"""
            select i.*, count(*) over() as total_count
            from public.crm_interactions i
            left join public.crm_stakeholders s on s.tenant_id = i.tenant_id and s.id = i.stakeholder_id
            left join public.crm_leads l on l.tenant_id = i.tenant_id and l.id = i.lead_id
            left join public.crm_opportunities o on o.tenant_id = i.tenant_id and o.id = i.opportunity_id
            where {" and ".join(filters)}
            order by i.interaction_date desc, i.created_at desc
            limit :limit offset :offset
            """
        ),
        params,
    )
    rows = [row_to_dict(row) for row in result.mappings()]
    total = int(rows[0].pop("total_count")) if rows else 0
    for row in rows[1:]:
        row.pop("total_count", None)
    return ListResult(data=rows, meta=list_meta(query.page, query.page_size, total))


async def create_interaction(session: AsyncSession, context: dict[str, Any], stakeholder_id: str, request: InteractionCreateRequest) -> dict[str, Any]:
    await ensure_crm_tables(session, stakeholders=True, interactions=True)
    await require_stakeholder(session, context, stakeholder_id)
    return await create_interaction_deep(session, context, request, stakeholder_id=stakeholder_id)


async def create_interaction_deep(
    session: AsyncSession,
    context: dict[str, Any],
    request: InteractionCreateRequest,
    *,
    stakeholder_id: str | None = None,
    lead_id: str | None = None,
    opportunity_id: str | None = None,
) -> dict[str, Any]:
    await ensure_crm_deepening_tables(session, interactions=True)
    if not stakeholder_id and not lead_id and not opportunity_id:
        raise DomainError("Etkilesim icin lead, firsat veya paydas baglantisi zorunludur.", "CRM_INTERACTION_ENTITY_REQUIRED", status.HTTP_422_UNPROCESSABLE_ENTITY)
    if stakeholder_id:
        await require_stakeholder(session, context, stakeholder_id)
    if lead_id:
        await require_lead(session, context, lead_id)
    if opportunity_id:
        await require_opportunity(session, context, opportunity_id)
    result = await session.execute(
        text(
            """
            insert into public.crm_interactions (
              tenant_id, stakeholder_id, lead_id, opportunity_id, interaction_type,
              subject, body, interaction_date, direction, contact_person,
              next_followup_date, related_task_id, related_document_id, attachments,
              outcome, created_by
            )
            values (
              :tenant_id, :stakeholder_id, :lead_id, :opportunity_id, :interaction_type,
              :subject, :body, :interaction_date, :direction, :contact_person,
              :next_followup_date, :related_task_id, :related_document_id,
              cast(:attachments as jsonb), :outcome, :created_by
            )
            returning *
            """
        ),
        {
            **request.model_dump(),
            "tenant_id": context["tenant_id"],
            "stakeholder_id": stakeholder_id,
            "lead_id": lead_id,
            "opportunity_id": opportunity_id,
            "interaction_date": request.interaction_date or datetime.now(UTC),
            "attachments": json_list_dumps(request.attachments),
            "created_by": context.get("user_id"),
        },
    )
    interaction = row_to_dict(result.mappings().one())
    if lead_id:
        await session.execute(
            text(
                """
                update public.crm_leads
                set last_contacted_at = :interaction_date,
                    next_followup_date = coalesce(:next_followup_date, next_followup_date),
                    updated_at = now(),
                    version = version + 1
                where tenant_id = :tenant_id and id = :lead_id
                """
            ),
            {"tenant_id": context["tenant_id"], "lead_id": lead_id, "interaction_date": interaction["interaction_date"], "next_followup_date": request.next_followup_date},
        )
    if opportunity_id:
        await session.execute(
            text(
                """
                update public.crm_opportunities
                set next_followup_date = coalesce(:next_followup_date, next_followup_date),
                    updated_at = now(),
                    version = version + 1
                where tenant_id = :tenant_id and id = :opportunity_id
                """
            ),
            {"tenant_id": context["tenant_id"], "opportunity_id": opportunity_id, "next_followup_date": request.next_followup_date},
        )
    await record_crm_audit_best_effort(
        session,
        context,
        action_type="interaction_added",
        entity_type="crm_interaction",
        entity_id=str(interaction["id"]),
        company_id=None,
        summary="CRM etkilesimi eklendi.",
        metadata={"lead_id": lead_id, "opportunity_id": opportunity_id, "stakeholder_id": stakeholder_id},
    )
    return interaction
