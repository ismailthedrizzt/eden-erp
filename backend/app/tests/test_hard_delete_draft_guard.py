from __future__ import annotations

import pytest

from app.core.errors import DomainError
from app.policies.delete_guards import (
    can_hard_delete_company_draft,
    can_hard_delete_partner_draft,
    can_hard_delete_representative_draft,
)


@pytest.mark.asyncio
async def test_company_active_delete_fails_before_relation_checks() -> None:
    with pytest.raises(DomainError) as exc:
        await can_hard_delete_company_draft(
            None,  # type: ignore[arg-type]
            {"id": "company-1", "record_status": "active", "company_status": "active"},
            tenant_id="tenant-1",
        )

    assert exc.value.code == "COMPANY_DELETE_REQUIRES_OFFICIAL_OPERATION"


@pytest.mark.asyncio
async def test_partner_active_delete_fails_before_relation_checks() -> None:
    with pytest.raises(DomainError) as exc:
        await can_hard_delete_partner_draft(
            None,  # type: ignore[arg-type]
            {"id": "partner-1", "record_status": "active", "status": "active"},
            tenant_id="tenant-1",
        )

    assert exc.value.code == "PARTNER_DELETE_REQUIRES_OWNERSHIP_EXIT"


@pytest.mark.asyncio
async def test_representative_active_delete_fails_before_relation_checks() -> None:
    with pytest.raises(DomainError) as exc:
        await can_hard_delete_representative_draft(
            None,  # type: ignore[arg-type]
            {"id": "rep-1", "record_status": "active", "status": "active"},
            tenant_id="tenant-1",
        )

    assert exc.value.code == "REPRESENTATIVE_DELETE_REQUIRES_TERMINATION"
