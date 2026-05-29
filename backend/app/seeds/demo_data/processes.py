from __future__ import annotations

from typing import Any

OPERATION_REQUESTS: list[dict[str, Any]] = [
    {
        "key": "failed_address_change",
        "company_key": "eden_tech",
        "module_key": "companies",
        "entity_type": "company",
        "entity_key": "eden_tech",
        "operation_type": "address_change",
        "operation_status": "failed",
        "client_request_id": "demo-failed-address-change",
        "scenario_key": "failed_operation_action_center",
    },
    {
        "key": "pending_capital_increase",
        "company_key": "eden_tech",
        "module_key": "partners",
        "entity_type": "company",
        "entity_key": "eden_tech",
        "operation_type": "capital_increase",
        "operation_status": "requires_action",
        "client_request_id": "demo-capital-increase-precheck",
        "scenario_key": "pending_approval",
    },
]

PROCESS_INSTANCES: list[dict[str, Any]] = [
    {
        "key": "capital_increase_process",
        "company_key": "eden_tech",
        "module_key": "partners",
        "process_key": "capital_increase",
        "entity_type": "company",
        "entity_key": "eden_tech",
        "operation_key": "capital_increase",
        "operation_key_ref": "pending_capital_increase",
        "status": "waiting_approval",
        "current_step_key": "approval",
        "scenario_key": "approval_requested",
    },
]

PROCESS_TASKS: list[dict[str, Any]] = [
    {
        "key": "approval_task",
        "process_key": "capital_increase_process",
        "company_key": "eden_tech",
        "module_key": "partners",
        "entity_type": "company",
        "entity_key": "eden_tech",
        "step_key": "approval",
        "title": "Sermaye artirimi onayi bekliyor",
        "status": "open",
        "assigned_user_key": "company_manager",
        "scenario_key": "approval_action_center_item",
    },
]

OUTBOX_EVENTS: list[dict[str, Any]] = [
    {
        "key": "failed_email_outbox",
        "company_key": "eden_tech",
        "module_key": "notifications",
        "event_type": "email.send",
        "aggregate_type": "email_message",
        "aggregate_key": "failed_email",
        "status": "failed",
        "scenario_key": "failed_outbox_admin",
    },
]

