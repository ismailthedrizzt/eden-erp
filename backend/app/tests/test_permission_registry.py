from __future__ import annotations

from app.policies.permissions import (
    get_permission_contract,
    resolve_permission_with_fallback,
)


def test_branches_view_falls_back_to_companies_view() -> None:
    resolved = resolve_permission_with_fallback("branches.view")

    assert resolved == ["branches.view", "companies.view"]


def test_permission_contract_exists() -> None:
    contract = get_permission_contract("representatives.authorityStart")

    assert contract is not None
    assert contract.module_key == "representatives"
