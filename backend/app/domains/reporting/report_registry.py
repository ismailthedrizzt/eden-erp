from __future__ import annotations

from app.domains.reporting.reports import REPORT_DEFINITIONS

ADVANCED_REPORT_KEYS = [
    "company_360_status_report",
    "operations_risk_report",
    "financial_document_gap_report",
    "authority_expiry_report",
    "service_operations_report",
    "hr_readiness_report",
]


def report_source_allowed(source_key: str) -> bool:
    return source_key in REPORT_DEFINITIONS


def advanced_report_catalog() -> list[dict[str, object]]:
    return [
        {
            "report_key": key,
            "module_key": REPORT_DEFINITIONS[key]["module_key"],
            "title": REPORT_DEFINITIONS[key]["title"],
        }
        for key in ADVANCED_REPORT_KEYS
        if key in REPORT_DEFINITIONS
    ]
