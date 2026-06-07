# ruff: noqa: B008, E501

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel
from sqlalchemy import bindparam, text
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




class TenantWorkspaceMutation(BaseModel):
    tenant_id: str


def tenant_role_label(role_key: str | None) -> str | None:
    labels = {
        "yonetici": "Yonetici",
        "admin": "Yonetici",
        "owner": "Sahip",
        "member": "Kullanici",
        "viewer": "Izleyici",
    }
    return labels.get(str(role_key or "").lower(), role_key)


def _digits(value: str | None) -> str:
    return "".join(ch for ch in str(value or "") if ch.isdigit())


def _phone_candidates(value: str | None) -> list[str]:
    digits = _digits(value)
    if not digits:
        return []
    candidates = {digits}
    if digits.startswith("90") and len(digits) == 12:
        candidates.add(digits[2:])
    if digits.startswith("0") and len(digits) == 11:
        candidates.add(digits[1:])
    if len(digits) == 10:
        candidates.add(f"90{digits}")
        candidates.add(f"0{digits}")
    return sorted(candidates)



PROFILE_IMAGE_METADATA_KEYS = (
    "avatarUrl",
    "avatar_url",
    "photoUrl",
    "photo_url",
    "profileImage",
    "profile_image",
    "imageUrl",
    "image_url",
    "picture",
)


def _clean_text(value: Any) -> str | None:
    if isinstance(value, str) and value.strip():
        return value.strip()
    return None


def _person_display_name(person: dict[str, Any] | None) -> str | None:
    if not person:
        return None
    full_name = _clean_text(person.get("full_name"))
    if full_name:
        return full_name
    parts = [_clean_text(person.get("first_name")), _clean_text(person.get("last_name"))]
    return " ".join(part for part in parts if part) or None


def _first_metadata_value(*sources: Any, keys: tuple[str, ...] = PROFILE_IMAGE_METADATA_KEYS) -> str | None:
    for source in sources:
        if not isinstance(source, dict):
            continue
        for key in keys:
            value = _clean_text(source.get(key))
            if value:
                return value
    return None


async def _table_exists(session: AsyncSession, qualified_name: str) -> bool:
    result = await session.execute(
        text("select to_regclass(:qualified_name) is not null as exists"),
        {"qualified_name": qualified_name},
    )
    return bool(result.scalar())


async def _current_user_person(session: AsyncSession, user_id: str | None) -> dict[str, Any] | None:
    if not user_id or not await _table_exists(session, "public.persons"):
        return None
    result = await session.execute(
        text(
            """
            select id, first_name, last_name, full_name, email, phone, metadata_json
            from public.persons
            where id::text = :user_id and coalesce(is_deleted, false) = false
            limit 1
            """
        ),
        {"user_id": user_id},
    )
    row = result.mappings().one_or_none()
    return dict(row) if row else None


async def _current_user_person_by_identity(
    session: AsyncSession,
    user_id: str | None,
    email: str | None = None,
    phone: str | None = None,
) -> dict[str, Any] | None:
    person = await _current_user_person(session, user_id)
    if person or not await _table_exists(session, "public.persons"):
        return person

    clean_email = _clean_text(email)
    if clean_email:
        result = await session.execute(
            text(
                """
                select id, first_name, last_name, full_name, email, phone, metadata_json
                from public.persons
                where coalesce(is_deleted, false) = false
                  and lower(coalesce(email, '')) = :email
                order by updated_at desc nulls last
                limit 1
                """
            ),
            {"email": clean_email.lower()},
        )
        row = result.mappings().one_or_none()
        if row:
            return dict(row)

    phones = _phone_candidates(phone)
    if phones:
        result = await session.execute(
            text(
                """
                select id, first_name, last_name, full_name, email, phone, metadata_json
                from public.persons
                where coalesce(is_deleted, false) = false
                  and regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g') in :phones
                order by updated_at desc nulls last
                limit 1
                """
            ).bindparams(bindparam("phones", expanding=True)),
            {"phones": phones},
        )
        row = result.mappings().one_or_none()
        if row:
            return dict(row)

    return None


async def _current_user_security_profile(
    session: AsyncSession,
    tenant_id: str,
    user_id: str | None,
) -> dict[str, Any] | None:
    if not user_id or not await _table_exists(session, "public.security_users_profile"):
        return None
    result = await session.execute(
        text(
            """
            select id, auth_user_id, display_name, email, metadata_json
            from public.security_users_profile
            where tenant_id::text = :tenant_id
              and coalesce(is_deleted, false) = false
              and (auth_user_id::text = :user_id or id::text = :user_id)
            order by updated_at desc nulls last
            limit 1
            """
        ),
        {"tenant_id": tenant_id, "user_id": user_id},
    )
    row = result.mappings().one_or_none()
    return dict(row) if row else None


async def _current_user_membership(
    session: AsyncSession,
    tenant_id: str,
    user_id: str | None,
    email: str | None = None,
    phone: str | None = None,
) -> dict[str, Any] | None:
    person_ids = await _related_person_ids(session, user_id, email, phone)
    if not person_ids or not await _table_exists(session, "public.tenant_memberships"):
        return None
    result = await session.execute(
        text(
            """
            select user_id, role_key, is_default, status
            from public.tenant_memberships
            where tenant_id::text = :tenant_id
              and status = 'active'
              and user_id::text in :person_ids
            order by is_default desc, created_at asc nulls last
            limit 1
            """
        ).bindparams(bindparam("person_ids", expanding=True)),
        {"tenant_id": tenant_id, "person_ids": person_ids},
    )
    row = result.mappings().one_or_none()
    return dict(row) if row else None


async def _avatar_from_hr_employee(
    session: AsyncSession,
    tenant_id: str,
    person_ids: list[str],
) -> str | None:
    if not person_ids or not await _table_exists(session, "public.hr_employees"):
        return None
    result = await session.execute(
        text(
            """
            select photo_url
            from public.hr_employees
            where tenant_id::text = :tenant_id
              and coalesce(is_deleted, false) = false
              and nullif(trim(coalesce(photo_url, '')), '') is not null
              and (person_id::text in :person_ids or id::text in :person_ids)
            order by updated_at desc nulls last
            limit 1
            """
        ).bindparams(bindparam("person_ids", expanding=True)),
        {"tenant_id": tenant_id, "person_ids": person_ids},
    )
    row = result.mappings().one_or_none()
    return _clean_text(row.get("photo_url")) if row else None


async def _avatar_from_legacy_employee(session: AsyncSession, person_ids: list[str]) -> str | None:
    if not person_ids or not await _table_exists(session, "public.employees"):
        return None
    result = await session.execute(
        text(
            """
            select photo_url
            from public.employees
            where coalesce(is_deleted, false) = false
              and nullif(trim(coalesce(photo_url, '')), '') is not null
              and (person_id::text in :person_ids or id::text in :person_ids)
            order by updated_at desc nulls last
            limit 1
            """
        ).bindparams(bindparam("person_ids", expanding=True)),
        {"person_ids": person_ids},
    )
    row = result.mappings().one_or_none()
    return _clean_text(row.get("photo_url")) if row else None


async def _related_person_ids(
    session: AsyncSession,
    user_id: str | None,
    email: str | None = None,
    phone: str | None = None,
) -> list[str]:
    if not user_id and not email and not phone:
        return []
    person = await _current_user_person_by_identity(session, user_id, email, phone)
    if not person:
        return [user_id] if user_id else []

    ids = {str(person["id"])}
    phone_candidates = sorted(set(_phone_candidates(person.get("phone")) + _phone_candidates(phone)))
    email_value = str(person.get("email") or email or "").strip().lower()

    if phone_candidates:
        related = await session.execute(
            text(
                """
                select id
                from public.persons
                where is_deleted = false
                  and regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g') in :phones
                """
            ).bindparams(bindparam("phones", expanding=True)),
            {"phones": phone_candidates},
        )
        ids.update(str(row["id"]) for row in related.mappings().all() if row.get("id"))

    if email_value:
        related = await session.execute(
            text(
                """
                select id
                from public.persons
                where is_deleted = false and lower(coalesce(email, '')) = :email
                """
            ),
            {"email": email_value},
        )
        ids.update(str(row["id"]) for row in related.mappings().all() if row.get("id"))

    return sorted(ids)


def _metadata_value(*sources: Any, key: str) -> str | None:
    for source in sources:
        if isinstance(source, dict):
            value = source.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()
    return None


def _workspace_payload(row: dict[str, Any], current_tenant_id: str | None) -> dict[str, Any]:
    workspace_meta = row.get("workspace_metadata") if isinstance(row.get("workspace_metadata"), dict) else {}
    instance_meta = row.get("instance_metadata") if isinstance(row.get("instance_metadata"), dict) else {}
    tenant_id = str(row.get("id") or row.get("tenant_id") or "")
    return {
        "id": tenant_id,
        "name": row.get("name") or "Calisma Alani",
        "user_id": str(row.get("user_id")) if row.get("user_id") else None,
        "role_key": row.get("role_key"),
        "role_label": tenant_role_label(row.get("role_key")),
        "is_default": bool(row.get("is_default")),
        "is_current": bool(current_tenant_id and tenant_id == current_tenant_id),
        "logoUrl": _metadata_value(workspace_meta, instance_meta, key="logoUrl"),
        "lightLogoUrl": _metadata_value(workspace_meta, instance_meta, key="lightLogoUrl"),
        "darkLogoUrl": _metadata_value(workspace_meta, instance_meta, key="darkLogoUrl"),
    }


async def _list_workspace_options(
    session: AsyncSession,
    context: RequestContext,
    current_tenant_id: str | None,
) -> list[dict[str, Any]]:
    person_ids = await _related_person_ids(session, context.user_id)
    if not person_ids:
        return []
    result = await session.execute(
        text(
            """
            select
              ei.id,
              coalesce(ws.workspace_name, ei.name) as name,
              tm.role_key,
              tm.is_default,
              ws.metadata_json as workspace_metadata,
              ei.metadata_json as instance_metadata,
              tm.user_id,
              tm.created_at
            from public.tenant_memberships tm
            join public.erp_instances ei on ei.id = tm.tenant_id and ei.status = 'active'
            left join public.workspace_settings ws on ws.tenant_id = ei.id
            where tm.status = 'active'
              and tm.user_id in :person_ids
            order by tm.is_default desc, tm.created_at asc
            """
        ).bindparams(bindparam("person_ids", expanding=True)),
        {"person_ids": person_ids},
    )
    by_tenant: dict[str, dict[str, Any]] = {}
    for row in result.mappings().all():
        item = _workspace_payload(dict(row), current_tenant_id)
        tenant_id = item["id"]
        if not tenant_id or tenant_id in by_tenant:
            continue
        by_tenant[tenant_id] = item
    return list(by_tenant.values())


async def _require_workspace_option(
    session: AsyncSession,
    context: RequestContext,
    target_tenant_id: str,
) -> dict[str, Any]:
    options = await _list_workspace_options(session, context, context.tenant_id)
    for option in options:
        if option["id"] == target_tenant_id:
            return option
    raise DomainError("Bu calisma alanina erisiminiz bulunmuyor.", "TENANT_ACCESS_DENIED", status.HTTP_403_FORBIDDEN)


@router.get("/tenants/options", response_model=ApiSuccess[list[dict[str, Any]]])
async def tenant_options_endpoint(session: SessionDep, context: RequestContextDep) -> ApiSuccess[list[dict[str, Any]]]:
    tenant_id = require_tenant(context)
    try:
        return ApiSuccess(data=await _list_workspace_options(session, context, tenant_id))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/tenants/current", response_model=ApiSuccess[dict[str, Any]])
async def tenant_current_endpoint(session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    tenant_id = require_tenant(context)
    options = await _list_workspace_options(session, context, tenant_id)
    current = next((item for item in options if item["id"] == tenant_id), None)
    if current:
        return ApiSuccess(data={"workspace": current})
    raise DomainError("Calisma alani bilgisi dogrulanamadi.", "TENANT_CONTEXT_MISSING", status.HTTP_400_BAD_REQUEST)



@router.get("/me", response_model=ApiSuccess[dict[str, Any]])
async def current_user_endpoint(session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    tenant_id = require_tenant(context)
    user_id = context.user_id
    claim_email = _clean_text(context.auth_claims.get("email"))
    claim_phone = (
        _clean_text(context.auth_claims.get("phone"))
        or _clean_text(context.auth_claims.get("phone_number"))
    )

    if not user_id:
        return ApiSuccess(data={
            "id": None,
            "displayName": None,
            "roleKey": None,
            "roleLabel": None,
            "avatarUrl": None,
            "email": None,
            "phone": None,
        })

    person = await _current_user_person_by_identity(session, user_id, claim_email, claim_phone)
    security_profile = await _current_user_security_profile(session, tenant_id, user_id)
    if not security_profile and person and str(person.get("id")) != str(user_id):
        security_profile = await _current_user_security_profile(session, tenant_id, str(person.get("id")))
    membership = await _current_user_membership(session, tenant_id, user_id, claim_email, claim_phone)
    person_ids = await _related_person_ids(session, user_id, claim_email, claim_phone)
    profile_meta = security_profile.get("metadata_json") if security_profile else None
    person_meta = person.get("metadata_json") if person else None

    avatar_url = (
        _first_metadata_value(profile_meta, person_meta)
        or await _avatar_from_hr_employee(session, tenant_id, person_ids)
        or await _avatar_from_legacy_employee(session, person_ids)
    )
    display_name = (
        _clean_text(security_profile.get("display_name")) if security_profile else None
    ) or _person_display_name(person) or _clean_text(context.auth_claims.get("name"))
    email = (
        _clean_text(security_profile.get("email")) if security_profile else None
    ) or (_clean_text(person.get("email")) if person else None) or claim_email
    phone = (
        _clean_text(person.get("phone")) if person else None
    ) or claim_phone
    role_key = membership.get("role_key") if membership else None

    return ApiSuccess(data={
        "id": user_id,
        "displayName": display_name,
        "roleKey": role_key,
        "roleLabel": tenant_role_label(role_key),
        "avatarUrl": avatar_url,
        "email": email,
        "phone": phone,
    })


@router.post("/tenants/switch", response_model=ApiSuccess[dict[str, Any]])
async def tenant_switch_endpoint(request: TenantWorkspaceMutation, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    try:
        workspace = await _require_workspace_option(session, context, request.tenant_id)
        workspace["is_current"] = True
        return ApiSuccess(data={"workspace": workspace}, message="Calisma alani degistirildi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/tenants/default", response_model=ApiSuccess[dict[str, Any]])
async def tenant_default_endpoint(request: TenantWorkspaceMutation, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    try:
        workspace = await _require_workspace_option(session, context, request.tenant_id)
        person_ids = await _related_person_ids(session, context.user_id)
        await session.execute(
            text("update public.tenant_memberships set is_default = false where user_id in :person_ids").bindparams(bindparam("person_ids", expanding=True)),
            {"person_ids": person_ids},
        )
        await session.execute(
            text("update public.tenant_memberships set is_default = true where user_id in :person_ids and tenant_id = :tenant_id").bindparams(bindparam("person_ids", expanding=True)),
            {"person_ids": person_ids, "tenant_id": request.tenant_id},
        )
        await session.commit()
        workspace["is_default"] = True
        return ApiSuccess(data={"workspace": workspace}, message="Varsayilan calisma alani guncellendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


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
