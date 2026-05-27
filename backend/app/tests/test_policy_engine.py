from __future__ import annotations

from app.policies.policy_engine import evaluate_policy
from app.policies.schemas import AccessContext, PolicyInput


def test_missing_permission_denies_policy() -> None:
    context = AccessContext(tenant_id="tenant-1", permissions=[])

    decision = evaluate_policy(
        PolicyInput(
            context=context,
            action_key="branch_opening",
            module_key="branches",
            required_permissions=["branches.openingStart"],
        )
    )

    assert decision.allowed is False
    assert decision.code == "PERMISSION_DENIED"


def test_permission_fallback_allows_policy() -> None:
    context = AccessContext(tenant_id="tenant-1", permissions=["companies.view"])

    decision = evaluate_policy(
        PolicyInput(
            context=context,
            action_key="branches.view",
            module_key="branches",
            required_permissions=["branches.view"],
        )
    )

    assert decision.allowed is True


def test_company_scope_denies_out_of_scope_record() -> None:
    context = AccessContext(
        tenant_id="tenant-1",
        permissions=["companies.view"],
        company_scope=["company-1"],
    )

    decision = evaluate_policy(
        PolicyInput(
            context=context,
            action_key="companies.view",
            module_key="companies",
            required_permissions=["companies.view"],
            resource={"company_id": "company-2"},
        )
    )

    assert decision.allowed is False
    assert decision.code == "SCOPE_DENIED"
