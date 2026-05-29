from __future__ import annotations

from typing import Any

REPORTING_EXPECTATIONS: list[dict[str, Any]] = [
    {
        "key": "dashboard_kpis",
        "label": "Dashboard KPI kaynaklari",
        "checks": [
            "active_companies",
            "open_tasks",
            "service_requests",
            "accounting_balances",
            "data_quality_findings",
        ],
    },
]

