# ruff: noqa: B008, E501

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.errors import DomainError, domain_error_to_http
from app.core.security import RequestContext, has_permission, require_access_context, require_tenant
from app.domains.data_quality.schemas import (
    DuplicateDetectRequest,
    DuplicateGroupActionRequest,
    MergeConfirmRequest,
    MergePreviewRequest,
    QualityCheckRequest,
    RuleUpdateRequest,
)
from app.domains.data_quality.service import (
    check_entity_quality,
    data_quality_summary,
    detect_duplicates,
    dismiss_duplicate_group,
    get_duplicate_group,
    get_merge_operation,
    list_duplicate_groups,
    list_rules,
    mark_duplicate_false_positive,
    merge_confirm,
    merge_preview,
    run_quality_check,
    service_context,
    update_rule,
)
from app.schemas.common import ApiSuccess

router = APIRouter(dependencies=[Depends(require_access_context)])
RequestContextDep = Annotated[RequestContext, Depends(require_access_context)]
SessionDep = Annotated[AsyncSession, Depends(get_session)]


@router.get("/data-quality/summary", response_model=ApiSuccess[dict[str, Any]])
async def get_summary(session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "dataQuality.view")
    tenant_id = require_tenant(context)
    try:
        data = await data_quality_summary(session, service_context(context, tenant_id))
        return ApiSuccess(data=data)
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/data-quality/by-entity/{entity_type}/{entity_id}", response_model=ApiSuccess[dict[str, Any]])
async def get_by_entity(
    entity_type: str,
    entity_id: str,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "dataQuality.view")
    tenant_id = require_tenant(context)
    try:
        data = await check_entity_quality(session, service_context(context, tenant_id), entity_type, entity_id)
        return ApiSuccess(data=data)
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/data-quality/check", response_model=ApiSuccess[dict[str, Any]])
async def post_check(
    request: QualityCheckRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "dataQuality.runChecks")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            data = await run_quality_check(session, service_context(context, tenant_id), request)
        return ApiSuccess(data=data, message="Veri kalitesi kontrolu tamamlandi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/data-quality/check/{entity_type}/{entity_id}", response_model=ApiSuccess[dict[str, Any]])
async def post_check_entity(
    entity_type: str,
    entity_id: str,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "dataQuality.runChecks")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            data = await check_entity_quality(session, service_context(context, tenant_id), entity_type, entity_id)
        return ApiSuccess(data=data, message="Kayit kalite kontrolu tamamlandi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/data-quality/duplicates", response_model=ApiSuccess[list[dict[str, Any]]])
async def get_duplicates(
    session: SessionDep,
    context: RequestContextDep,
    entity_type: str | None = Query(default=None),
    status_value: str | None = Query(default="open", alias="status"),
    severity: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=200),
) -> ApiSuccess[list[dict[str, Any]]]:
    ensure_permission(context, "dataQuality.reviewDuplicates")
    tenant_id = require_tenant(context)
    try:
        data = await list_duplicate_groups(
            session,
            service_context(context, tenant_id),
            entity_type=entity_type,
            status_value=status_value,
            severity=severity,
            limit=limit,
        )
        return ApiSuccess(data=data)
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/data-quality/duplicates/{group_id}", response_model=ApiSuccess[dict[str, Any]])
async def get_duplicate(
    group_id: str,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "dataQuality.reviewDuplicates")
    tenant_id = require_tenant(context)
    try:
        data = await get_duplicate_group(session, service_context(context, tenant_id), group_id)
        return ApiSuccess(data=data)
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/data-quality/duplicates/detect", response_model=ApiSuccess[dict[str, Any]])
async def post_detect_duplicates(
    request: DuplicateDetectRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "dataQuality.runChecks")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            data = await detect_duplicates(session, service_context(context, tenant_id), request)
        return ApiSuccess(data=data, message="Duplicate detection tamamlandi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/data-quality/duplicates/{group_id}/dismiss", response_model=ApiSuccess[dict[str, Any]])
async def post_dismiss_duplicate(
    group_id: str,
    request: DuplicateGroupActionRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "dataQuality.dismissFinding")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            data = await dismiss_duplicate_group(session, service_context(context, tenant_id), group_id, request)
        return ApiSuccess(data=data, message="Duplicate aday grubu yok sayildi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/data-quality/duplicates/{group_id}/false-positive", response_model=ApiSuccess[dict[str, Any]])
async def post_false_positive_duplicate(
    group_id: str,
    request: DuplicateGroupActionRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "dataQuality.dismissFinding")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            data = await mark_duplicate_false_positive(session, service_context(context, tenant_id), group_id, request)
        return ApiSuccess(data=data, message="Duplicate aday grubu false positive isaretlendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/data-quality/merge/preview", response_model=ApiSuccess[dict[str, Any]])
async def post_merge_preview(
    request: MergePreviewRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "dataQuality.reviewDuplicates")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            data = await merge_preview(session, service_context(context, tenant_id), request)
        return ApiSuccess(data=data)
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/data-quality/merge/confirm", response_model=ApiSuccess[dict[str, Any]])
async def post_merge_confirm(
    request: MergeConfirmRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "dataQuality.merge")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            data = await merge_confirm(session, service_context(context, tenant_id), request)
        return ApiSuccess(data=data, message="Merge islemi tamamlandi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/data-quality/merge/{merge_id}", response_model=ApiSuccess[dict[str, Any]])
async def get_merge(
    merge_id: str,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "dataQuality.reviewDuplicates")
    tenant_id = require_tenant(context)
    try:
        data = await get_merge_operation(session, service_context(context, tenant_id), merge_id)
        return ApiSuccess(data=data)
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/data-quality/rules", response_model=ApiSuccess[list[dict[str, Any]]])
async def get_rules(
    session: SessionDep,
    context: RequestContextDep,
    entity_type: str | None = Query(default=None),
) -> ApiSuccess[list[dict[str, Any]]]:
    ensure_permission(context, "dataQuality.view")
    tenant_id = require_tenant(context)
    data = await list_rules(session, service_context(context, tenant_id), entity_type=entity_type)
    return ApiSuccess(data=data)


@router.patch("/data-quality/rules/{rule_key}", response_model=ApiSuccess[dict[str, Any]])
async def patch_rule(
    rule_key: str,
    request: RuleUpdateRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "dataQuality.admin")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            data = await update_rule(session, service_context(context, tenant_id), rule_key, request)
        return ApiSuccess(data=data, message="Data quality rule guncellendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


def ensure_permission(context: RequestContext, permission_key: str) -> None:
    if has_permission(context, permission_key):
        return
    raise DomainError(
        "Bu islem icin yetkiniz yok.",
        "PERMISSION_DENIED",
        status.HTTP_403_FORBIDDEN,
    )

