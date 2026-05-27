from __future__ import annotations

from typing import cast

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.policies.action_eligibility import evaluate_action_eligibility
from app.policies.schemas import AccessContext
from app.setup.schemas import ModuleReadinessResult


@pytest.mark.asyncio
async def test_capital_increase_partners_missing_disables_action(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_readiness(
        session: AsyncSession,
        tenant_id: str,
        module_key: str,
    ) -> ModuleReadinessResult:
        _ = session, tenant_id
        if module_key == "partners":
            return ModuleReadinessResult(
                module_key=module_key,
                ok=False,
                status="setup_required",
                message="Bu modulun kurulumu tamamlanmamis.",
                missing_views=["v_current_ownership"],
            )
        return ModuleReadinessResult(
            module_key=module_key,
            ok=True,
            status="ready",
            message="Modul kullanima hazir.",
        )

    monkeypatch.setattr(
        "app.policies.action_eligibility.check_module_readiness",
        fake_readiness,
    )

    eligibility = await evaluate_action_eligibility(
        cast(AsyncSession, object()),
        AccessContext(
            tenant_id="tenant-1",
            permissions=["companies.capitalIncreaseStart"],
        ),
        "capital_increase",
        {"company_id": "company-1", "record_status": "active"},
    )

    assert eligibility.can_start is False
    assert eligibility.disabled is True
    assert eligibility.details["code"] == "MODULE_SETUP_REQUIRED"
