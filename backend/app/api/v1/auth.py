from __future__ import annotations

from typing import Annotated, Any, Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import bindparam, text
from sqlalchemy.exc import ProgrammingError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.schemas.common import ApiSuccess

router = APIRouter()
SessionDep = Annotated[AsyncSession, Depends(get_session)]

UNKNOWN_USER_MESSAGE = (
    "Kayitli olmayan kullanici. Kaydolun ya da sistem yoneticinizle temasa gecin."
)


class TenantAccessRequest(BaseModel):
    identifier: str = Field(min_length=3)


def normalize_login_identifier(value: str) -> tuple[str, Literal["email", "phone"]] | None:
    trimmed = value.strip()
    if "@" in trimmed and "." in trimmed.rsplit("@", 1)[-1]:
        return trimmed.lower(), "email"

    digits = "".join(char for char in trimmed if char.isdigit())
    if len(digits) == 12 and digits.startswith("90"):
        digits = digits[2:]
    if len(digits) == 11 and digits.startswith("0"):
        digits = digits[1:]
    if 10 <= len(digits) <= 11:
        return digits, "phone"
    return None


def phone_candidates(phone: str) -> list[str]:
    digits = "".join(char for char in phone if char.isdigit())
    local = (
        digits[2:]
        if len(digits) == 12 and digits.startswith("90")
        else digits[1:]
        if len(digits) == 11 and digits.startswith("0")
        else digits
    )
    candidates = {phone, digits, local}
    if len(local) == 10:
        candidates.update({f"0{local}", f"90{local}", f"+90{local}"})
    return sorted(item for item in candidates if item)


def role_label(role_key: str | None) -> str | None:
    if role_key == "yonetici":
        return "Yonetici"
    if role_key == "admin":
        return "Admin"
    if role_key == "super_admin":
        return "Super Admin"
    return role_key


def no_access(identifier: str, identifier_type: str, message: str = UNKNOWN_USER_MESSAGE) -> dict[str, Any]:
    return {
        "identifier": identifier,
        "identifier_type": identifier_type,
        "user_id": None,
        "display_name": None,
        "tenants": [],
        "status": "no_tenants",
        "message": message,
    }


def is_missing_foundation_error(error: Exception) -> bool:
    message = str(error).lower()
    return "does not exist" in message or "undefinedtable" in message or "undefinedcolumn" in message


@router.post("/tenant-access", response_model=ApiSuccess[dict[str, Any]])
async def tenant_access(
    request: TenantAccessRequest,
    session: SessionDep,
) -> ApiSuccess[dict[str, Any]]:
    normalized = normalize_login_identifier(request.identifier)
    if not normalized:
        raise HTTPException(status_code=400, detail="Gecerli bir e-posta veya telefon numarasi giriniz.")

    identifier, identifier_type = normalized

    try:
        if identifier_type == "email":
            person_result = await session.execute(
                text(
                    """
                    select id, first_name, last_name, full_name, email, phone
                    from public.persons
                    where is_deleted = false and lower(email) = :identifier
                    """
                ),
                {"identifier": identifier},
            )
        else:
            person_result = await session.execute(
                text(
                    """
                    select id, first_name, last_name, full_name, email, phone
                    from public.persons
                    where is_deleted = false and phone in :phones
                    """
                ).bindparams(bindparam("phones", expanding=True)),
                {"phones": phone_candidates(identifier)},
            )
        persons = [dict(row) for row in person_result.mappings().all()]
        if not persons:
            return ApiSuccess(data=no_access(identifier, identifier_type))

        person_ids = [str(person["id"]) for person in persons if person.get("id")]
        membership_result = await session.execute(
            text(
                """
                select tenant_id, user_id, role_key, is_default, status
                from public.tenant_memberships
                where status = 'active' and user_id in :person_ids
                """
            ).bindparams(bindparam("person_ids", expanding=True)),
            {"person_ids": person_ids},
        )
        memberships = [dict(row) for row in membership_result.mappings().all()]
        if not memberships:
            return ApiSuccess(data=no_access(identifier, identifier_type))

        tenant_ids = sorted({str(item["tenant_id"]) for item in memberships if item.get("tenant_id")})
        tenant_result = await session.execute(
            text(
                """
                select id, name, status
                from public.erp_instances
                where status = 'active' and id in :tenant_ids
                """
            ).bindparams(bindparam("tenant_ids", expanding=True)),
            {"tenant_ids": tenant_ids},
        )
        tenants_by_id = {str(row["id"]): dict(row) for row in tenant_result.mappings().all()}

        tenants = []
        for membership in memberships:
            tenant_id = str(membership.get("tenant_id") or "")
            tenant = tenants_by_id.get(tenant_id)
            if not tenant:
                continue
            tenants.append(
                {
                    "tenant_id": tenant_id,
                    "tenant_name": tenant.get("name") or "Eden ERP",
                    "logoUrl": None,
                    "role_key": membership.get("role_key"),
                    "role_label": role_label(membership.get("role_key")),
                    "is_default": bool(membership.get("is_default")),
                }
            )

        if not tenants:
            return ApiSuccess(data=no_access(identifier, identifier_type))

        primary = next((item for item in memberships if item.get("is_default")), memberships[0])
        person = next((item for item in persons if str(item.get("id")) == str(primary.get("user_id"))), persons[0])
        display_name = person.get("full_name") or " ".join(
            item for item in [person.get("first_name"), person.get("last_name")] if item
        )

        return ApiSuccess(
            data={
                "identifier": identifier,
                "identifier_type": identifier_type,
                "user_id": str(person.get("id")) if person.get("id") else None,
                "display_name": display_name or None,
                "tenants": tenants,
                "status": "found",
                "message": "Kullanici tanimli.",
            }
        )
    except ProgrammingError as error:
        if is_missing_foundation_error(error):
            return ApiSuccess(data=no_access(identifier, identifier_type))
        raise


@router.get("/tenant-status", response_model=ApiSuccess[dict[str, Any]])
async def tenant_status(session: SessionDep) -> ApiSuccess[dict[str, Any]]:
    try:
        result = await session.execute(
            text("select count(*) from public.tenant_memberships where status = 'active'")
        )
        tenant_count = int(result.scalar_one() or 0)
    except ProgrammingError as error:
        if not is_missing_foundation_error(error):
            raise
        tenant_count = 0

    return ApiSuccess(
        data={
            "login_enabled": tenant_count > 0,
            "tenant_count": tenant_count,
            "status": "ready" if tenant_count > 0 else "empty",
        }
    )
