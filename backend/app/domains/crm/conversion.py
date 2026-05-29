# ruff: noqa: E501, I001

from __future__ import annotations

from typing import Any, cast

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.crm.leads import require_lead
from app.domains.crm.opportunities import create_opportunity
from app.domains.crm.schemas import (
    CreateCariAccountFromStakeholderRequest,
    LeadConvertRequest,
    MasterOrganizationCreateRequest,
    MasterPersonCreateRequest,
    OpportunityCreateRequest,
    StakeholderCreateRequest,
)
from app.domains.crm.service import record_crm_audit_best_effort
from app.domains.crm.stakeholders import create_cari_account_for_stakeholder, create_stakeholder


async def convert_lead(session: AsyncSession, context: dict[str, Any], lead_id: str, request: LeadConvertRequest) -> dict[str, Any]:
    lead = await require_lead(session, context, lead_id)
    stakeholder = None
    cari_account = None
    if request.create_stakeholder:
        stakeholder_payload = _stakeholder_payload_from_lead(lead, request)
        stakeholder = await create_stakeholder(session, context, stakeholder_payload)
        if request.create_cari_account:
            cari_account = await create_cari_account_for_stakeholder(
                session,
                context,
                str(stakeholder["id"]),
                CreateCariAccountFromStakeholderRequest(currency=lead.get("currency") or "TRY"),
            )
    opportunity = None
    if request.create_opportunity:
        opportunity = await create_opportunity(
            session,
            context,
            OpportunityCreateRequest(
                company_id=str(lead["company_id"]),
                stakeholder_id=str(stakeholder["id"]) if stakeholder else lead.get("stakeholder_id"),
                lead_id=str(lead["id"]),
                opportunity_name=request.opportunity_name or f"{lead['lead_name']} firsati",
                customer_name=str(stakeholder.get("display_name") if stakeholder else lead.get("company_name") or lead.get("lead_name")),
                estimated_value=lead.get("estimated_value"),
                currency=lead.get("currency") or "TRY",
                expected_close_date=lead.get("expected_close_date"),
                assigned_owner_user_id=lead.get("assigned_owner_user_id"),
                source=lead.get("source"),
                product_interest=lead.get("product_interest"),
                next_followup_date=lead.get("next_followup_date"),
                tags=lead.get("tags") or [],
                notes=request.notes or lead.get("notes"),
            ),
        )
    await session.execute(
        text(
            """
            update public.crm_leads
            set lead_status = 'converted',
                stakeholder_id = coalesce(:stakeholder_id, stakeholder_id),
                updated_by = :user_id,
                updated_at = now(),
                version = version + 1
            where tenant_id = :tenant_id and id = :lead_id
            """
        ),
        {"tenant_id": context["tenant_id"], "lead_id": lead_id, "stakeholder_id": stakeholder.get("id") if stakeholder else None, "user_id": context.get("user_id")},
    )
    await record_crm_audit_best_effort(session, context, action_type="lead_converted", entity_type="lead", entity_id=lead_id, company_id=str(lead["company_id"]), metadata={"stakeholder_id": stakeholder.get("id") if stakeholder else None, "opportunity_id": opportunity.get("id") if opportunity else None})
    return {
        "lead": await require_lead(session, context, lead_id),
        "stakeholder": stakeholder,
        "cari_account": cari_account,
        "opportunity": opportunity,
        "accounting_cari_recommended": not request.create_cari_account,
        "after_sales_asset_future": True,
    }


def _stakeholder_payload_from_lead(lead: dict[str, Any], request: LeadConvertRequest) -> StakeholderCreateRequest:
    master_type = cast(Any, lead.get("master_entity_type") or ("organization" if lead.get("company_name") else "person"))
    if lead.get("master_entity_id"):
        return StakeholderCreateRequest(
            company_id=str(lead["company_id"]),
            master_entity_type=master_type,
            master_entity_id=str(lead["master_entity_id"]),
            display_name=lead.get("company_name") or lead.get("lead_name"),
            stakeholder_type=request.stakeholder_type,
            relationship_status=request.relationship_status,
            customer_status=request.customer_status,
            assigned_owner_user_id=lead.get("assigned_owner_user_id"),
            source=lead.get("source"),
            sector=lead.get("sector"),
            tags=lead.get("tags") or [],
            notes=request.notes or lead.get("notes"),
        )
    if master_type == "person":
        first_name, last_name = _split_name(str(lead.get("contact_name") or lead.get("lead_name")))
        return StakeholderCreateRequest(
            company_id=str(lead["company_id"]),
            master_entity_type="person",
            master_person=MasterPersonCreateRequest(first_name=first_name, last_name=last_name, phone=lead.get("phone"), email=lead.get("email"), notes=lead.get("notes")),
            display_name=lead.get("lead_name"),
            stakeholder_type=request.stakeholder_type,
            relationship_status=request.relationship_status,
            customer_status=request.customer_status,
            assigned_owner_user_id=lead.get("assigned_owner_user_id"),
            source=lead.get("source"),
            sector=lead.get("sector"),
            tags=lead.get("tags") or [],
            notes=request.notes or lead.get("notes"),
        )
    return StakeholderCreateRequest(
        company_id=str(lead["company_id"]),
        master_entity_type="organization",
        master_organization=MasterOrganizationCreateRequest(trade_name=str(lead.get("company_name") or lead.get("lead_name")), phone=lead.get("phone"), email=lead.get("email"), notes=lead.get("notes")),
        display_name=lead.get("company_name") or lead.get("lead_name"),
        stakeholder_type=request.stakeholder_type,
        relationship_status=request.relationship_status,
        customer_status=request.customer_status,
        assigned_owner_user_id=lead.get("assigned_owner_user_id"),
        source=lead.get("source"),
        sector=lead.get("sector"),
        tags=lead.get("tags") or [],
        notes=request.notes or lead.get("notes"),
    )


def _split_name(value: str) -> tuple[str, str]:
    parts = value.strip().split()
    if not parts:
        return "CRM", "Lead"
    if len(parts) == 1:
        return parts[0], "Lead"
    return parts[0], " ".join(parts[1:])
