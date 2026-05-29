from __future__ import annotations

from datetime import UTC, datetime

from app.domains.automation.registry import (
    ACTION_TEMPLATES,
    CONDITION_ENTITIES,
    CONDITION_OPERATORS,
    RULE_TEMPLATES,
    list_action_registry,
    list_condition_registry,
    validate_registry_payload,
)
from app.domains.automation.schemas import AutomationRuleCreateRequest, AutomationSimulationRequest
from app.domains.automation.service import max_actions_per_run, next_run_for_schedule
from app.policies.permissions import PERMISSIONS
from app.setup.readiness_registry import get_readiness_definition


def test_automation_registry_is_constrained() -> None:
    assert "create_notification" in ACTION_TEMPLATES
    assert "create_project_task" in ACTION_TEMPLATES
    assert "date_within_days" in CONDITION_OPERATORS
    assert "document" in CONDITION_ENTITIES

    action_types = {item["action_type"] for item in list_action_registry()}
    assert "queue_report_export" in action_types

    conditions = list_condition_registry()
    document = next(item for item in conditions["entities"] if item["key"] == "document")
    assert "expiry_date" in document["fields"]


def test_automation_registry_rejects_unsafe_payloads() -> None:
    errors = validate_registry_payload(
        "schedule",
        {
            "entity": "document",
            "field": "drop table documents",
            "operator": "field_equals",
            "value": "x",
        },
        {"actions": [{"action_type": "run_python"}]},
    )
    assert errors
    assert any("field" in error for error in errors)
    assert any("action" in error for error in errors)


def test_automation_schemas_and_templates_defaults() -> None:
    request = AutomationRuleCreateRequest(
        rule_name="Belge suresi",
        module_key="documents",
        trigger_type="schedule",
        condition_config={
            "entity": "document",
            "field": "expiry_date",
            "operator": "date_within_days",
            "value": 30,
        },
        action_config={"actions": [{"action_type": "create_document_expiry_warning"}]},
    )
    assert request.status == "draft"
    assert request.run_mode == "async_worker"

    simulation = AutomationSimulationRequest()
    assert simulation.limit == 20
    assert simulation.trigger_payload == {}

    template_keys = {item["template_key"] for item in RULE_TEMPLATES}
    assert "document_expiry_30_days" in template_keys
    assert "crm_followup_overdue" in template_keys
    assert "maintenance_due_7_days" in template_keys


def test_automation_permissions_and_readiness() -> None:
    for permission in [
        "automation.view",
        "automation.create",
        "automation.edit",
        "automation.activate",
        "automation.run",
        "automation.admin",
        "automation.viewRuns",
    ]:
        assert permission in PERMISSIONS

    definition = get_readiness_definition("automation")
    assert definition is not None
    assert "automation_rules" in definition.required_tables
    assert "automation_rule_runs" in definition.required_tables
    assert "automation_action_results" in definition.optional_tables


def test_automation_schedule_and_limits() -> None:
    base = datetime(2026, 5, 29, 9, 0, tzinfo=UTC)
    hourly = next_run_for_schedule({"frequency": "hourly"}, base)
    daily = next_run_for_schedule({"frequency": "daily"}, base)
    weekly = next_run_for_schedule({"frequency": "weekly"}, base)
    monthly = next_run_for_schedule({"frequency": "monthly"}, base)
    assert hourly is not None and hourly.hour == 10
    assert daily is not None and daily.day == 30
    assert weekly is not None and weekly.day == 5
    assert monthly is not None and monthly.day == 28
    assert max_actions_per_run() == 100
