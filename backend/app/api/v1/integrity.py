from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.integrity.checker import run_integrity_checks, run_integrity_for_operation
from app.policies.access_context import build_access_context

router = APIRouter()
SessionDep = Annotated[AsyncSession, Depends(get_session)]


class IntegrityCheckRequest(BaseModel):
    check_keys: list[str] = Field(default_factory=list)
    resource: dict[str, Any] | None = None
    company_id: str | None = None
    branch_id: str | None = None
    record_id: str | None = None
    record_type: str | None = None


@router.post("/check")
async def post_integrity_check(
    payload: IntegrityCheckRequest,
    request: Request,
    session: SessionDep,
) -> dict[str, object]:
    context = await build_access_context(request, session, payload.model_dump())
    summary = await run_integrity_checks(
        session,
        context,
        payload.check_keys,
        payload.resource,
    )
    return {"data": summary.model_dump(), "warnings": summary.warnings}


@router.post("/operation/{operation_key}")
async def post_operation_integrity_check(
    operation_key: str,
    payload: IntegrityCheckRequest,
    request: Request,
    session: SessionDep,
) -> dict[str, object]:
    context = await build_access_context(request, session, payload.model_dump())
    summary = await run_integrity_for_operation(
        session,
        context,
        operation_key,
        payload.resource,
    )
    return {"data": summary.model_dump(), "warnings": summary.warnings}
