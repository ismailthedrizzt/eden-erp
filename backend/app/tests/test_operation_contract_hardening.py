from __future__ import annotations

import inspect
from datetime import datetime

import pytest

from app.domains.operations.payload_registry import normalize_operation_payload
from app.domains.representatives import authority
from app.domains.representatives.schemas import RepresentativeAuthorityTransactionRequest


def test_representative_authority_payload_normalizes_label_and_datetime() -> None:
    payload = normalize_operation_payload(
        'representative.authority_start',
        {
            'transaction_type': 'Temsilcilik Başlatma',
            'effective_date': '2026-06-10',
            'base_updated_at': '2026-06-10T12:00:00+00:00',
            'authority_types': ['sole_authority'],
        },
    )

    assert payload['transaction_type'] == 'authority_start'
    assert isinstance(payload['base_updated_at'], datetime)


def test_representative_authority_request_accepts_turkish_label_as_input() -> None:
    request = RepresentativeAuthorityTransactionRequest.model_validate(
        {
            'transaction_type': 'Temsilcilik Başlatma',
            'effective_date': '2026-06-10',
            'authority_types': ['sole_authority'],
            'base_updated_at': '2026-06-10T12:00:00+00:00',
        }
    )

    assert request.transaction_type == 'authority_start'
    assert isinstance(request.base_updated_at, datetime)


def test_operation_payload_registry_rejects_unregistered_operation_type() -> None:
    with pytest.raises(ValueError):
        normalize_operation_payload('unregistered.operation', {})


def test_representative_authority_transaction_number_uses_counter_not_count() -> None:
    source = inspect.getsource(authority._next_transaction_no).lower()

    assert 'count(*)' not in source
    assert 'tenant_sequence_counters' in source
    assert 'pg_advisory_xact_lock' in source
