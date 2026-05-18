from typing import Annotated

from fastapi import Depends, Header, HTTPException
from jose import JWTError, jwt
from psycopg import Connection

from app.core.config import settings
from app.core.db import get_db
from app.schemas.auth import CurrentUser


def _bearer_token(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail={"code": "AUTH_REQUIRED", "message": "Bearer token required"})
    return authorization.split(" ", 1)[1].strip()


def _decode_supabase_jwt(token: str) -> dict:
    if settings.supabase_jwt_secret:
        try:
            return jwt.decode(token, settings.supabase_jwt_secret, algorithms=["HS256"], options={"verify_aud": False})
        except JWTError as exc:
            raise HTTPException(status_code=401, detail={"code": "INVALID_TOKEN", "message": "Invalid token"}) from exc

    # Development fallback: parse claims without signature verification until the
    # Supabase JWT secret is provided. Production must set SUPABASE_JWT_SECRET.
    return jwt.get_unverified_claims(token)


def _first_non_empty(*values: str | None) -> str | None:
    for value in values:
        if value and value.strip():
            return value.strip()
    return None


def _tenant_from_claims(claims: dict) -> str | None:
    metadata = claims.get("app_metadata") or {}
    return _first_non_empty(
        metadata.get("tenant_id"),
        metadata.get("workspace_id"),
        metadata.get("instance_id"),
    )


def _apply_tenant_session(db: Connection, user: CurrentUser) -> None:
    db.execute(
        """
        select
          set_config('app.tenant_id', %s, true),
          set_config('app.instance_id', %s, true)
        """,
        (user.tenant_id, user.instance_id),
    )


def get_current_user(
    authorization: Annotated[str | None, Header()] = None,
    x_eden_tenant_id: Annotated[str | None, Header(alias="x-eden-tenant-id")] = None,
    x_eden_workspace_id: Annotated[str | None, Header(alias="x-eden-workspace-id")] = None,
    db: Connection = Depends(get_db),
) -> CurrentUser:
    token = _bearer_token(authorization)
    claims = _decode_supabase_jwt(token)
    user_id = claims.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail={"code": "INVALID_TOKEN", "message": "Missing subject"})

    tenant_id = _first_non_empty(
        x_eden_tenant_id,
        x_eden_workspace_id,
        _tenant_from_claims(claims),
        settings.default_tenant_id,
        settings.default_instance_id,
    ) or settings.default_tenant_id

    user = CurrentUser(
        id=user_id,
        email=claims.get("email"),
        instance_id=tenant_id,
        tenant_id=tenant_id,
        workspace_id=tenant_id,
    )
    _apply_tenant_session(db, user)

    rows = db.execute(
        """
        select distinct p.permission_key
        from user_roles ur
        join role_permissions rp on rp.role_id = ur.role_id
        join permissions p on p.id = rp.permission_id
        where ur.user_id = %s and coalesce(ur.instance_id, %s) = %s
        """,
        (user.id, user.instance_id, user.instance_id),
    ).fetchall()
    user.permissions = {row["permission_key"] for row in rows}
    return user
