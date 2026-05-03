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


def get_current_user(
    authorization: Annotated[str | None, Header()] = None,
    db: Connection = Depends(get_db),
) -> CurrentUser:
    token = _bearer_token(authorization)
    claims = _decode_supabase_jwt(token)
    user_id = claims.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail={"code": "INVALID_TOKEN", "message": "Missing subject"})

    user = CurrentUser(
        id=user_id,
        email=claims.get("email"),
        instance_id=claims.get("app_metadata", {}).get("instance_id") or settings.default_instance_id,
    )

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
