from __future__ import annotations

import hashlib
import hmac
import json
import secrets
from datetime import UTC, datetime
from typing import Any

SIGNATURE_VERSION = "v1"


def generate_secret() -> str:
    return f"eden_whsec_{secrets.token_urlsafe(32)}"


def hash_secret(secret: str) -> str:
    return hashlib.sha256(secret.encode("utf-8")).hexdigest()


def secret_preview(secret: str) -> str:
    return f"...{secret[-6:]}"


def canonical_json_bytes(payload: dict[str, Any]) -> bytes:
    return json.dumps(
        payload,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
        default=str,
    ).encode("utf-8")


def sign_raw_payload(raw_body: bytes, secret_hash: str, timestamp: str) -> str:
    signed_payload = timestamp.encode("utf-8") + b"." + raw_body
    digest = hmac.new(secret_hash.encode("utf-8"), signed_payload, hashlib.sha256).hexdigest()
    return f"{SIGNATURE_VERSION}={digest}"


def verify_signature(
    raw_body: bytes,
    secret_hash: str,
    timestamp: str | None,
    signature: str | None,
    *,
    replay_window_seconds: int = 300,
) -> bool:
    if not timestamp or not signature:
        return False
    try:
        event_time = datetime.fromtimestamp(int(timestamp), tz=UTC)
    except ValueError:
        return False
    delta = abs((datetime.now(UTC) - event_time).total_seconds())
    if delta > replay_window_seconds:
        return False
    expected = sign_raw_payload(raw_body, secret_hash, timestamp)
    return hmac.compare_digest(expected, signature)


def build_signature_headers(
    payload: dict[str, Any],
    delivery_id: str,
    secret_hash: str | None = None,
) -> dict[str, str]:
    timestamp = str(int(datetime.now(UTC).timestamp()))
    raw_body = canonical_json_bytes(payload)
    headers = {
        "X-Eden-Event-Id": str(payload.get("event_id") or ""),
        "X-Eden-Event-Type": str(payload.get("event_type") or ""),
        "X-Eden-Delivery-Id": delivery_id,
        "X-Eden-Timestamp": timestamp,
        "X-Eden-Signature-Version": SIGNATURE_VERSION,
        "User-Agent": "EdenERP-Webhooks/1.0",
    }
    if secret_hash:
        headers["X-Eden-Signature"] = sign_raw_payload(raw_body, secret_hash, timestamp)
    return headers
