from __future__ import annotations

# ruff: noqa: E501, I001

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.errors import DomainError, domain_error_to_http
from app.core.security import RequestContext, has_permission, require_access_context, require_tenant
from app.domains.products.catalog import create_product, delete_product, get_product, get_product_summary, list_products, update_product
from app.domains.products.schemas import ProductCreateRequest, ProductListQuery, ProductUpdateRequest
from app.schemas.common import ApiSuccess

router = APIRouter(dependencies=[Depends(require_access_context)])
RequestContextDep = Annotated[RequestContext, Depends(require_access_context)]
SessionDep = Annotated[AsyncSession, Depends(get_session)]


@router.get("/summary", response_model=ApiSuccess[dict[str, Any]])
async def products_summary(session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "products.view")
    tenant_id = require_tenant(context)
    try:
        summary = await get_product_summary(session, service_context(context, tenant_id))
        return ApiSuccess(data=summary.model_dump())
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("", response_model=ApiSuccess[dict[str, Any]])
async def products_list(
    session: SessionDep,
    context: RequestContextDep,
    company_id: str | None = Query(default=None),
    product_type: str | None = Query(default=None),
    category: str | None = Query(default=None),
    brand: str | None = Query(default=None),
    active: bool | None = Query(default=None),
    after_sales_enabled: bool | None = Query(default=None),
    maintenance_required: bool | None = Query(default=None),
    search: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, alias="pageSize", ge=1, le=200),
    sort: str = Query(default="updated_at"),
    direction: str = Query(default="desc"),
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "products.view")
    tenant_id = require_tenant(context)
    try:
        result = await list_products(
            session,
            service_context(context, tenant_id),
            ProductListQuery(
                company_id=company_id,
                product_type=product_type,
                category=category,
                brand=brand,
                active=active,
                after_sales_enabled=after_sales_enabled,
                maintenance_required=maintenance_required,
                search=search,
                page=page,
                page_size=page_size,
                sort=sort,
                direction=direction,
            ),
        )
        return ApiSuccess(data={"data": result.data, "meta": result.meta})
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("", response_model=ApiSuccess[dict[str, Any]], status_code=201)
async def products_create(request: ProductCreateRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "products.create")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            product = await create_product(session, service_context(context, tenant_id), request)
        return ApiSuccess(data=product, message="Urun/Hizmet kaydi olusturuldu.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/{product_id}", response_model=ApiSuccess[dict[str, Any]])
async def products_get(product_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "products.view")
    tenant_id = require_tenant(context)
    try:
        product = await get_product(session, tenant_id, product_id)
        if not product:
            raise DomainError("Urun/Hizmet kaydi bulunamadi.", "PRODUCT_NOT_FOUND", 404)
        return ApiSuccess(data=product)
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.patch("/{product_id}", response_model=ApiSuccess[dict[str, Any]])
async def products_update(product_id: str, request: ProductUpdateRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "products.edit")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            product = await update_product(session, service_context(context, tenant_id), product_id, request)
        return ApiSuccess(data=product, message="Urun/Hizmet kaydi guncellendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.delete("/{product_id}", response_model=ApiSuccess[dict[str, Any]])
async def products_delete(product_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "products.delete")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            result = await delete_product(session, service_context(context, tenant_id), product_id)
        return ApiSuccess(data=result, message="Urun/Hizmet kaydi silindi.")
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
