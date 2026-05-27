from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.policies.access_context import build_access_context
from app.policies.action_eligibility import evaluate_action_eligibility

router = APIRouter()
SessionDep = Annotated[AsyncSession, Depends(get_session)]


class ActionEligibilityEvaluateRequest(BaseModel):
    action_key: str
    resource: dict[str, Any] | None = None
    company_id: str | None = None
    branch_id: str | None = None
    record_status: str | None = None


@router.post("/evaluate")
async def post_action_eligibility_evaluate(
    payload: ActionEligibilityEvaluateRequest,
    request: Request,
    session: SessionDep,
) -> dict[str, object]:
    context = await build_access_context(request, session, payload.model_dump())
    eligibility = await evaluate_action_eligibility(
        session,
        context,
        payload.action_key,
        payload.resource,
    )
    return {"data": eligibility.model_dump(), "warnings": eligibility.warnings}
