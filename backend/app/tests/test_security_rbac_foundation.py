# ruff: noqa: E501

from app.domains.security.permissions import (
    list_permission_groups,
    permission_key_exists,
    permission_risk,
)
from app.domains.security.policy_test import infer_permission_key
from app.domains.security.roles import DEFAULT_ROLES
from app.policies.permissions import permission_exists, resolve_permission_with_fallback
from app.setup.readiness_registry import get_readiness_definition


def test_security_permissions_are_registered_with_fallbacks() -> None:
    assert permission_exists("security.view")
    assert permission_exists("security.rolesManage")
    assert "settings.view" in resolve_permission_with_fallback("security.view")
    assert "roles.manage" in resolve_permission_with_fallback("security.rolesManage")


def test_default_roles_cover_product_role_set() -> None:
    role_keys = {role.role_key for role in DEFAULT_ROLES}

    assert {
        "system_admin",
        "company_manager",
        "accounting_user",
        "hr_user",
        "operations_user",
        "auditor",
        "standard_user",
        "external_user_future",
    }.issubset(role_keys)


def test_permission_registry_groups_security_and_flags_risk() -> None:
    groups = {group.module_key: group for group in list_permission_groups(include_deprecated=True)}

    assert "security" in groups
    assert permission_key_exists("security.policyTest")
    assert permission_risk("security.rolesManage") == "critical"
    assert permission_risk("representatives.authorityTerminate") == "high"


def test_policy_test_infers_product_actions() -> None:
    assert infer_permission_key("capital_increase") == "companies.capitalIncreaseStart"
    assert infer_permission_key("branch_opening") == "branches.openingStart"
    assert infer_permission_key("start_employment") == "hr.employmentStart"
    assert infer_permission_key("manage_roles") == "security.rolesManage"


def test_security_readiness_contract_includes_rbac_tables() -> None:
    definition = get_readiness_definition("security")

    assert definition is not None
    assert "security_users_profile" in definition.required_tables
    assert "security_roles" in definition.required_tables
    assert "security_role_permissions" in definition.required_tables
    assert "security_policy_test_logs" in definition.optional_tables
