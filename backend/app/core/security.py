from __future__ import annotations

import base64
import hashlib
import hmac
import importlib
import json
import time
from dataclasses import dataclass, field
from typing import Any

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_session_factory
from app.core.errors import DomainError

AUTH_MESSAGE = "Oturumunuz dogrulanamadi. Lutfen tekrar giris yapin."
TENANT_MESSAGE = "Calisma alani bilgisi dogrulanamadi."
PERMISSION_MESSAGE = "Bu islem icin yetkiniz bulunmuyor."
SCOPE_MESSAGE = "Bu kayit erisim kapsaminiz disinda."


@dataclass(frozen=True)
class AuthenticatedUser:
    user_id: str
    email: str | None = None
    role: str | None = None
    claims: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class RequestContext:
    tenant_id: str | None
    user_id: str | None
    company_scope: str | None = None
    permissions: list[str] = field(default_factory=list)
    company_scope_ids: list[str] | None = None
    writable_company_scope_ids: list[str] | None = None
    branch_scope_ids: list[str] | None = None
    is_internal: bool = False
    is_trusted_proxy: bool = False
    auth_claims: dict[str, Any] = field(default_factory=dict)


def _auth_http_exception(
    code: str,
    status_code: int = status.HTTP_401_UNAUTHORIZED,
) -> HTTPException:
    return HTTPException(
        status_code=status_code,
        detail={"error": AUTH_MESSAGE, "code": code, "message": AUTH_MESSAGE, "details": {}},
    )


def _tenant_http_exception(
    code: str,
    status_code: int = status.HTTP_400_BAD_REQUEST,
) -> HTTPException:
    return HTTPException(
        status_code=status_code,
        detail={"error": TENANT_MESSAGE, "code": code, "message": TENANT_MESSAGE, "details": {}},
    )


def _permission_http_exception(
    code: str = "PERMISSION_DENIED",
    status_code: int = status.HTTP_403_FORBIDDEN,
) -> HTTPException:
    return HTTPException(
        status_code=status_code,
        detail={
            "error": PERMISSION_MESSAGE,
            "code": code,
            "message": PERMISSION_MESSAGE,
            "details": {},
        },
    )


def _urlsafe_b64decode(value: str) -> bytes:
    padded = value + "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(padded.encode("ascii"))


def _decode_jwt_unverified(token: str) -> tuple[dict[str, Any], dict[str, Any], bytes]:
    parts = token.split(".")
    if len(parts) != 3:
        raise DomainError(AUTH_MESSAGE, "AUTH_TOKEN_INVALID", status.HTTP_401_UNAUTHORIZED)
    try:
        header = json.loads(_urlsafe_b64decode(parts[0]))
        claims = json.loads(_urlsafe_b64decode(parts[1]))
        signature = _urlsafe_b64decode(parts[2])
    except (ValueError, json.JSONDecodeError) as exc:
        raise DomainError(AUTH_MESSAGE, "AUTH_TOKEN_INVALID", status.HTTP_401_UNAUTHORIZED) from exc
    if not isinstance(header, dict) or not isinstance(claims, dict):
        raise DomainError(AUTH_MESSAGE, "AUTH_TOKEN_INVALID", status.HTTP_401_UNAUTHORIZED)
    return header, claims, signature


def _verify_hs256(token: str, secret: str) -> dict[str, Any]:
    header, claims, signature = _decode_jwt_unverified(token)
    algorithm = str(header.get("alg") or "")
    if algorithm != "HS256":
        raise DomainError(AUTH_MESSAGE, "AUTH_TOKEN_INVALID", status.HTTP_401_UNAUTHORIZED)
    signing_input = ".".join(token.split(".")[:2]).encode("ascii")
    expected = hmac.new(secret.encode("utf-8"), signing_input, hashlib.sha256).digest()
    if not hmac.compare_digest(signature, expected):
        raise DomainError(AUTH_MESSAGE, "AUTH_TOKEN_INVALID", status.HTTP_401_UNAUTHORIZED)
    _validate_jwt_times(claims)
    return claims


def _validate_jwt_times(claims: dict[str, Any]) -> None:
    now = int(time.time())
    exp = claims.get("exp")
    if exp is not None and int(exp) < now:
        raise DomainError(AUTH_MESSAGE, "AUTH_TOKEN_EXPIRED", status.HTTP_401_UNAUTHORIZED)
    nbf = claims.get("nbf")
    if nbf is not None and int(nbf) > now:
        raise DomainError(AUTH_MESSAGE, "AUTH_TOKEN_INVALID", status.HTTP_401_UNAUTHORIZED)


def extract_bearer_token(request: Request) -> str | None:
    authorization = request.headers.get("authorization")
    if not authorization:
        return None
    if authorization.lower().startswith("bearer "):
        token = authorization[7:].strip()
        return token or None
    return None


def verify_legacy_supabase_jwt(token: str) -> dict[str, Any]:
    """Legacy Supabase JWT verifier.

    The canonical remote-server auth path is Next app-session plus trusted proxy
    headers. This verifier is retained only for deployments that explicitly
    configure external JWT compatibility.
    """
    settings = get_settings()
    if not settings.legacy_supabase_jwt_enabled:
        raise DomainError(
            AUTH_MESSAGE,
            "LEGACY_SUPABASE_JWT_DISABLED",
            status.HTTP_401_UNAUTHORIZED,
        )
    if settings.supabase_jwt_secret:
        return _verify_hs256(token, settings.supabase_jwt_secret)

    jwks_url = settings.effective_supabase_jwks_url
    if jwks_url:
        try:
            jwt_module = importlib.import_module("jwt")
            jwk_client = jwt_module.PyJWKClient(jwks_url)
            signing_key = jwk_client.get_signing_key_from_jwt(token)
            claims = jwt_module.decode(
                token,
                signing_key.key,
                algorithms=["RS256", "ES256"],
                options={"verify_aud": False},
            )
        except ModuleNotFoundError as exc:
            raise DomainError(
                AUTH_MESSAGE,
                "AUTH_JWKS_VERIFIER_UNAVAILABLE",
                status.HTTP_401_UNAUTHORIZED,
            ) from exc
        except Exception as exc:
            raise DomainError(
                AUTH_MESSAGE,
                "AUTH_TOKEN_INVALID",
                status.HTTP_401_UNAUTHORIZED,
            ) from exc
        if not isinstance(claims, dict):
            raise DomainError(AUTH_MESSAGE, "AUTH_TOKEN_INVALID", status.HTTP_401_UNAUTHORIZED)
        _validate_jwt_times(claims)
        return claims

    settings = get_settings()
    if settings.effective_auth_required:
        raise DomainError(
            AUTH_MESSAGE,
            "AUTH_VERIFIER_NOT_CONFIGURED",
            status.HTTP_401_UNAUTHORIZED,
        )
    raise DomainError(AUTH_MESSAGE, "AUTH_TOKEN_INVALID", status.HTTP_401_UNAUTHORIZED)


def verify_external_jwt(token: str) -> dict[str, Any]:
    """Verify explicit direct FastAPI bearer tokens.

    Direct browser auth is not canonical for Eden ERP MVP. Until a dedicated
    direct FastAPI JWT/API-token policy is introduced, this wrapper only routes
    to the legacy Supabase verifier when the legacy compatibility flag is set.
    """
    return verify_legacy_supabase_jwt(token)


def verify_supabase_jwt(token: str) -> dict[str, Any]:
    return verify_legacy_supabase_jwt(token)


def get_jwt_claims(request: Request) -> dict[str, Any] | None:
    token = extract_bearer_token(request)
    if not token:
        if _is_trusted_proxy(request):
            return None
        if get_settings().effective_auth_required:
            raise DomainError(AUTH_MESSAGE, "AUTH_TOKEN_MISSING", status.HTTP_401_UNAUTHORIZED)
        return None
    if is_internal_request(request) and _is_trusted_proxy(request):
        return None
    return verify_external_jwt(token)


async def get_current_user(
    request: Request,
    _session: AsyncSession | None = None,
) -> AuthenticatedUser | None:
    claims = get_jwt_claims(request)
    if not claims:
        return None
    user_id = str(claims.get("sub") or "")
    if not user_id:
        raise DomainError(AUTH_MESSAGE, "AUTH_TOKEN_INVALID", status.HTTP_401_UNAUTHORIZED)
    return AuthenticatedUser(
        user_id=user_id,
        email=str(claims.get("email")) if claims.get("email") else None,
        role=str(claims.get("role")) if claims.get("role") else None,
        claims=claims,
    )


async def require_authenticated_user(
    request: Request,
    session: AsyncSession | None = None,
) -> AuthenticatedUser:
    user = await get_current_user(request, session)
    if not user:
        raise DomainError(AUTH_MESSAGE, "AUTH_REQUIRED", status.HTTP_401_UNAUTHORIZED)
    return user


def _bearer_or_raw(value: str | None) -> str | None:
    if not value:
        return None
    if value.lower().startswith("bearer "):
        return value[7:].strip()
    return value.strip()


def is_internal_request(request: Request) -> bool:
    settings = get_settings()
    provided = (
        _bearer_or_raw(request.headers.get("authorization"))
        or request.headers.get("x-internal-token")
        or request.query_params.get("secret")
    )
    expected = settings.internal_backend_token or settings.cron_secret
    return bool(expected and provided and hmac.compare_digest(provided, expected))


def require_internal_token(request: Request) -> None:
    settings = get_settings()
    expected = settings.internal_backend_token or settings.cron_secret
    if not expected:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "Sistem erisimi yapilandirilmamis.",
                "code": "INTERNAL_TOKEN_NOT_CONFIGURED",
                "message": "Sistem erisimi yapilandirilmamis.",
                "details": {},
            },
        )
    if not is_internal_request(request):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error": "Sistem gorevi icin yetki dogrulanamadi.",
                "code": "INTERNAL_TOKEN_INVALID",
                "message": "Sistem gorevi icin yetki dogrulanamadi.",
                "details": {},
            },
        )


def validate_security_configuration() -> None:
    settings = get_settings()
    if settings.is_production and not settings.effective_auth_required:
        raise DomainError(
            "Production ortaminda kimlik dogrulama kapatilamaz.",
            "AUTH_REQUIRED_MISCONFIGURED",
            status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
    if (
        settings.is_production
        and settings.effective_allow_trusted_proxy_headers
        and not settings.trusted_proxy_secret
    ):
        raise DomainError(
            "Production ortaminda proxy header guveni icin proxy secret gereklidir.",
            "TRUSTED_PROXY_MISCONFIGURED",
            status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
    if settings.is_production and settings.legacy_supabase_jwt_enabled:
        raise DomainError(
            "Release ortaminda legacy Supabase JWT dogrulamasi acik olamaz.",
            "LEGACY_SUPABASE_JWT_MISCONFIGURED",
            status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


def _is_trusted_proxy(request: Request) -> bool:
    settings = get_settings()
    secret = settings.trusted_proxy_secret
    if not settings.effective_allow_trusted_proxy_headers:
        return False
    if secret:
        provided = request.headers.get("x-proxy-secret")
        return bool(provided and hmac.compare_digest(provided, secret))
    return settings.is_development


def _split_header(value: str | None) -> list[str]:
    if not value:
        return []
    return [item.strip() for item in value.split(",") if item.strip()]


def _clean_header_value(value: str | None) -> str | None:
    if value is None:
        return None
    return value.strip() or None


async def _build_request_context(
    request: Request,
    session: AsyncSession,
) -> RequestContext:
    from app.policies.access_context import (  # local import avoids a policy/security cycle
        load_branch_scope,
        load_company_scope,
        load_effective_permissions,
        resolve_tenant_id,
    )

    settings = get_settings()
    trusted_proxy = _is_trusted_proxy(request)
    user = await get_current_user(request, session)
    x_tenant_id = _clean_header_value(request.headers.get("x-tenant-id"))
    x_user_id = _clean_header_value(request.headers.get("x-user-id"))
    x_user_email = _clean_header_value(request.headers.get("x-user-email"))
    x_user_phone = _clean_header_value(request.headers.get("x-user-phone"))
    x_user_name = _clean_header_value(request.headers.get("x-user-name"))
    x_company_scope = _clean_header_value(request.headers.get("x-company-scope"))
    x_branch_scope = _clean_header_value(request.headers.get("x-branch-scope"))
    x_user_permissions = _clean_header_value(request.headers.get("x-user-permissions"))

    if not user and settings.effective_auth_required and not is_internal_request(request):
        raise _auth_http_exception("AUTH_REQUIRED")

    user_id = user.user_id if user else (x_user_id if trusted_proxy else None)
    try:
        tenant_id = await resolve_tenant_id(
            request,
            session,
            user_id=user_id,
            requested_tenant_id=x_tenant_id,
            trusted_proxy=trusted_proxy,
        )
    except DomainError as exc:
        raise _tenant_http_exception(exc.code, exc.status_code) from exc

    if not tenant_id:
        raise _tenant_http_exception("TENANT_CONTEXT_MISSING")

    if user_id:
        permissions = await load_effective_permissions(session, tenant_id, user_id)
        company_scope_ids, writable_company_scope_ids = await load_company_scope(
            session, tenant_id, user_id
        )
        branch_scope_ids = await load_branch_scope(session, tenant_id, user_id)
    else:
        permissions = []
        company_scope_ids = []
        writable_company_scope_ids = []
        branch_scope_ids = []

    if trusted_proxy and not permissions:
        permissions = _split_header(x_user_permissions)
    if trusted_proxy and not company_scope_ids:
        company_scope_ids = _split_header(x_company_scope)
        writable_company_scope_ids = list(company_scope_ids)

    trusted_proxy_claims: dict[str, Any] = {}
    if trusted_proxy:
        if x_user_email:
            trusted_proxy_claims["email"] = x_user_email
        if x_user_phone:
            trusted_proxy_claims["phone"] = x_user_phone
            trusted_proxy_claims["phone_number"] = x_user_phone
        if x_user_name:
            trusted_proxy_claims["name"] = x_user_name

    if not permissions and not settings.effective_auth_required and settings.is_development:
        permissions = ["system.admin"]

    return RequestContext(
        tenant_id=tenant_id,
        user_id=user_id,
        company_scope=x_company_scope,
        permissions=permissions,
        company_scope_ids=company_scope_ids or None,
        writable_company_scope_ids=writable_company_scope_ids or None,
        branch_scope_ids=branch_scope_ids or _split_header(x_branch_scope) or None,
        is_internal=is_internal_request(request),
        is_trusted_proxy=trusted_proxy,
        auth_claims=user.claims if user else trusted_proxy_claims,
    )


async def get_request_context(request: Request) -> RequestContext:
    settings = get_settings()
    token = extract_bearer_token(request)
    trusted_proxy = _is_trusted_proxy(request)
    if not token and settings.effective_auth_required and not is_internal_request(request) and not trusted_proxy:
        raise _auth_http_exception("AUTH_REQUIRED")
    if not token and not settings.effective_auth_required and settings.is_development:
        x_tenant_id = _clean_header_value(request.headers.get("x-tenant-id"))
        x_user_id = _clean_header_value(request.headers.get("x-user-id"))
        x_company_scope = _clean_header_value(request.headers.get("x-company-scope"))
        x_branch_scope = _clean_header_value(request.headers.get("x-branch-scope"))
        x_user_permissions = _clean_header_value(request.headers.get("x-user-permissions"))
        tenant_id = x_tenant_id or "00000000-0000-0000-0000-000000000000"
        company_scope_ids = _split_header(x_company_scope)
        return RequestContext(
            tenant_id=tenant_id,
            user_id=x_user_id,
            company_scope=x_company_scope,
            permissions=_split_header(x_user_permissions) or ["system.admin"],
            company_scope_ids=company_scope_ids or None,
            writable_company_scope_ids=company_scope_ids or None,
            branch_scope_ids=_split_header(x_branch_scope) or None,
            is_internal=is_internal_request(request),
            is_trusted_proxy=_is_trusted_proxy(request),
            auth_claims={},
        )

    if token and not is_internal_request(request):
        verify_external_jwt(token)

    async with get_session_factory()() as session:
        return await _build_request_context(request, session)


REQUEST_CONTEXT_DEPENDENCY = Depends(get_request_context)


async def require_access_context(
    context: RequestContext = REQUEST_CONTEXT_DEPENDENCY,
) -> RequestContext:
    if not context.tenant_id:
        raise _tenant_http_exception("TENANT_CONTEXT_MISSING")
    if get_settings().effective_auth_required and not context.user_id and not context.is_internal:
        raise _auth_http_exception("AUTH_REQUIRED")
    return context


def require_tenant(context: RequestContext) -> str:
    if not context.tenant_id:
        raise _tenant_http_exception("TENANT_CONTEXT_MISSING")
    return context.tenant_id


def has_permission(context: RequestContext, permission_key: str) -> bool:
    from app.policies.permissions import resolve_permission_with_fallback

    permissions = set(context.permissions)
    if "*" in permissions or "system.admin" in permissions:
        return True
    return bool(permissions.intersection(resolve_permission_with_fallback(permission_key)))


def require_permission(permission_key: str) -> Any:
    access_context_dependency = Depends(require_access_context)

    async def dependency(
        context: RequestContext = access_context_dependency,
    ) -> RequestContext:
        if not has_permission(context, permission_key):
            raise _permission_http_exception()
        return context

    return dependency


def require_any_permission(permission_keys: list[str]) -> Any:
    access_context_dependency = Depends(require_access_context)

    async def dependency(
        context: RequestContext = access_context_dependency,
    ) -> RequestContext:
        if not any(has_permission(context, permission_key) for permission_key in permission_keys):
            raise _permission_http_exception()
        return context

    return dependency
