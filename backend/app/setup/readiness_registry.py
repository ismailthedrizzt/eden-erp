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
    "hr": ModuleReadinessDefinition(
        module_key="hr",
        required_tables=[
            "hr_employees",
            "hr_employment_records",
            "hr_employment_transactions",
        ],
        optional_tables=["hr_employee_documents"],
        required_dependencies=["companies"],
        optional_dependencies=["organization", "branches", "facilities", "accounting"],
        setup_steps=[
            "Create employee card, employment record, and employment transaction tables.",
            "Configure HR permissions, company scope, and employee document storage.",
        ],
    ),
    "project_management": ModuleReadinessDefinition(
        module_key="project_management",
        required_tables=["project_projects", "project_tasks"],
        optional_tables=[
            "project_task_comments",
            "project_task_attachments",
            "project_task_history",
            "project_boards",
            "project_sprints",
            "hr_employees",
            "organization_units",
        ],
        required_dependencies=["companies"],
        optional_dependencies=["hr", "organization", "branches", "facilities"],
        setup_steps=[
            "Create project and project task tables.",
            "Configure project/task permissions, company scope, and Action Center mapping.",
        ],
    ),
    "product_services": ModuleReadinessDefinition(
        module_key="product_services",
        required_tables=["product_catalog"],
        required_dependencies=["companies"],
        optional_dependencies=["accounting", "inventory"],
        setup_steps=[
            "Create product and service catalog table.",
            "Configure product permissions and after-sales selectable product flags.",
        ],
    ),
    "after_sales": ModuleReadinessDefinition(
        module_key="after_sales",
        required_tables=[
            "after_sales_installed_assets",
            "after_sales_service_requests",
            "after_sales_service_records",
        ],
        required_dependencies=["companies", "product_services"],
        optional_dependencies=[
            "accounting",
            "project_management",
            "hr",
            "facilities",
            "branches",
        ],
        setup_steps=[
            "Create installed asset, service request, and service record tables.",
            "Configure after-sales permissions, customer/cari links, and project task integration.",
        ],
    ),
    "crm": ModuleReadinessDefinition(
        module_key="crm",
        required_tables=[
            "master_persons",
            "master_organizations",
            "crm_stakeholders",
        ],
        optional_tables=["crm_interactions"],
        required_dependencies=["companies"],
        optional_dependencies=[
            "accounting",
            "project_management",
            "after_sales",
            "hr",
            "partners",
            "representatives",
        ],
        setup_steps=[
            "Create master person, master organization, and CRM stakeholder tables.",
            "Configure CRM permissions, master lookup, cari integration, and task integration.",
        ],
    ),
    "reporting": ModuleReadinessDefinition(
        module_key="reporting",
        required_tables=[],
        optional_tables=[
            "companies",
            "company_partners",
            "company_representatives",
            "accounting_cari_accounts",
            "accounting_cari_transactions",
            "hr_employees",
            "project_tasks",
            "after_sales_service_requests",
            "crm_stakeholders",
            "audit_logs",
            "outbox_events",
        ],
        required_dependencies=["companies"],
        optional_dependencies=[
            "partners",
            "representatives",
            "branches",
            "accounting",
            "hr",
            "project_management",
            "after_sales",
            "crm",
            "audit",
            "actionCenter",
        ],
        setup_steps=[
            "Enable reporting dashboard feature flags and verify module summary endpoints.",
            "Verify projection/read-model sources for enabled modules.",
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
