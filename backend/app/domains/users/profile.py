from __future__ import annotations

import json
import uuid
from pathlib import Path
from typing import Any

from sqlalchemy import bindparam, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.errors import DomainError
from app.core.security import RequestContext

MAX_AVATAR_BYTES = 2 * 1024 * 1024
ALLOWED_AVATAR_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}

PROFILE_IMAGE_METADATA_KEYS = (
    "avatar",
    "avatarUrl",
    "avatar_url",
    "photo",
    "photoUrl",
    "photo_url",
    "profilePhoto",
    "profile_photo",
    "profileImage",
    "profile_image",
    "image",
    "imageUrl",
    "image_url",
    "picture",
    "photoLogo",
    "photo_logo",
)

PROFILE_IMAGE_VALUE_KEYS = (
    "url",
    "src",
    "href",
    "path",
    "publicUrl",
    "public_url",
    "signedUrl",
    "signed_url",
    "downloadUrl",
    "download_url",
)

DIRECT_AVATAR_COLUMNS = (
    "profile_photo_url",
    "avatar_url",
    "photo_url",
    "profile_image",
    "image_url",
)

DOCUMENT_AVATAR_COLUMNS = (
    "profile_photo_document_id",
    "avatar_document_id",
    "photo_document_id",
)

FILE_AVATAR_COLUMNS = (
    "profile_photo_file_id",
    "avatar_file_id",
    "photo_file_id",
)


def tenant_role_label(role_key: str | None) -> str | None:
    labels = {
        "yonetici": "Yonetici",
        "admin": "Yonetici",
        "owner": "Sahip",
        "member": "Kullanici",
        "viewer": "Izleyici",
    }
    return labels.get(str(role_key or "").lower(), role_key)


def _clean_text(value: Any) -> str | None:
    if isinstance(value, str) and value.strip():
        return value.strip()
    if value is not None and not isinstance(value, (dict, list, tuple)):
        text_value = str(value).strip()
        return text_value or None
    return None


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


def _identity_claims(context: RequestContext) -> tuple[str | None, str | None]:
    claim_email = _clean_text(context.auth_claims.get("email"))
    claim_phone = (
        _clean_text(context.auth_claims.get("phone"))
        or _clean_text(context.auth_claims.get("phone_number"))
    )
    return claim_email, claim_phone


async def _table_exists(session: AsyncSession, table_name: str) -> bool:
    result = await session.execute(
        text("select to_regclass(:qualified_name) is not null as exists"),
        {"qualified_name": f"public.{table_name}"},
    )
    return bool(result.scalar())


async def _table_columns(session: AsyncSession, table_name: str) -> set[str]:
    result = await session.execute(
        text(
            """
            select column_name
            from information_schema.columns
            where table_schema = 'public' and table_name = :table_name
            """
        ),
        {"table_name": table_name},
    )
    return {str(row["column_name"]) for row in result.mappings().all()}


async def _person_table(session: AsyncSession) -> str | None:
    if await _table_exists(session, "master_persons"):
        return "master_persons"
    if await _table_exists(session, "persons"):
        return "persons"
    return None


def _first_media_value(value: Any) -> str | None:
    direct = _clean_text(value)
    if direct:
        return direct
    if isinstance(value, dict):
        for key in PROFILE_IMAGE_METADATA_KEYS + PROFILE_IMAGE_VALUE_KEYS:
            direct = _first_media_value(value.get(key))
            if direct:
                return direct
    if isinstance(value, list):
        for item in value:
            direct = _first_media_value(item)
            if direct:
                return direct
    return None


def _first_metadata_value(*sources: Any) -> str | None:
    for source in sources:
        if not isinstance(source, dict):
            continue
        for key in PROFILE_IMAGE_METADATA_KEYS:
            value = _first_media_value(source.get(key))
            if value:
                return value
    return None


def _safe_avatar_url(value: Any) -> str | None:
    url = _clean_text(value)
    if not url:
        return None
    lowered = url.lower()
    blocked = ("javascript:", "data:", "file:", "<", ">", "\\", "../", "..\\")
    if any(item in lowered for item in blocked):
        return None
    if lowered.startswith(("http://", "https://", "/api/", "/uploads/")):
        return url
    return None


def _safe_path_part(value: str) -> str:
    return "".join(ch for ch in value if ch.isalnum() or ch in {"-", "_"}) or "unknown"


def _storage_root() -> Path:
    root = Path(get_settings().document_storage_root)
    if not root.is_absolute():
        root = Path.cwd() / root
    return root.resolve()


def _stored_avatar_metadata(value: Any) -> dict[str, Any] | None:
    if not isinstance(value, dict):
        return None
    for key in ("profileAvatar", "profile_avatar", "profilePhoto", "profile_photo"):
        item = value.get(key)
        if isinstance(item, dict) and _clean_text(item.get("storagePath")):
            return item
    return None


def _public_stored_avatar(value: Any) -> dict[str, Any] | None:
    item = _stored_avatar_metadata(value)
    if not item:
        return None
    return {
        "type": "stored_media",
        "contentType": _clean_text(item.get("contentType")) or "image/jpeg",
        "updated_at": _clean_text(item.get("updatedAt")),
    }


def _private_stored_avatar_path(value: Any) -> tuple[Path, str] | None:
    item = _stored_avatar_metadata(value)
    if not item:
        return None
    relative_path = _clean_text(item.get("storagePath"))
    content_type = _clean_text(item.get("contentType")) or "image/jpeg"
    if not relative_path or relative_path.startswith("/") or ".." in Path(relative_path).parts:
        return None
    root = _storage_root()
    candidate = (root / relative_path).resolve()
    if root not in candidate.parents and candidate != root:
        return None
    return candidate, content_type


def _initials(display_name: str | None, email: str | None = None, phone: str | None = None) -> str:
    name = _clean_text(display_name)
    if name:
        parts = [part for part in name.split() if part]
        if len(parts) == 1:
            return parts[0][:2].upper()
        return f"{parts[0][0]}{parts[-1][0]}".upper()
    if email:
        return email[:2].upper()
    if phone:
        digits = _digits(phone)
        return digits[-2:] if len(digits) >= 2 else "?"
    return "?"


def _display_name(row: dict[str, Any] | None) -> str | None:
    if not row:
        return None
    direct = (
        _clean_text(row.get("display_name"))
        or _clean_text(row.get("full_name"))
        or _clean_text(row.get("name"))
    )
    if direct:
        return direct
    parts = [_clean_text(row.get("first_name")), _clean_text(row.get("last_name"))]
    return " ".join(part for part in parts if part) or None


async def _related_person_ids(
    session: AsyncSession,
    user_id: str | None,
    email: str | None = None,
    phone: str | None = None,
) -> list[str]:
    ids = {user_id} if user_id else set()
    table_name = await _person_table(session)
    if not table_name:
        return sorted(item for item in ids if item)

    columns = await _table_columns(session, table_name)
    if "id" not in columns:
        return sorted(item for item in ids if item)

    conditions: list[str] = []
    params: dict[str, Any] = {}
    if user_id:
        conditions.append("id::text = :user_id")
        params["user_id"] = user_id
    clean_email = _clean_text(email)
    if clean_email and "email" in columns:
        conditions.append("lower(coalesce(email, '')) = :email")
        params["email"] = clean_email.lower()
    phones = _phone_candidates(phone)
    if phones and "phone" in columns:
        conditions.append("regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g') in :phones")
        params["phones"] = phones

    if not conditions:
        return sorted(item for item in ids if item)

    deleted_clause = "and coalesce(is_deleted, false) = false" if "is_deleted" in columns else ""
    query = text(
        f"""
        select id::text
        from public.{table_name}
        where ({' or '.join(conditions)})
          {deleted_clause}
        """
    )
    if "phones" in params:
        query = query.bindparams(bindparam("phones", expanding=True))
    result = await session.execute(query, params)
    ids.update(str(row["id"]) for row in result.mappings().all() if row.get("id"))
    return sorted(item for item in ids if item)


async def resolve_user_master_person(
    session: AsyncSession,
    context: RequestContext,
    target_user_id: str | None = None,
) -> dict[str, Any] | None:
    tenant_id = _clean_text(context.tenant_id)
    user_id = _clean_text(target_user_id) or _clean_text(context.user_id)
    if not tenant_id or not user_id or not await _table_exists(session, "tenant_memberships"):
        return None

    claim_email, claim_phone = _identity_claims(context) if target_user_id is None else (None, None)
    person_ids = await _related_person_ids(session, user_id, claim_email, claim_phone)
    columns = await _table_columns(session, "tenant_memberships")

    identity_terms: list[str] = []
    params: dict[str, Any] = {"tenant_id": tenant_id, "user_id": user_id, "person_ids": person_ids}
    if "user_id" in columns:
        identity_terms.append("tm.user_id::text = :user_id")
        if person_ids:
            identity_terms.append("tm.user_id::text in :person_ids")
    if "auth_user_id" in columns:
        identity_terms.append("tm.auth_user_id::text = :user_id")
    if "master_person_id" in columns and person_ids:
        identity_terms.append("tm.master_person_id::text in :person_ids")
    if not identity_terms:
        return None

    select_parts: list[str] = []
    membership_select_columns = (
        "id",
        "user_id",
        "auth_user_id",
        "master_person_id",
        "role_key",
        "role_label",
        "status",
        "is_default",
    )
    for column in membership_select_columns:
        if column in columns:
            select_parts.append(f"tm.{column} as {column}")
    if "master_person_id" not in columns and "user_id" in columns:
        select_parts.append("tm.user_id as master_person_id")
    if "master_person_id" in columns:
        select_parts.append(
            "coalesce(tm.master_person_id::text, tm.user_id::text) "
            "as resolved_master_person_id"
        )
    elif "user_id" in columns:
        select_parts.append("tm.user_id::text as resolved_master_person_id")
    else:
        select_parts.append("null::text as resolved_master_person_id")
    if "id" not in columns:
        select_parts.append("null::text as id")

    status_clause = "and tm.status = 'active'" if "status" in columns else ""
    order_parts = []
    if "is_default" in columns:
        order_parts.append("tm.is_default desc")
    if "created_at" in columns:
        order_parts.append("tm.created_at asc nulls last")
    order_clause = f"order by {', '.join(order_parts)}" if order_parts else ""

    query = text(
        f"""
        select {', '.join(select_parts)}
        from public.tenant_memberships tm
        where tm.tenant_id::text = :tenant_id
          {status_clause}
          and ({' or '.join(identity_terms)})
        {order_clause}
        limit 1
        """
    ).bindparams(bindparam("person_ids", expanding=True))
    result = await session.execute(query, params)
    row = result.mappings().one_or_none()
    return dict(row) if row else None


async def _load_master_person(
    session: AsyncSession,
    tenant_id: str,
    master_person_id: str | None,
) -> tuple[str | None, dict[str, Any] | None]:
    table_name = await _person_table(session)
    if not table_name or not master_person_id:
        return table_name, None
    columns = await _table_columns(session, table_name)
    wanted = [
        "id",
        "tenant_id",
        "first_name",
        "last_name",
        "full_name",
        "display_name",
        "name",
        "title",
        "email",
        "phone",
        "metadata_json",
        *DIRECT_AVATAR_COLUMNS,
        *DOCUMENT_AVATAR_COLUMNS,
        *FILE_AVATAR_COLUMNS,
    ]
    select_parts = [column for column in wanted if column in columns]
    if "id" not in select_parts:
        return table_name, None

    tenant_clause = "and tenant_id::text = :tenant_id" if "tenant_id" in columns else ""
    deleted_clause = "and coalesce(is_deleted, false) = false" if "is_deleted" in columns else ""
    result = await session.execute(
        text(
            f"""
            select {', '.join(select_parts)}
            from public.{table_name}
            where id::text = :master_person_id
              {tenant_clause}
              {deleted_clause}
            limit 1
            """
        ),
        {"tenant_id": tenant_id, "master_person_id": master_person_id},
    )
    row = result.mappings().one_or_none()
    return table_name, dict(row) if row else None


def _avatar_from_person_row(row: dict[str, Any] | None) -> dict[str, Any] | None:
    if not row:
        return None
    stored = _public_stored_avatar(row.get("metadata_json"))
    if stored:
        return stored
    for column in DOCUMENT_AVATAR_COLUMNS:
        document_id = _clean_text(row.get(column))
        if document_id:
            return {
                "type": "media",
                "document_id": document_id,
                "mediaAccessUrl": f"/api/documents/{document_id}/media-access-url",
            }
    for column in FILE_AVATAR_COLUMNS:
        file_id = _clean_text(row.get(column))
        if file_id:
            return {"type": "media", "file_id": file_id}
    for column in DIRECT_AVATAR_COLUMNS:
        url = _safe_avatar_url(row.get(column))
        if url:
            return {"type": "url", "url": url}
    url = _safe_avatar_url(_first_metadata_value(row.get("metadata_json")))
    if url:
        return {"type": "url", "url": url}
    return None


async def _avatar_from_hr_employee(
    session: AsyncSession,
    tenant_id: str,
    master_person_id: str | None,
) -> dict[str, Any] | None:
    if not master_person_id or not await _table_exists(session, "hr_employees"):
        return None
    columns = await _table_columns(session, "hr_employees")
    if "tenant_id" not in columns:
        return None
    wanted = [
        "id",
        "person_id",
        "tenant_id",
        "metadata_json",
        *DIRECT_AVATAR_COLUMNS,
        *DOCUMENT_AVATAR_COLUMNS,
    ]
    select_parts = [column for column in wanted if column in columns]
    if not select_parts:
        return None
    person_condition = []
    if "person_id" in columns:
        person_condition.append("person_id::text = :master_person_id")
    if "id" in columns:
        person_condition.append("id::text = :master_person_id")
    if not person_condition:
        return None
    deleted_clause = "and coalesce(is_deleted, false) = false" if "is_deleted" in columns else ""
    result = await session.execute(
        text(
            f"""
            select {', '.join(select_parts)}
            from public.hr_employees
            where tenant_id::text = :tenant_id
              and ({' or '.join(person_condition)})
              {deleted_clause}
            order by updated_at desc nulls last
            limit 1
            """
        ),
        {"tenant_id": tenant_id, "master_person_id": master_person_id},
    )
    row = result.mappings().one_or_none()
    return _avatar_from_person_row(dict(row)) if row else None


def _attach_avatar_url(profile: dict[str, Any], target_user_id: str | None) -> dict[str, Any]:
    avatar = profile.get("avatar")
    if not isinstance(avatar, dict) or avatar.get("type") != "stored_media":
        return profile
    updated = _clean_text(avatar.get("updated_at")) or "current"
    if target_user_id:
        avatar_url = f"/api/users/{target_user_id}/avatar/content?v={updated}"
    else:
        avatar_url = f"/api/users/me/avatar/content?v={updated}"
    avatar["mediaAccessUrl"] = avatar_url
    profile["avatarUrl"] = avatar_url
    return profile


async def get_master_person_avatar(
    session: AsyncSession,
    tenant_id: str,
    master_person_id: str | None,
    display_name: str | None = None,
    email: str | None = None,
    phone: str | None = None,
) -> dict[str, Any]:
    _, person = await _load_master_person(session, tenant_id, master_person_id)
    avatar = _avatar_from_person_row(person) or await _avatar_from_hr_employee(
        session,
        tenant_id,
        master_person_id,
    )
    if avatar:
        return avatar
    return {
        "type": "initials",
        "initials": _initials(display_name, email, phone),
        "colorToken": "userAvatar.generated",
    }


async def get_current_user_profile(
    session: AsyncSession,
    context: RequestContext,
    target_user_id: str | None = None,
) -> dict[str, Any]:
    tenant_id = _clean_text(context.tenant_id)
    user_id = _clean_text(target_user_id) or _clean_text(context.user_id)
    if not tenant_id:
        raise DomainError("Calisma alani bilgisi dogrulanamadi.", "TENANT_CONTEXT_MISSING", 400)
    if not user_id:
        raise DomainError("Oturumunuz dogrulanamadi.", "AUTH_REQUIRED", 401)

    membership = await resolve_user_master_person(session, context, target_user_id)
    master_person_id = (
        _clean_text(membership.get("resolved_master_person_id"))
        if membership
        else None
    )
    person_table, person = await _load_master_person(session, tenant_id, master_person_id)
    claim_email, claim_phone = _identity_claims(context) if target_user_id is None else (None, None)

    display_name = _display_name(person) or _clean_text(context.auth_claims.get("name"))
    email = (_clean_text(person.get("email")) if person else None) or claim_email
    phone = (_clean_text(person.get("phone")) if person else None) or claim_phone
    role_key = _clean_text(membership.get("role_key")) if membership else None
    role_label = (
        _clean_text(membership.get("role_label")) if membership else None
    ) or tenant_role_label(role_key)
    initials = _initials(display_name, email, phone)
    avatar = await get_master_person_avatar(
        session,
        tenant_id,
        master_person_id,
        display_name,
        email,
        phone,
    )
    if avatar.get("type") == "initials":
        avatar["initials"] = initials

    profile = {
        "user_id": user_id,
        "id": user_id,
        "tenant_id": tenant_id,
        "membership_id": _clean_text(membership.get("id")) if membership else None,
        "master_person_id": master_person_id,
        "masterPersonId": master_person_id,
        "master_person_table": person_table,
        "display_name": display_name,
        "displayName": display_name,
        "initials": initials,
        "email": email,
        "phone": phone,
        "role_key": role_key,
        "roleKey": role_key,
        "role_label": role_label,
        "roleLabel": role_label,
        "avatar": avatar,
        "avatarUrl": avatar.get("url") if avatar.get("type") == "url" else None,
    }
    return _attach_avatar_url(profile, target_user_id)


async def get_current_user_avatar(session: AsyncSession, context: RequestContext) -> dict[str, Any]:
    profile = await get_current_user_profile(session, context)
    return {
        "user_id": profile["user_id"],
        "tenant_id": profile["tenant_id"],
        "master_person_id": profile["master_person_id"],
        "display_name": profile["display_name"],
        "initials": profile["initials"],
        "avatar": profile["avatar"],
        "avatarUrl": profile["avatarUrl"],
    }


async def get_current_user_avatar_file(
    session: AsyncSession,
    context: RequestContext,
    target_user_id: str | None = None,
) -> tuple[Path, str]:
    profile = await get_current_user_profile(session, context, target_user_id)
    tenant_id = _clean_text(profile.get("tenant_id"))
    master_person_id = _clean_text(profile.get("master_person_id"))
    if not tenant_id or not master_person_id:
        raise DomainError(
            "Tenant icinde bagli master person kaydi bulunamadi.",
            "MASTER_PERSON_NOT_LINKED",
            404,
        )
    _, person = await _load_master_person(session, tenant_id, master_person_id)
    stored = _private_stored_avatar_path(person.get("metadata_json") if person else None)
    if not stored:
        raise DomainError("Profil fotografi bulunamadi.", "AVATAR_NOT_FOUND", 404)
    path, content_type = stored
    if not path.exists() or not path.is_file():
        raise DomainError("Profil fotografi bulunamadi.", "AVATAR_FILE_NOT_FOUND", 404)
    return path, content_type


async def save_current_user_avatar(
    session: AsyncSession,
    context: RequestContext,
    filename: str,
    content_type: str | None,
    content: bytes,
) -> dict[str, Any]:
    if not content or len(content) > MAX_AVATAR_BYTES:
        raise DomainError("Profil fotografi en fazla 2 MB olabilir.", "AVATAR_FILE_TOO_LARGE", 422)
    normalized_type = (content_type or "").split(";")[0].strip().lower()
    extension = ALLOWED_AVATAR_TYPES.get(normalized_type)
    if not extension:
        raise DomainError(
            "Sadece jpg, png veya webp profil fotografi kabul edilir.",
            "AVATAR_TYPE_NOT_ALLOWED",
            422,
        )

    profile = await get_current_user_profile(session, context)
    tenant_id = _clean_text(profile.get("tenant_id"))
    master_person_id = _clean_text(profile.get("master_person_id"))
    table_name = _clean_text(profile.get("master_person_table"))
    if not tenant_id or not master_person_id or not table_name:
        raise DomainError(
            "Tenant icinde bagli master person kaydi bulunamadi.",
            "MASTER_PERSON_NOT_LINKED",
            404,
        )

    columns = await _table_columns(session, table_name)
    if "metadata_json" not in columns:
        raise DomainError(
            "Master person profil metadata alani bulunamadi.",
            "PROFILE_METADATA_MISSING",
            422,
        )

    relative_path = Path(
        "profile-avatars",
        _safe_path_part(tenant_id),
        _safe_path_part(master_person_id),
        f"{uuid.uuid4().hex}{extension}",
    )
    target_path = (_storage_root() / relative_path).resolve()
    target_path.parent.mkdir(parents=True, exist_ok=True)
    target_path.write_bytes(content)

    metadata = {
        "profileAvatar": {
            "storagePath": relative_path.as_posix(),
            "contentType": normalized_type,
            "fileName": Path(filename or "avatar").name[:120],
            "updatedAt": uuid.uuid4().hex,
        }
    }
    tenant_clause = "and tenant_id::text = :tenant_id" if "tenant_id" in columns else ""
    await session.execute(
        text(
            f"""
            update public.{table_name}
            set metadata_json = coalesce(metadata_json, '{{}}'::jsonb) || cast(:metadata as jsonb)
            where id::text = :master_person_id
              {tenant_clause}
            """
        ),
        {
            "tenant_id": tenant_id,
            "master_person_id": master_person_id,
            "metadata": json.dumps(metadata),
        },
    )
    await session.commit()
    return await get_current_user_profile(session, context)


async def delete_current_user_avatar(
    session: AsyncSession,
    context: RequestContext,
) -> dict[str, Any]:
    profile = await get_current_user_profile(session, context)
    tenant_id = _clean_text(profile.get("tenant_id"))
    master_person_id = _clean_text(profile.get("master_person_id"))
    table_name = _clean_text(profile.get("master_person_table"))
    if not tenant_id or not master_person_id or not table_name:
        raise DomainError(
            "Tenant icinde bagli master person kaydi bulunamadi.",
            "MASTER_PERSON_NOT_LINKED",
            404,
        )

    columns = await _table_columns(session, table_name)
    if "metadata_json" in columns:
        tenant_clause = "and tenant_id::text = :tenant_id" if "tenant_id" in columns else ""
        await session.execute(
            text(
                f"""
                update public.{table_name}
                set metadata_json = coalesce(metadata_json, '{{}}'::jsonb)
                  - 'profileAvatar'
                  - 'profile_avatar'
                  - 'profilePhoto'
                  - 'profile_photo'
                where id::text = :master_person_id
                  {tenant_clause}
                """
            ),
            {"tenant_id": tenant_id, "master_person_id": master_person_id},
        )
        await session.commit()
    return await get_current_user_profile(session, context)


async def patch_current_user_profile(
    session: AsyncSession,
    context: RequestContext,
    patch: dict[str, Any],
) -> dict[str, Any]:
    profile = await get_current_user_profile(session, context)
    tenant_id = _clean_text(profile.get("tenant_id"))
    master_person_id = _clean_text(profile.get("master_person_id"))
    table_name = _clean_text(profile.get("master_person_table"))
    if not tenant_id or not master_person_id or not table_name:
        raise DomainError(
            "Tenant icinde bagli master person kaydi bulunamadi.",
            "MASTER_PERSON_NOT_LINKED",
            404,
        )

    columns = await _table_columns(session, table_name)
    updates: dict[str, Any] = {}
    field_map = {
        "displayName": ("display_name", "full_name"),
        "firstName": ("first_name",),
        "lastName": ("last_name",),
        "email": ("email",),
        "phone": ("phone",),
        "title": ("title",),
    }
    for input_key, candidate_columns in field_map.items():
        if input_key not in patch:
            continue
        value = _clean_text(patch.get(input_key))
        for column in candidate_columns:
            if column in columns:
                updates[column] = value
                break

    if updates:
        set_parts = [f"{column} = :{column}" for column in updates]
        if "updated_at" in columns:
            set_parts.append("updated_at = now()")
        tenant_clause = "and tenant_id::text = :tenant_id" if "tenant_id" in columns else ""
        params = {"tenant_id": tenant_id, "master_person_id": master_person_id, **updates}
        await session.execute(
            text(
                f"""
                update public.{table_name}
                set {', '.join(set_parts)}
                where id::text = :master_person_id
                  {tenant_clause}
                """
            ),
            params,
        )
        await session.commit()

    return await get_current_user_profile(session, context)
