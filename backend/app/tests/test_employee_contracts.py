from __future__ import annotations

from datetime import datetime

import pytest
from pydantic import ValidationError

from app.contracts.page_flow_contracts import (
    EmployeeCreatePayloadContract,
    GenericLifecycleOperationPayloadContract,
)

TENANT_ID = "11111111-1111-4111-8111-111111111111"
COMPANY_ID = "22222222-2222-4222-8222-222222222222"
EMPLOYEE_ID = "33333333-3333-4333-8333-333333333333"


def _employee_operation(operation_type: str, payload: dict[str, object] | None = None) -> GenericLifecycleOperationPayloadContract:
    return GenericLifecycleOperationPayloadContract.model_validate({
        "tenant_id": TENANT_ID,
        "operation_type": operation_type,
        "entity_type": "employee",
        "entity_id": EMPLOYEE_ID,
        "lifecycle_state": "submitted",
        "payload_json": payload or {"employee_id": EMPLOYEE_ID},
        "base_updated_at": "2026-06-11T10:00:00Z",
    })


def test_employee_contract_rejects_invalid_uuid() -> None:
    with pytest.raises(ValidationError):
        EmployeeCreatePayloadContract.model_validate({
            "tenant_id": TENANT_ID,
            "employee_id": "not-a-uuid",
            "first_name": "Ismail",
            "last_name": "ILGAR",
        })


def test_employee_contract_rejects_invalid_date() -> None:
    with pytest.raises(ValidationError):
        EmployeeCreatePayloadContract.model_validate({
            "tenant_id": TENANT_ID,
            "employee_id": EMPLOYEE_ID,
            "first_name": "Ismail",
            "last_name": "ILGAR",
            "start_date": "not-a-date",
        })


def test_employee_contract_normalizes_iso_datetime() -> None:
    payload = EmployeeCreatePayloadContract.model_validate({
        "tenant_id": TENANT_ID,
        "employee_id": EMPLOYEE_ID,
        "first_name": "Ismail",
        "last_name": "ILGAR",
        "base_updated_at": "2026-06-11T10:00:00Z",
    })
    assert isinstance(payload.base_updated_at, datetime)


def test_employment_start_requires_operation_record() -> None:
    operation = _employee_operation("employee.employment_start", {
        "employee_id": EMPLOYEE_ID,
        "company_id": COMPANY_ID,
        "start_date": "2026-06-11",
    })
    assert operation.entity_type == "employee"
    assert operation.payload_json["employee_id"] == EMPLOYEE_ID


def test_employment_termination_requires_operation_record() -> None:
    operation = _employee_operation("employee.employment_termination", {
        "employee_id": EMPLOYEE_ID,
        "end_date": "2026-06-11",
    })
    assert operation.operation_type == "employee.employment_termination"


def test_employee_assignment_change_requires_operation_record() -> None:
    operation = _employee_operation("employee.assignment_change", {
        "employee_id": EMPLOYEE_ID,
        "effective_date": "2026-06-11",
    })
    assert operation.operation_type == "employee.assignment_change"


def test_employee_sgk_entry_completed_requires_operation_record() -> None:
    operation = _employee_operation("employee.sgk_entry_completed", {
        "employee_id": EMPLOYEE_ID,
        "completed_date": "2026-06-11",
    })
    assert operation.operation_type == "employee.sgk_entry_completed"


def test_employee_sgk_exit_completed_requires_operation_record() -> None:
    operation = _employee_operation("employee.sgk_exit_completed", {
        "employee_id": EMPLOYEE_ID,
        "completed_date": "2026-06-11",
    })
    assert operation.operation_type == "employee.sgk_exit_completed"


def test_employee_document_upload_requires_operation_record() -> None:
    operation = _employee_operation("employee.document_upload", {
        "employee_id": EMPLOYEE_ID,
        "document_type": "contract",
    })
    assert operation.payload_json["document_type"] == "contract"
