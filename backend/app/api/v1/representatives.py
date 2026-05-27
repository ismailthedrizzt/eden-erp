from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.errors import DomainError, domain_error_to_http
from app.core.security import RequestContext, get_request_context, require_tenant
from app.domains.operations.service import table_exists
from app.domains.representatives.authority import perform_authority_transaction_for_request
from app.domains.representatives.schemas import (
    RepresentativeAuthorityTransactionRequest,
    RepresentativeCardUpdateRequest,
)
from app.domains.representatives.service import (
    create_representative_card,
    get_current_authority,
    get_representative_by_id,
    list_authorities_for_branch,
    list_authorities_for_company,
    list_representatives,
    representative_card_status,
    update_representative_card,
)
from app.schemas.common import ApiSuccess, OperationResponse

router = APIRouter()

RequestContextDep = Annotated[RequestContext, Depends(get_request_context)]
SessionDep = Annotated[AsyncSession, Depends(get_session)]


def _context(tenant_id: str, user_id: str | None) -> dict[str, Any]:
    return {"tenant_id": tenant_id, "user_id": user_id, "module_key": "representatives"}


@router.get("/authorities", response_model=ApiSuccess[list[dict[str, Any]]])
async def list_representative_authorities(
    session: SessionDep,
    context: RequestContextDep,
    company_id: str | None = Query(default=None),
    branch_id: str | None = Query(default=None),
    organization_unit_id: str | None = Query(default=None),
    facility_id: str | None = Query(default=None),
    scope_type: str | None = Query(default=None),
    include_company_wide: bool = Query(default=False),
) -> ApiSuccess[list[dict[str, Any]]]:
    tenant_id = require_tenant(context)
    ctx = _context(tenant_id, context.user_id)
    try:
        if branch_id and not company_id:
            rows = await list_authorities_for_branch(
                session, ctx, branch_id, include_company_wide=include_company_wide
            )
        elif company_id:
            rows = await list_authorities_for_company(
                session,
                ctx,
                company_id,
                {
                    "branch_id": branch_id,
                    "organization_unit_id": organization_unit_id,
                    "facility_id": facility_id,
                    "scope_type": scope_type,
                },
            )
        else:
            rows = []
        return ApiSuccess(
            data=rows, meta={"count": len(rows)}, message="Temsil yetkileri listelendi."
        )
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("", response_model=ApiSuccess[list[dict[str, Any]]])
async def list_representative_records(
    session: SessionDep,
    context: RequestContextDep,
    company_id: str | None = Query(default=None),
) -> ApiSuccess[list[dict[str, Any]]]:
    tenant_id = require_tenant(context)
    rows = await list_representatives(
        session, _context(tenant_id, context.user_id), {"company_id": company_id}
    )
    return ApiSuccess(data=rows, meta={"count": len(rows)}, message="Temsilciler listelendi.")


@router.post("", response_model=ApiSuccess[dict[str, Any]])
async def create_representative_record(
    payload: dict[str, Any],
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await create_representative_card(
                session, _context(tenant_id, context.user_id), payload
            )
        return ApiSuccess(data=row, message="Temsilci karti taslak olarak olusturuldu.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/{representative_id}", response_model=ApiSuccess[dict[str, Any]])
async def get_representative_record(
    representative_id: str,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    tenant_id = require_tenant(context)
    try:
        row = await get_representative_by_id(session, tenant_id, representative_id)
        if not row:
            raise DomainError("Temsilci kaydi bulunamadi.", "REPRESENTATIVE_NOT_FOUND", 404)
        current_authority = await get_current_authority(
            session, _context(tenant_id, context.user_id), representative_id
        )
        return ApiSuccess(
            data={**row, "current_authority": current_authority},
            message="Temsilci kaydi getirildi.",
        )
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.patch("/{representative_id}", response_model=ApiSuccess[dict[str, Any]])
async def patch_representative_record(
    representative_id: str,
    payload: RepresentativeCardUpdateRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await update_representative_card(
                session,
                _context(tenant_id, context.user_id),
                representative_id,
                payload.model_dump(exclude_none=True),
            )
        return ApiSuccess(data=row, message="Temsilci kart bilgileri guncellendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.delete("/{representative_id}", response_model=ApiSuccess[dict[str, Any]])
async def delete_representative_record(
    representative_id: str,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            representative = await get_representative_by_id(session, tenant_id, representative_id)
            if not representative:
                raise DomainError("Temsilci kaydi bulunamadi.", "REPRESENTATIVE_NOT_FOUND", 404)
            if representative_card_status(representative) != "draft":
                raise DomainError(
                    "Aktif veya islem gecmisi olan temsilci dogrudan silinemez.",
                    "REPRESENTATIVE_DELETE_REQUIRES_TERMINATION",
                    409,
                )
            if await table_exists(session, "public.company_representative_authority_transactions"):
                tx_count = await session.execute(
                    text(
                        """
                        select count(*) as count
                        from public.company_representative_authority_transactions
                        where tenant_id = :tenant_id
                          and representative_id = :representative_id
                          and coalesce(is_deleted, false) = false
                        """
                    ),
                    {"tenant_id": tenant_id, "representative_id": representative_id},
                )
                if int(tx_count.mappings().one()["count"] or 0) > 0:
                    raise DomainError(
                        "Islem gecmisi olan temsilci dogrudan silinemez.",
                        "REPRESENTATIVE_DELETE_REQUIRES_TERMINATION",
                        409,
                    )
            await session.execute(
                text(
                    """
                    delete from public.company_representatives
                    where tenant_id = :tenant_id
                      and id = :representative_id
                      and coalesce(is_deleted, false) = false
                    """
                ),
                {"tenant_id": tenant_id, "representative_id": representative_id},
            )
        return ApiSuccess(
            data={"id": representative_id, "deleted": True}, message="Temsilci karti silindi."
        )
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/{representative_id}/authority-transactions", response_model=OperationResponse)
async def representative_authority_transaction(
    representative_id: str,
    request: RepresentativeAuthorityTransactionRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> OperationResponse:
    tenant_id = require_tenant(context)
    try:
        result = await perform_authority_transaction_for_request(
            session=session,
            tenant_id=tenant_id,
            user_id=context.user_id,
            representative_id=representative_id,
            request=request,
        )
        return OperationResponse(**result)
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get(
    "/{representative_id}/current-authority", response_model=ApiSuccess[dict[str, Any] | None]
)
async def representative_current_authority(
    representative_id: str,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any] | None]:
    tenant_id = require_tenant(context)
    try:
        row = await get_current_authority(
            session, _context(tenant_id, context.user_id), representative_id
        )
        return ApiSuccess(data=row, message="Guncel temsil yetkisi getirildi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error
