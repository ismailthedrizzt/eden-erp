from __future__ import annotations

from typing import Any

import pytest
from pydantic import ValidationError

from app.core.errors import DomainError
from app.domains.representatives import scope as scope_service
from app.domains.representatives.schemas import RepresentativeAuthorityScope


def test_company_wide_scope_rejects_branch_id() -> None:
    with pytest.raises(ValidationError):
        RepresentativeAuthorityScope(scope_type="company_wide", branch_id="branch-1")


def test_branch_scope_requires_branch_id() -> None:
    with pytest.raises(ValidationError):
        RepresentativeAuthorityScope(scope_type="branch")


def test_organization_unit_scope_requires_id() -> None:
    with pytest.raises(ValidationError):
        RepresentativeAuthorityScope(scope_type="organization_unit")


def test_facility_scope_requires_id() -> None:
    with pytest.raises(ValidationError):
        RepresentativeAuthorityScope(scope_type="facility")


@pytest.mark.asyncio
async def test_branch_scope_closed_branch_blocks(monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake_branch(*_args: Any, **_kwargs: Any) -> dict[str, Any]:
        return {
            "id": "branch-1",
            "company_id": "company-1",
            "record_status": "closed",
            "status": "closed",
            "is_deleted": False,
        }

    monkeypatch.setattr(scope_service, "get_branch_by_id", fake_branch)

    with pytest.raises(DomainError) as exc:
        await scope_service.validate_authority_scope(
            session=None,  # type: ignore[arg-type]
            context={"tenant_id": "tenant-1"},
            company_id="company-1",
            scope=RepresentativeAuthorityScope(scope_type="branch", branch_id="branch-1"),
        )

    assert exc.value.code == "BRANCH_SCOPE_CLOSED"
