# ruff: noqa: E501, I001

from __future__ import annotations

from datetime import date
from typing import Annotated, Any, cast

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.errors import DomainError, domain_error_to_http
from app.core.security import RequestContext, has_permission, require_access_context, require_tenant
from app.domains.crm.conversion import convert_lead
from app.domains.crm.followups import complete_followup, list_due_followups, snooze_followup
from app.domains.crm.interactions import create_interaction, create_interaction_deep, list_interactions, list_interactions_deep
from app.domains.crm.leads import create_lead, get_lead, list_leads, mark_lead_lost, qualify_lead, update_lead
from app.domains.crm.master_data import create_master_organization, create_master_person, search_master_organizations, search_master_persons
from app.domains.crm.opportunities import create_opportunity, create_opportunity_followup_task, get_opportunity, list_opportunities, mark_opportunity_lost, mark_opportunity_won, change_opportunity_stage, update_opportunity, upload_opportunity_proposal
from app.domains.crm.pipelines import create_pipeline, list_pipeline_stages, list_pipelines, update_pipeline_stage
from app.domains.crm.schemas import (
    CreateCariAccountFromStakeholderRequest,
    CreateFollowupTaskRequest,
    FollowupCompleteRequest,
    FollowupDueQuery,
    FollowupSnoozeRequest,
    InteractionCreateRequest,
    InteractionListQuery,
    LeadConvertRequest,
    LeadCreateRequest,
    LeadListQuery,
    LeadMarkLostRequest,
    LeadQualifyRequest,
    LeadUpdateRequest,
    MasterOrganizationCreateRequest,
    MasterOrganizationSearchQuery,
    MasterPersonCreateRequest,
    MasterPersonSearchQuery,
    OpportunityCreateRequest,
    OpportunityFollowupTaskRequest,
    OpportunityListQuery,
    OpportunityLostRequest,
    OpportunityProposalUploadRequest,
    OpportunityStageChangeRequest,
    OpportunityUpdateRequest,
    OpportunityWinRequest,
    PipelineCreateRequest,
    PipelineStageUpdateRequest,
    StakeholderCreateRequest,
    StakeholderListQuery,
    StakeholderUpdateRequest,
)
from app.domains.crm.stakeholders import create_cari_account_for_stakeholder, create_followup_task_for_stakeholder, create_stakeholder, delete_stakeholder, get_stakeholder, list_stakeholders, related_records, stakeholder_summary, update_stakeholder
from app.schemas.common import ApiSuccess

router = APIRouter(dependencies=[Depends(require_access_context)])
RequestContextDep = Annotated[RequestContext, Depends(require_access_context)]
SessionDep = Annotated[AsyncSession, Depends(get_session)]


@router.get("/master/persons/search", response_model=ApiSuccess[dict[str, Any]])
async def master_persons_search(
    session: SessionDep,
    context: RequestContextDep,
    nationality: str | None = Query(default=None),
    identity_number: str | None = Query(default=None),
    passport_no: str | None = Query(default=None),
    full_name: str | None = Query(default=None),
    phone: str | None = Query(default=None),
    email: str | None = Query(default=None),
    search: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, alias="pageSize", ge=1, le=100),
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "crm.view")
    tenant_id = require_tenant(context)
    try:
        result = await search_master_persons(session, service_context(context, tenant_id), MasterPersonSearchQuery(nationality=nationality, identity_number=identity_number, passport_no=passport_no, full_name=full_name, phone=phone, email=email, search=search, page=page, page_size=page_size))
        return ApiSuccess(data=result)
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/master/persons", response_model=ApiSuccess[dict[str, Any]], status_code=201)
async def master_persons_create(request: MasterPersonCreateRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "crm.create")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            person = await create_master_person(session, service_context(context, tenant_id), request)
        return ApiSuccess(data=person, message="Master kisi kaydi olusturuldu.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/master/organizations/search", response_model=ApiSuccess[dict[str, Any]])
async def master_organizations_search(
    session: SessionDep,
    context: RequestContextDep,
    country: str | None = Query(default=None),
    tax_number: str | None = Query(default=None),
    registry_number: str | None = Query(default=None),
    trade_name: str | None = Query(default=None),
    city: str | None = Query(default=None),
    search: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, alias="pageSize", ge=1, le=100),
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "crm.view")
    tenant_id = require_tenant(context)
    try:
        result = await search_master_organizations(session, service_context(context, tenant_id), MasterOrganizationSearchQuery(country=country, tax_number=tax_number, registry_number=registry_number, trade_name=trade_name, city=city, search=search, page=page, page_size=page_size))
        return ApiSuccess(data=result)
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/master/organizations", response_model=ApiSuccess[dict[str, Any]], status_code=201)
async def master_organizations_create(request: MasterOrganizationCreateRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "crm.create")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            organization = await create_master_organization(session, service_context(context, tenant_id), request)
        return ApiSuccess(data=organization, message="Master kurum kaydi olusturuldu.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/stakeholders", response_model=ApiSuccess[dict[str, Any]])
async def stakeholders_list(
    session: SessionDep,
    context: RequestContextDep,
    company_id: str | None = Query(default=None),
    stakeholder_type: str | None = Query(default=None),
    relationship_status: str | None = Query(default=None),
    customer_status: str | None = Query(default=None),
    supplier_status: str | None = Query(default=None),
    city: str | None = Query(default=None),
    sector: str | None = Query(default=None),
    owner_user_id: str | None = Query(default=None),
    has_cari_account: bool | None = Query(default=None),
    tag: str | None = Query(default=None),
    search: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, alias="pageSize", ge=1, le=200),
    sort: str = Query(default="updated_at"),
    direction: str = Query(default="desc"),
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "crm.view")
    tenant_id = require_tenant(context)
    try:
        result = await list_stakeholders(session, service_context(context, tenant_id), StakeholderListQuery(company_id=company_id, stakeholder_type=stakeholder_type, relationship_status=relationship_status, customer_status=customer_status, supplier_status=supplier_status, city=city, sector=sector, owner_user_id=owner_user_id, has_cari_account=has_cari_account, tag=tag, search=search, page=page, page_size=page_size, sort=sort, direction=direction))
        return ApiSuccess(data=result)
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/stakeholders", response_model=ApiSuccess[dict[str, Any]], status_code=201)
async def stakeholders_create(request: StakeholderCreateRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "crm.create")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            stakeholder = await create_stakeholder(session, service_context(context, tenant_id), request)
        return ApiSuccess(data=stakeholder, message="Paydas kaydi olusturuldu.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/stakeholders/{stakeholder_id}", response_model=ApiSuccess[dict[str, Any]])
async def stakeholders_get(stakeholder_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "crm.view")
    tenant_id = require_tenant(context)
    try:
        stakeholder = await get_stakeholder(session, service_context(context, tenant_id), stakeholder_id)
        if not stakeholder:
            raise DomainError("Paydas kaydi bulunamadi.", "STAKEHOLDER_NOT_FOUND", 404)
        return ApiSuccess(data=stakeholder)
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.patch("/stakeholders/{stakeholder_id}", response_model=ApiSuccess[dict[str, Any]])
async def stakeholders_update(stakeholder_id: str, request: StakeholderUpdateRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "crm.edit")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            stakeholder = await update_stakeholder(session, service_context(context, tenant_id), stakeholder_id, request)
        return ApiSuccess(data=stakeholder, message="Paydas kaydi guncellendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.delete("/stakeholders/{stakeholder_id}", response_model=ApiSuccess[dict[str, Any]])
async def stakeholders_delete(stakeholder_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "crm.delete")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            result = await delete_stakeholder(session, service_context(context, tenant_id), stakeholder_id)
        return ApiSuccess(data=result, message=result.get("message"))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/stakeholders/{stakeholder_id}/interactions", response_model=ApiSuccess[list[dict[str, Any]]])
async def stakeholder_interactions_list(stakeholder_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[list[dict[str, Any]]]:
    ensure_permission(context, "crm.view")
    tenant_id = require_tenant(context)
    try:
        rows = await list_interactions(session, service_context(context, tenant_id), stakeholder_id)
        return ApiSuccess(data=rows)
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/stakeholders/{stakeholder_id}/interactions", response_model=ApiSuccess[dict[str, Any]], status_code=201)
async def stakeholder_interactions_create(stakeholder_id: str, request: InteractionCreateRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "crm.interactionsManage")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            interaction = await create_interaction(session, service_context(context, tenant_id), stakeholder_id, request)
        return ApiSuccess(data=interaction, message="Etkilesim eklendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/stakeholders/{stakeholder_id}/related-records", response_model=ApiSuccess[dict[str, Any]])
async def stakeholder_related_records(stakeholder_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "crm.view")
    tenant_id = require_tenant(context)
    try:
        result = await related_records(session, service_context(context, tenant_id), stakeholder_id)
        return ApiSuccess(data=result)
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/stakeholders/{stakeholder_id}/summary", response_model=ApiSuccess[dict[str, Any]])
async def stakeholder_summary_endpoint(stakeholder_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "crm.view")
    tenant_id = require_tenant(context)
    try:
        summary = await stakeholder_summary(session, service_context(context, tenant_id), stakeholder_id)
        return ApiSuccess(data=summary.model_dump())
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/stakeholders/{stakeholder_id}/create-cari-account", response_model=ApiSuccess[dict[str, Any]], status_code=201)
async def stakeholder_create_cari_account(stakeholder_id: str, request: CreateCariAccountFromStakeholderRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "crm.createCariAccount")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            result = await create_cari_account_for_stakeholder(session, service_context(context, tenant_id), stakeholder_id, request)
        return ApiSuccess(data=result, message="Paydas icin cari kart olusturuldu.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/stakeholders/{stakeholder_id}/create-followup-task", response_model=ApiSuccess[dict[str, Any]], status_code=201)
async def stakeholder_create_followup_task(stakeholder_id: str, request: CreateFollowupTaskRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "crm.createTask")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            result = await create_followup_task_for_stakeholder(session, service_context(context, tenant_id), stakeholder_id, request)
        return ApiSuccess(data=result, message="Takip gorevi olusturuldu.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/leads", response_model=ApiSuccess[dict[str, Any]])
async def leads_list(
    session: SessionDep,
    context: RequestContextDep,
    company_id: str | None = Query(default=None),
    lead_status: str | None = Query(default=None),
    source: str | None = Query(default=None),
    assigned_owner_user_id: str | None = Query(default=None),
    next_followup_before: Annotated[date | None, Query()] = None,
    tag: str | None = Query(default=None),
    search: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, alias="pageSize", ge=1, le=200),
    sort: str = Query(default="updated_at"),
    direction: str = Query(default="desc"),
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "crm.leadsView")
    tenant_id = require_tenant(context)
    try:
        result = await list_leads(session, service_context(context, tenant_id), LeadListQuery(company_id=company_id, lead_status=lead_status, source=source, assigned_owner_user_id=assigned_owner_user_id, next_followup_before=next_followup_before, tag=tag, search=search, page=page, page_size=page_size, sort=sort, direction=direction))
        return ApiSuccess(data=result.model_dump())
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/leads", response_model=ApiSuccess[dict[str, Any]], status_code=201)
async def leads_create(request: LeadCreateRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "crm.leadsEdit")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            lead = await create_lead(session, service_context(context, tenant_id), request)
        return ApiSuccess(data=lead, message="Lead olusturuldu.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/leads/{lead_id}", response_model=ApiSuccess[dict[str, Any]])
async def leads_get(lead_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "crm.leadsView")
    tenant_id = require_tenant(context)
    try:
        lead = await get_lead(session, service_context(context, tenant_id), lead_id)
        if not lead:
            raise DomainError("Lead bulunamadi.", "CRM_LEAD_NOT_FOUND", 404)
        return ApiSuccess(data=lead)
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.patch("/leads/{lead_id}", response_model=ApiSuccess[dict[str, Any]])
async def leads_update(lead_id: str, request: LeadUpdateRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "crm.leadsEdit")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            lead = await update_lead(session, service_context(context, tenant_id), lead_id, request)
        return ApiSuccess(data=lead, message="Lead guncellendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/leads/{lead_id}/qualify", response_model=ApiSuccess[dict[str, Any]])
async def leads_qualify(lead_id: str, request: LeadQualifyRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "crm.leadsEdit")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            lead = await qualify_lead(session, service_context(context, tenant_id), lead_id, request)
        return ApiSuccess(data=lead, message="Lead qualified durumuna alindi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/leads/{lead_id}/convert", response_model=ApiSuccess[dict[str, Any]])
async def leads_convert(lead_id: str, request: LeadConvertRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "crm.leadsConvert")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            result = await convert_lead(session, service_context(context, tenant_id), lead_id, request)
        return ApiSuccess(data=result, message="Lead musteri/firsat akisina donusturuldu.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/leads/{lead_id}/mark-lost", response_model=ApiSuccess[dict[str, Any]])
async def leads_mark_lost(lead_id: str, request: LeadMarkLostRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "crm.leadsEdit")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            lead = await mark_lead_lost(session, service_context(context, tenant_id), lead_id, request)
        return ApiSuccess(data=lead, message="Lead kaybedildi olarak isaretlendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/opportunities", response_model=ApiSuccess[dict[str, Any]])
async def opportunities_list(
    session: SessionDep,
    context: RequestContextDep,
    company_id: str | None = Query(default=None),
    stakeholder_id: str | None = Query(default=None),
    lead_id: str | None = Query(default=None),
    pipeline_id: str | None = Query(default=None),
    stage_id: str | None = Query(default=None),
    status_value: str | None = Query(default=None, alias="status"),
    assigned_owner_user_id: str | None = Query(default=None),
    expected_close_before: Annotated[date | None, Query()] = None,
    next_followup_before: Annotated[date | None, Query()] = None,
    tag: str | None = Query(default=None),
    search: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, alias="pageSize", ge=1, le=200),
    sort: str = Query(default="updated_at"),
    direction: str = Query(default="desc"),
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "crm.opportunitiesView")
    tenant_id = require_tenant(context)
    try:
        result = await list_opportunities(session, service_context(context, tenant_id), OpportunityListQuery(company_id=company_id, stakeholder_id=stakeholder_id, lead_id=lead_id, pipeline_id=pipeline_id, stage_id=stage_id, status=status_value, assigned_owner_user_id=assigned_owner_user_id, expected_close_before=expected_close_before, next_followup_before=next_followup_before, tag=tag, search=search, page=page, page_size=page_size, sort=sort, direction=direction))
        return ApiSuccess(data=result.model_dump())
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/opportunities", response_model=ApiSuccess[dict[str, Any]], status_code=201)
async def opportunities_create(request: OpportunityCreateRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "crm.opportunitiesEdit")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            opportunity = await create_opportunity(session, service_context(context, tenant_id), request)
        return ApiSuccess(data=opportunity, message="Firsat olusturuldu.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/opportunities/{opportunity_id}", response_model=ApiSuccess[dict[str, Any]])
async def opportunities_get(opportunity_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "crm.opportunitiesView")
    tenant_id = require_tenant(context)
    try:
        opportunity = await get_opportunity(session, service_context(context, tenant_id), opportunity_id)
        if not opportunity:
            raise DomainError("Firsat bulunamadi.", "CRM_OPPORTUNITY_NOT_FOUND", 404)
        return ApiSuccess(data=opportunity)
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.patch("/opportunities/{opportunity_id}", response_model=ApiSuccess[dict[str, Any]])
async def opportunities_update(opportunity_id: str, request: OpportunityUpdateRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "crm.opportunitiesEdit")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            opportunity = await update_opportunity(session, service_context(context, tenant_id), opportunity_id, request)
        return ApiSuccess(data=opportunity, message="Firsat guncellendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/opportunities/{opportunity_id}/stage", response_model=ApiSuccess[dict[str, Any]])
async def opportunities_stage(opportunity_id: str, request: OpportunityStageChangeRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "crm.opportunityStageChange")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            opportunity = await change_opportunity_stage(session, service_context(context, tenant_id), opportunity_id, request)
        return ApiSuccess(data=opportunity, message="Firsat asamasi guncellendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/opportunities/{opportunity_id}/mark-won", response_model=ApiSuccess[dict[str, Any]])
async def opportunities_won(opportunity_id: str, request: OpportunityWinRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "crm.opportunityWinLoss")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            opportunity = await mark_opportunity_won(session, service_context(context, tenant_id), opportunity_id, request)
        return ApiSuccess(data=opportunity, message="Firsat kazanildi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/opportunities/{opportunity_id}/mark-lost", response_model=ApiSuccess[dict[str, Any]])
async def opportunities_lost(opportunity_id: str, request: OpportunityLostRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "crm.opportunityWinLoss")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            opportunity = await mark_opportunity_lost(session, service_context(context, tenant_id), opportunity_id, request)
        return ApiSuccess(data=opportunity, message="Firsat kaybedildi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/opportunities/{opportunity_id}/create-followup-task", response_model=ApiSuccess[dict[str, Any]], status_code=201)
async def opportunities_followup_task(opportunity_id: str, request: OpportunityFollowupTaskRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "crm.followupManage")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            result = await create_opportunity_followup_task(session, service_context(context, tenant_id), opportunity_id, request)
        return ApiSuccess(data=result, message="Firsat takip gorevi olusturuldu.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/opportunities/{opportunity_id}/upload-proposal", response_model=ApiSuccess[dict[str, Any]])
async def opportunities_upload_proposal(opportunity_id: str, request: OpportunityProposalUploadRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "crm.proposalManage")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            opportunity = await upload_opportunity_proposal(session, service_context(context, tenant_id), opportunity_id, request)
        return ApiSuccess(data=opportunity, message="Teklif belgesi firsata baglandi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/pipelines", response_model=ApiSuccess[dict[str, Any]])
async def pipelines_list(session: SessionDep, context: RequestContextDep, company_id: str | None = Query(default=None), include_inactive: bool = Query(default=False), page: int = Query(default=1, ge=1), page_size: int = Query(default=50, alias="pageSize", ge=1, le=200)) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "crm.opportunitiesView")
    tenant_id = require_tenant(context)
    try:
        result = await list_pipelines(session, service_context(context, tenant_id), company_id=company_id, include_inactive=include_inactive, page=page, page_size=page_size)
        return ApiSuccess(data=result.model_dump())
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/pipelines", response_model=ApiSuccess[dict[str, Any]], status_code=201)
async def pipelines_create(request: PipelineCreateRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "crm.pipelineManage")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            pipeline = await create_pipeline(session, service_context(context, tenant_id), request)
        return ApiSuccess(data=pipeline, message="Pipeline olusturuldu.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/pipelines/{pipeline_id}/stages", response_model=ApiSuccess[list[dict[str, Any]]])
async def pipelines_stages(pipeline_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[list[dict[str, Any]]]:
    ensure_permission(context, "crm.opportunitiesView")
    tenant_id = require_tenant(context)
    try:
        return ApiSuccess(data=await list_pipeline_stages(session, service_context(context, tenant_id), pipeline_id))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.patch("/pipeline-stages/{stage_id}", response_model=ApiSuccess[dict[str, Any]])
async def pipeline_stages_update(stage_id: str, request: PipelineStageUpdateRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "crm.pipelineManage")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            stage = await update_pipeline_stage(session, service_context(context, tenant_id), stage_id, request)
        return ApiSuccess(data=stage, message="Pipeline asamasi guncellendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/interactions", response_model=ApiSuccess[dict[str, Any]])
async def interactions_list(session: SessionDep, context: RequestContextDep, stakeholder_id: str | None = Query(default=None), lead_id: str | None = Query(default=None), opportunity_id: str | None = Query(default=None), interaction_type: str | None = Query(default=None), page: int = Query(default=1, ge=1), page_size: int = Query(default=50, alias="pageSize", ge=1, le=200)) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "crm.view")
    tenant_id = require_tenant(context)
    try:
        result = await list_interactions_deep(session, service_context(context, tenant_id), InteractionListQuery(stakeholder_id=stakeholder_id, lead_id=lead_id, opportunity_id=opportunity_id, interaction_type=interaction_type, page=page, page_size=page_size))
        return ApiSuccess(data=result.model_dump())
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/interactions", response_model=ApiSuccess[dict[str, Any]], status_code=201)
async def interactions_create(request: InteractionCreateRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "crm.interactionsManage")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            interaction = await create_interaction_deep(session, service_context(context, tenant_id), request, stakeholder_id=getattr(request, "stakeholder_id", None), lead_id=getattr(request, "lead_id", None), opportunity_id=getattr(request, "opportunity_id", None))
        return ApiSuccess(data=interaction, message="Etkilesim eklendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/opportunities/{opportunity_id}/interactions", response_model=ApiSuccess[dict[str, Any]])
async def opportunity_interactions_list(opportunity_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "crm.opportunitiesView")
    tenant_id = require_tenant(context)
    try:
        result = await list_interactions_deep(session, service_context(context, tenant_id), InteractionListQuery(opportunity_id=opportunity_id))
        return ApiSuccess(data=result.model_dump())
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/opportunities/{opportunity_id}/interactions", response_model=ApiSuccess[dict[str, Any]], status_code=201)
async def opportunity_interactions_create(opportunity_id: str, request: InteractionCreateRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "crm.interactionsManage")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            interaction = await create_interaction_deep(session, service_context(context, tenant_id), request, opportunity_id=opportunity_id)
        return ApiSuccess(data=interaction, message="Firsat etkilesimi eklendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/leads/{lead_id}/interactions", response_model=ApiSuccess[dict[str, Any]])
async def lead_interactions_list(lead_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "crm.leadsView")
    tenant_id = require_tenant(context)
    try:
        result = await list_interactions_deep(session, service_context(context, tenant_id), InteractionListQuery(lead_id=lead_id))
        return ApiSuccess(data=result.model_dump())
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/leads/{lead_id}/interactions", response_model=ApiSuccess[dict[str, Any]], status_code=201)
async def lead_interactions_create(lead_id: str, request: InteractionCreateRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "crm.interactionsManage")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            interaction = await create_interaction_deep(session, service_context(context, tenant_id), request, lead_id=lead_id)
        return ApiSuccess(data=interaction, message="Lead etkilesimi eklendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/followups/due", response_model=ApiSuccess[list[dict[str, Any]]])
async def followups_due(
    session: SessionDep,
    context: RequestContextDep,
    company_id: str | None = Query(default=None),
    owner_user_id: str | None = Query(default=None),
    entity_type: str | None = Query(default=None),
    due_until: Annotated[date | None, Query()] = None,
    limit: int = Query(default=100, ge=1, le=500),
) -> ApiSuccess[list[dict[str, Any]]]:
    ensure_permission(context, "crm.followupManage")
    tenant_id = require_tenant(context)
    try:
        rows = await list_due_followups(session, service_context(context, tenant_id), FollowupDueQuery(company_id=company_id, owner_user_id=owner_user_id, entity_type=cast(Any, entity_type), due_until=due_until, limit=limit))
        return ApiSuccess(data=rows)
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/followups/{entity_type}/{entity_id}/complete", response_model=ApiSuccess[dict[str, Any]])
async def followups_complete(entity_type: str, entity_id: str, request: FollowupCompleteRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "crm.followupManage")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            result = await complete_followup(session, service_context(context, tenant_id), entity_type, entity_id, request)
        return ApiSuccess(data=result, message="Takip tamamlandi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/followups/{entity_type}/{entity_id}/snooze", response_model=ApiSuccess[dict[str, Any]])
async def followups_snooze(entity_type: str, entity_id: str, request: FollowupSnoozeRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "crm.followupManage")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            result = await snooze_followup(session, service_context(context, tenant_id), entity_type, entity_id, request)
        return ApiSuccess(data=result, message="Takip ertelendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


def ensure_permission(context: RequestContext, permission_key: str) -> None:
    if not has_permission(context, permission_key):
        raise DomainError("Bu islem icin yetkiniz bulunmuyor.", "PERMISSION_DENIED", status.HTTP_403_FORBIDDEN)


def service_context(context: RequestContext, tenant_id: str) -> dict[str, Any]:
    return {
        "tenant_id": tenant_id,
        "user_id": context.user_id,
        "permissions": context.permissions,
        "company_scope_ids": context.company_scope_ids,
        "writable_company_scope_ids": context.writable_company_scope_ids,
    }
