# ruff: noqa: B008, E501

from __future__ import annotations

import base64
import json
import re
from pathlib import PurePath
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query, Request, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.errors import DomainError, domain_error_to_http
from app.core.security import RequestContext, has_permission, require_access_context, require_tenant
from app.domains.documents.schemas import (
    DocumentCreateRequest,
    DocumentListQuery,
    DocumentRejectRequest,
    DocumentUpdateRequest,
    DocumentUploadRequest,
)
from app.domains.documents.service import (
    create_document,
    create_new_version,
    delete_document,
    get_document,
    get_document_url,
    list_access_logs,
    list_documents,
    list_documents_by_entity,
    list_expiring_documents,
    list_requirements,
    reject_document,
    service_context,
    update_document,
    upload_document,
    upload_document_for_entity,
    verify_document,
)
from app.domains.documents.storage import (
    DEFAULT_BUCKET,
    SIGNED_URL_EXPIRES_IN,
    create_media_access_url,
    create_signed_url,
    local_file_metadata,
    validate_storage_path,
)
from app.schemas.common import ApiSuccess

router = APIRouter(dependencies=[Depends(require_access_context)])
RequestContextDep = Annotated[RequestContext, Depends(require_access_context)]
SessionDep = Annotated[AsyncSession, Depends(get_session)]
MAX_DOCUMENT_UPLOAD_BYTES = 25 * 1024 * 1024
ALLOWED_DOCUMENT_MIME_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/json",
    "text/css",
    "text/markdown",
    "text/plain",
    "text/csv",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}


async def document_upload_request_from_http(request: Request) -> DocumentUploadRequest:
    content_type = request.headers.get("content-type", "").lower()
    if "multipart/form-data" not in content_type:
        return DocumentUploadRequest.model_validate(await request.json())

    form = await request.form()
    file = form.get("file")
    if not isinstance(file, UploadFile):
        raise DomainError("Dosya bulunamadi.", "DOCUMENT_FILE_REQUIRED", status.HTTP_400_BAD_REQUEST)

    if _form_string(form, "storage_path") or _form_string(form, "storagePath"):
        raise DomainError(
            "Storage path istemci tarafindan belirlenemez.",
            "DOCUMENT_STORAGE_PATH_CLIENT_CONTROLLED",
            status.HTTP_400_BAD_REQUEST,
        )

    file_name = sanitize_upload_file_name(file.filename or "document")
    mime_type = normalize_upload_mime_type(file.content_type, file_name)
    if mime_type not in ALLOWED_DOCUMENT_MIME_TYPES:
        raise DomainError(
            "Desteklenmeyen belge formati.",
            "DOCUMENT_MIME_TYPE_NOT_ALLOWED",
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
        )

    content = await file.read(MAX_DOCUMENT_UPLOAD_BYTES + 1)
    if not content:
        raise DomainError("Belge dosyasi bos.", "DOCUMENT_FILE_EMPTY", status.HTTP_400_BAD_REQUEST)
    if len(content) > MAX_DOCUMENT_UPLOAD_BYTES:
        raise DomainError(
            "Belge dosyasi en fazla 25 MB olabilir.",
            "DOCUMENT_FILE_TOO_LARGE",
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
        )

    return DocumentUploadRequest(
        company_id=_form_string(form, "company_id"),
        branch_id=_form_string(form, "branch_id"),
        owner_entity_type=_form_string(form, "owner_entity_type") or "document",
        owner_entity_id=_form_string(form, "owner_entity_id") or "document",
        document_type=_form_string(form, "document_type") or _form_string(form, "slotId") or "other",
        document_category=_form_string(form, "document_category") or "general",
        title=_form_string(form, "title") or file_name,
        description=_form_string(form, "description"),
        file_name=file_name,
        mime_type=mime_type,
        file_size=len(content),
        content_base64=base64.b64encode(content).decode("ascii"),
        storage_bucket=_form_string(form, "storage_bucket"),
        storage_provider=_form_string(form, "storage_provider") or "local",
        required=_form_bool(form, "required"),
        verification_required=_form_bool(form, "verification_required"),
        issue_date=_form_string(form, "issue_date"),
        expiry_date=_form_string(form, "expiry_date"),
        relation_type=_form_string(form, "relation_type") or "attachment",
        module_key=_form_string(form, "module_key"),
        operation_key=_form_string(form, "operation_key"),
        operation_id=_form_string(form, "operation_id"),
        document_slot_key=_form_string(form, "document_slot_key") or _form_string(form, "slotId"),
        tags=_form_list(form, "tags"),
        metadata_json=_form_json_object(form, "metadata_json"),
    )


def sanitize_upload_file_name(file_name: str) -> str:
    safe_name = PurePath(file_name).name.strip().replace("\x00", "")
    safe_name = re.sub(r"[^A-Za-z0-9._ -]+", "_", safe_name).strip(" .")
    return safe_name[:180] or "document"


def normalize_upload_mime_type(content_type: str | None, file_name: str) -> str:
    normalized = (content_type or "").split(";", maxsplit=1)[0].strip().lower()
    suffix = file_name.lower()
    if normalized == "image/jpg":
        return "image/jpeg"
    if normalized and normalized != "application/octet-stream":
        return normalized
    if suffix.endswith(".pdf"):
        return "application/pdf"
    if suffix.endswith((".jpg", ".jpeg")):
        return "image/jpeg"
    if suffix.endswith(".png"):
        return "image/png"
    if suffix.endswith(".webp"):
        return "image/webp"
    if suffix.endswith(".json"):
        return "application/json"
    if suffix.endswith(".css"):
        return "text/css"
    if suffix.endswith((".md", ".markdown")):
        return "text/markdown"
    if suffix.endswith(".txt"):
        return "text/plain"
    if suffix.endswith(".csv"):
        return "text/csv"
    if suffix.endswith(".doc"):
        return "application/msword"
    if suffix.endswith(".docx"):
        return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    if suffix.endswith(".xls"):
        return "application/vnd.ms-excel"
    if suffix.endswith(".xlsx"):
        return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    return "application/octet-stream"


def _form_string(form: Any, key: str) -> str | None:
    value = form.get(key)
    return value.strip() if isinstance(value, str) and value.strip() else None


def _form_bool(form: Any, key: str) -> bool:
    return (_form_string(form, key) or "").lower() in {"1", "true", "yes", "on"}


def _form_list(form: Any, key: str) -> list[str]:
    value = _form_string(form, key)
    if not value:
        return []
    try:
      parsed = json.loads(value)
    except json.JSONDecodeError:
      parsed = None
    if isinstance(parsed, list):
        return [str(item).strip() for item in parsed if str(item).strip()]
    return [item.strip() for item in value.split(",") if item.strip()]


def _form_json_object(form: Any, key: str) -> dict[str, Any]:
    value = _form_string(form, key)
    if not value:
        return {}
    try:
        parsed = json.loads(value)
    except json.JSONDecodeError:
        return {}
    return parsed if isinstance(parsed, dict) else {}


@router.get("/documents", response_model=ApiSuccess[dict[str, Any]])
async def documents_list(
    session: SessionDep,
    context: RequestContextDep,
    document_type: str | None = Query(default=None),
    document_category: str | None = Query(default=None),
    status_value: str | None = Query(default=None, alias="status"),
    verification_status: str | None = Query(default=None),
    required: bool | None = Query(default=None),
    company_id: str | None = Query(default=None),
    owner_entity_type: str | None = Query(default=None),
    owner_entity_id: str | None = Query(default=None),
    uploaded_by: str | None = Query(default=None),
    search: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, alias="pageSize", ge=1, le=200),
    sort: str = Query(default="created_at"),
    direction: str = Query(default="desc"),
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "documents.view")
    tenant_id = require_tenant(context)
    try:
        query = DocumentListQuery(document_type=document_type, document_category=document_category, status=status_value, verification_status=verification_status, required=required, company_id=company_id, owner_entity_type=owner_entity_type, owner_entity_id=owner_entity_id, uploaded_by=uploaded_by, search=search, page=page, page_size=page_size, sort=sort, direction="asc" if direction == "asc" else "desc")
        return ApiSuccess(data=await list_documents(session, service_context(context, tenant_id), query))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/documents", response_model=ApiSuccess[dict[str, Any]], status_code=201)
async def documents_create(request: DocumentCreateRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "documents.upload")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await create_document(session, service_context(context, tenant_id), request)
        return ApiSuccess(data=row, message="Belge metadata olusturuldu.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/documents/upload", response_model=ApiSuccess[dict[str, Any]], status_code=201)
async def documents_upload(raw_request: Request, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "documents.upload")
    tenant_id = require_tenant(context)
    try:
        request = await document_upload_request_from_http(raw_request)
        async with session.begin():
            row = await upload_document(session, service_context(context, tenant_id), request)
        return ApiSuccess(data=row, message="Belge yuklendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/documents/expiring", response_model=ApiSuccess[list[dict[str, Any]]])
async def documents_expiring(session: SessionDep, context: RequestContextDep) -> ApiSuccess[list[dict[str, Any]]]:
    ensure_permission(context, "documents.view")
    tenant_id = require_tenant(context)
    try:
        return ApiSuccess(data=await list_expiring_documents(session, service_context(context, tenant_id), expired=False))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/documents/expired", response_model=ApiSuccess[list[dict[str, Any]]])
async def documents_expired(session: SessionDep, context: RequestContextDep) -> ApiSuccess[list[dict[str, Any]]]:
    ensure_permission(context, "documents.view")
    tenant_id = require_tenant(context)
    try:
        return ApiSuccess(data=await list_expiring_documents(session, service_context(context, tenant_id), expired=True))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/documents/requirements", response_model=ApiSuccess[list[dict[str, Any]]])
async def documents_requirements(
    session: SessionDep,
    context: RequestContextDep,
    module_key: str | None = Query(default=None),
    operation_key: str | None = Query(default=None),
    entity_type: str | None = Query(default=None),
) -> ApiSuccess[list[dict[str, Any]]]:
    ensure_permission(context, "documents.view")
    tenant_id = require_tenant(context)
    return ApiSuccess(data=await list_requirements(session, service_context(context, tenant_id), module_key=module_key, operation_key=operation_key, entity_type=entity_type))


@router.get("/documents/requirements/{module_key}/{operation_key}", response_model=ApiSuccess[list[dict[str, Any]]])
async def documents_requirements_for_operation(module_key: str, operation_key: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[list[dict[str, Any]]]:
    ensure_permission(context, "documents.view")
    tenant_id = require_tenant(context)
    return ApiSuccess(data=await list_requirements(session, service_context(context, tenant_id), module_key=module_key, operation_key=operation_key))


@router.get("/documents/by-entity/{entity_type}/{entity_id}", response_model=ApiSuccess[list[dict[str, Any]]])
async def documents_by_entity(entity_type: str, entity_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[list[dict[str, Any]]]:
    ensure_permission(context, "documents.view")
    tenant_id = require_tenant(context)
    try:
        return ApiSuccess(data=await list_documents_by_entity(session, service_context(context, tenant_id), entity_type, entity_id))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/documents/by-entity/{entity_type}/{entity_id}/upload", response_model=ApiSuccess[dict[str, Any]], status_code=201)
async def documents_by_entity_upload(entity_type: str, entity_id: str, raw_request: Request, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "documents.upload")
    tenant_id = require_tenant(context)
    try:
        request = await document_upload_request_from_http(raw_request)
        async with session.begin():
            row = await upload_document_for_entity(session, service_context(context, tenant_id), entity_type, entity_id, request)
        return ApiSuccess(data=row, message="Kayda belge yuklendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error



@router.post("/documents/uploads/signed-url")
async def documents_upload_signed_url(
    payload: dict[str, Any],
    context: RequestContextDep,
) -> dict[str, Any]:
    tenant_id = require_tenant(context)
    storage_path = str(payload.get("storagePath") or payload.get("storage_path") or "").strip()
    if not storage_path or storage_path.startswith("/") or ".." in storage_path or storage_path.lower().startswith(("http://", "https://")):
        raise DomainError("Gecersiz storage path.", "DOCUMENT_STORAGE_PATH_INVALID", status.HTTP_400_BAD_REQUEST)
    if str(tenant_id) not in storage_path:
        raise DomainError("Storage path calisma alani kapsami disinda.", "DOCUMENT_STORAGE_SCOPE_DENIED", status.HTTP_403_FORBIDDEN)
    storage_bucket = str(payload.get("storageBucket") or payload.get("storage_bucket") or DEFAULT_BUCKET)
    storage_provider = str(payload.get("storageProvider") or payload.get("storage_provider") or "local")
    expires_in = int(payload.get("expiresIn") or payload.get("expires_in") or SIGNED_URL_EXPIRES_IN)
    signed_url = await create_signed_url(storage_bucket, storage_path, storage_provider, expires_in=expires_in)
    media_access_url = await create_media_access_url(storage_bucket, storage_path, storage_provider, expires_in=expires_in)
    return {
        "signedUrl": signed_url,
        "mediaAccessUrl": media_access_url,
        "media_access_url": media_access_url,
        "expiresIn": expires_in,
        "storagePath": storage_path,
        "storageBucket": storage_bucket,
    }


@router.get("/documents/media/open")
async def documents_media_open(
    context: RequestContextDep,
    storage_path: str = Query(alias="storagePath"),
    storage_bucket: str = Query(default=DEFAULT_BUCKET, alias="storageBucket"),
    download: bool = Query(default=False),
) -> FileResponse:
    tenant_id = require_tenant(context)
    validate_storage_path(storage_path, str(tenant_id))
    metadata = local_file_metadata(storage_bucket, storage_path)
    disposition = "attachment" if download else "inline"
    file_name = str(metadata["file_name"]).replace('"', "")
    return FileResponse(
        metadata["path"],
        media_type=metadata["mime_type"],
        filename=file_name,
        headers={"content-disposition": f'{disposition}; filename="{file_name}"'},
    )


@router.get("/documents/media/metadata")
async def documents_media_metadata(
    context: RequestContextDep,
    storage_path: str = Query(alias="storagePath"),
    storage_bucket: str = Query(default=DEFAULT_BUCKET, alias="storageBucket"),
) -> dict[str, Any]:
    tenant_id = require_tenant(context)
    validate_storage_path(storage_path, str(tenant_id))
    metadata = local_file_metadata(storage_bucket, storage_path)
    return {
        "storagePath": storage_path,
        "storageBucket": storage_bucket,
        "name": metadata["file_name"],
        "type": metadata["mime_type"],
        "size": metadata["file_size"],
    }


@router.get("/documents/{document_id}", response_model=ApiSuccess[dict[str, Any]])
async def documents_get(document_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "documents.view")
    tenant_id = require_tenant(context)
    try:
        return ApiSuccess(data=await get_document(session, service_context(context, tenant_id), document_id))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.patch("/documents/{document_id}", response_model=ApiSuccess[dict[str, Any]])
async def documents_patch(document_id: str, request: DocumentUpdateRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "documents.upload")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await update_document(session, service_context(context, tenant_id), document_id, request)
        return ApiSuccess(data=row, message="Belge guncellendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.delete("/documents/{document_id}", response_model=ApiSuccess[dict[str, Any]])
async def documents_delete(document_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "documents.delete")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await delete_document(session, service_context(context, tenant_id), document_id)
        return ApiSuccess(data=row, message="Belge silindi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/documents/{document_id}/new-version", response_model=ApiSuccess[dict[str, Any]], status_code=201)
async def documents_new_version(document_id: str, raw_request: Request, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "documents.upload")
    tenant_id = require_tenant(context)
    try:
        request = await document_upload_request_from_http(raw_request)
        async with session.begin():
            row = await create_new_version(session, service_context(context, tenant_id), document_id, request)
        return ApiSuccess(data=row, message="Belge yeni versiyonu olusturuldu.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/documents/{document_id}/verify", response_model=ApiSuccess[dict[str, Any]])
async def documents_verify(document_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "documents.verify")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await verify_document(session, service_context(context, tenant_id), document_id)
        return ApiSuccess(data=row, message="Belge dogrulandi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/documents/{document_id}/reject", response_model=ApiSuccess[dict[str, Any]])
async def documents_reject(document_id: str, request: DocumentRejectRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "documents.reject")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await reject_document(session, service_context(context, tenant_id), document_id, request)
        return ApiSuccess(data=row, message="Belge reddedildi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/documents/{document_id}/download-url", response_model=ApiSuccess[dict[str, Any]])
async def documents_download_url(document_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "documents.download")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            return ApiSuccess(data=await get_document_url(session, service_context(context, tenant_id), document_id, action="download"))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/documents/{document_id}/media-access-url", response_model=ApiSuccess[dict[str, Any]])
async def documents_media_access_url(document_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "documents.view")
    tenant_id = require_tenant(context)
    try:
        return ApiSuccess(data=await get_document_url(session, service_context(context, tenant_id), document_id, action="preview"))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/documents/{document_id}/preview-url", response_model=ApiSuccess[dict[str, Any]])
async def documents_preview_url(document_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "documents.view")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            return ApiSuccess(data=await get_document_url(session, service_context(context, tenant_id), document_id, action="preview"))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/documents/{document_id}/access-logs", response_model=ApiSuccess[list[dict[str, Any]]])
async def documents_access_logs(document_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[list[dict[str, Any]]]:
    ensure_permission(context, "documents.accessLogsView")
    tenant_id = require_tenant(context)
    try:
        return ApiSuccess(data=await list_access_logs(session, service_context(context, tenant_id), document_id))
    except DomainError as error:
        raise domain_error_to_http(error) from error


def ensure_permission(context: RequestContext, permission_key: str) -> None:
    if not has_permission(context, permission_key):
        raise DomainError("Bu islem icin yetkiniz bulunmuyor.", "PERMISSION_DENIED", status.HTTP_403_FORBIDDEN)
