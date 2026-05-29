# ruff: noqa: E501, I001

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any

from fastapi import status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.domains.crm.pipelines import ensure_default_pipeline, first_active_stage, get_pipeline, get_pipeline_stage
from app.domains.crm.schemas import (
    ListResult,
    OpportunityCreateRequest,
    OpportunityFollowupTaskRequest,
    OpportunityListQuery,
    OpportunityLostRequest,
    OpportunityProposalUploadRequest,
    OpportunityStageChangeRequest,
    OpportunityUpdateRequest,
    OpportunityWinRequest,
)
from app.domains.crm.service import (
    assert_company_scope,
    assert_version,
    create_crm_notification_best_effort,
    create_crm_project_task_best_effort,
    ensure_crm_deepening_tables,
    json_dumps,
    json_list_dumps,
    list_meta,
    next_sequence_code,
    record_crm_audit_best_effort,
    row_to_dict,
)

OPPORTUNITY_SORT_COLUMNS = {
    "opportunity_no": "o.opportunity_no",
    "opportunity_name": "o.opportunity_name",
    "customer_name": "o.customer_name",
    "estimated_value": "o.estimated_value",
    "weighted_value": "o.weighted_value",
    "expected_close_date": "o.expected_close_date",
    "next_followup_date": "o.next_followup_date",
    "updated_at": "o.updated_at",
    "created_at": "o.created_at",
}

OPPORTUNITY_MUTABLE_COLUMNS = {
    "stakeholder_id",
    "lead_id",
    "opportunity_name",
    "customer_name",
    "pipeline_id",
    "stage_id",
    "status",
    "estimated_value",
    "weighted_value",
    "probability",
    "currency",
    "expected_close_date",
    "actual_close_date",
    "assigned_owner_user_id",
    "source",
    "product_interest",
    "related_product_ids",
    "related_service_ids",
    "next_followup_date",
    "lost_reason",
    "won_reason",
    "competitor_name",
    "proposal_status",
    "proposal_document_id",
    "proposal_amount",
    "proposal_sent_at",
    "proposal_valid_until",
    "notes",
    "tags",
    "metadata_json",
}


def calculate_weighted_value(estimated_value: Decimal | int | float | None, probability: Decimal | int | float | None) -> Decimal | None:
    if estimated_value is None:
        return None
    probability_value = Decimal(str(probability if probability is not None else 0))
    return Decimal(str(estimated_value)) * probability_value / Decimal("100")


async def list_opportunities(session: AsyncSession, context: dict[str, Any], query: OpportunityListQuery) -> ListResult:
    await ensure_crm_deepening_tables(session, opportunities=True, pipelines=True)
    filters = ["o.tenant_id = :tenant_id", "coalesce(o.is_deleted, false) = false"]
    params: dict[str, Any] = {"tenant_id": context["tenant_id"], "limit": query.page_size, "offset": (query.page - 1) * query.page_size}
    if query.company_id:
        assert_company_scope(context, query.company_id)
        filters.append("o.company_id = :company_id")
        params["company_id"] = query.company_id
    elif context.get("company_scope_ids"):
        filters.append("o.company_id = any(cast(:company_scope_ids as uuid[]))")
        params["company_scope_ids"] = context["company_scope_ids"]
    for field in ["stakeholder_id", "lead_id", "pipeline_id", "stage_id", "status", "assigned_owner_user_id"]:
        value = getattr(query, field)
        if value:
            filters.append(f"o.{field} = :{field}")
            params[field] = value
    if query.expected_close_before:
        filters.append("o.expected_close_date <= :expected_close_before")
        params["expected_close_before"] = query.expected_close_before
    if query.next_followup_before:
        filters.append("o.next_followup_date <= :next_followup_before")
        params["next_followup_before"] = query.next_followup_before
    if query.tag:
        filters.append(":tag = any(o.tags)")
        params["tag"] = query.tag
    if query.search:
        filters.append("(o.opportunity_no ilike :search or o.opportunity_name ilike :search or o.customer_name ilike :search or coalesce(o.product_interest, '') ilike :search)")
        params["search"] = f"%{query.search}%"
    sort = OPPORTUNITY_SORT_COLUMNS.get(query.sort, "o.updated_at")
    direction = "asc" if query.direction.lower() == "asc" else "desc"
    result = await session.execute(
        text(
            f"""
            select o.*, p.pipeline_name, s.stage_name, s.stage_key, s.stage_type,
                   s.order_index as stage_order_index, l.lead_name,
                   count(*) over() as total_count
            from public.crm_opportunities o
            left join public.crm_pipelines p on p.tenant_id = o.tenant_id and p.id = o.pipeline_id
            left join public.crm_pipeline_stages s on s.tenant_id = o.tenant_id and s.id = o.stage_id
            left join public.crm_leads l on l.tenant_id = o.tenant_id and l.id = o.lead_id
            where {" and ".join(filters)}
            order by {sort} {direction} nulls last, o.id desc
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


async def get_opportunity(session: AsyncSession, context: dict[str, Any], opportunity_id: str) -> dict[str, Any] | None:
    await ensure_crm_deepening_tables(session, opportunities=True, pipelines=True)
    result = await session.execute(
        text(
            """
            select o.*, p.pipeline_name, s.stage_name, s.stage_key, s.stage_type,
                   s.order_index as stage_order_index, l.lead_name
            from public.crm_opportunities o
            left join public.crm_pipelines p on p.tenant_id = o.tenant_id and p.id = o.pipeline_id
            left join public.crm_pipeline_stages s on s.tenant_id = o.tenant_id and s.id = o.stage_id
            left join public.crm_leads l on l.tenant_id = o.tenant_id and l.id = o.lead_id
            where o.tenant_id = :tenant_id and o.id = :opportunity_id and coalesce(o.is_deleted, false) = false
            limit 1
            """
        ),
        {"tenant_id": context["tenant_id"], "opportunity_id": opportunity_id},
    )
    row = result.mappings().one_or_none()
    if not row:
        return None
    opportunity = row_to_dict(row)
    assert_company_scope(context, str(opportunity["company_id"]))
    return opportunity


async def require_opportunity(session: AsyncSession, context: dict[str, Any], opportunity_id: str) -> dict[str, Any]:
    opportunity = await get_opportunity(session, context, opportunity_id)
    if not opportunity:
        raise DomainError("Firsat bulunamadi.", "CRM_OPPORTUNITY_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    return opportunity


async def create_opportunity(session: AsyncSession, context: dict[str, Any], request: OpportunityCreateRequest) -> dict[str, Any]:
    await ensure_crm_deepening_tables(session, opportunities=True, pipelines=True)
    assert_company_scope(context, request.company_id, write=True)
    if request.pipeline_id:
        pipeline = await get_pipeline(session, context, request.pipeline_id)
        if not pipeline:
            raise DomainError("Pipeline bulunamadi.", "CRM_PIPELINE_NOT_FOUND", status.HTTP_404_NOT_FOUND)
        if pipeline.get("company_id") and str(pipeline["company_id"]) != request.company_id:
            raise DomainError("Pipeline sirket kapsami firsat sirketiyle uyusmuyor.", "CRM_PIPELINE_COMPANY_SCOPE_MISMATCH", status.HTTP_409_CONFLICT)
        pipeline_id = request.pipeline_id
    else:
        pipeline = await ensure_default_pipeline(session, context, request.company_id)
        pipeline_id = str(pipeline["id"])
    if request.stage_id:
        stage = await get_pipeline_stage(session, context, request.stage_id)
        if not stage:
            raise DomainError("Pipeline asamasi bulunamadi.", "CRM_PIPELINE_STAGE_NOT_FOUND", status.HTTP_404_NOT_FOUND)
        if str(stage["pipeline_id"]) != pipeline_id:
            raise DomainError("Pipeline asamasi secili pipeline ile uyusmuyor.", "CRM_PIPELINE_STAGE_SCOPE_MISMATCH", status.HTTP_409_CONFLICT)
        if stage.get("company_id") and str(stage["company_id"]) != request.company_id:
            raise DomainError("Pipeline asamasi sirket kapsami firsat sirketiyle uyusmuyor.", "CRM_PIPELINE_STAGE_COMPANY_SCOPE_MISMATCH", status.HTTP_409_CONFLICT)
    else:
        stage = await first_active_stage(session, context, pipeline_id)
    probability = request.probability if request.probability is not None else stage.get("probability")
    status_value = request.status
    if stage.get("stage_type") == "won":
        status_value = "won"
    elif stage.get("stage_type") == "lost":
        status_value = "lost"
    opportunity_no = request.opportunity_no or await next_sequence_code(session, "crm_opportunities", context["tenant_id"], "OPP")
    weighted_value = calculate_weighted_value(request.estimated_value, probability)
    inserted = await session.execute(
        text(
            """
            insert into public.crm_opportunities (
              tenant_id, company_id, stakeholder_id, lead_id, opportunity_no,
              opportunity_name, customer_name, pipeline_id, stage_id, status,
              estimated_value, weighted_value, probability, currency,
              expected_close_date, assigned_owner_user_id, source, product_interest,
              related_product_ids, related_service_ids, next_followup_date, notes,
              tags, metadata_json, created_by, updated_by
            )
            values (
              :tenant_id, :company_id, :stakeholder_id, :lead_id, :opportunity_no,
              :opportunity_name, :customer_name, :pipeline_id, :stage_id, :status,
              :estimated_value, :weighted_value, :probability, :currency,
              :expected_close_date, :assigned_owner_user_id, :source, :product_interest,
              cast(:related_product_ids as jsonb), cast(:related_service_ids as jsonb),
              :next_followup_date, :notes, :tags, cast(:metadata_json as jsonb),
              :user_id, :user_id
            )
            returning id
            """
        ),
        {
            **request.model_dump(exclude={"pipeline_id", "stage_id", "opportunity_no", "status", "related_product_ids", "related_service_ids", "metadata_json"}),
            "tenant_id": context["tenant_id"],
            "pipeline_id": pipeline_id,
            "stage_id": stage["id"],
            "status": status_value,
            "opportunity_no": opportunity_no,
            "weighted_value": weighted_value,
            "probability": probability,
            "related_product_ids": json_list_dumps(request.related_product_ids),
            "related_service_ids": json_list_dumps(request.related_service_ids),
            "metadata_json": json_dumps(request.metadata_json),
            "user_id": context.get("user_id"),
        },
    )
    opportunity = await require_opportunity(session, context, str(inserted.scalar_one()))
    await record_crm_audit_best_effort(session, context, action_type="opportunity_created", entity_type="opportunity", entity_id=str(opportunity["id"]), company_id=str(opportunity["company_id"]), summary="CRM firsati olusturuldu.")
    await create_crm_notification_best_effort(
        session,
        context,
        user_id=opportunity.get("assigned_owner_user_id"),
        company_id=str(opportunity["company_id"]),
        notification_type="opportunity_assigned",
        title="Firsat atandi",
        message=f"{opportunity.get('opportunity_name')} firsati size atandi.",
        target_page="/app/crm/firsatlar",
        related_entity_type="opportunity",
        related_entity_id=str(opportunity["id"]),
        related_record_label=opportunity.get("opportunity_no"),
    )
    return opportunity


async def update_opportunity(session: AsyncSession, context: dict[str, Any], opportunity_id: str, request: OpportunityUpdateRequest) -> dict[str, Any]:
    current = await require_opportunity(session, context, opportunity_id)
    assert_company_scope(context, str(current["company_id"]), write=True)
    assert_version(current, request.base_version)
    data = request.model_dump(exclude_unset=True, exclude={"base_version"})
    if not data:
        return current
    if data.get("stage_id"):
        stage = await get_pipeline_stage(session, context, str(data["stage_id"]))
        if not stage:
            raise DomainError("Pipeline asamasi bulunamadi.", "CRM_PIPELINE_STAGE_NOT_FOUND", status.HTTP_404_NOT_FOUND)
        if stage.get("company_id") and str(stage["company_id"]) != str(current["company_id"]):
            raise DomainError("Pipeline asamasi sirket kapsami firsat sirketiyle uyusmuyor.", "CRM_PIPELINE_STAGE_COMPANY_SCOPE_MISMATCH", status.HTTP_409_CONFLICT)
        data["probability"] = data.get("probability", stage.get("probability"))
        if stage.get("stage_type") == "won":
            data["status"] = "won"
        elif stage.get("stage_type") == "lost":
            data["status"] = "lost"
    if "estimated_value" in data or "probability" in data:
        data["weighted_value"] = calculate_weighted_value(data.get("estimated_value", current.get("estimated_value")), data.get("probability", current.get("probability")))
    set_parts: list[str] = []
    params: dict[str, Any] = {"tenant_id": context["tenant_id"], "opportunity_id": opportunity_id, "user_id": context.get("user_id")}
    for key, value in data.items():
        if key not in OPPORTUNITY_MUTABLE_COLUMNS:
            continue
        if key in {"related_product_ids", "related_service_ids"}:
            set_parts.append(f"{key} = cast(:{key} as jsonb)")
            params[key] = json_list_dumps(value)
        elif key == "metadata_json":
            set_parts.append("metadata_json = cast(:metadata_json as jsonb)")
            params[key] = json_dumps(value)
        else:
            set_parts.append(f"{key} = :{key}")
            params[key] = value
    if not set_parts:
        return current
    set_parts.extend(["updated_by = :user_id", "updated_at = now()", "version = version + 1"])
    await session.execute(
        text(f"update public.crm_opportunities set {', '.join(set_parts)} where tenant_id = :tenant_id and id = :opportunity_id and coalesce(is_deleted, false) = false"),
        params,
    )
    updated = await require_opportunity(session, context, opportunity_id)
    await record_crm_audit_best_effort(session, context, action_type="opportunity_updated", entity_type="opportunity", entity_id=opportunity_id, company_id=str(updated["company_id"]))
    return updated


async def change_opportunity_stage(session: AsyncSession, context: dict[str, Any], opportunity_id: str, request: OpportunityStageChangeRequest) -> dict[str, Any]:
    current = await require_opportunity(session, context, opportunity_id)
    stage = await get_pipeline_stage(session, context, request.stage_id)
    if not stage:
        raise DomainError("Pipeline asamasi bulunamadi.", "CRM_PIPELINE_STAGE_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    if stage.get("company_id") and str(stage["company_id"]) != str(current["company_id"]):
        raise DomainError("Pipeline asamasi sirket kapsami firsat sirketiyle uyusmuyor.", "CRM_PIPELINE_STAGE_COMPANY_SCOPE_MISMATCH", status.HTTP_409_CONFLICT)
    probability = request.probability if request.probability is not None else stage.get("probability")
    status_value = "won" if stage.get("stage_type") == "won" else "lost" if stage.get("stage_type") == "lost" else "open"
    weighted_value = calculate_weighted_value(current.get("estimated_value"), probability)
    await session.execute(
        text(
            """
            update public.crm_opportunities
            set stage_id = :stage_id,
                pipeline_id = :pipeline_id,
                status = :status,
                probability = :probability,
                weighted_value = :weighted_value,
                next_followup_date = coalesce(:next_followup_date, next_followup_date),
                expected_close_date = coalesce(:expected_close_date, expected_close_date),
                notes = concat_ws(E'\n', notes, :reason),
                updated_by = :user_id,
                updated_at = now(),
                version = version + 1
            where tenant_id = :tenant_id and id = :opportunity_id
            """
        ),
        {"tenant_id": context["tenant_id"], "opportunity_id": opportunity_id, "stage_id": request.stage_id, "pipeline_id": stage["pipeline_id"], "status": status_value, "probability": probability, "weighted_value": weighted_value, "next_followup_date": request.next_followup_date, "expected_close_date": request.expected_close_date, "reason": request.reason, "user_id": context.get("user_id")},
    )
    updated = await require_opportunity(session, context, opportunity_id)
    await record_crm_audit_best_effort(session, context, action_type="opportunity_stage_changed", entity_type="opportunity", entity_id=opportunity_id, company_id=str(updated["company_id"]), metadata={"stage_id": request.stage_id, "reason": request.reason})
    await create_crm_notification_best_effort(
        session,
        context,
        user_id=updated.get("assigned_owner_user_id"),
        company_id=str(updated["company_id"]),
        notification_type="opportunity_stage_changed",
        title="Firsat asamasi degisti",
        message=f"{updated.get('opportunity_name')} asamasi {stage.get('stage_name')} oldu.",
        target_page="/app/crm/firsatlar",
        related_entity_type="opportunity",
        related_entity_id=opportunity_id,
        related_record_label=updated.get("opportunity_no"),
    )
    return updated


async def mark_opportunity_won(session: AsyncSession, context: dict[str, Any], opportunity_id: str, request: OpportunityWinRequest) -> dict[str, Any]:
    current = await require_opportunity(session, context, opportunity_id)
    await session.execute(
        text(
            """
            update public.crm_opportunities
            set status = 'won',
                actual_close_date = coalesce(:actual_close_date, current_date),
                won_reason = :won_reason,
                probability = 100,
                weighted_value = estimated_value,
                updated_by = :user_id,
                updated_at = now(),
                version = version + 1
            where tenant_id = :tenant_id and id = :opportunity_id
            """
        ),
        {"tenant_id": context["tenant_id"], "opportunity_id": opportunity_id, "actual_close_date": request.actual_close_date, "won_reason": request.won_reason, "user_id": context.get("user_id")},
    )
    if request.activate_customer and current.get("stakeholder_id"):
        await session.execute(
            text(
                """
                update public.crm_stakeholders
                set relationship_status = 'active',
                    customer_status = 'active_customer',
                    updated_by = :user_id,
                    updated_at = now(),
                    version = version + 1
                where tenant_id = :tenant_id and id = :stakeholder_id
                """
            ),
            {"tenant_id": context["tenant_id"], "stakeholder_id": current["stakeholder_id"], "user_id": context.get("user_id")},
        )
    updated = await require_opportunity(session, context, opportunity_id)
    await record_crm_audit_best_effort(session, context, action_type="opportunity_won", entity_type="opportunity", entity_id=opportunity_id, company_id=str(updated["company_id"]))
    updated["customer_activation_recommended"] = not bool(current.get("stakeholder_id"))
    updated["cari_account_recommended"] = request.create_cari_account
    updated["after_sales_asset_future"] = True
    return updated


async def mark_opportunity_lost(session: AsyncSession, context: dict[str, Any], opportunity_id: str, request: OpportunityLostRequest) -> dict[str, Any]:
    await require_opportunity(session, context, opportunity_id)
    await session.execute(
        text(
            """
            update public.crm_opportunities
            set status = 'lost',
                actual_close_date = current_date,
                lost_reason = :lost_reason,
                competitor_name = :competitor_name,
                next_followup_date = :future_followup_date,
                probability = 0,
                weighted_value = 0,
                updated_by = :user_id,
                updated_at = now(),
                version = version + 1
            where tenant_id = :tenant_id and id = :opportunity_id
            """
        ),
        {"tenant_id": context["tenant_id"], "opportunity_id": opportunity_id, "lost_reason": request.lost_reason, "competitor_name": request.competitor_name, "future_followup_date": request.future_followup_date, "user_id": context.get("user_id")},
    )
    updated = await require_opportunity(session, context, opportunity_id)
    await record_crm_audit_best_effort(session, context, action_type="opportunity_lost", entity_type="opportunity", entity_id=opportunity_id, company_id=str(updated["company_id"]), metadata={"lost_reason": request.lost_reason})
    return updated


async def create_opportunity_followup_task(session: AsyncSession, context: dict[str, Any], opportunity_id: str, request: OpportunityFollowupTaskRequest) -> dict[str, Any]:
    opportunity = await require_opportunity(session, context, opportunity_id)
    task = await create_crm_project_task_best_effort(
        session,
        context,
        company_id=str(opportunity["company_id"]),
        title=request.title or f"{opportunity['opportunity_name']} takip gorevi",
        description=request.description or "CRM firsat takip gorevi.",
        priority=request.priority,
        assignee_user_id=request.assignee_user_id or opportunity.get("assigned_owner_user_id"),
        due_date=request.due_date or opportunity.get("next_followup_date"),
        related_entity_type="opportunity",
        related_entity_id=opportunity_id,
    )
    await record_followup_event(session, context, opportunity, "task_created", request.due_date or opportunity.get("next_followup_date"), task.get("id") if task else None)
    return {"opportunity": opportunity, "task": task, "warning": None if task else "Project/Task altyapisi yok; CRM firsat state'i korunuyor."}


async def upload_opportunity_proposal(session: AsyncSession, context: dict[str, Any], opportunity_id: str, request: OpportunityProposalUploadRequest) -> dict[str, Any]:
    opportunity = await require_opportunity(session, context, opportunity_id)
    await session.execute(
        text(
            """
            update public.crm_opportunities
            set proposal_document_id = :proposal_document_id,
                proposal_status = :proposal_status,
                proposal_amount = :proposal_amount,
                proposal_sent_at = coalesce(:proposal_sent_at, now()),
                proposal_valid_until = :proposal_valid_until,
                updated_by = :user_id,
                updated_at = now(),
                version = version + 1
            where tenant_id = :tenant_id and id = :opportunity_id
            """
        ),
        {"tenant_id": context["tenant_id"], "opportunity_id": opportunity_id, **request.model_dump(), "user_id": context.get("user_id")},
    )
    await record_crm_audit_best_effort(session, context, action_type="proposal_uploaded", entity_type="opportunity", entity_id=opportunity_id, company_id=str(opportunity["company_id"]))
    return await require_opportunity(session, context, opportunity_id)


async def record_followup_event(session: AsyncSession, context: dict[str, Any], opportunity: dict[str, Any], event_type: str, due_date: date | None, task_id: str | None = None) -> None:
    await ensure_crm_deepening_tables(session, followups=True)
    await session.execute(
        text(
            """
            insert into public.crm_followup_events (
              tenant_id, company_id, entity_type, entity_id, event_type,
              due_date, related_task_id, created_by, metadata_json
            )
            values (
              :tenant_id, :company_id, 'opportunity', :entity_id, :event_type,
              :due_date, :related_task_id, :user_id, cast(:metadata_json as jsonb)
            )
            """
        ),
        {"tenant_id": context["tenant_id"], "company_id": opportunity["company_id"], "entity_id": opportunity["id"], "event_type": event_type, "due_date": due_date, "related_task_id": task_id, "user_id": context.get("user_id"), "metadata_json": json_dumps({"source": "opportunity"})},
    )


def utc_now() -> datetime:
    return datetime.utcnow()
