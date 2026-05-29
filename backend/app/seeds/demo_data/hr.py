from __future__ import annotations

from typing import Any

EMPLOYEES: list[dict[str, Any]] = [
    {
        "key": "employee_ops",
        "company_key": "eden_tech",
        "position_key": "ops_manager",
        "employee_no": "EDN-001",
        "first_name": "Selin",
        "last_name": "Arman",
        "full_name": "Selin Arman",
        "identity_number": "10000000110",
        "phone": "+90 532 100 10 10",
        "email": "selin.arman@example.com",
        "record_status": "active",
        "employment_status": "active",
        "scenario_key": "active_employee",
    },
    {
        "key": "employee_technician",
        "company_key": "eden_tech",
        "position_key": "field_technician",
        "employee_no": "EDN-002",
        "first_name": "Can",
        "last_name": "Yildiz",
        "full_name": "Can Yildiz",
        "identity_number": "10000000120",
        "phone": "+90 532 100 20 20",
        "email": "can.yildiz@example.com",
        "record_status": "active",
        "employment_status": "sgk_pending",
        "scenario_key": "sgk_pending_employee",
    },
    {
        "key": "employee_draft",
        "company_key": "glasstech",
        "position_key": None,
        "employee_no": "GT-009",
        "first_name": "Derya",
        "last_name": "Koc",
        "full_name": "Derya Koc",
        "identity_number": "10000000130",
        "phone": "+90 532 100 30 30",
        "email": "derya.koc@example.com",
        "record_status": "draft",
        "employment_status": "draft",
        "scenario_key": "draft_employee",
    },
]

