from __future__ import annotations

# ruff: noqa: E501, I001

from typing import Annotated, Any

from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.security import RequestContext, require_access_context, require_tenant
from app.domains.licensing.service import has_feature_entitlement, has_module_entitlement

SessionDep = Annotated[AsyncSession, Depends(get_session)]
ContextDep = Annotated[RequestContext, Depends(require_access_context)]

LICENSE_BLOCK_MESSAGE = "Bu modul mevcut lisansinizda aktif degildir."


def require_module_entitlement(module_key: str) -> Any:
    async def dependency(session: SessionDep, context: ContextDep) -> RequestContext:
        tenant_id = require_tenant(context)
        if not await has_module_entitlement(session, tenant_id, module_key):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": LICENSE_BLOCK_MESSAGE,
                    "code": "MODULE_NOT_LICENSED",
                    "message": LICENSE_BLOCK_MESSAGE,
                    "details": {"module_key": module_key},
                },
            )
        return context

    return dependency


def require_feature_entitlement(feature_key: str) -> Any:
    async def dependency(session: SessionDep, context: ContextDep) -> RequestContext:
        tenant_id = require_tenant(context)
        if not await has_feature_entitlement(session, tenant_id, feature_key):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": "Bu ozellik mevcut lisansinizda aktif degildir.",
                    "code": "FEATURE_NOT_LICENSED",
                    "message": "Bu ozellik mevcut lisansinizda aktif degildir.",
                    "details": {"feature_key": feature_key},
                },
            )
        return context

    return dependency
