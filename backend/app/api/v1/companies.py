from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.errors import DomainError, domain_error_to_http
from app.core.security import RequestContext, require_access_context, require_tenant
from app.domains.company.capital import (
    build_capital_increase_precheck_for_request,
    complete_capital_increase_for_request,
)
from app.domains.company.capital_schemas import CapitalIncreaseRequest
from app.domains.company.operations import (
    build_activity_subject_change_precheck,
    build_company_official_change_precheck,
    build_nace_change_precheck,
    complete_activity_subject_change,
    complete_address_change,
    complete_nace_change,
    complete_public_registration_update,
    complete_title_change,
)
from app.domains.company.schemas import (
    ActivitySubjectChangeRequest,
    AddressChangeRequest,
    CompanyCardUpdateRequest,
    CompanyCreateDraftRequest,
    NaceChangeRequest,
    PublicRegistrationUpdateRequest,
    TitleChangeRequest,
)
from app.domains.company.service import (
    create_company_draft,
    delete_company_draft,
    get_company_by_id,
    update_company_card,
)
from app.projections.company import build_company_detail_read_model, list_company_projection
from app.projections.current_ownership import current_ownership_projection
from app.projections.query import projection_query_from_params
from app.schemas.common import ApiSuccess, OperationResponse

router = APIRouter(dependencies=[Depends(require_access_context)])

RequestContextDep = Annotated[RequestContext, Depends(require_access_context)]
SessionDep = Annotated[AsyncSession, Depends(get_session)]


@router.get("", response_model=ApiSuccess[dict[str, Any]])
async def list_companies(
    session: SessionDep,
    context: RequestContextDep,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, alias="pageSize", ge=1, le=200),
    search: str | None = Query(default=None),
    sort: str | None = Query(default=None),
    direction: str = Query(default="asc"),
    statuses: str | None = Query(default=None),
) -> ApiSuccess[dict[str, Any]]:
    tenant_id = require_tenant(context)
    try:
        result = await list_company_projection(
            session,
            projection_query_from_params(
                tenant_id=tenant_id,
                page=page,
                page_size=page_size,
                search=search,
                sort=sort,
                direction=direction,
                statuses=statuses,
            ),
        )
        return ApiSuccess(
            data={
                "data": result.data,
                "meta": result.meta.model_dump(),
                "projection": result.projection.model_dump(),
            },
            warnings=result.warnings,
            message="Sirketler listelendi.",
        )
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("", response_model=ApiSuccess[dict[str, Any]])
async def create_company_card(
    request: CompanyCreateDraftRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            company = await create_company_draft(
                session,
                {
                    "tenant_id": tenant_id,
                    "user_id": context.user_id,
                    "module_key": "companies",
                    "permissions": context.permissions,
                    "company_scope": context.company_scope_ids,
                },
                request.model_dump(exclude_none=True),
            )
        return ApiSuccess(data=company, message="Sirket karti taslak olarak olusturuldu.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/{company_id}", response_model=ApiSuccess[dict[str, Any]])
async def company_detail(
    company_id: str,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    tenant_id = require_tenant(context)
    try:
        data = await build_company_detail_read_model(
            session,
            tenant_id=tenant_id,
            company_id=company_id,
        )
        return ApiSuccess(
            data=data,
            warnings=data.get("warnings", []),
            message="Sirket detayi getirildi.",
        )
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.patch("/{company_id}", response_model=ApiSuccess[dict[str, Any]])
async def patch_company_card(
    company_id: str,
    request: CompanyCardUpdateRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            company = await update_company_card(
                session,
                {
                    "tenant_id": tenant_id,
                    "user_id": context.user_id,
                    "module_key": "companies",
                    "permissions": context.permissions,
                    "company_scope": context.company_scope_ids,
                },
                company_id,
                request.model_dump(exclude_unset=True),
            )
        return ApiSuccess(data=company, message="Sirket karti guncellendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.delete("/{company_id}", response_model=ApiSuccess[dict[str, Any]])
async def delete_company_card(
    company_id: str,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            result = await delete_company_draft(
                session,
                {
                    "tenant_id": tenant_id,
                    "user_id": context.user_id,
                    "module_key": "companies",
                    "permissions": context.permissions,
                    "company_scope": context.company_scope_ids,
                },
                company_id,
            )
        return ApiSuccess(data=result, message=result.get("message"))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get(
    "/{company_id}/capital-increases/precheck",
    response_model=ApiSuccess[dict[str, Any]],
)
async def capital_increase_precheck(
    company_id: str,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    tenant_id = require_tenant(context)
    try:
        data = await build_capital_increase_precheck_for_request(
            session=session,
            tenant_id=tenant_id,
            user_id=context.user_id,
            company_id=company_id,
        )
        return ApiSuccess(data=data, warnings=data.get("warnings", []), message=data.get("message"))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/{company_id}/capital-increases", response_model=OperationResponse)
async def capital_increase(
    company_id: str,
    request: CapitalIncreaseRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> OperationResponse:
    tenant_id = require_tenant(context)
    try:
        result = await complete_capital_increase_for_request(
            session=session,
            tenant_id=tenant_id,
            user_id=context.user_id,
            company_id=company_id,
            request=request,
            permissions=context.permissions,
            company_scope=context.company_scope_ids,
        )
        return OperationResponse(**result)
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/{company_id}/current-ownership", response_model=ApiSuccess[list[dict[str, Any]]])
async def current_ownership_for_company(
    company_id: str,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[list[dict[str, Any]]]:
    tenant_id = require_tenant(context)
    try:
        company = await get_company_by_id(session, tenant_id, company_id)
        if not company:
            raise DomainError("Sirket kaydi bulunamadi.", "COMPANY_NOT_FOUND", 404)
        projection = await current_ownership_projection(session, tenant_id, company_id)
        return ApiSuccess(data=projection.data, warnings=projection.warnings)
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get(
    "/{company_id}/official-changes/title-change/precheck",
    response_model=ApiSuccess[dict[str, Any]],
)
async def title_change_precheck(
    company_id: str,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    tenant_id = require_tenant(context)
    try:
        data = await build_company_official_change_precheck(
            session=session,
            tenant_id=tenant_id,
            user_id=context.user_id,
            company_id=company_id,
            change_type="title_change",
        )
        return ApiSuccess(data=data, warnings=data.get("warnings", []), message=data.get("message"))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/{company_id}/official-changes/title-change", response_model=OperationResponse)
async def title_change(
    company_id: str,
    request: TitleChangeRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> OperationResponse:
    tenant_id = require_tenant(context)
    try:
        result = await complete_title_change(
            session=session,
            tenant_id=tenant_id,
            user_id=context.user_id,
            company_id=company_id,
            request=request,
        )
        return OperationResponse(**result)
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get(
    "/{company_id}/official-changes/address-change/precheck",
    response_model=ApiSuccess[dict[str, Any]],
)
async def address_change_precheck(
    company_id: str,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    tenant_id = require_tenant(context)
    try:
        data = await build_company_official_change_precheck(
            session=session,
            tenant_id=tenant_id,
            user_id=context.user_id,
            company_id=company_id,
            change_type="address_change",
        )
        return ApiSuccess(data=data, warnings=data.get("warnings", []), message=data.get("message"))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/{company_id}/official-changes/address-change", response_model=OperationResponse)
async def address_change(
    company_id: str,
    request: AddressChangeRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> OperationResponse:
    tenant_id = require_tenant(context)
    try:
        result = await complete_address_change(
            session=session,
            tenant_id=tenant_id,
            user_id=context.user_id,
            company_id=company_id,
            request=request,
        )
        return OperationResponse(**result)
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get(
    "/{company_id}/official-changes/public-registration-update/precheck",
    response_model=ApiSuccess[dict[str, Any]],
)
async def public_registration_update_precheck(
    company_id: str,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    tenant_id = require_tenant(context)
    try:
        data = await build_company_official_change_precheck(
            session=session,
            tenant_id=tenant_id,
            user_id=context.user_id,
            company_id=company_id,
            change_type="public_registration_update",
        )
        return ApiSuccess(data=data, warnings=data.get("warnings", []), message=data.get("message"))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post(
    "/{company_id}/official-changes/public-registration-update",
    response_model=OperationResponse,
)
async def public_registration_update(
    company_id: str,
    request: PublicRegistrationUpdateRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> OperationResponse:
    tenant_id = require_tenant(context)
    try:
        result = await complete_public_registration_update(
            session=session,
            tenant_id=tenant_id,
            user_id=context.user_id,
            company_id=company_id,
            request=request,
        )
        return OperationResponse(**result)
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get(
    "/{company_id}/official-changes/nace-change/precheck",
    response_model=ApiSuccess[dict[str, Any]],
)
async def nace_change_precheck(
    company_id: str,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    tenant_id = require_tenant(context)
    try:
        data = await build_nace_change_precheck(
            session=session,
            tenant_id=tenant_id,
            user_id=context.user_id,
            company_id=company_id,
        )
        return ApiSuccess(data=data, warnings=data.get("warnings", []), message=data.get("message"))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/{company_id}/official-changes/nace-change", response_model=OperationResponse)
async def nace_change(
    company_id: str,
    request: NaceChangeRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> OperationResponse:
    tenant_id = require_tenant(context)
    try:
        result = await complete_nace_change(
            session=session,
            tenant_id=tenant_id,
            user_id=context.user_id,
            company_id=company_id,
            request=request,
        )
        return OperationResponse(**result)
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get(
    "/{company_id}/official-changes/activity-subject-change/precheck",
    response_model=ApiSuccess[dict[str, Any]],
)
async def activity_subject_change_precheck(
    company_id: str,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    tenant_id = require_tenant(context)
    try:
        data = await build_activity_subject_change_precheck(
            session=session,
            tenant_id=tenant_id,
            user_id=context.user_id,
            company_id=company_id,
        )
        return ApiSuccess(data=data, warnings=data.get("warnings", []), message=data.get("message"))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post(
    "/{company_id}/official-changes/activity-subject-change",
    response_model=OperationResponse,
)
async def activity_subject_change(
    company_id: str,
    request: ActivitySubjectChangeRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> OperationResponse:
    tenant_id = require_tenant(context)
    try:
        result = await complete_activity_subject_change(
            session=session,
            tenant_id=tenant_id,
            user_id=context.user_id,
            company_id=company_id,
            request=request,
        )
        return OperationResponse(**result)
    except DomainError as error:
        raise domain_error_to_http(error) from error
