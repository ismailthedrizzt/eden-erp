from __future__ import annotations

from typing import cast

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.registry import (
    is_feature_enabled,
    list_feature_flags,
    set_feature_enabled,
)
from app.policies.action_eligibility import evaluate_action_eligibility
from app.policies.schemas import AccessContext
from app.setup.schemas import ModuleReadinessResult


def test_feature_flag_defaults_and_override() -> None:
    assert any(flag.key == "audit.export" for flag in list_feature_flags("audit"))
    assert is_feature_enabled("tenant-feature-test", "audit.export") is True

    assert set_feature_enabled("tenant-feature-test", "audit.export", False) is True
    assert is_feature_enabled("tenant-feature-test", "audit.export") is False


@pytest.mark.asyncio
async def test_action_eligibility_blocks_disabled_feature(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def ready(
        session: AsyncSession,
        tenant_id: str,
        module_key: str,
    ) -> ModuleReadinessResult:
        _ = session, tenant_id
        return ModuleReadinessResult(
            module_key=module_key,
            ok=True,
            status="ready",
            message="Modul kullanima hazir.",
        )

    monkeypatch.setattr("app.policies.action_eligibility.check_module_readiness", ready)
    set_feature_enabled("tenant-scope-disabled", "representatives.scopeAuthority", False)

    eligibility = await evaluate_action_eligibility(
        cast(AsyncSession, object()),
        AccessContext(
            tenant_id="tenant-scope-disabled",
            permissions=["representatives.authorityUpdate"],
        ),
        "representative_authority_scope_change",
        {"company_id": "company-1", "record_status": "active"},
    )

    assert eligibility.can_start is False
    assert eligibility.details["code"] == "FEATURE_DISABLED"
