from __future__ import annotations

# ruff: noqa: E501, I001

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.errors import DomainError, domain_error_to_http
from app.core.security import RequestContext, has_permission, require_access_context, require_tenant
from app.domains.licensing import repository
from app.domains.licensing.schemas import (
    LicensedProductCreateRequest,
    LicensedProductUpdateRequest,
    PlanFeaturePatchRequest,
    PlanModulePatchRequest,
    ProductPlanCreateRequest,
    ProductPlanUpdateRequest,
    TenantLicenseCreateRequest,
    TenantLicensePaymentCreateRequest,
    TenantLicensePlanChangeRequest,
    TenantLicenseUpdateRequest,
    TenantUsageSnapshotCreateRequest,
)
from app.domains.licensing.service import (
    get_current_tenant_entitlements,
    get_licensed_product,
    get_product_plan,
    get_tenant_license,
    list_licensed_products,
    list_plan_features,
    list_plan_modules,
    list_product_plans,
    list_tenant_licenses,
    require_tables_for_mutation,
)

router = APIRouter(dependencies=[Depends(require_access_context)])
SessionDep = Annotated[AsyncSession, Depends(get_session)]
RequestContextDep = Annotated[RequestContext, Depends(require_access_context)]

LICENSE_ADMIN_PERMISSIONS = [
    "system.admin",
    "platform_owner",
    "vendor_admin",
    "license_admin",
    "adminConsole.manage",
    "settings.modulesManage",
]


@router.get("/products")
async def products_list(session: SessionDep, context: RequestContextDep) -> dict[str, Any]:
    ensure_license_view(context)
    return {"data": {"products": await list_licensed_products(session)}, "warnings": []}


@router.post("/products", status_code=201)
async def products_create(payload: LicensedProductCreateRequest, session: SessionDep, context: RequestContextDep) -> dict[str, Any]:
    ensure_license_admin(context)
    try:
        await require_tables_for_mutation(session)
        async with session.begin():
            product = await repository.create_product(session, payload.model_dump(), context.user_id)
        return {"data": product, "warnings": []}
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/products/{product_id}")
async def products_get(product_id: str, session: SessionDep, context: RequestContextDep) -> dict[str, Any]:
    ensure_license_view(context)
    try:
        return {"data": await get_licensed_product(session, product_id), "warnings": []}
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.patch("/products/{product_id}")
async def products_update(product_id: str, payload: LicensedProductUpdateRequest, session: SessionDep, context: RequestContextDep) -> dict[str, Any]:
    ensure_license_admin(context)
    try:
        await require_tables_for_mutation(session)
        async with session.begin():
            product = await repository.update_product(session, product_id, payload.model_dump(exclude_unset=True))
        if not product:
            raise DomainError("Urun bulunamadi.", "LICENSE_PRODUCT_NOT_FOUND", status.HTTP_404_NOT_FOUND)
        return {"data": product, "warnings": []}
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/products/{product_id}/plans")
async def product_plans_list(product_id: str, session: SessionDep, context: RequestContextDep) -> dict[str, Any]:
    ensure_license_view(context)
    return {"data": {"plans": await list_product_plans(session, product_id)}, "warnings": []}


@router.post("/products/{product_id}/plans", status_code=201)
async def product_plans_create(product_id: str, payload: ProductPlanCreateRequest, session: SessionDep, context: RequestContextDep) -> dict[str, Any]:
    ensure_license_admin(context)
    try:
        await require_tables_for_mutation(session)
        async with session.begin():
            plan = await repository.create_plan(session, product_id, payload.model_dump())
        if not plan:
            raise DomainError("Urun bulunamadi.", "LICENSE_PRODUCT_NOT_FOUND", status.HTTP_404_NOT_FOUND)
        return {"data": plan, "warnings": []}
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/plans/{plan_id}")
async def plans_get(plan_id: str, session: SessionDep, context: RequestContextDep) -> dict[str, Any]:
    ensure_license_view(context)
    try:
        return {"data": await get_product_plan(session, plan_id), "warnings": []}
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.patch("/plans/{plan_id}")
async def plans_update(plan_id: str, payload: ProductPlanUpdateRequest, session: SessionDep, context: RequestContextDep) -> dict[str, Any]:
    ensure_license_admin(context)
    try:
        await require_tables_for_mutation(session)
        async with session.begin():
            plan = await repository.update_plan(session, plan_id, payload.model_dump(exclude_unset=True))
        if not plan:
            raise DomainError("Plan bulunamadi.", "LICENSE_PLAN_NOT_FOUND", status.HTTP_404_NOT_FOUND)
        return {"data": plan, "warnings": []}
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/plans/{plan_id}/modules")
async def plans_modules_get(plan_id: str, session: SessionDep, context: RequestContextDep) -> dict[str, Any]:
    ensure_license_view(context)
    return {"data": {"modules": await list_plan_modules(session, plan_id)}, "warnings": []}


@router.patch("/plans/{plan_id}/modules")
async def plans_modules_patch(plan_id: str, payload: PlanModulePatchRequest, session: SessionDep, context: RequestContextDep) -> dict[str, Any]:
    ensure_license_admin(context)
    try:
        await require_tables_for_mutation(session)
        async with session.begin():
            modules = await repository.replace_plan_modules(session, plan_id, payload.modules)
        return {"data": {"modules": modules}, "warnings": []}
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/plans/{plan_id}/features")
async def plans_features_get(plan_id: str, session: SessionDep, context: RequestContextDep) -> dict[str, Any]:
    ensure_license_view(context)
    return {"data": {"features": await list_plan_features(session, plan_id)}, "warnings": []}


@router.patch("/plans/{plan_id}/features")
async def plans_features_patch(plan_id: str, payload: PlanFeaturePatchRequest, session: SessionDep, context: RequestContextDep) -> dict[str, Any]:
    ensure_license_admin(context)
    try:
        await require_tables_for_mutation(session)
        async with session.begin():
            features = await repository.replace_plan_features(session, plan_id, payload.features)
        return {"data": {"features": features}, "warnings": []}
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/tenant-licenses")
async def tenant_licenses_list(session: SessionDep, context: RequestContextDep, tenant_id: str | None = Query(default=None)) -> dict[str, Any]:
    ensure_license_admin(context)
    return {"data": {"licenses": await list_tenant_licenses(session, tenant_id)}, "warnings": []}


@router.post("/tenant-licenses", status_code=201)
async def tenant_licenses_create(payload: TenantLicenseCreateRequest, session: SessionDep, context: RequestContextDep) -> dict[str, Any]:
    ensure_license_admin(context)
    try:
        await require_tables_for_mutation(session)
        async with session.begin():
            license_row = await repository.create_tenant_license(session, payload.model_dump(), context.user_id)
        if not license_row:
            raise DomainError("Urun veya plan bulunamadi.", "TENANT_LICENSE_REFERENCE_NOT_FOUND", status.HTTP_404_NOT_FOUND)
        return {"data": license_row, "warnings": []}
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/tenant-licenses/{license_id}")
async def tenant_licenses_get(license_id: str, session: SessionDep, context: RequestContextDep) -> dict[str, Any]:
    ensure_license_admin(context)
    try:
        return {"data": await get_tenant_license(session, license_id), "warnings": []}
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.patch("/tenant-licenses/{license_id}")
async def tenant_licenses_patch(license_id: str, payload: TenantLicenseUpdateRequest, session: SessionDep, context: RequestContextDep) -> dict[str, Any]:
    ensure_license_admin(context)
    try:
        await require_tables_for_mutation(session)
        async with session.begin():
            license_row = await repository.update_tenant_license(session, license_id, payload.model_dump(exclude_unset=True), context.user_id)
        if not license_row:
            raise DomainError("Tenant lisansi bulunamadi.", "TENANT_LICENSE_NOT_FOUND", status.HTTP_404_NOT_FOUND)
        return {"data": license_row, "warnings": []}
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/tenant-licenses/{license_id}/change-plan")
async def tenant_licenses_change_plan(license_id: str, payload: TenantLicensePlanChangeRequest, session: SessionDep, context: RequestContextDep) -> dict[str, Any]:
    ensure_license_admin(context)
    plan_ref = payload.product_plan_id or payload.plan_key
    if not plan_ref:
        raise DomainError("Yeni plan secilmelidir.", "LICENSE_PLAN_REQUIRED", status.HTTP_400_BAD_REQUEST)
    try:
        await require_tables_for_mutation(session)
        async with session.begin():
            license_row = await repository.change_tenant_license_plan(session, license_id, plan_ref, context.user_id)
        if not license_row:
            raise DomainError("Tenant lisansi veya plan bulunamadi.", "TENANT_LICENSE_PLAN_NOT_FOUND", status.HTTP_404_NOT_FOUND)
        return {"data": license_row, "warnings": []}
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/tenant-licenses/{license_id}/suspend")
async def tenant_licenses_suspend(license_id: str, session: SessionDep, context: RequestContextDep) -> dict[str, Any]:
    return await update_license_status(session, context, license_id, "suspended")


@router.post("/tenant-licenses/{license_id}/reactivate")
async def tenant_licenses_reactivate(license_id: str, session: SessionDep, context: RequestContextDep) -> dict[str, Any]:
    return await update_license_status(session, context, license_id, "active")


@router.post("/tenant-licenses/{license_id}/cancel")
async def tenant_licenses_cancel(license_id: str, session: SessionDep, context: RequestContextDep) -> dict[str, Any]:
    return await update_license_status(session, context, license_id, "cancelled")


@router.post("/tenant-licenses/{license_id}/archive")
async def tenant_licenses_archive(license_id: str, session: SessionDep, context: RequestContextDep) -> dict[str, Any]:
    return await update_license_status(session, context, license_id, "archived")


@router.get("/tenant-licenses/{license_id}/payments")
async def tenant_license_payments_get(license_id: str, session: SessionDep, context: RequestContextDep) -> dict[str, Any]:
    ensure_license_admin(context)
    return {"data": {"payments": await repository.list_license_payments(session, license_id)}, "warnings": []}


@router.post("/tenant-licenses/{license_id}/payments", status_code=201)
async def tenant_license_payments_post(license_id: str, payload: TenantLicensePaymentCreateRequest, session: SessionDep, context: RequestContextDep) -> dict[str, Any]:
    ensure_license_admin(context)
    try:
        await require_tables_for_mutation(session)
        async with session.begin():
            payment = await repository.create_license_payment(session, license_id, payload.model_dump())
        if not payment:
            raise DomainError("Tenant lisansi bulunamadi.", "TENANT_LICENSE_NOT_FOUND", status.HTTP_404_NOT_FOUND)
        return {"data": payment, "warnings": []}
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/tenant-licenses/{license_id}/usage")
async def tenant_license_usage_get(license_id: str, session: SessionDep, context: RequestContextDep) -> dict[str, Any]:
    ensure_license_admin(context)
    return {"data": {"usage": await repository.list_usage_snapshots(session, license_id)}, "warnings": []}


@router.post("/tenant-licenses/{license_id}/usage-snapshot", status_code=201)
async def tenant_license_usage_post(license_id: str, payload: TenantUsageSnapshotCreateRequest, session: SessionDep, context: RequestContextDep) -> dict[str, Any]:
    ensure_license_admin(context)
    try:
        await require_tables_for_mutation(session)
        async with session.begin():
            snapshot = await repository.create_usage_snapshot(session, license_id, payload.model_dump())
        if not snapshot:
            raise DomainError("Tenant lisansi bulunamadi.", "TENANT_LICENSE_NOT_FOUND", status.HTTP_404_NOT_FOUND)
        return {"data": snapshot, "warnings": []}
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/current")
async def current_license(session: SessionDep, context: RequestContextDep) -> dict[str, Any]:
    tenant_id = require_tenant(context)
    entitlements = await get_current_tenant_entitlements(session, tenant_id)
    return {"data": entitlements.model_dump(), "warnings": entitlements.warnings}


@router.get("/current/modules")
async def current_license_modules(session: SessionDep, context: RequestContextDep) -> dict[str, Any]:
    tenant_id = require_tenant(context)
    entitlements = await get_current_tenant_entitlements(session, tenant_id)
    return {"data": {"modules": entitlements.enabled_modules}, "warnings": entitlements.warnings}


@router.get("/current/features")
async def current_license_features(session: SessionDep, context: RequestContextDep) -> dict[str, Any]:
    tenant_id = require_tenant(context)
    entitlements = await get_current_tenant_entitlements(session, tenant_id)
    return {"data": {"features": entitlements.enabled_features}, "warnings": entitlements.warnings}


async def update_license_status(session: SessionDep, context: RequestContextDep, license_id: str, status_value: str) -> dict[str, Any]:
    ensure_license_admin(context)
    try:
        await require_tables_for_mutation(session)
        async with session.begin():
            license_row = await repository.update_tenant_license(session, license_id, {"status": status_value}, context.user_id)
        if not license_row:
            raise DomainError("Tenant lisansi bulunamadi.", "TENANT_LICENSE_NOT_FOUND", status.HTTP_404_NOT_FOUND)
        return {"data": license_row, "warnings": []}
    except DomainError as error:
        raise domain_error_to_http(error) from error


def ensure_license_view(context: RequestContext) -> None:
    if has_any_permission(context, LICENSE_ADMIN_PERMISSIONS + ["settings.view"]):
        return
    raise DomainError("Bu islem icin yetkiniz bulunmuyor.", "PERMISSION_DENIED", status.HTTP_403_FORBIDDEN)


def ensure_license_admin(context: RequestContext) -> None:
    if has_any_permission(context, LICENSE_ADMIN_PERMISSIONS):
        return
    raise DomainError("Bu islem icin yetkiniz bulunmuyor.", "PERMISSION_DENIED", status.HTTP_403_FORBIDDEN)


def has_any_permission(context: RequestContext, permissions: list[str]) -> bool:
    return any(has_permission(context, permission) for permission in permissions)
