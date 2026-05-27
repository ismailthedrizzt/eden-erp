from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.setup.readiness_checker import check_module_readiness, check_tenant_readiness

router = APIRouter()
SessionDep = Annotated[AsyncSession, Depends(get_session)]


@router.get("/readiness")
async def get_setup_readiness(
    request: Request,
    session: SessionDep,
) -> dict[str, object]:
    tenant_id = _tenant_id(request)
    result = await check_tenant_readiness(session, tenant_id)
    return {"data": result.model_dump(), "warnings": result.warnings}


@router.get("/readiness/{module_key}")
async def get_module_setup_readiness(
    module_key: str,
    request: Request,
    session: SessionDep,
) -> dict[str, object]:
    tenant_id = _tenant_id(request)
    result = await check_module_readiness(session, tenant_id, module_key)
    return {"data": result.model_dump(), "warnings": result.warnings}


def _tenant_id(request: Request) -> str:
    tenant_id = request.headers.get("x-tenant-id")
    if tenant_id:
        return tenant_id
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail={
            "error": "Calisma alani bilgisi alinamadi.",
            "code": "WORKSPACE_CONTEXT_REQUIRED",
            "message": "Calisma alani bilgisi alinamadi.",
        },
    )
