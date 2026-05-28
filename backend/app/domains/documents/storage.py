# ruff: noqa: E501

from __future__ import annotations

import asyncio
import base64
import hashlib
import json
import mimetypes
import re
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from pathlib import PurePosixPath
from typing import Any

from fastapi import status

from app.core.config import get_settings
from app.core.errors import DomainError

DEFAULT_BUCKET = "eden-documents"
MAX_FILE_SIZE = 20 * 1024 * 1024
SIGNED_URL_EXPIRES_IN = 300
ALLOWED_EXTENSIONS = {
    ".pdf",
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".csv",
    ".txt",
}
BLOCKED_EXTENSIONS = {".exe", ".bat", ".cmd", ".js", ".vbs", ".sh", ".ps1", ".jar"}
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/csv",
    "text/plain",
}


@dataclass(frozen=True)
class StoragePreparedFile:
    file_name: str
    file_extension: str
    mime_type: str
    file_size: int
    checksum: str | None
    storage_bucket: str
    storage_path: str
    storage_provider: str
    metadata: dict[str, Any]


def sanitize_file_name(value: str) -> str:
    normalized = value.replace("\\", "/").split("/")[-1].strip()
    normalized = re.sub(r"[^A-Za-z0-9._-]+", "_", normalized)
    normalized = re.sub(r"_+", "_", normalized).strip("._")
    return normalized or "document"


def file_extension(file_name: str) -> str:
    return PurePosixPath(file_name).suffix.lower()


def validate_file(file_name: str, mime_type: str, file_size: int) -> None:
    extension = file_extension(file_name)
    if extension in BLOCKED_EXTENSIONS:
        raise DomainError("Bu dosya uzantisi guvenlik nedeniyle yuklenemez.", "DOCUMENT_FILE_TYPE_BLOCKED", status.HTTP_400_BAD_REQUEST, {"extension": extension})
    if extension and extension not in ALLOWED_EXTENSIONS:
        raise DomainError("Dosya uzantisi desteklenmiyor.", "DOCUMENT_FILE_EXTENSION_NOT_ALLOWED", status.HTTP_400_BAD_REQUEST, {"extension": extension})
    if mime_type and mime_type not in ALLOWED_MIME_TYPES:
        raise DomainError("Dosya turu desteklenmiyor.", "DOCUMENT_MIME_TYPE_NOT_ALLOWED", status.HTTP_400_BAD_REQUEST, {"mime_type": mime_type})
    if file_size > MAX_FILE_SIZE:
        raise DomainError("Dosya boyutu limiti asildi.", "DOCUMENT_FILE_TOO_LARGE", status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, {"max_file_size": MAX_FILE_SIZE})


def storage_path_for(
    *,
    tenant_id: str,
    company_id: str | None,
    entity_type: str,
    entity_id: str,
    document_id: str,
    file_name: str,
) -> str:
    company_part = company_id or "global"
    return "/".join(
        [
            "tenant",
            safe_path_part(tenant_id),
            "company",
            safe_path_part(company_part),
            "entity",
            safe_path_part(entity_type),
            safe_path_part(entity_id),
            safe_path_part(document_id),
            sanitize_file_name(file_name),
        ]
    )


def safe_path_part(value: str) -> str:
    return re.sub(r"[^A-Za-z0-9_-]+", "_", value).strip("_") or "item"


async def prepare_storage_file(
    context: dict[str, Any],
    *,
    document_id: str,
    owner_entity_type: str,
    owner_entity_id: str,
    company_id: str | None,
    file_name: str,
    mime_type: str,
    file_size: int,
    content_base64: str | None,
    storage_bucket: str | None,
    storage_path: str | None,
    storage_provider: str,
) -> StoragePreparedFile:
    safe_name = sanitize_file_name(file_name)
    inferred_mime = mime_type or mimetypes.guess_type(safe_name)[0] or "application/octet-stream"
    content = base64.b64decode(content_base64) if content_base64 else None
    size = len(content) if content is not None else file_size
    validate_file(safe_name, inferred_mime, size)
    bucket = storage_bucket or DEFAULT_BUCKET
    path = storage_path or storage_path_for(
        tenant_id=str(context["tenant_id"]),
        company_id=company_id,
        entity_type=owner_entity_type,
        entity_id=owner_entity_id,
        document_id=document_id,
        file_name=safe_name,
    )
    validate_storage_path(path, str(context["tenant_id"]))
    checksum = hashlib.sha256(content).hexdigest() if content is not None else None
    if content is not None:
        await upload_to_storage(bucket, path, content, inferred_mime, storage_provider)
    return StoragePreparedFile(
        file_name=safe_name,
        file_extension=file_extension(safe_name).lstrip(".") or None or "",
        mime_type=inferred_mime,
        file_size=size,
        checksum=checksum,
        storage_bucket=bucket,
        storage_path=path,
        storage_provider=storage_provider,
        metadata={"storage_path_masked": mask_storage_path(path)},
    )


def validate_storage_path(path: str, tenant_id: str) -> None:
    if not path or path.startswith("/") or ".." in path or re.match(r"^https?://", path, re.I):
        raise DomainError("Gecersiz storage path.", "DOCUMENT_STORAGE_PATH_INVALID", status.HTTP_400_BAD_REQUEST)
    if f"tenant/{tenant_id}/" not in path:
        raise DomainError("Storage path calisma alani kapsami disinda.", "DOCUMENT_STORAGE_SCOPE_DENIED", status.HTTP_403_FORBIDDEN)


def mask_storage_path(path: str) -> str:
    parts = path.split("/")
    if len(parts) <= 4:
        return "***"
    return "/".join(parts[:4] + ["***", parts[-1]])


async def upload_to_storage(bucket: str, path: str, content: bytes, mime_type: str, provider: str) -> None:
    if provider != "supabase":
        raise DomainError("Storage provider desteklenmiyor.", "DOCUMENT_STORAGE_PROVIDER_UNSUPPORTED", status.HTTP_409_CONFLICT, {"provider": provider})
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise DomainError("Supabase Storage yapilandirilmamis.", "DOCUMENT_STORAGE_NOT_CONFIGURED", status.HTTP_503_SERVICE_UNAVAILABLE)
    await asyncio.to_thread(_supabase_upload_sync, settings.supabase_url, settings.supabase_service_role_key, bucket, path, content, mime_type)


async def create_signed_url(bucket: str, path: str, provider: str, *, expires_in: int = SIGNED_URL_EXPIRES_IN) -> str:
    if provider != "supabase":
        raise DomainError("Storage provider desteklenmiyor.", "DOCUMENT_STORAGE_PROVIDER_UNSUPPORTED", status.HTTP_409_CONFLICT, {"provider": provider})
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise DomainError("Signed URL servisi yapilandirilmamis.", "DOCUMENT_STORAGE_NOT_CONFIGURED", status.HTTP_503_SERVICE_UNAVAILABLE)
    return await asyncio.to_thread(_supabase_signed_url_sync, settings.supabase_url, settings.supabase_service_role_key, bucket, path, expires_in)


def _supabase_headers(service_role_key: str, content_type: str = "application/json") -> dict[str, str]:
    return {
        "Authorization": f"Bearer {service_role_key}",
        "apikey": service_role_key,
        "Content-Type": content_type,
    }


def _supabase_upload_sync(supabase_url: str, service_role_key: str, bucket: str, path: str, content: bytes, mime_type: str) -> None:
    url = f"{supabase_url.rstrip('/')}/storage/v1/object/{urllib.parse.quote(bucket)}/{urllib.parse.quote(path)}"
    request = urllib.request.Request(url, data=content, method="POST", headers={**_supabase_headers(service_role_key, mime_type), "x-upsert": "false"})
    try:
        with urllib.request.urlopen(request, timeout=20):
            return
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="ignore")
        raise DomainError("Dosya storage'a yuklenemedi.", "DOCUMENT_STORAGE_UPLOAD_FAILED", status.HTTP_502_BAD_GATEWAY, {"status": exc.code, "reason": body[:300]}) from exc


def _supabase_signed_url_sync(supabase_url: str, service_role_key: str, bucket: str, path: str, expires_in: int) -> str:
    encoded_path = urllib.parse.quote(path)
    url = f"{supabase_url.rstrip('/')}/storage/v1/object/sign/{urllib.parse.quote(bucket)}/{encoded_path}"
    payload = json.dumps({"expiresIn": expires_in}).encode("utf-8")
    request = urllib.request.Request(url, data=payload, method="POST", headers=_supabase_headers(service_role_key))
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            data = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="ignore")
        raise DomainError("Signed URL uretilemedi.", "DOCUMENT_SIGNED_URL_FAILED", status.HTTP_502_BAD_GATEWAY, {"status": exc.code, "reason": body[:300]}) from exc
    signed = str(data.get("signedURL") or data.get("signedUrl") or "")
    if not signed:
        raise DomainError("Signed URL cevabi gecersiz.", "DOCUMENT_SIGNED_URL_INVALID", status.HTTP_502_BAD_GATEWAY)
    if signed.startswith("http"):
        return signed
    return f"{supabase_url.rstrip('/')}{signed}"
