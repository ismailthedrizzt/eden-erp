from __future__ import annotations

import base64
from typing import Annotated

from fastapi import APIRouter, File, Form, UploadFile, status

from app.core.errors import DomainError, domain_error_to_http
router = APIRouter()

MAX_IMAGE_BYTES = 8 * 1024 * 1024
SUPPORTED_IMAGE_TYPES = {
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "image/gif",
    "image/svg+xml",
}


def _image_type(file: UploadFile) -> str:
    content_type = (file.content_type or "").lower()
    if content_type in SUPPORTED_IMAGE_TYPES:
        return "image/jpeg" if content_type == "image/jpg" else content_type
    name = (file.filename or "").lower()
    if name.endswith(".png"):
        return "image/png"
    if name.endswith((".jpg", ".jpeg")):
        return "image/jpeg"
    if name.endswith(".webp"):
        return "image/webp"
    if name.endswith(".gif"):
        return "image/gif"
    if name.endswith(".svg"):
        return "image/svg+xml"
    return content_type


def _data_url(content: bytes, content_type: str) -> str:
    encoded = base64.b64encode(content).decode("ascii")
    return f"data:{content_type};base64,{encoded}"


@router.post("/image-variants")
async def image_variants(
    file: Annotated[UploadFile, File()],
    maxDimension: Annotated[int, Form()] = 512,
    thumbnailDimension: Annotated[int, Form()] = 96,
    quality: Annotated[float, Form()] = 0.78,
    thumbnailQuality: Annotated[float, Form()] = 0.72,
    transparentBackground: Annotated[str | None, Form()] = None,
) -> dict[str, object]:
    try:
        content_type = _image_type(file)
        if content_type not in SUPPORTED_IMAGE_TYPES:
            raise DomainError(
                "Desteklenmeyen gorsel formati.",
                "UNSUPPORTED_IMAGE_TYPE",
                status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            )
        content = await file.read()
        if not content:
            raise DomainError("Gorsel dosyasi bos.", "EMPTY_IMAGE", status.HTTP_400_BAD_REQUEST)
        if len(content) > MAX_IMAGE_BYTES:
            raise DomainError(
                "Gorsel dosyasi en fazla 8 MB olabilir.",
                "IMAGE_TOO_LARGE",
                status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            )
        preview_url = _data_url(content, content_type)
        return {
            "previewUrl": preview_url,
            "thumbnailUrl": preview_url,
            "previewSize": len(content),
            "maxDimension": maxDimension,
            "thumbnailDimension": thumbnailDimension,
            "quality": quality,
            "thumbnailQuality": thumbnailQuality,
            "transparentBackground": transparentBackground == "true",
        }
    except DomainError as error:
        raise domain_error_to_http(error) from error
