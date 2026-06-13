import pytest
from pydantic import ValidationError

from app.domains.facilities.schemas import FacilityCreateRequest, FacilityUpdateRequest


def test_facility_create_request_rejects_unknown_fields() -> None:
    with pytest.raises(ValidationError) as exc_info:
        FacilityCreateRequest(company_id="company-1", name="Main Facility", unknown_field=True)

    assert "extra_forbidden" in str(exc_info.value)


def test_facility_update_request_rejects_unknown_fields() -> None:
    with pytest.raises(ValidationError) as exc_info:
        FacilityUpdateRequest(name="Main Facility", unknown_field=True)

    assert "extra_forbidden" in str(exc_info.value)
