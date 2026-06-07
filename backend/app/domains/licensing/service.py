from __future__ import annotations

# ruff: noqa: E501, I001

from typing import Any

from fastapi import status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.domains.licensing import repository
from app.domains.licensing.plans import (
    EDEN_PRODUCT_KEY,
    EDEN_PRODUCT_NAME,
    fallback_plan_key,
    get_plan_definition,
    list_plan_definitions,
    plan_feature_keys,
    plan_limits,
    plan_module_keys,
)
from app.domains.licensing.schemas import TenantEntitlementResponse

ACTIVE_STATUSES = {"trial", "active", "past_due", "development", "internal"}
BLOCKED_STATUSES = {"suspended", "cancelled", "expired", "archived"}


async def list_licensed_products(session: AsyncSession) -> list[dict[str, Any]]:
    products = await repository.list_products(session)
    if products:
        return products
    return [
        {
            "id": EDEN_PRODUCT_KEY,
            "product_key": EDEN_PRODUCT_KEY,
            "product_name": EDEN_PRODUCT_NAME,
            "description": "Canonical Eden ERP product catalog fallback.",
            "status": "active",
            "source": "catalog_fallback",
        }
    ]


async def get_licensed_product(session: AsyncSession, product_ref: str) -> dict[str, Any]:
    product = await repository.get_product(session, product_ref)
    if product:
        return product
    if product_ref == EDEN_PRODUCT_KEY:
        return (await list_licensed_products(session))[0]
    raise DomainError("Urun bulunamadi.", "LICENSE_PRODUCT_NOT_FOUND", status.HTTP_404_NOT_FOUND)


async def list_product_plans(session: AsyncSession, product_ref: str | None = None) -> list[dict[str, Any]]:
    plans = await repository.list_plans(session, product_ref)
    if plans:
        return plans
    return [plan_payload(plan) for plan in list_plan_definitions(include_development=True)]


async def get_product_plan(session: AsyncSession, plan_ref: str) -> dict[str, Any]:
    plan = await repository.get_plan(session, plan_ref)
    if plan:
        return plan
    definition = get_plan_definition(plan_ref)
    if definition:
        return plan_payload(definition)
    raise DomainError("Plan bulunamadi.", "LICENSE_PLAN_NOT_FOUND", status.HTTP_404_NOT_FOUND)


async def list_plan_modules(session: AsyncSession, plan_ref: str) -> list[dict[str, Any]]:
    modules = await repository.list_plan_modules(session, plan_ref)
    if modules:
        return modules
    definition = get_plan_definition(plan_ref)
    if not definition:
        definition = get_plan_definition(fallback_plan_key())
    return [
        {
            "module_key": module_key,
            "enabled": True,
            "visibility": "visible",
            "included_level": "internal" if definition and definition.is_development_plan else "included",
            "source": "catalog_fallback",
        }
        for module_key in (definition.modules if definition else [])
    ]


async def list_plan_features(session: AsyncSession, plan_ref: str) -> list[dict[str, Any]]:
    features = await repository.list_plan_features(session, plan_ref)
    if features:
        return features
    definition = get_plan_definition(plan_ref) or get_plan_definition(fallback_plan_key())
    return [
        {"feature_key": key, "enabled": enabled, "source": "catalog_fallback"}
        for key, enabled in (definition.features.items() if definition else [])
    ]


async def list_tenant_licenses(session: AsyncSession, tenant_id: str | None = None) -> list[dict[str, Any]]:
    return await repository.list_tenant_licenses(session, tenant_id)


async def get_tenant_license(session: AsyncSession, license_id: str) -> dict[str, Any]:
    license_row = await repository.get_tenant_license(session, license_id)
    if not license_row:
        raise DomainError("Tenant lisansi bulunamadi.", "TENANT_LICENSE_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    return license_row


async def get_current_tenant_entitlements(session: AsyncSession, tenant_id: str) -> TenantEntitlementResponse:
    warnings: list[str] = []
    active_license = await repository.get_active_tenant_license(session, tenant_id)
    source = "database"
    if not active_license:
        plan_key = fallback_plan_key()
        active_license = {
            "tenant_id": tenant_id,
            "product_key": EDEN_PRODUCT_KEY,
            "plan_key": plan_key,
            "status": "active",
            "is_development_plan": False,
            **plan_limits(plan_key),
        }
        source = "catalog_fallback"
        warnings.append(
            "Kalici tenant lisansi bulunamadi; gecici guvenli fallback olarak medium plan kullanildi."
        )

    plan_key = str(active_license.get("plan_key") or fallback_plan_key())
    license_status = str(active_license.get("status") or "active")
    is_development = bool(active_license.get("is_development_plan")) or plan_key == "development" or license_status in {"development", "internal"}
    modules = plan_module_keys(plan_key)
    features = plan_feature_keys(plan_key)
    limits = plan_limits(plan_key)
    for limit_key in ["max_users", "max_companies", "max_branches", "max_storage_mb"]:
        if active_license.get(limit_key) is not None:
            limits[limit_key] = active_license.get(limit_key)

    if license_status in BLOCKED_STATUSES:
        modules = []
        features = []
        warnings.append("Tenant lisansi aktif olmadigi icin modul erisimi kapatildi.")

    return TenantEntitlementResponse(
        tenant_id=tenant_id,
        product_key=str(active_license.get("product_key") or EDEN_PRODUCT_KEY),
        plan_key=plan_key,
        license_status=license_status,
        is_development=is_development,
        enabled_modules=modules,
        enabled_features=features,
        limits=limits,
        source=source,
        warnings=warnings,
    )


async def get_tenant_enabled_modules(session: AsyncSession, tenant_id: str) -> set[str]:
    entitlements = await get_current_tenant_entitlements(session, tenant_id)
    return set(entitlements.enabled_modules)


async def get_tenant_enabled_features(session: AsyncSession, tenant_id: str) -> set[str]:
    entitlements = await get_current_tenant_entitlements(session, tenant_id)
    return set(entitlements.enabled_features)


async def has_module_entitlement(session: AsyncSession, tenant_id: str, module_key: str) -> bool:
    modules = await get_tenant_enabled_modules(session, tenant_id)
    return module_key in modules


async def has_feature_entitlement(session: AsyncSession, tenant_id: str, feature_key: str) -> bool:
    features = await get_tenant_enabled_features(session, tenant_id)
    return feature_key in features


async def is_development_tenant(session: AsyncSession, tenant_id: str) -> bool:
    entitlements = await get_current_tenant_entitlements(session, tenant_id)
    return entitlements.is_development


def plan_payload(plan: Any) -> dict[str, Any]:
    return {
        "id": plan.plan_key,
        "product_key": EDEN_PRODUCT_KEY,
        "plan_key": plan.plan_key,
        "plan_name": plan.plan_name,
        "description": plan.description,
        "status": "active",
        "business_size_label": plan.business_size_label,
        "default_billing_period": plan.default_billing_period,
        "base_price": plan.base_price,
        "currency": plan.currency,
        "trial_days": plan.trial_days,
        "support_level": plan.support_level,
        "visible_in_setup": plan.visible_in_setup,
        "is_development_plan": plan.is_development_plan,
        "sort_order": list_plan_definitions(True).index(plan) if plan in list_plan_definitions(True) else 100,
        "limits": dict(plan.limits),
        "source": "catalog_fallback",
    }


async def require_tables_for_mutation(session: AsyncSession) -> None:
    if await repository.licensing_tables_ready(session):
        return
    raise DomainError(
        "Lisans veri modeli henuz migrate edilmemis.",
        "LICENSING_TABLES_MISSING",
        status.HTTP_409_CONFLICT,
    )
