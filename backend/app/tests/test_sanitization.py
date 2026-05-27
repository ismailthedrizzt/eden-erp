from __future__ import annotations

from app.core.sanitization import sanitize_headers, sanitize_payload


def test_sanitize_payload_masks_tokens() -> None:
    payload = sanitize_payload({"access_token": "abc123", "nested": {"secret": "value"}})

    assert payload["access_token"] == "***"
    assert payload["nested"]["secret"] == "***"


def test_sanitize_payload_masks_email_phone_and_tax_number() -> None:
    payload = sanitize_payload(
        {
            "email": "user@example.com",
            "phone": "+905551112233",
            "tax_number": "1234567890",
        }
    )

    assert payload["email"] == "u***@example.com"
    assert payload["phone"] == "***2233"
    assert payload["tax_number"] == "***7890"


def test_sanitize_headers_masks_authorization_and_cookie() -> None:
    headers = sanitize_headers({"authorization": "Bearer token", "cookie": "session=abc"})

    assert headers["authorization"] == "***"
    assert headers["cookie"] == "***"
