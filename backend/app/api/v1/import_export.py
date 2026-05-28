# ruff: noqa: B008, E501

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.errors import DomainError, domain_error_to_http
from app.core.security import RequestContext, has_permission, require_access_context, require_tenant
from app.domains.import_export.bulk_actions import (
    bulk_action_report,
    confirm_bulk_action_job,
    create_bulk_action_job,
    get_bulk_action_job,
)
from app.domains.import_export.export_jobs import (
    create_export_job,
    download_export_job,
    get_export_job,
)
from app.domains.import_export.import_jobs import (
    cancel_import_job,
    confirm_import_job,
    create_import_job,
    get_import_error_report,
    get_import_job,
    update_import_mapping,
    upload_import_file,
    validate_import_job,
)
from app.domains.import_export.schemas import (
    BulkActionConfirmRequest,
    BulkActionCreateRequest,
    ExportJobCreateRequest,
    ImportConfirmRequest,
    ImportJobCreateRequest,
    ImportMappingRequest,
    ImportUploadRequest,
    ImportValidateRequest,
)
from app.domains.import_export.service import service_context
from app.domains.import_export.templates import get_template, list_templates, template_csv
from app.schemas.common import ApiSuccess

router = APIRouter(dependencies=[Depends(require_access_context)])
RequestContextDep = Annotated[RequestContext, Depends(require_access_context)]
SessionDep = Annotated[AsyncSession, Depends(get_session)]


@router.get("/import/templates", response_model=ApiSuccess[list[dict[str, Any]]])
async def import_templates(context: RequestContextDep) -> ApiSuccess[list[dict[str, Any]]]:
    ensure_permission(context, "import.view")
    return ApiSuccess(data=[template.model_dump(mode="json") for template in list_templates()])


@router.get("/import/templates/{template_key}", response_model=ApiSuccess[dict[str, Any]])
async def import_template_get(template_key: str, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "import.view")
    template = get_template(template_key)
    if not template:
        raise domain_error_to_http(DomainError("Import sablonu bulunamadi.", "IMPORT_TEMPLATE_NOT_FOUND", status.HTTP_404_NOT_FOUND))
    return ApiSuccess(data=template.model_dump(mode="json"))


@router.get("/import/templates/{template_key}/download")
async def import_template_download(template_key: str, context: RequestContextDep) -> Response:
    ensure_permission(context, "import.view")
    template = get_template(template_key)
    if not template:
        raise domain_error_to_http(DomainError("Import sablonu bulunamadi.", "IMPORT_TEMPLATE_NOT_FOUND", status.HTTP_404_NOT_FOUND))
    csv_text = template_csv(template)
    return Response(
        content=csv_text,
        media_type="text/csv",
        headers={"content-disposition": f'attachment; filename="{template_key}.csv"'},
    )


@router.post("/import/jobs", response_model=ApiSuccess[dict[str, Any]], status_code=201)
async def import_job_create(request: ImportJobCreateRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "import.create")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            job = await create_import_job(session, service_context(context, tenant_id), request)
        return ApiSuccess(data=job, message="Import job olusturuldu.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/import/jobs/{job_id}/upload", response_model=ApiSuccess[dict[str, Any]])
async def import_job_upload(job_id: str, request: ImportUploadRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "import.create")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            job = await upload_import_file(session, service_context(context, tenant_id), job_id, request)
        return ApiSuccess(data=job, message="Dosya yuklendi; alan eslestirme bekleniyor.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/import/jobs/{job_id}", response_model=ApiSuccess[dict[str, Any]])
async def import_job_get(job_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "import.view")
    tenant_id = require_tenant(context)
    try:
        return ApiSuccess(data=await get_import_job(session, service_context(context, tenant_id), job_id))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/import/jobs/{job_id}/mapping", response_model=ApiSuccess[dict[str, Any]])
async def import_job_mapping(job_id: str, request: ImportMappingRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "import.create")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            job = await update_import_mapping(session, service_context(context, tenant_id), job_id, request)
        return ApiSuccess(data=job, message="Alan eslestirmesi kaydedildi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/import/jobs/{job_id}/validate", response_model=ApiSuccess[dict[str, Any]])
async def import_job_validate(job_id: str, request: ImportValidateRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "import.create")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            job = await validate_import_job(session, service_context(context, tenant_id), job_id, request)
        return ApiSuccess(data=job, message="On dogrulama ve dry-run tamamlandi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/import/jobs/{job_id}/confirm", response_model=ApiSuccess[dict[str, Any]])
async def import_job_confirm(job_id: str, request: ImportConfirmRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "import.confirm")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            job = await confirm_import_job(session, service_context(context, tenant_id), job_id, request)
        return ApiSuccess(data=job, message="Import tamamlandi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/import/jobs/{job_id}/cancel", response_model=ApiSuccess[dict[str, Any]])
async def import_job_cancel(job_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "import.cancel")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            job = await cancel_import_job(session, service_context(context, tenant_id), job_id)
        return ApiSuccess(data=job, message="Import job iptal edildi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/import/jobs/{job_id}/error-report")
async def import_job_error_report(job_id: str, session: SessionDep, context: RequestContextDep) -> Response:
    ensure_permission(context, "import.view")
    tenant_id = require_tenant(context)
    try:
        report = await get_import_error_report(session, service_context(context, tenant_id), job_id)
        return Response(content=report, media_type="text/csv", headers={"content-disposition": f'attachment; filename="import-job-{job_id}-error-report.csv"'})
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/export/jobs", response_model=ApiSuccess[dict[str, Any]], status_code=201)
async def export_job_create(request: ExportJobCreateRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "export.create")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            job = await create_export_job(session, service_context(context, tenant_id), request)
        return ApiSuccess(data=job, message="Export job hazirlandi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/export/jobs/{job_id}", response_model=ApiSuccess[dict[str, Any]])
async def export_job_get(job_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "export.create")
    tenant_id = require_tenant(context)
    try:
        return ApiSuccess(data=await get_export_job(session, service_context(context, tenant_id), job_id))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/export/jobs/{job_id}/download")
async def export_job_download(job_id: str, session: SessionDep, context: RequestContextDep) -> Response:
    ensure_permission(context, "export.download")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            csv_text = await download_export_job(session, service_context(context, tenant_id), job_id)
        return Response(content=csv_text, media_type="text/csv", headers={"content-disposition": f'attachment; filename="export-job-{job_id}.csv"'})
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/bulk/actions", response_model=ApiSuccess[dict[str, Any]], status_code=201)
async def bulk_action_create(request: BulkActionCreateRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "bulk.create")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            job = await create_bulk_action_job(session, service_context(context, tenant_id), request)
        return ApiSuccess(data=job, message="Bulk action dry-run hazirlandi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/bulk/actions/{job_id}", response_model=ApiSuccess[dict[str, Any]])
async def bulk_action_get(job_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "bulk.create")
    tenant_id = require_tenant(context)
    try:
        return ApiSuccess(data=await get_bulk_action_job(session, service_context(context, tenant_id), job_id))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/bulk/actions/{job_id}/confirm", response_model=ApiSuccess[dict[str, Any]])
async def bulk_action_confirm(job_id: str, request: BulkActionConfirmRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "bulk.confirm")
    if not request.confirm:
        raise domain_error_to_http(DomainError("Bulk action onayi zorunludur.", "BULK_CONFIRM_REQUIRED", status.HTTP_400_BAD_REQUEST))
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            job = await confirm_bulk_action_job(session, service_context(context, tenant_id), job_id)
        return ApiSuccess(data=job, message="Bulk action tamamlandi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/bulk/actions/{job_id}/report", response_model=ApiSuccess[dict[str, Any]])
async def bulk_action_report_endpoint(job_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "bulk.create")
    tenant_id = require_tenant(context)
    try:
        return ApiSuccess(data=await bulk_action_report(session, service_context(context, tenant_id), job_id))
    except DomainError as error:
        raise domain_error_to_http(error) from error


def ensure_permission(context: RequestContext, permission_key: str) -> None:
    if not has_permission(context, permission_key):
        raise DomainError("Bu islem icin yetkiniz bulunmuyor.", "PERMISSION_DENIED", status.HTTP_403_FORBIDDEN)

