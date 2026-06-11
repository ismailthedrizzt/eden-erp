from __future__ import annotations

from typing import Any

import pytest
from pydantic import ValidationError

from app.core.errors import DomainError
from app.domains.audit.service import AUDIT_REQUIRED_COLUMNS, _assert_audit_schema_compatible
from app.domains.operations.service import _coerce_base_updated_at
from app.domains.outbox.service import OUTBOX_REQUIRED_COLUMNS, _assert_outbox_schema_compatible
from app.domains.representatives import service as representative_service
from app.domains.representatives.schemas import RepresentativeAuthorityTransactionRequest


class _ColumnResult:
    def __init__(self, columns: set[str]) -> None:
        self.columns = columns

    def scalars(self) -> _ColumnResult:
        return self

    def all(self) -> list[str]:
        return sorted(self.columns)


class _ColumnSession:
    def __init__(self, columns: set[str]) -> None:
        self.columns = columns

    async def execute(self, *_args: Any, **_kwargs: Any) -> _ColumnResult:
        return _ColumnResult(self.columns)


def valid_authority_payload() -> dict[str, Any]:
    return {
        "transaction_type": "authority_start",
        "authority_action": True,
        "authority_types": ["signature_authority"],
        "signature_type": "single",
        "effective_date": "2026-05-27",
        "document_files": [{"name": "yetki.pdf"}],
        "scope_type": "company_wide",
    }


def test_start_authority_request_accepts_valid_payload() -> None:
    request = RepresentativeAuthorityTransactionRequest(**valid_authority_payload())

    assert request.transaction_type == "authority_start"
    assert request.scope_type == "company_wide"


def test_transaction_request_rejects_invalid_scope_shape() -> None:
    payload = valid_authority_payload()
    payload["branch_id"] = "branch-1"

    with pytest.raises(ValidationError):
        RepresentativeAuthorityTransactionRequest(**payload)


def test_operation_base_updated_at_accepts_iso_string() -> None:
    value = _coerce_base_updated_at("2026-05-25T16:23:09.719750+00:00")

    assert value is not None
    assert value.year == 2026
    assert value.tzinfo is not None


def test_operation_base_updated_at_accepts_z_suffix() -> None:
    value = _coerce_base_updated_at("2026-05-25T16:23:09.719750Z")

    assert value is not None
    assert value.year == 2026
    assert value.tzinfo is not None


@pytest.mark.asyncio
async def test_outbox_schema_guard_reports_missing_legacy_columns() -> None:
    session = _ColumnSession(OUTBOX_REQUIRED_COLUMNS - {"event_version"})

    with pytest.raises(RuntimeError, match="event_version"):
        await _assert_outbox_schema_compatible(session)  # type: ignore[arg-type]


@pytest.mark.asyncio
async def test_audit_schema_guard_reports_missing_legacy_columns() -> None:
    session = _ColumnSession(AUDIT_REQUIRED_COLUMNS - {"tenant_id"})

    with pytest.raises(RuntimeError, match="tenant_id"):
        await _assert_audit_schema_compatible(session)  # type: ignore[arg-type]


@pytest.mark.asyncio
async def test_duplicate_representative_card_check_blocks(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_duplicate(*_args: Any, **_kwargs: Any) -> dict[str, str]:
        return {"id": "existing-rep"}

    monkeypatch.setattr(
        representative_service,
        "find_representative_by_master_for_company",
        fake_duplicate,
    )

    with pytest.raises(DomainError) as exc:
        await representative_service.assert_unique_representative_card(
            session=None,  # type: ignore[arg-type]
            context={"tenant_id": "tenant-1"},
            company_id="company-1",
            person_id="person-1",
            organization_id=None,
        )

    assert exc.value.code == "DUPLICATE_REPRESENTATIVE_CARD"
