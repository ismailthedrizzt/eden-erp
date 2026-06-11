from __future__ import annotations

from datetime import datetime

import pytest

from app.contracts.datetime_normalization import normalize_optional_datetime
from app.domains.operations.payload_registry import normalize_operation_payload


def test_optional_datetime_contract_normalizes_frontend_iso_string() -> None:
    value = normalize_optional_datetime("2026-06-11T10:20:30Z", field_name="base_updated_at")

    assert isinstance(value, datetime)
    assert value.isoformat() == "2026-06-11T10:20:30+00:00"


def test_optional_datetime_contract_rejects_invalid_string_before_db() -> None:
    with pytest.raises(ValueError):
        normalize_optional_datetime("not-a-date", field_name="base_updated_at")


def test_operation_payload_registry_normalizes_base_updated_at_to_datetime() -> None:
    payload = normalize_operation_payload(
        "representative.authority_start",
        {
            "company_id": "6abdf3dc-e00c-41c0-bcc2-e6a1324ccb8b",
            "representative_id": "7abdf3dc-e00c-41c0-bcc2-e6a1324ccb8c",
            "transaction_type": "authority_start",
            "effective_date": "2026-06-11",
            "base_updated_at": "2026-06-11T10:20:30Z",
        },
    )

    assert payload["transaction_type"] == "authority_start"
    assert isinstance(payload["base_updated_at"], datetime)


def test_operation_payload_registry_rejects_invalid_base_updated_at() -> None:
    with pytest.raises(ValueError):
        normalize_operation_payload(
            "representative.authority_start",
            {
                "company_id": "6abdf3dc-e00c-41c0-bcc2-e6a1324ccb8b",
                "representative_id": "7abdf3dc-e00c-41c0-bcc2-e6a1324ccb8c",
                "transaction_type": "authority_start",
                "effective_date": "2026-06-11",
                "base_updated_at": "not-a-date",
            },
        )
