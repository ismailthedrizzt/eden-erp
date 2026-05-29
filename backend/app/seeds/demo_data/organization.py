from __future__ import annotations

from typing import Any

ORGANIZATION_UNITS: list[dict[str, Any]] = [
    {
        "key": "eden_hq",
        "company_key": "eden_tech",
        "parent_key": None,
        "name": "Genel Mudurluk",
        "type": "headquarters",
        "code": "HQ",
        "scenario_key": "organization_hq",
    },
    {
        "key": "eden_operations",
        "company_key": "eden_tech",
        "parent_key": "eden_hq",
        "name": "Operasyon Departmani",
        "type": "department",
        "code": "OPS",
        "scenario_key": "operations_department",
    },
    {
        "key": "eden_sales",
        "company_key": "eden_tech",
        "parent_key": "eden_hq",
        "name": "Satis Departmani",
        "type": "department",
        "code": "SALES",
        "scenario_key": "sales_department",
    },
    {
        "key": "ankara_branch_unit",
        "company_key": "eden_tech",
        "parent_key": "eden_operations",
        "name": "Ankara Sube Organizasyonu",
        "type": "branch",
        "code": "BR-ANK",
        "scenario_key": "branch_unit_link",
    },
    {
        "key": "ostim_ops_unit",
        "company_key": "glasstech",
        "parent_key": None,
        "name": "Ostim Operasyon Ekibi",
        "type": "branch",
        "code": "GT-OPS",
        "scenario_key": "operation_unit_link",
    },
]

POSITIONS: list[dict[str, Any]] = [
    {
        "key": "ops_manager",
        "unit_key": "eden_operations",
        "title": "Operasyon Muduru",
        "grade": "M2",
        "is_manager": True,
    },
    {
        "key": "field_technician",
        "unit_key": "ankara_branch_unit",
        "title": "Saha Teknisyeni",
        "grade": "T1",
        "is_manager": False,
    },
    {
        "key": "accounting_specialist",
        "unit_key": "eden_hq",
        "title": "Muhasebe Uzmani",
        "grade": "S1",
        "is_manager": False,
    },
]

