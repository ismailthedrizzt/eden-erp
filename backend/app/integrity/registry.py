from __future__ import annotations

OPERATION_INTEGRITY_CHECKS: dict[str, list[str]] = {
    "branch_opening": [
        "company_active_for_official_operation",
        "branch_duplicate_active_name",
        "branch_facility_address_warning",
        "organization_unit_no_cycle",
    ],
    "branch_closing": [
        "branch_can_close",
        "branch_representative_scope_impact",
        "organization_unit_active_dependents",
        "facility_active_dependents",
        "branch_open_process_conflict",
    ],
    "capital_increase": [
        "capital_increase_requires_partners",
        "current_ownership_available",
        "ownership_distribution_valid",
        "no_active_ownership_transaction_conflict",
    ],
    "representative_authority": [
        "representative_scope_valid",
        "representative_scope_not_closed",
        "representative_authority_no_conflict",
        "representative_unique_card_per_company",
    ],
    "ownership_transaction": [
        "ownership_distribution_valid",
        "no_active_transaction_conflict",
        "ownership_exit_not_last_without_resolution",
    ],
    "company_deregistration": [
        "no_open_branches",
        "no_active_representative_authorities",
        "no_open_processes",
        "no_active_facilities",
    ],
}


def get_checks_for_operation(operation_key: str) -> list[str]:
    return OPERATION_INTEGRITY_CHECKS.get(operation_key, [])
