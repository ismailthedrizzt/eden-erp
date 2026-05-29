from __future__ import annotations

from typing import Any

AUDIT_EVENTS: list[dict[str, Any]] = [
    {
        "key": "company_address_change_audit",
        "company_key": "eden_tech",
        "module_key": "companies",
        "entity_type": "company",
        "entity_key": "eden_tech",
        "action_type": "update",
        "action_key": "company.address_change.completed",
        "summary": "Sirket adres degisikligi demo audit kaydi.",
        "severity": "info",
        "scenario_key": "company_address_change_audit",
    },
    {
        "key": "representative_authority_audit",
        "company_key": "eden_tech",
        "module_key": "representatives",
        "entity_type": "representative",
        "entity_key": "eden_rep_mert_branch_bank",
        "action_type": "operation",
        "action_key": "representative.authority.started",
        "summary": "Sube bazli banka yetkisi demo audit kaydi.",
        "severity": "info",
        "scenario_key": "representative_authority_audit",
    },
    {
        "key": "permission_denied_audit",
        "company_key": "eden_tech",
        "module_key": "security",
        "entity_type": "permission",
        "entity_key": "standard_user",
        "action_type": "permission_denied",
        "action_key": "policy.denied",
        "summary": "Scope disi sirket goruntuleme denemesi engellendi.",
        "severity": "warning",
        "scenario_key": "permission_denied_audit",
    },
]

