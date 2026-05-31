from __future__ import annotations

import json
from datetime import UTC, datetime

import pytest

from app.core.errors import DomainError
from app.domains.integrations.event_subscriptions import (
    EVENT_DEFINITIONS,
    get_event_type,
    list_event_types,
    validate_event_types,
)
from app.domains.integrations.schemas import (
    CredentialCreateRequest,
    WebhookSubscriptionCreateRequest,
)
from app.domains.integrations.service import default_retry_policy, sanitize_headers
from app.domains.integrations.signatures import (
    canonical_json_bytes,
    generate_secret,
    hash_secret,
    sign_raw_payload,
    verify_signature,
)
from app.domains.integrations.webhooks import validate_target_url
from app.policies.permissions import PERMISSIONS
from app.setup.readiness_registry import get_readiness_definition


def test_integration_event_registry_is_constrained() -> None:
    assert "company.opened" in EVENT_DEFINITIONS
    assert "after_sales.service_request_created" in EVENT_DEFINITIONS
    assert get_event_type("crm.opportunity_won")["module_key"] == "crm"
    assert any(item["event_type"] == "document.uploaded" for item in list_event_types())
    validate_event_types(["company.opened", "integration.test"])
    with pytest.raises(DomainError):
        validate_event_types(["unsafe.sql.executed"])


def test_webhook_signature_uses_canonical_payload_and_replay_window() -> None:
    secret = generate_secret()
    secret_hash = hash_secret(secret)
    payload = {"event_type": "company.opened", "event_id": "evt_1", "data": {"b": 2, "a": 1}}
    raw = canonical_json_bytes(payload)
    timestamp = str(int(datetime.now(UTC).timestamp()))
    signature = sign_raw_payload(raw, secret_hash, timestamp)
    assert verify_signature(raw, secret_hash, timestamp, signature)
    assert not verify_signature(raw, secret_hash, "1", signature)
    assert json.loads(raw.decode("utf-8"))["data"]["a"] == 1


def test_webhook_validation_blocks_secret_headers_and_unsafe_targets() -> None:
    assert sanitize_headers({"X-Trace": "abc"}) == {"X-Trace": "abc"}
    with pytest.raises(DomainError):
        sanitize_headers({"Authorization": "Bearer secret"})

    validate_target_url("https://example.com/webhook")
    with pytest.raises(DomainError):
        validate_target_url("ftp://example.com/webhook")


def test_integration_schemas_and_retry_defaults() -> None:
    credential = CredentialCreateRequest(name="Primary signing secret")
    assert credential.credential_type == "webhook_secret"

    subscription = WebhookSubscriptionCreateRequest(
        integration_app_id="00000000-0000-0000-0000-000000000000",
        subscription_name="Company events",
        target_url="https://example.com/webhook",
        event_types=["company.opened"],
    )
    assert subscription.event_types == ["company.opened"]

    policy = default_retry_policy({"max_retries": 99, "timeout_seconds": 999})
    assert policy["max_retries"] == 20
    assert policy["timeout_seconds"] == 60


def test_integration_permissions_and_readiness_registered() -> None:
    for permission in [
        "integrations.view",
        "integrations.manageApps",
        "integrations.manageCredentials",
        "integrations.manageWebhooks",
        "integrations.viewDeliveries",
        "integrations.retryDelivery",
        "integrations.viewInbound",
        "integrations.processInbound",
        "integrations.admin",
    ]:
        assert permission in PERMISSIONS

    definition = get_readiness_definition("integrations")
    assert definition is not None
    assert "integration_apps" in definition.required_tables
    assert "integration_webhook_deliveries" in definition.required_tables
