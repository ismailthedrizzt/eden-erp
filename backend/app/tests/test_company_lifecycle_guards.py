from __future__ import annotations

import pytest

from app.core.errors import DomainError
from app.domains.company.service import assert_company_active_for_official_change


def test_company_lifecycle_guard_allows_active_company() -> None:
    assert_company_active_for_official_change(
        {"id": "company-1", "record_status": "active", "company_status": "active"},
        "title_change",
    )


def test_company_lifecycle_guard_blocks_draft_company() -> None:
    with pytest.raises(DomainError) as error:
        assert_company_active_for_official_change(
            {"id": "company-1", "record_status": "draft", "company_status": "draft"},
            "title_change",
        )
    assert error.value.code == "COMPANY_DRAFT_OFFICIAL_CHANGE_NOT_REQUIRED"


def test_company_lifecycle_guard_blocks_deregistered_company() -> None:
    with pytest.raises(DomainError) as error:
        assert_company_active_for_official_change(
            {"id": "company-1", "record_status": "deregistered", "company_status": "deregistered"},
            "title_change",
        )
    assert error.value.code == "COMPANY_DEREGISTERED"
