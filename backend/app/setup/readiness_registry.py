# ruff: noqa: E501
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
            "accounting_bank_accounts",
            "accounting_bank_transactions",
            "accounting_card_transactions",
            "accounting_e_documents",
            "accounting_matching_suggestions",
            "accounting_capital_reconciliation",
        ],
        required_dependencies=["companies"],
        setup_steps=[
            "Create cari account and cari transaction tables.",
            "Create bank account, bank transaction, e-document and reconciliation tables for deepening.",
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
    "importExport": ModuleReadinessDefinition(
        module_key="importExport",
        required_tables=[
            "data_import_jobs",
            "data_import_job_rows",
            "data_export_jobs",
            "data_bulk_action_jobs",
            "data_bulk_action_results",
        ],
        required_dependencies=["companies", "audit"],
        optional_dependencies=[
            "accounting",
            "crm",
            "product_services",
            "hr",
            "project_management",
            "facilities",
            "organization",
            "partners",
            "representatives",
            "actionCenter",
        ],
        setup_steps=[
            "Create import/export/bulk operation tables.",
            "Verify storage, CSV/XLSX parsing, domain adapters, permissions, and Action Center hooks.",
        ],
    ),
    "documents": ModuleReadinessDefinition(
        module_key="documents",
        required_tables=[
            "documents",
            "document_relations",
        ],
        optional_tables=[
            "document_requirements",
            "document_access_logs",
        ],
        required_dependencies=["companies"],
        optional_dependencies=[
            "audit",
            "actionCenter",
            "importExport",
            "hr",
            "after_sales",
            "project_management",
        ],
        setup_steps=[
            "Create central document metadata and relation tables.",
            "Configure private storage bucket, signed URL policy, permissions, and access logs.",
            "Connect module document loaders to the canonical documents API.",
        ],
    ),
    "notifications": ModuleReadinessDefinition(
        module_key="notifications",
        required_tables=[
            "notifications",
            "notification_preferences",
        ],
        optional_tables=[
            "reminders",
            "email_messages",
            "notification_templates",
        ],
        required_dependencies=["security"],
        optional_dependencies=["outbox", "actionCenter", "audit", "documents"],
        setup_steps=[
            "Create notifications, preferences, reminders and email queue tables.",
            "Configure SMTP settings only when email notifications are enabled.",
            "Wire outbox event handlers, reminder worker and email worker.",
        ],
    ),
    "onboarding": ModuleReadinessDefinition(
        module_key="onboarding",
        required_tables=[
            "workspace_onboarding_state",
            "user_workspace_state",
        ],
        optional_dependencies=["companies", "notifications", "actionCenter"],
        setup_steps=[
            "Create workspace onboarding state and user workspace preference tables.",
            "Verify first-run welcome, setup checklist, guided tour and Action Guide state.",
        ],
    ),
    "search": ModuleReadinessDefinition(
        module_key="search",
        required_tables=["user_recent_items"],
        optional_dependencies=[
            "companies",
            "partners",
            "representatives",
            "branches",
            "accounting",
            "hr",
            "project_management",
            "after_sales",
            "crm",
            "documents",
            "audit",
            "reporting",
        ],
        setup_steps=[
            "Create user recent items table.",
            "Verify search providers, permission filtering, command palette and Action Guide action results.",
        ],
    ),
    "dataQuality": ModuleReadinessDefinition(
        module_key="dataQuality",
        required_tables=[
            "data_quality_rules",
            "data_quality_scores",
            "duplicate_candidate_groups",
            "duplicate_candidate_items",
            "merge_operations",
            "merge_operation_relations",
            "data_quality_findings",
        ],
        optional_dependencies=[
            "crm",
            "accounting",
            "hr",
            "partners",
            "representatives",
            "after_sales",
            "documents",
            "importExport",
            "actionCenter",
            "audit",
        ],
        setup_steps=[
            "Create data quality rules, scores, duplicate queue, merge operation and finding tables.",
            "Verify duplicate detection, safe merge guard, import warning and Action Center quality signals.",
        ],
    ),
    "adminConsole": ModuleReadinessDefinition(
        module_key="adminConsole",
        required_tables=[
            "workspace_settings",
            "admin_settings",
            "feature_flag_overrides",
            "integration_status_cache",
        ],
        optional_tables=["worker_heartbeats"],
        optional_dependencies=["audit", "outbox", "notifications", "documents"],
        setup_steps=[
            "Create workspace/admin settings and integration status tables.",
            "Wire module, feature flag, health, integration and outbox admin endpoints.",
            "Expose permission-aware Admin Console navigation.",
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
    "security": ModuleReadinessDefinition(
        module_key="security",
        required_tables=[
            "security_users_profile",
            "security_roles",
            "security_role_permissions",
            "security_user_roles",
            "security_user_company_scopes",
            "security_user_branch_scopes",
        ],
        optional_tables=["security_policy_test_logs", "audit_logs"],
        required_dependencies=["companies"],
        optional_dependencies=["branches", "audit", "reporting"],
        setup_steps=[
            "Create security user profile, role, permission and scope tables.",
            "Configure default roles and seed admin/user scope assignments.",
            "Verify permission denied and scope denied audit reporting.",
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
