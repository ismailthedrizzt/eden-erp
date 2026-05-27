from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.security import RequestContext, get_request_context, require_tenant
from app.domains.branches.service import get_branch_by_id, list_branches
from app.schemas.common import ApiSuccess

router = APIRouter()

RequestContextDep = Annotated[RequestContext, Depends(get_request_context)]
SessionDep = Annotated[AsyncSession, Depends(get_session)]


@router.get("")
async def list_branch_records(
    context: RequestContextDep,
    session: SessionDep,
    company_id: str | None = Query(default=None),
) -> ApiSuccess[list[dict[str, Any]]]:
    tenant_id = require_tenant(context)
    rows = await list_branches(session, tenant_id, company_id=company_id)
    return ApiSuccess(data=rows, meta={"count": len(rows)}, message="Şubeler listelendi.")


@router.get("/{branch_id}")
async def get_branch_record(
    branch_id: str,
    context: RequestContextDep,
    session: SessionDep,
) -> ApiSuccess[dict[str, Any]]:
    tenant_id = require_tenant(context)
    branch = await get_branch_by_id(session, tenant_id, branch_id)
    if not branch:
        from app.core.errors import DomainError

        raise DomainError("Şube kaydı bulunamadı.", "BRANCH_NOT_FOUND", 404)
    return ApiSuccess(data=branch, message="Şube kaydı getirildi.")


@router.patch("/{branch_id}")
async def patch_branch_record(
    branch_id: str,
    payload: dict[str, Any],
    context: RequestContextDep,
    session: SessionDep,
) -> ApiSuccess[dict[str, Any]]:
    tenant_id = require_tenant(context)
    allowed = {key: payload.get(key) for key in ["phone", "email", "notes"] if key in payload}
    if not allowed:
        from app.core.errors import DomainError

        raise DomainError(
            "Şube resmi alanları yalnızca işlem sihirbazıyla değiştirilebilir.",
            "BRANCH_PATCH_NO_ALLOWED_FIELDS",
            400,
        )
    assignments = ", ".join(f"{key} = :{key}" for key in allowed)
    result = await session.execute(
        text(
            f"""
            update public.company_branches
            set {assignments},
                updated_at = now(),
                updated_by = :user_id,
                version = coalesce(version, 0) + 1
            where tenant_id = :tenant_id
              and id = :branch_id
              and coalesce(is_deleted, false) = false
            returning *
            """
        ),
        {
            **allowed,
            "tenant_id": tenant_id,
            "branch_id": branch_id,
            "user_id": context.user_id,
        },
    )
    row = result.mappings().one_or_none()
    if not row:
        from app.core.errors import DomainError

        raise DomainError("Şube kaydı bulunamadı.", "BRANCH_NOT_FOUND", 404)
    await session.commit()
    return ApiSuccess(data=dict(row), message="Şube kart bilgileri güncellendi.")
