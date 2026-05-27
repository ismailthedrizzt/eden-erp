from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.domains.company.schemas import (
    ActivitySubjectChangeRequest,
    AddressChangeRequest,
    PublicRegistrationUpdateRequest,
    TitleChangeRequest,
)


def test_title_change_missing_new_trade_name() -> None:
    with pytest.raises(ValidationError) as error:
        TitleChangeRequest()
    assert "Yeni şirket unvanı zorunludur" in str(error.value)


def test_title_change_same_trade_name_is_domain_no_change_candidate() -> None:
    request = TitleChangeRequest(new_trade_name="Eden A.S.")
    assert request.resolved_trade_name == "Eden A.S."


def test_address_change_empty_address() -> None:
    with pytest.raises(ValidationError) as error:
        AddressChangeRequest(country="TR", city="Istanbul", district="Kadikoy", address="")
    assert "Yeni adres zorunludur" in str(error.value)


def test_public_registration_rejects_tax_number() -> None:
    with pytest.raises(ValidationError) as error:
        PublicRegistrationUpdateRequest(tax_number="1234567890", tax_office="Kadikoy")
    assert "VKN bu işlem üzerinden değiştirilemez" in str(error.value)


def test_public_registration_requires_changed_field() -> None:
    with pytest.raises(ValidationError) as error:
        PublicRegistrationUpdateRequest(notes="yalniz not")
    assert "en az bir alan değişmelidir" in str(error.value)


def test_activity_subject_empty() -> None:
    with pytest.raises(ValidationError) as error:
        ActivitySubjectChangeRequest(new_activity_subject="", decision_date="2026-01-01")
    assert "Yeni faaliyet konusu zorunludur" in str(error.value)


def test_registration_date_before_decision() -> None:
    with pytest.raises(ValidationError) as error:
        ActivitySubjectChangeRequest(
            new_activity_subject="Yazilim hizmetleri",
            decision_date="2026-01-10",
            registration_date="2026-01-01",
        )
    assert "Tescil tarihi karar tarihinden önce olamaz" in str(error.value)
