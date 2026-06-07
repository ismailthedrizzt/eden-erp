from __future__ import annotations

from app.domains.licensing.plans import get_plan_definition, plan_feature_keys, plan_module_keys


def test_medium_plan_contains_core_release_modules() -> None:
    modules = set(plan_module_keys("medium"))

    assert "companies" in modules
    assert "accounting" in modules
    assert "documents" in modules
    assert "design_lab" not in modules


def test_development_plan_contains_internal_modules() -> None:
    plan = get_plan_definition("development")
    modules = set(plan_module_keys("development"))

    assert plan is not None
    assert plan.is_development_plan is True
    assert "design_lab" in modules
    assert "diagnostics" in modules


def test_enterprise_plan_contains_enterprise_features() -> None:
    features = set(plan_feature_keys("enterprise"))

    assert "portal.enabled" in features
    assert "integrations.enabled" in features
    assert "aiCopilot.enabled" in features
