from __future__ import annotations

from app.setup.schemas import ModuleReadinessDefinition

READINESS_REGISTRY: dict[str, ModuleReadinessDefinition] = {
    "companies": ModuleReadinessDefinition(
        module_key="companies",
        required_tables=["companies"],
        optional_tables=[
            "company_public_tax",
            "company_public_sgk",
            "company_public_registry",
        ],
        setup_steps=["Create the companies base table."],
    ),
    "partners": ModuleReadinessDefinition(
        module_key="partners",
        required_tables=["company_partners", "ownership_transactions"],
        required_views=["v_current_ownership"],
        required_dependencies=["companies"],
        setup_steps=["Create partner cards, ownership transactions, and current view."],
    ),
    "representatives": ModuleReadinessDefinition(
        module_key="representatives",
        required_tables=[
            "company_representatives",
            "representative_authority_transactions",
        ],
        optional_views=["v_current_representative_authorities"],
        required_dependencies=["companies"],
        optional_dependencies=["branches", "organization", "facilities"],
        setup_steps=["Create representative cards and authority transaction tables."],
    ),
    "branches": ModuleReadinessDefinition(
        module_key="branches",
        required_tables=["company_branches"],
        optional_tables=["company_official_change_transactions"],
        optional_views=["v_company_branch_list"],
        required_dependencies=["companies"],
        optional_dependencies=["organization", "facilities"],
        setup_steps=["Create company branch records and branch projections."],
    ),
    "organization": ModuleReadinessDefinition(
        module_key="organization",
        required_tables=["organization_units"],
        required_dependencies=["companies"],
        setup_steps=["Create organization unit tables."],
    ),
    "facilities": ModuleReadinessDefinition(
        module_key="facilities",
        required_tables=["facilities"],
        required_dependencies=["companies"],
        setup_steps=["Create facilities/location tables."],
    ),
    "accounting": ModuleReadinessDefinition(
        module_key="accounting",
        required_tables=["accounting_cari_accounts", "accounting_cari_transactions"],
        optional_tables=[
            "accounting_transaction_attachments",
            "accounting_reconciliation_links",
            "bank_transactions",
            "invoices",
        ],
        required_dependencies=["companies"],
        setup_steps=[
            "Create cari account and cari transaction tables.",
            "Configure accounting permissions and company scope.",
        ],
    ),
    "process": ModuleReadinessDefinition(
        module_key="process",
        required_tables=[
            "process_instances",
            "process_tasks",
            "process_approvals",
            "process_events",
        ],
        setup_steps=["Create process engine tables."],
    ),
    "audit": ModuleReadinessDefinition(
        module_key="audit",
        required_tables=["audit_logs"],
        setup_steps=["Create audit log table."],
    ),
    "outbox": ModuleReadinessDefinition(
        module_key="outbox",
        required_tables=["outbox_events"],
        setup_steps=["Create outbox event table."],
    ),
}


def get_readiness_definition(module_key: str) -> ModuleReadinessDefinition | None:
    return READINESS_REGISTRY.get(module_key)


def list_readiness_definitions() -> list[ModuleReadinessDefinition]:
    return list(READINESS_REGISTRY.values())
