# ruff: noqa: E501

from __future__ import annotations

import asyncio
import base64
import hashlib
import mimetypes
import os
import re
import urllib.parse
from dataclasses import dataclass
from pathlib import Path, PurePosixPath
from typing import Any

from fastapi import status

from app.core.config import get_settings
from app.core.errors import DomainError

DEFAULT_BUCKET = "eden-documents"
LOCAL_STORAGE_PROVIDER = "local"
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
    content: bytes | None = None


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
    write_to_storage: bool = True,
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
    normalized_provider = LOCAL_STORAGE_PROVIDER
    if content is not None and write_to_storage:
        await upload_to_storage(bucket, path, content, inferred_mime, normalized_provider)
    return StoragePreparedFile(
        file_name=safe_name,
        file_extension=file_extension(safe_name).lstrip(".") or None or "",
        mime_type=inferred_mime,
        file_size=size,
        checksum=checksum,
        storage_bucket=bucket,
        storage_path=path,
        storage_provider=normalized_provider,
        metadata={"storage_path_masked": mask_storage_path(path)},
        content=content,
    )


async def write_prepared_file(prepared: StoragePreparedFile) -> None:
    if prepared.content is None:
        return
    await upload_to_storage(
        prepared.storage_bucket,
        prepared.storage_path,
        prepared.content,
        prepared.mime_type,
        prepared.storage_provider,
    )


def validate_storage_path(path: str, tenant_id: str) -> None:
    if not path or path.startswith("/") or ".." in path or re.match(r"^https?://", path, re.I):
        raise DomainError("Gecersiz storage path.", "DOCUMENT_STORAGE_PATH_INVALID", status.HTTP_400_BAD_REQUEST)
    if tenant_id not in path:
        raise DomainError("Storage path calisma alani kapsami disinda.", "DOCUMENT_STORAGE_SCOPE_DENIED", status.HTTP_403_FORBIDDEN)


def mask_storage_path(path: str) -> str:
    parts = path.split("/")
    if len(parts) <= 4:
        return "***"
    return "/".join(parts[:4] + ["***", parts[-1]])


async def upload_to_storage(bucket: str, path: str, content: bytes, mime_type: str, provider: str) -> None:
    normalized_provider = (provider or LOCAL_STORAGE_PROVIDER).lower()
    if normalized_provider != LOCAL_STORAGE_PROVIDER:
        normalized_provider = LOCAL_STORAGE_PROVIDER
    await asyncio.to_thread(_local_upload_sync, bucket, path, content)


async def create_media_access_url(bucket: str, path: str, provider: str, *, expires_in: int = SIGNED_URL_EXPIRES_IN) -> str:
    return local_media_url(bucket, path)


async def create_signed_url(bucket: str, path: str, provider: str, *, expires_in: int = SIGNED_URL_EXPIRES_IN) -> str:
    # Legacy name retained for API compatibility. This returns a controlled
    # local media access URL, not a public object-storage signed URL.
    return await create_media_access_url(bucket, path, provider, expires_in=expires_in)


def local_media_url(bucket: str, path: str, *, download: bool = False) -> str:
    query = urllib.parse.urlencode({
        "storageBucket": bucket or DEFAULT_BUCKET,
        "storagePath": path,
        "download": "1" if download else "0",
    })
    return f"/api/media/open?{query}"


def local_storage_root() -> Path:
    settings = get_settings()
    root = Path(settings.document_storage_root).expanduser()
    if not root.is_absolute():
        repo_root = Path(__file__).resolve().parents[4]
        root = repo_root / root
    return root.resolve()


def local_storage_file_path(bucket: str, path: str) -> Path:
    safe_bucket = safe_path_part(bucket or DEFAULT_BUCKET)
    root = local_storage_root()
    target = (root / safe_bucket / path).resolve()
    allowed_root = (root / safe_bucket).resolve()
    if os.path.commonpath([str(allowed_root), str(target)]) != str(allowed_root):
        raise DomainError("Gecersiz storage path.", "DOCUMENT_STORAGE_PATH_INVALID", status.HTTP_400_BAD_REQUEST)
    return target


def _local_upload_sync(bucket: str, path: str, content: bytes) -> None:
    target = local_storage_file_path(bucket, path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(content)


def local_file_metadata(bucket: str, path: str) -> dict[str, Any]:
    target = local_storage_file_path(bucket, path)
    if not target.exists() or not target.is_file():
        raise DomainError("Belge yerel storage alaninda bulunamadi.", "DOCUMENT_LOCAL_FILE_NOT_FOUND", status.HTTP_404_NOT_FOUND, {"storage_path": mask_storage_path(path)})
    mime_type = mimetypes.guess_type(target.name)[0] or "application/octet-stream"
    return {"path": target, "file_name": target.name, "mime_type": mime_type, "file_size": target.stat().st_size}
