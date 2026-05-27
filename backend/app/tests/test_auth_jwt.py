from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time
from collections.abc import Generator

import pytest
from fastapi import status

from app.core.config import get_settings
from app.core.errors import DomainError
from app.core.security import validate_security_configuration, verify_supabase_jwt


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")


def make_hs256_token(secret: str, claims: dict[str, object]) -> str:
    header = _b64(json.dumps({"alg": "HS256", "typ": "JWT"}).encode("utf-8"))
    payload = _b64(json.dumps(claims).encode("utf-8"))
    signing_input = f"{header}.{payload}".encode("ascii")
    signature = hmac.new(secret.encode("utf-8"), signing_input, hashlib.sha256).digest()
    return f"{header}.{payload}.{_b64(signature)}"


@pytest.fixture(autouse=True)
def clear_settings_cache() -> Generator[None]:
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def test_valid_hs256_supabase_jwt_returns_claims(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SUPABASE_JWT_SECRET", "secret")
    token = make_hs256_token(
        "secret",
        {"sub": "user-1", "email": "user@example.com", "exp": int(time.time()) + 300},
    )

    claims = verify_supabase_jwt(token)

    assert claims["sub"] == "user-1"
    assert claims["email"] == "user@example.com"


def test_invalid_hs256_supabase_jwt_rejects(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SUPABASE_JWT_SECRET", "secret")
    token = make_hs256_token(
        "other-secret",
        {"sub": "user-1", "exp": int(time.time()) + 300},
    )

    with pytest.raises(DomainError) as exc:
        verify_supabase_jwt(token)

    assert exc.value.status_code == status.HTTP_401_UNAUTHORIZED
    assert exc.value.code == "AUTH_TOKEN_INVALID"


def test_expired_supabase_jwt_rejects(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SUPABASE_JWT_SECRET", "secret")
    token = make_hs256_token("secret", {"sub": "user-1", "exp": int(time.time()) - 1})

    with pytest.raises(DomainError) as exc:
        verify_supabase_jwt(token)

    assert exc.value.code == "AUTH_TOKEN_EXPIRED"


def test_production_cannot_disable_auth(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("AUTH_REQUIRED", "false")

    with pytest.raises(DomainError) as exc:
        validate_security_configuration()

    assert exc.value.code == "AUTH_REQUIRED_MISCONFIGURED"
