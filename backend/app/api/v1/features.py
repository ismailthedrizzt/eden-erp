from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel

from app.core.security import RequestContext, require_permission
from app.features.registry import (
    feature_flag_payload,
    get_feature_flag,
    list_feature_flags,
    set_feature_enabled,
)

router = APIRouter()
SettingsViewDep = Annotated[RequestContext, Depends(require_permission("settings.view"))]
SettingsManageDep = Annotated[
    RequestContext, Depends(require_permission("settings.modulesManage"))
]


class FeatureFlagUpdateRequest(BaseModel):
    enabled: bool


@router.get("")
async def list_features(
    request: Request,
    context: SettingsViewDep,
    module_key: str | None = None,
) -> dict[str, object]:
    tenant_id = context.tenant_id or request.headers.get("x-tenant-id") or ""
    flags = [
        feature_flag_payload(flag, tenant_id=tenant_id)
        for flag in list_feature_flags(module_key)
    ]
    return {"data": {"features": flags}, "warnings": []}


@router.get("/{module_key}")
async def list_module_features(
    module_key: str,
    request: Request,
    context: SettingsViewDep,
) -> dict[str, object]:
    tenant_id = context.tenant_id or request.headers.get("x-tenant-id") or ""
    flags = [
        feature_flag_payload(flag, tenant_id=tenant_id)
        for flag in list_feature_flags(module_key)
    ]
    return {"data": {"module_key": module_key, "features": flags}, "warnings": []}


@router.patch("/{feature_key}")
async def patch_feature_flag(
    feature_key: str,
    payload: FeatureFlagUpdateRequest,
    context: SettingsManageDep,
) -> dict[str, object]:
    tenant_id = context.tenant_id or ""
    feature = get_feature_flag(feature_key)
    if feature is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": "Ozellik bayragi bulunamadi.",
                "code": "FEATURE_FLAG_NOT_FOUND",
                "message": "Ozellik bayragi bulunamadi.",
            },
        )
    set_feature_enabled(tenant_id, feature_key, payload.enabled)
    return {
        "data": feature_flag_payload(feature, tenant_id=tenant_id),
        "warnings": [
            (
                "Bu MVP'de feature flag degisiklikleri process bellegi icinde "
                "tutulur; kalici tenant ayarlari P1 borctur."
            )
        ],
    }
