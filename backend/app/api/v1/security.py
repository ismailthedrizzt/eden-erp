# ruff: noqa: B008, E501

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.errors import DomainError, domain_error_to_http
from app.core.security import RequestContext, has_permission, require_access_context, require_tenant
from app.domains.security.permissions import get_permission_matrix, list_permission_groups
from app.domains.security.policy_test import run_policy_test
from app.domains.security.roles import (
    create_role,
    delete_role,
    get_role,
    list_roles,
    patch_role,
    set_role_permissions,
)
from app.domains.security.schemas import (
    PolicyTestRequest,
    RoleCreate,
    RolePatch,
    RolePermissionsPatch,
    UserPatch,
    UserRoleMutation,
    UserScopesPatch,
)
from app.domains.security.scopes import get_user_scopes, patch_user_scopes
from app.domains.security.service import (
    get_access_summary,
    list_permission_denials,
    service_context,
)
from app.domains.security.users import (
    assign_user_role,
    get_user,
    get_user_roles,
    list_users,
    patch_user,
    remove_user_role,
)
from app.schemas.common import ApiSuccess

router = APIRouter(dependencies=[Depends(require_access_context)])
RequestContextDep = Annotated[RequestContext, Depends(require_access_context)]
SessionDep = Annotated[AsyncSession, Depends(get_session)]


@router.get("/users", response_model=ApiSuccess[list[dict[str, Any]]])
async def users_endpoint(session: SessionDep, context: RequestContextDep) -> ApiSuccess[list[dict[str, Any]]]:
    ensure_permission(context, "security.view")
    ctx = service_context(session, context, require_tenant(context))
    try:
        users = await list_users(ctx)
        return ApiSuccess(data=[user.model_dump(mode="json") for user in users])
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/users/{user_id}", response_model=ApiSuccess[dict[str, Any]])
async def user_detail_endpoint(user_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "security.view")
    ctx = service_context(session, context, require_tenant(context))
    try:
        return ApiSuccess(data=(await get_user(ctx, user_id)).model_dump(mode="json"))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.patch("/users/{user_id}", response_model=ApiSuccess[dict[str, Any]])
async def user_patch_endpoint(user_id: str, patch: UserPatch, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "security.usersManage")
    ctx = service_context(session, context, require_tenant(context))
    try:
        return ApiSuccess(data=(await patch_user(ctx, user_id, patch)).model_dump(mode="json"), message="Kullanici guncellendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/users/{user_id}/roles", response_model=ApiSuccess[list[dict[str, Any]]])
async def user_roles_endpoint(user_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[list[dict[str, Any]]]:
    ensure_permission(context, "security.view")
    ctx = service_context(session, context, require_tenant(context))
    try:
        roles = await get_user_roles(ctx, user_id)
        return ApiSuccess(data=[role.model_dump(mode="json") for role in roles])
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/users/{user_id}/roles", response_model=ApiSuccess[dict[str, Any]])
async def user_role_assign_endpoint(user_id: str, request: UserRoleMutation, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "security.usersManage")
    ctx = service_context(session, context, require_tenant(context))
    try:
        result = await assign_user_role(ctx, user_id, request)
        return ApiSuccess(data=result.model_dump(mode="json"), message="Rol kullaniciya atandi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.delete("/users/{user_id}/roles/{role_id}", response_model=ApiSuccess[dict[str, Any]])
async def user_role_remove_endpoint(user_id: str, role_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "security.usersManage")
    ctx = service_context(session, context, require_tenant(context))
    try:
        await remove_user_role(ctx, user_id, role_id)
        return ApiSuccess(data={"removed": True}, message="Rol kullanicidan kaldirildi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/roles", response_model=ApiSuccess[list[dict[str, Any]]])
async def roles_endpoint(session: SessionDep, context: RequestContextDep) -> ApiSuccess[list[dict[str, Any]]]:
    ensure_permission(context, "security.view")
    ctx = service_context(session, context, require_tenant(context))
    try:
        roles = await list_roles(ctx)
        return ApiSuccess(data=[role.model_dump(mode="json") for role in roles])
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/roles", response_model=ApiSuccess[dict[str, Any]])
async def role_create_endpoint(request: RoleCreate, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "security.rolesManage")
    ctx = service_context(session, context, require_tenant(context))
    try:
        role = await create_role(ctx, request)
        return ApiSuccess(data=role.model_dump(mode="json"), message="Rol olusturuldu.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/roles/{role_id}", response_model=ApiSuccess[dict[str, Any]])
async def role_detail_endpoint(role_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "security.view")
    ctx = service_context(session, context, require_tenant(context))
    try:
        return ApiSuccess(data=(await get_role(ctx, role_id)).model_dump(mode="json"))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.patch("/roles/{role_id}", response_model=ApiSuccess[dict[str, Any]])
async def role_patch_endpoint(role_id: str, patch: RolePatch, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "security.rolesManage")
    ctx = service_context(session, context, require_tenant(context))
    try:
        role = await patch_role(ctx, role_id, patch)
        return ApiSuccess(data=role.model_dump(mode="json"), message="Rol guncellendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.delete("/roles/{role_id}", response_model=ApiSuccess[dict[str, Any]])
async def role_delete_endpoint(role_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "security.rolesManage")
    ctx = service_context(session, context, require_tenant(context))
    try:
        await delete_role(ctx, role_id)
        return ApiSuccess(data={"deleted": True}, message="Rol arsivlendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/permissions", response_model=ApiSuccess[list[dict[str, Any]]])
async def permissions_endpoint(context: RequestContextDep) -> ApiSuccess[list[dict[str, Any]]]:
    ensure_permission(context, "security.view")
    return ApiSuccess(data=[group.model_dump(mode="json") for group in list_permission_groups()])


@router.get("/permissions/matrix", response_model=ApiSuccess[dict[str, Any]])
async def permissions_matrix_endpoint(session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "security.view")
    ctx = service_context(session, context, require_tenant(context))
    try:
        return ApiSuccess(data=(await get_permission_matrix(ctx)).model_dump(mode="json"))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.patch("/roles/{role_id}/permissions", response_model=ApiSuccess[dict[str, Any]])
async def role_permissions_patch_endpoint(role_id: str, request: RolePermissionsPatch, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "security.rolesManage")
    ctx = service_context(session, context, require_tenant(context))
    try:
        role = await set_role_permissions(ctx, role_id, request)
        return ApiSuccess(data=role.model_dump(mode="json"), message="Rol yetkileri guncellendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/users/{user_id}/scopes", response_model=ApiSuccess[dict[str, Any]])
async def user_scopes_endpoint(user_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "security.view")
    ctx = service_context(session, context, require_tenant(context))
    try:
        return ApiSuccess(data=(await get_user_scopes(ctx, user_id)).model_dump(mode="json"))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.patch("/users/{user_id}/scopes", response_model=ApiSuccess[dict[str, Any]])
async def user_scopes_patch_endpoint(user_id: str, patch: UserScopesPatch, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "security.scopesManage")
    ctx = service_context(session, context, require_tenant(context))
    try:
        result = await patch_user_scopes(ctx, user_id, patch)
        return ApiSuccess(data=result.model_dump(mode="json"), message="Erisim kapsami guncellendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/policy-test", response_model=ApiSuccess[dict[str, Any]])
async def policy_test_endpoint(request: PolicyTestRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "security.policyTest")
    ctx = service_context(session, context, require_tenant(context))
    try:
        return ApiSuccess(data=(await run_policy_test(ctx, request)).model_dump(mode="json"))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/permission-denials", response_model=ApiSuccess[list[dict[str, Any]]])
async def permission_denials_endpoint(session: SessionDep, context: RequestContextDep) -> ApiSuccess[list[dict[str, Any]]]:
    ensure_permission(context, "security.view")
    ctx = service_context(session, context, require_tenant(context))
    try:
        rows = await list_permission_denials(ctx)
        return ApiSuccess(data=[row.model_dump(mode="json") for row in rows])
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/access-summary", response_model=ApiSuccess[dict[str, Any]])
async def access_summary_endpoint(session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "security.view")
    ctx = service_context(session, context, require_tenant(context))
    try:
        return ApiSuccess(data=(await get_access_summary(ctx)).model_dump(mode="json"))
    except DomainError as error:
        raise domain_error_to_http(error) from error


def ensure_permission(context: RequestContext, permission_key: str) -> None:
    if not has_permission(context, permission_key):
        raise DomainError("Bu islem icin yetkiniz bulunmuyor.", "PERMISSION_DENIED", status.HTTP_403_FORBIDDEN)
