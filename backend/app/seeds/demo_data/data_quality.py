from __future__ import annotations

from typing import Any

QUALITY_FINDINGS: list[dict[str, Any]] = [
    {
        "key": "duplicate_glass_org",
        "entity_type": "master_organization",
        "entity_key": "master_glass_duplicate",
        "rule_key": "duplicate_trade_name",
        "severity": "warning",
        "message": "GlassTech kaydi ile benzer kurum kaydi olabilir.",
        "scenario_key": "duplicate_organization_candidate",
    },
    {
        "key": "stakeholder_without_cari",
        "entity_type": "crm_stakeholder",
        "entity_key": "lead_quattro",
        "rule_key": "customer_without_cari_account",
        "severity": "warning",
        "message": "Lead/paydas icin cari kart baglantisi yok.",
        "scenario_key": "stakeholder_without_cari_warning",
    },
    {
        "key": "employee_missing_document",
        "entity_type": "hr_employee",
        "entity_key": "employee_technician",
        "rule_key": "missing_required_documents",
        "severity": "critical",
        "message": "Calisan icin zorunlu belge eksik.",
        "scenario_key": "employee_missing_document_warning",
    },
]

