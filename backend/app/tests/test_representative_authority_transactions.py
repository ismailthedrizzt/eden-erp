from __future__ import annotations

from typing import Any

import pytest
from pydantic import ValidationError

from app.core.errors import DomainError
from app.domains.representatives import service as representative_service
from app.domains.representatives.schemas import RepresentativeAuthorityTransactionRequest


def valid_authority_payload() -> dict[str, Any]:
    return {
        "transaction_type": "Temsilcilik Başlatma",
        "authority_action": True,
        "authority_types": ["signature_authority"],
        "signature_type": "single",
        "effective_date": "2026-05-27",
        "document_files": [{"name": "yetki.pdf"}],
        "scope_type": "company_wide",
    }


def test_start_authority_request_accepts_valid_payload() -> None:
    request = RepresentativeAuthorityTransactionRequest(**valid_authority_payload())

    assert request.transaction_type == "Temsilcilik Başlatma"
    assert request.scope_type == "company_wide"


def test_transaction_request_rejects_invalid_scope_shape() -> None:
    payload = valid_authority_payload()
    payload["branch_id"] = "branch-1"

    with pytest.raises(ValidationError):
        RepresentativeAuthorityTransactionRequest(**payload)


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
