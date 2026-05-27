from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.policies.access_context import build_access_context
from app.policies.action_eligibility import evaluate_action_eligibility
from app.policies.policy_engine import evaluate_policy
from app.policies.schemas import PolicyInput

router = APIRouter()
SessionDep = Annotated[AsyncSession, Depends(get_session)]


class PolicyEvaluateRequest(BaseModel):
    action_key: str | None = None
    module_key: str | None = None
    resource_type: str | None = None
    resource_id: str | None = None
    resource: dict[str, Any] | None = None
    required_permissions: list[str] = Field(default_factory=list)
    required_record_status: list[str] = Field(default_factory=list)
    blocked_record_status: list[str] = Field(default_factory=list)


class ActionEligibilityRequest(BaseModel):
    action_key: str
    resource: dict[str, Any] | None = None
    company_id: str | None = None
    branch_id: str | None = None
    record_status: str | None = None


@router.post("/evaluate")
async def post_policy_evaluate(
    payload: PolicyEvaluateRequest,
    request: Request,
    session: SessionDep,
) -> dict[str, object]:
    context = await build_access_context(request, session, payload.model_dump())
    decision = evaluate_policy(
        PolicyInput(
            context=context,
            action_key=payload.action_key,
            module_key=payload.module_key,
            resource_type=payload.resource_type,
            resource_id=payload.resource_id,
            resource=payload.resource,
            required_permissions=payload.required_permissions,
            required_record_status=payload.required_record_status,
            blocked_record_status=payload.blocked_record_status,
        )
    )
    return {"data": decision.model_dump(), "warnings": decision.warnings}


@router.post("/action-eligibility")
async def post_action_eligibility(
    payload: ActionEligibilityRequest,
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
