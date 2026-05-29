# ruff: noqa: E501, I001

from __future__ import annotations

from typing import Any

from fastapi import status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.domains.crm.schemas import LeadCreateRequest, LeadListQuery, LeadMarkLostRequest, LeadQualifyRequest, LeadUpdateRequest, ListResult
from app.domains.crm.service import (
    assert_company_scope,
    assert_version,
    create_crm_notification_best_effort,
    ensure_crm_deepening_tables,
    ensure_crm_tables,
    json_dumps,
    list_meta,
    record_crm_audit_best_effort,
    row_to_dict,
)

LEAD_SORT_COLUMNS = {
    "lead_name": "l.lead_name",
    "lead_status": "l.lead_status",
    "source": "l.source",
    "estimated_value": "l.estimated_value",
    "expected_close_date": "l.expected_close_date",
    "next_followup_date": "l.next_followup_date",
    "last_contacted_at": "l.last_contacted_at",
    "updated_at": "l.updated_at",
    "created_at": "l.created_at",
}

LEAD_MUTABLE_COLUMNS = {
    "stakeholder_id",
    "master_entity_type",
    "master_entity_id",
    "lead_name",
    "contact_name",
    "phone",
    "email",
    "company_name",
    "sector",
    "source",
    "lead_status",
    "qualification_score",
    "interest_area",
    "product_interest",
    "estimated_value",
    "currency",
    "expected_close_date",
    "assigned_owner_user_id",
    "next_followup_date",
    "last_contacted_at",
    "lost_reason",
    "notes",
    "tags",
    "metadata_json",
}


async def list_leads(session: AsyncSession, context: dict[str, Any], query: LeadListQuery) -> ListResult:
    await ensure_crm_deepening_tables(session, leads=True)
    filters = ["l.tenant_id = :tenant_id", "coalesce(l.is_deleted, false) = false"]
    params: dict[str, Any] = {"tenant_id": context["tenant_id"], "limit": query.page_size, "offset": (query.page - 1) * query.page_size}
    if query.company_id:
        assert_company_scope(context, query.company_id)
        filters.append("l.company_id = :company_id")
        params["company_id"] = query.company_id
    elif context.get("company_scope_ids"):
        filters.append("l.company_id = any(cast(:company_scope_ids as uuid[]))")
        params["company_scope_ids"] = context["company_scope_ids"]
    for field in ["lead_status", "source", "assigned_owner_user_id"]:
        value = getattr(query, field)
        if value:
            filters.append(f"l.{field} = :{field}")
            params[field] = value
    if query.next_followup_before:
        filters.append("l.next_followup_date <= :next_followup_before")
        params["next_followup_before"] = query.next_followup_before
    if query.tag:
        filters.append(":tag = any(l.tags)")
        params["tag"] = query.tag
    if query.search:
        filters.append("(l.lead_name ilike :search or coalesce(l.contact_name, '') ilike :search or coalesce(l.company_name, '') ilike :search or coalesce(l.email, '') ilike :search or coalesce(l.phone, '') ilike :search)")
        params["search"] = f"%{query.search}%"
    sort = LEAD_SORT_COLUMNS.get(query.sort, "l.updated_at")
    direction = "asc" if query.direction.lower() == "asc" else "desc"
    result = await session.execute(
        text(
            f"""
            select l.*, s.display_name as stakeholder_name, count(*) over() as total_count
            from public.crm_leads l
            left join public.crm_stakeholders s on s.tenant_id = l.tenant_id and s.id = l.stakeholder_id
            where {" and ".join(filters)}
            order by {sort} {direction} nulls last, l.id desc
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


async def get_lead(session: AsyncSession, context: dict[str, Any], lead_id: str) -> dict[str, Any] | None:
    await ensure_crm_deepening_tables(session, leads=True)
    result = await session.execute(
        text(
            """
            select l.*, s.display_name as stakeholder_name
            from public.crm_leads l
            left join public.crm_stakeholders s on s.tenant_id = l.tenant_id and s.id = l.stakeholder_id
            where l.tenant_id = :tenant_id and l.id = :lead_id and coalesce(l.is_deleted, false) = false
            limit 1
            """
        ),
        {"tenant_id": context["tenant_id"], "lead_id": lead_id},
    )
    row = result.mappings().one_or_none()
    if not row:
        return None
    lead = row_to_dict(row)
    assert_company_scope(context, str(lead["company_id"]))
    lead["duplicate_warnings"] = await duplicate_lead_candidates(session, context, lead)
    return lead


async def require_lead(session: AsyncSession, context: dict[str, Any], lead_id: str) -> dict[str, Any]:
    lead = await get_lead(session, context, lead_id)
    if not lead:
        raise DomainError("Lead bulunamadi.", "CRM_LEAD_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    return lead


async def create_lead(session: AsyncSession, context: dict[str, Any], request: LeadCreateRequest) -> dict[str, Any]:
    await ensure_crm_tables(session, stakeholders=True)
    await ensure_crm_deepening_tables(session, leads=True)
    assert_company_scope(context, request.company_id, write=True)
    inserted = await session.execute(
        text(
            """
            insert into public.crm_leads (
              tenant_id, company_id, stakeholder_id, master_entity_type, master_entity_id,
              lead_name, contact_name, phone, email, company_name, sector, source,
              lead_status, qualification_score, interest_area, product_interest,
              estimated_value, currency, expected_close_date, assigned_owner_user_id,
              next_followup_date, lost_reason, notes, tags, metadata_json, created_by, updated_by
            )
            values (
              :tenant_id, :company_id, :stakeholder_id, :master_entity_type, :master_entity_id,
              :lead_name, :contact_name, :phone, :email, :company_name, :sector, :source,
              :lead_status, :qualification_score, :interest_area, :product_interest,
              :estimated_value, :currency, :expected_close_date, :assigned_owner_user_id,
              :next_followup_date, :lost_reason, :notes, :tags, cast(:metadata_json as jsonb),
              :user_id, :user_id
            )
            returning id
            """
        ),
        {"tenant_id": context["tenant_id"], "user_id": context.get("user_id"), **request.model_dump(exclude={"metadata_json"}), "metadata_json": json_dumps(request.metadata_json)},
    )
    lead = await require_lead(session, context, str(inserted.scalar_one()))
    await record_crm_audit_best_effort(session, context, action_type="lead_created", entity_type="lead", entity_id=str(lead["id"]), company_id=str(lead["company_id"]), summary="CRM lead olusturuldu.")
    await create_crm_notification_best_effort(
        session,
        context,
        user_id=lead.get("assigned_owner_user_id"),
        company_id=str(lead["company_id"]),
        notification_type="lead_assigned",
        title="Yeni lead atandi",
        message=f"{lead.get('lead_name')} size atandi.",
        target_page="/app/crm/leadler",
        related_entity_type="lead",
        related_entity_id=str(lead["id"]),
        related_record_label=lead.get("lead_name"),
        due_at=lead.get("next_followup_date"),
    )
    return lead


async def update_lead(session: AsyncSession, context: dict[str, Any], lead_id: str, request: LeadUpdateRequest) -> dict[str, Any]:
    current = await require_lead(session, context, lead_id)
    assert_company_scope(context, str(current["company_id"]), write=True)
    assert_version(current, request.base_version)
    data = request.model_dump(exclude_unset=True, exclude={"base_version"})
    if not data:
        return current
    set_parts: list[str] = []
    params = {"tenant_id": context["tenant_id"], "lead_id": lead_id, "user_id": context.get("user_id")}
    for key, value in data.items():
        if key not in LEAD_MUTABLE_COLUMNS:
            continue
        if key == "metadata_json":
            set_parts.append("metadata_json = cast(:metadata_json as jsonb)")
            params[key] = json_dumps(value)
        else:
            set_parts.append(f"{key} = :{key}")
            params[key] = value
    if not set_parts:
        return current
    set_parts.extend(["updated_by = :user_id", "updated_at = now()", "version = version + 1"])
    await session.execute(
        text(f"update public.crm_leads set {', '.join(set_parts)} where tenant_id = :tenant_id and id = :lead_id and coalesce(is_deleted, false) = false"),
        params,
    )
    updated = await require_lead(session, context, lead_id)
    await record_crm_audit_best_effort(session, context, action_type="lead_updated", entity_type="lead", entity_id=lead_id, company_id=str(updated["company_id"]))
    return updated


async def qualify_lead(session: AsyncSession, context: dict[str, Any], lead_id: str, request: LeadQualifyRequest) -> dict[str, Any]:
    lead = await require_lead(session, context, lead_id)
    await session.execute(
        text(
            """
            update public.crm_leads
            set lead_status = 'qualified',
                qualification_score = coalesce(:qualification_score, qualification_score),
                notes = concat_ws(E'\n', notes, :notes),
                updated_by = :user_id,
                updated_at = now(),
                version = version + 1
            where tenant_id = :tenant_id and id = :lead_id
            """
        ),
        {"tenant_id": context["tenant_id"], "lead_id": lead_id, "qualification_score": request.qualification_score, "notes": request.notes, "user_id": context.get("user_id")},
    )
    qualified = await require_lead(session, context, lead_id)
    await record_crm_audit_best_effort(session, context, action_type="lead_qualified", entity_type="lead", entity_id=lead_id, company_id=str(lead["company_id"]))
    if request.create_opportunity:
        from app.domains.crm.opportunities import create_opportunity
        from app.domains.crm.schemas import OpportunityCreateRequest

        qualified["opportunity"] = await create_opportunity(
            session,
            context,
            OpportunityCreateRequest(
                company_id=str(qualified["company_id"]),
                lead_id=str(qualified["id"]),
                opportunity_name=f"{qualified['lead_name']} firsati",
                customer_name=str(qualified.get("company_name") or qualified.get("lead_name")),
                estimated_value=qualified.get("estimated_value"),
                currency=qualified.get("currency") or "TRY",
                expected_close_date=qualified.get("expected_close_date"),
                assigned_owner_user_id=qualified.get("assigned_owner_user_id"),
                source=qualified.get("source"),
                product_interest=qualified.get("product_interest"),
                next_followup_date=qualified.get("next_followup_date"),
                tags=qualified.get("tags") or [],
            ),
        )
    return qualified


async def mark_lead_lost(session: AsyncSession, context: dict[str, Any], lead_id: str, request: LeadMarkLostRequest) -> dict[str, Any]:
    lead = await require_lead(session, context, lead_id)
    await session.execute(
        text(
            """
            update public.crm_leads
            set lead_status = 'lost',
                lost_reason = :lost_reason,
                notes = concat_ws(E'\n', notes, :notes),
                updated_by = :user_id,
                updated_at = now(),
                version = version + 1
            where tenant_id = :tenant_id and id = :lead_id
            """
        ),
        {"tenant_id": context["tenant_id"], "lead_id": lead_id, "lost_reason": request.lost_reason, "notes": request.notes, "user_id": context.get("user_id")},
    )
    updated = await require_lead(session, context, lead_id)
    await record_crm_audit_best_effort(session, context, action_type="lead_lost", entity_type="lead", entity_id=lead_id, company_id=str(lead["company_id"]), metadata={"lost_reason": request.lost_reason})
    return updated


async def duplicate_lead_candidates(session: AsyncSession, context: dict[str, Any], lead: dict[str, Any]) -> list[dict[str, Any]]:
    candidates: list[dict[str, Any]] = []
    params = {"tenant_id": context["tenant_id"], "lead_id": lead.get("id"), "email": lead.get("email"), "phone": lead.get("phone"), "company_name": lead.get("company_name")}
    if lead.get("email") or lead.get("phone") or lead.get("company_name"):
        result = await session.execute(
            text(
                """
                select id, lead_name as label, 'lead' as source_type,
                       case
                         when :email is not null and email = :email then 'email'
                         when :phone is not null and phone = :phone then 'phone'
                         else 'company_name'
                       end as match_field
                from public.crm_leads
                where tenant_id = :tenant_id
                  and id <> cast(:lead_id as uuid)
                  and coalesce(is_deleted, false) = false
                  and (
                    (:email is not null and email = :email)
                    or (:phone is not null and phone = :phone)
                    or (:company_name is not null and company_name ilike :company_name)
                  )
                limit 10
                """
            ),
            params,
        )
        candidates.extend(row_to_dict(row) for row in result.mappings())
    if await stakeholder_table_ready(session):
        result = await session.execute(
            text(
                """
                select s.id, s.display_name as label, 'stakeholder' as source_type,
                       case
                         when :email is not null and coalesce(p.email, o.email) = :email then 'email'
                         when :phone is not null and coalesce(p.phone, o.phone) = :phone then 'phone'
                         else 'trade_name'
                       end as match_field
                from public.crm_stakeholders s
                left join public.master_persons p on p.tenant_id = s.tenant_id and s.master_entity_type = 'person' and p.id = s.master_entity_id
                left join public.master_organizations o on o.tenant_id = s.tenant_id and s.master_entity_type = 'organization' and o.id = s.master_entity_id
                where s.tenant_id = :tenant_id
                  and coalesce(s.is_deleted, false) = false
                  and (
                    (:email is not null and coalesce(p.email, o.email) = :email)
                    or (:phone is not null and coalesce(p.phone, o.phone) = :phone)
                    or (:company_name is not null and o.trade_name ilike :company_name)
                  )
                limit 10
                """
            ),
            params,
        )
        candidates.extend(row_to_dict(row) for row in result.mappings())
    return candidates


async def stakeholder_table_ready(session: AsyncSession) -> bool:
    from app.domains.operations.service import table_exists

    return await table_exists(session, "public.crm_stakeholders")
