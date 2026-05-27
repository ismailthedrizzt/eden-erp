from typing import Annotated, Any

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.errors import DomainError, domain_error_to_http
from app.core.security import RequestContext, get_request_context, require_tenant
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
    NaceChangeRequest,
    PublicRegistrationUpdateRequest,
    TitleChangeRequest,
)
from app.domains.company.service import get_company_by_id
from app.domains.ownership.current import get_current_ownership_for_company
from app.schemas.common import ApiSuccess, OperationResponse
from app.schemas.placeholder import PlaceholderResponse

router = APIRouter()

RequestContextDep = Annotated[RequestContext, Depends(get_request_context)]
SessionDep = Annotated[AsyncSession, Depends(get_session)]


@router.get("", response_model=PlaceholderResponse)
async def list_companies() -> PlaceholderResponse:
    return PlaceholderResponse(
        status="planned",
        module="companies",
        message="Company endpoints will migrate from Next.js BFF routes to FastAPI.",
    )


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
        rows = await get_current_ownership_for_company(session, tenant_id, company_id)
        return ApiSuccess(data=[row.model_dump(mode="json") for row in rows])
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
