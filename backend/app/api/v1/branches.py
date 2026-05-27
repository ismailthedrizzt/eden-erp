from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.security import RequestContext, require_access_context, require_tenant
from app.projections.branch import get_branch_projection, list_branch_projection
from app.projections.query import projection_query_from_params
from app.schemas.common import ApiSuccess

router = APIRouter(dependencies=[Depends(require_access_context)])

RequestContextDep = Annotated[RequestContext, Depends(require_access_context)]
SessionDep = Annotated[AsyncSession, Depends(get_session)]


@router.get("")
async def list_branch_records(
    context: RequestContextDep,
    session: SessionDep,
    company_id: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, alias="pageSize", ge=1, le=200),
    search: str | None = Query(default=None),
    sort: str | None = Query(default=None),
    direction: str = Query(default="asc"),
    statuses: str | None = Query(default=None),
    branch_type: str | None = Query(default=None),
    city: str | None = Query(default=None),
    is_official_branch: bool | None = Query(default=None),
) -> ApiSuccess[dict[str, Any]]:
    tenant_id = require_tenant(context)
    result = await list_branch_projection(
        session,
        projection_query_from_params(
            tenant_id=tenant_id,
            company_id=company_id,
            page=page,
            page_size=page_size,
            search=search,
            sort=sort,
            direction=direction,
            statuses=statuses,
            filters={
                "branch_type": branch_type,
                "city": city,
                "is_official_branch": is_official_branch,
            },
        ),
    )
    return ApiSuccess(
        data={
            "data": result.data,
            "meta": result.meta.model_dump(),
            "projection": result.projection.model_dump(),
        },
        warnings=result.warnings,
        message="Subeler listelendi.",
    )


@router.get("/{branch_id}")
async def get_branch_record(
    branch_id: str,
    context: RequestContextDep,
    session: SessionDep,
) -> ApiSuccess[dict[str, Any]]:
    tenant_id = require_tenant(context)
    branch = await get_branch_projection(session, tenant_id, branch_id)
    return ApiSuccess(data=branch, message="Sube kaydi getirildi.")


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
            "Sube resmi alanlari yalnizca islem sihirbaziyla degistirilebilir.",
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

        raise DomainError("Sube kaydi bulunamadi.", "BRANCH_NOT_FOUND", 404)
    await session.commit()
    return ApiSuccess(data=dict(row), message="Sube kart bilgileri guncellendi.")
