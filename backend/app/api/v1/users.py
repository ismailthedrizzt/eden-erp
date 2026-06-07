from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, File, UploadFile, status
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.errors import DomainError, domain_error_to_http
from app.core.security import RequestContext, has_permission, require_access_context
from app.domains.users.profile import (
    delete_current_user_avatar,
    get_current_user_avatar,
    get_current_user_avatar_file,
    get_current_user_profile,
    patch_current_user_profile,
    save_current_user_avatar,
)
from app.schemas.common import ApiSuccess

router = APIRouter(dependencies=[Depends(require_access_context)])
RequestContextDep = Annotated[RequestContext, Depends(require_access_context)]
SessionDep = Annotated[AsyncSession, Depends(get_session)]


class UserProfilePatch(BaseModel):
    displayName: str | None = Field(default=None, max_length=160)
    firstName: str | None = Field(default=None, max_length=80)
    lastName: str | None = Field(default=None, max_length=80)
    email: str | None = Field(default=None, max_length=160)
    phone: str | None = Field(default=None, max_length=40)
    title: str | None = Field(default=None, max_length=120)


@router.get("/me/profile", response_model=ApiSuccess[dict[str, Any]])
async def current_user_profile_endpoint(
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    try:
        return ApiSuccess(data=await get_current_user_profile(session, context))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.patch("/me/profile", response_model=ApiSuccess[dict[str, Any]])
async def current_user_profile_patch_endpoint(
    patch: UserProfilePatch,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    try:
        profile = await patch_current_user_profile(
            session,
            context,
            patch.model_dump(exclude_unset=True),
        )
        return ApiSuccess(data=profile, message="Profil guncellendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/me/avatar", response_model=ApiSuccess[dict[str, Any]])
async def current_user_avatar_endpoint(
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    try:
        return ApiSuccess(data=await get_current_user_avatar(session, context))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/me/avatar", response_model=ApiSuccess[dict[str, Any]])
async def current_user_avatar_upload_endpoint(
    session: SessionDep,
    context: RequestContextDep,
    file: Annotated[UploadFile, File(...)],
) -> ApiSuccess[dict[str, Any]]:
    try:
        content = await file.read()
        profile = await save_current_user_avatar(
            session,
            context,
            file.filename or "avatar",
            file.content_type,
            content,
        )
        return ApiSuccess(data=profile, message="Profil fotografi guncellendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.delete("/me/avatar", response_model=ApiSuccess[dict[str, Any]])
async def current_user_avatar_delete_endpoint(
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    try:
        profile = await delete_current_user_avatar(session, context)
        return ApiSuccess(data=profile, message="Profil fotografi kaldirildi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/me/avatar/content")
async def current_user_avatar_content_endpoint(
    session: SessionDep,
    context: RequestContextDep,
) -> FileResponse:
    try:
        path, content_type = await get_current_user_avatar_file(session, context)
        return FileResponse(path, media_type=content_type, filename="avatar")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/{user_id}/profile", response_model=ApiSuccess[dict[str, Any]])
async def user_profile_endpoint(
    user_id: str,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "security.view")
    try:
        return ApiSuccess(data=await get_current_user_profile(session, context, user_id))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/{user_id}/avatar/content")
async def user_avatar_content_endpoint(
    user_id: str,
    session: SessionDep,
    context: RequestContextDep,
) -> FileResponse:
    ensure_permission(context, "security.view")
    try:
        path, content_type = await get_current_user_avatar_file(session, context, user_id)
        return FileResponse(path, media_type=content_type, filename="avatar")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/{user_id}/avatar", response_model=ApiSuccess[dict[str, Any]])
async def user_avatar_endpoint(
    user_id: str,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "security.view")
    try:
        profile = await get_current_user_profile(session, context, user_id)
        return ApiSuccess(data={
            "user_id": profile["user_id"],
            "tenant_id": profile["tenant_id"],
            "master_person_id": profile["master_person_id"],
            "display_name": profile["display_name"],
            "initials": profile["initials"],
            "avatar": profile["avatar"],
            "avatarUrl": profile["avatarUrl"],
        })
    except DomainError as error:
        raise domain_error_to_http(error) from error


def ensure_permission(context: RequestContext, permission_key: str) -> None:
    if not has_permission(context, permission_key):
        raise DomainError(
            "Bu islem icin yetkiniz bulunmuyor.",
            "PERMISSION_DENIED",
            status.HTTP_403_FORBIDDEN,
        )
