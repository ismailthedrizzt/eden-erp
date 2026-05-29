from __future__ import annotations

import argparse
import asyncio
import json
import re
from collections import Counter
from collections.abc import Mapping, Sequence
from dataclasses import dataclass, field
from datetime import UTC, date, datetime, timedelta
from typing import Any

from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import DatabaseConfigurationError, get_session_factory
from app.seeds.demo_data.accounting import CARI_ACCOUNTS, CARI_TRANSACTIONS
from app.seeds.demo_data.after_sales import (
    CHECKLIST_TEMPLATES,
    FIELD_ASSIGNMENTS,
    INSTALLED_ASSETS,
    MAINTENANCE_DUE_ITEMS,
    MAINTENANCE_PLANS,
    PRODUCTS,
    SERVICE_CHECKLIST_RESULTS,
    SERVICE_RECORDS,
    SERVICE_REQUESTS,
)
from app.seeds.demo_data.audit import AUDIT_EVENTS
from app.seeds.demo_data.branches import BRANCHES
from app.seeds.demo_data.common import (
    DEMO_MODULES,
    DEMO_TENANT_ID,
    SEED_VERSION,
    demo_id,
    demo_metadata,
)
from app.seeds.demo_data.companies import COMPANIES
from app.seeds.demo_data.crm import MASTER_ORGANIZATIONS, STAKEHOLDERS
from app.seeds.demo_data.data_quality import QUALITY_FINDINGS
from app.seeds.demo_data.documents import DOCUMENTS
from app.seeds.demo_data.facilities import FACILITIES
from app.seeds.demo_data.hr import EMPLOYEES
from app.seeds.demo_data.notifications import EMAIL_MESSAGES, NOTIFICATIONS
from app.seeds.demo_data.organization import ORGANIZATION_UNITS, POSITIONS
from app.seeds.demo_data.partners import PARTNER_PERSONS, PARTNERS
from app.seeds.demo_data.processes import (
    OPERATION_REQUESTS,
    OUTBOX_EVENTS,
    PROCESS_INSTANCES,
    PROCESS_TASKS,
)
from app.seeds.demo_data.projects import PROJECTS, TASKS
from app.seeds.demo_data.representatives import REPRESENTATIVES
from app.seeds.demo_data.users import DEMO_ROLES, DEMO_USERS, role_id, user_id

JsonDict = dict[str, Any]

IDENTIFIER_PATTERN = re.compile(r"^[a-zA-Z_][a-zA-Z0-9_]*$")
MUTATING_SAFE_ENVS = {"local", "development", "dev", "test", "demo", "staging", "sandbox"}

RESET_ORDER = [
    "document_access_logs",
    "document_relations",
    "documents",
    "data_import_job_rows",
    "data_import_jobs",
    "data_export_jobs",
    "data_bulk_action_results",
    "data_bulk_action_jobs",
    "email_messages",
    "notifications",
    "reminders",
    "outbox_events",
    "process_approvals",
    "process_tasks",
    "process_instances",
    "operation_requests",
    "audit_logs",
    "data_quality_findings",
    "duplicate_candidate_items",
    "duplicate_candidate_groups",
    "data_quality_scores",
    "after_sales_service_checklist_results",
    "after_sales_field_assignments",
    "after_sales_maintenance_due_items",
    "after_sales_maintenance_plans",
    "after_sales_checklist_templates",
    "after_sales_service_records",
    "after_sales_service_requests",
    "after_sales_installed_assets",
    "product_catalog",
    "project_tasks",
    "project_projects",
    "crm_interactions",
    "crm_stakeholders",
    "master_organizations",
    "hr_employee_documents",
    "hr_employment_records",
    "hr_employees",
    "accounting_cari_transactions",
    "accounting_cari_accounts",
    "company_representative_authority_transactions",
    "company_representatives",
    "ownership_transactions",
    "company_partners",
    "positions",
    "company_branches",
    "company_facilities",
    "organization_units",
    "persons",
    "companies",
    "organizations",
    "security_user_company_scopes",
    "security_user_roles",
    "security_role_permissions",
    "security_roles",
    "security_users_profile",
    "tenant_company_scopes",
    "tenant_memberships",
    "instance_modules",
    "workspace_settings",
    "tenant_database_bindings",
    "erp_instances",
]


@dataclass(frozen=True)
class SeedRecord:
    table: str
    key: str
    values: JsonDict
    conflict_columns: tuple[str, ...] = ("id",)


@dataclass(frozen=True)
class DemoSeedPlan:
    tenant_id: str
    records: list[SeedRecord]
    warnings: list[str] = field(default_factory=list)

    def summary(self) -> JsonDict:
        by_table = Counter(record.table for record in self.records)
        return {
            "seed_version": SEED_VERSION,
            "tenant_id": self.tenant_id,
            "total_records": len(self.records),
            "records_by_table": dict(sorted(by_table.items())),
            "demo_modules": DEMO_MODULES,
            "demo_users": [
                {
                    "key": str(row["key"]),
                    "display_name": str(row["display_name"]),
                    "email": str(row["email"]),
                    "role_key": str(row["role_key"]),
                }
                for row in DEMO_USERS
            ],
            "warnings": self.warnings,
        }


@dataclass(frozen=True)
class DemoSeedOptions:
    tenant_id: str = DEMO_TENANT_ID
    reset_demo_data: bool = False
    module: str | None = None
    dry_run: bool = False
    verbose: bool = False
    confirm_reset: bool = False


@dataclass(frozen=True)
class SeedExecutionResult:
    status: str
    summary: JsonDict
    inserted_or_updated: int = 0
    skipped_tables: list[str] = field(default_factory=list)
    reset_deleted: int = 0


@dataclass(frozen=True)
class ValidationCheck:
    key: str
    label: str
    table: str
    where_sql: str
    minimum: int = 1


def id_for(kind: str, key: str) -> str:
    return demo_id(f"{kind}:{key}")


def today(offset_days: int = 0) -> date:
    return date.today() + timedelta(days=offset_days)


def utc_now(offset_days: int = 0) -> datetime:
    return datetime.now(UTC) + timedelta(days=offset_days)


def assert_seed_allowed(environment: str, *, dry_run: bool) -> None:
    env = environment.lower()
    if dry_run:
        return
    if env not in MUTATING_SAFE_ENVS:
        raise RuntimeError(
            "Demo seed mutating operations are blocked outside local/dev/test/demo/staging."
        )


def build_demo_seed_plan(options: DemoSeedOptions | None = None) -> DemoSeedPlan:
    opts = options or DemoSeedOptions()
    records: list[SeedRecord] = []
    tenant_id = opts.tenant_id

    add(records, "erp_instances", "demo_workspace", {
        "id": tenant_id,
        "name": "Eden Demo Workspace",
        "code": "eden-demo",
        "tenant_key": "eden-demo-workspace",
        "tenant_type": "demo",
        "status": "active",
        "isolation_mode": "shared_schema",
        "schema_name": "public",
        "activation_phase": "pilot",
        "metadata_json": demo_metadata("demo_workspace", country="Turkiye"),
    })
    add(records, "tenant_database_bindings", "demo_workspace", {
        "id": id_for("tenant_binding", "demo_workspace"),
        "tenant_id": tenant_id,
        "isolation_mode": "shared_schema",
        "schema_name": "public",
        "connection_name": "demo",
        "status": "active",
        "activated_at": utc_now(),
        "metadata_json": demo_metadata("demo_workspace"),
    }, conflict_columns=("tenant_id",))
    add(records, "workspace_settings", "demo_workspace", {
        "id": id_for("workspace_settings", "demo_workspace"),
        "tenant_id": tenant_id,
        "workspace_name": "Eden Demo Workspace",
        "country": "Turkiye",
        "default_language": "tr",
        "default_currency": "TRY",
        "timezone": "Europe/Istanbul",
        "date_format": "dd.MM.yyyy",
        "number_format": "tr-TR",
        "metadata_json": demo_metadata("demo_workspace", demo_mode=True),
    }, conflict_columns=("tenant_id",))

    for module_key in DEMO_MODULES:
        add(records, "instance_modules", f"module_{module_key}", {
            "id": id_for("instance_module", module_key),
            "instance_id": tenant_id,
            "module_code": module_key,
            "status": "enabled",
            "enabled_at": utc_now(),
            "settings_json": demo_metadata("module_enabled", module_key=module_key),
        }, conflict_columns=("instance_id", "module_code"))

    add_security_records(records, tenant_id)
    add_company_records(records, tenant_id)
    add_partner_records(records, tenant_id)
    add_organization_facility_branch_records(records, tenant_id)
    add_representative_records(records, tenant_id)
    add_accounting_records(records, tenant_id)
    add_crm_records(records, tenant_id)
    add_hr_records(records, tenant_id)
    add_product_after_sales_records(records, tenant_id)
    add_project_records(records, tenant_id)
    add_document_records(records, tenant_id)
    add_import_export_records(records, tenant_id)
    add_process_records(records, tenant_id)
    add_audit_records(records, tenant_id)
    add_notification_records(records, tenant_id)
    add_data_quality_records(records, tenant_id)

    if opts.module:
        module = opts.module
        records = [
            record for record in records
            if record.values.get("module_key") == module
            or record.table in {"erp_instances", "workspace_settings", "tenant_database_bindings"}
            or record.values.get("metadata_json", {}).get("module_key") == module
        ]

    return DemoSeedPlan(tenant_id=tenant_id, records=records)


def add(
    records: list[SeedRecord],
    table: str,
    key: str,
    values: JsonDict,
    *,
    conflict_columns: tuple[str, ...] = ("id",),
) -> None:
    records.append(
        SeedRecord(table=table, key=key, values=values, conflict_columns=conflict_columns)
    )


def add_security_records(records: list[SeedRecord], tenant_id: str) -> None:
    for role in DEMO_ROLES:
        role_key = str(role["role_key"])
        add(records, "security_roles", str(role["key"]), {
            "id": role_id(role_key),
            "tenant_id": tenant_id,
            "role_key": role_key,
            "role_name": role["role_name"],
            "description": f"Demo role: {role['role_name']}",
            "system_role": True,
            "risk_level": role["risk_level"],
            "status": "active",
            "metadata_json": demo_metadata("demo_role_set"),
        })
        for permission_key in role["permissions"]:
            add(records, "security_role_permissions", f"{role_key}_{permission_key}", {
                "id": id_for("role_permission", f"{role_key}:{permission_key}"),
                "tenant_id": tenant_id,
                "role_id": role_id(role_key),
                "permission_key": permission_key,
                "granted": True,
            })

    for user in DEMO_USERS:
        user_key = str(user["key"])
        user_uuid = user_id(user_key)
        role_key = str(user["role_key"])
        add(records, "security_users_profile", user_key, {
            "id": user_uuid,
            "tenant_id": tenant_id,
            "auth_user_id": user_uuid,
            "display_name": user["display_name"],
            "email": user["email"],
            "status": "active",
            "last_login_at": utc_now(-1),
            "metadata_json": demo_metadata("demo_user_roles", demo_user_key=user_key),
        })
        add(records, "security_user_roles", f"{user_key}_{role_key}", {
            "id": id_for("security_user_role", f"{user_key}:{role_key}"),
            "tenant_id": tenant_id,
            "user_id": user_uuid,
            "role_id": role_id(role_key),
            "scope_mode": "tenant",
        })
        add(records, "tenant_memberships", f"{user_key}_{role_key}", {
            "id": id_for("tenant_membership", f"{user_key}:{role_key}"),
            "tenant_id": tenant_id,
            "user_id": user_uuid,
            "role_key": role_key,
            "status": "active",
            "is_default": user_key == "admin",
            "metadata_json": demo_metadata("demo_user_roles"),
        })


def add_company_records(records: list[SeedRecord], tenant_id: str) -> None:
    for company in COMPANIES:
        company_key = str(company["key"])
        org_id = id_for("organization", company_key)
        company_id = id_for("company", company_key)
        metadata = demo_metadata(str(company["scenario_key"]), entity="company")
        add(records, "organizations", company_key, {
            "id": org_id,
            "tenant_id": tenant_id,
            "legal_name": company["trade_name"],
            "trade_name": company["trade_name"],
            "short_name": company["short_name"],
            "country": company["country"],
            "tax_number": company["tax_number"],
            "tax_office": company["tax_office"],
            "organization_type": company["company_type"],
            "phone": company["phone"],
            "email": company["email"],
            "address": company["address"],
            "city": company["city"],
            "district": company["district"],
            "status": "active",
            "metadata_json": metadata,
        })
        add(records, "companies", company_key, {
            "id": company_id,
            "tenant_id": tenant_id,
            "organization_id": org_id,
            "trade_name": company["trade_name"],
            "short_name": company["short_name"],
            "tax_number": company["tax_number"],
            "tax_office": company["tax_office"],
            "company_type": company["company_type"],
            "country": company["country"],
            "city": company["city"],
            "district": company["district"],
            "address": company["address"],
            "phone": company["phone"],
            "email": company["email"],
            "website": company.get("website"),
            "record_status": company["record_status"],
            "company_status": company["company_status"],
            "default_currency": company["default_currency"],
            "default_language": "tr",
            "time_zone": "Europe/Istanbul",
            "field_history": {"demo": True},
        })
        add(records, "tenant_company_scopes", company_key, {
            "id": id_for("tenant_company_scope", company_key),
            "tenant_id": tenant_id,
            "company_id": company_id,
            "scope_type": "owned",
            "is_primary": company_key == "eden_tech",
            "status": "active",
            "metadata_json": metadata,
        }, conflict_columns=("tenant_id", "company_id"))
        for user in DEMO_USERS:
            add(records, "security_user_company_scopes", f"{user['key']}_{company_key}", {
                "id": id_for("user_company_scope", f"{user['key']}:{company_key}"),
                "tenant_id": tenant_id,
                "user_id": user_id(str(user["key"])),
                "company_id": company_id,
                "can_view": True,
                "can_edit": user["role_key"] != "standard_user",
                "can_operate": user["role_key"]
                in {"system_admin", "company_manager", "operations_user"},
            })


def add_partner_records(records: list[SeedRecord], tenant_id: str) -> None:
    for person in PARTNER_PERSONS:
        person_key = str(person["key"])
        add(records, "persons", person_key, {
            "id": id_for("person", person_key),
            "tenant_id": tenant_id,
            "first_name": person["first_name"],
            "last_name": person["last_name"],
            "full_name": person["full_name"],
            "nationality": person["nationality"],
            "national_id": person["national_id"],
            "phone": person["phone"],
            "email": person["email"],
            "city": person["city"],
            "country": "Turkiye",
            "status": "active",
            "metadata_json": demo_metadata("demo_master_person"),
        })

    for partner in PARTNERS:
        partner_key = str(partner["key"])
        company_key = str(partner["company_key"])
        person_key = str(partner["person_key"])
        partner_id = id_for("partner", partner_key)
        add(records, "company_partners", partner_key, {
            "id": partner_id,
            "tenant_id": tenant_id,
            "company_id": id_for("company", company_key),
            "person_id": id_for("person", person_key),
            "owner_kind": "person",
            "partner_type": "person",
            "display_name": partner["display_name"],
            "partner_name": partner["display_name"],
            "identity_number": _person_identity(person_key),
            "share_ratio": partner["share_ratio"],
            "voting_ratio": partner["voting_ratio"],
            "profit_ratio": partner["profit_ratio"],
            "capital_amount": partner["capital_amount"],
            "status": "active" if partner["record_status"] == "active" else "draft",
            "record_status": partner["record_status"],
            "start_date": today(-365),
            "notes": f"Demo partner scenario: {partner['scenario_key']}",
            "history": [demo_metadata(str(partner["scenario_key"]))],
        })
        if partner["record_status"] == "active":
            add(records, "ownership_transactions", partner_key, {
                "id": id_for("ownership_tx", partner_key),
                "tenant_id": tenant_id,
                "company_id": id_for("company", company_key),
                "transaction_no": f"OWN-{partner_key.upper()}",
                "transaction_type": "initial_partnership_entry",
                "transaction_date": today(-360),
                "effective_date": today(-360),
                "to_partner_id": partner_id,
                "affected_partner_id": partner_id,
                "share_ratio": partner["share_ratio"],
                "voting_ratio": partner["voting_ratio"],
                "profit_ratio": partner["profit_ratio"],
                "capital_amount": partner["capital_amount"],
                "currency": "TRY",
                "new_values": {
                    "partner_id": partner_id,
                    "current_share_ratio": partner["share_ratio"],
                    "current_voting_ratio": partner["voting_ratio"],
                    "current_profit_ratio": partner["profit_ratio"],
                    "current_capital_amount": partner["capital_amount"],
                },
                "status": "approved",
                "approval_status": "approved",
                "workflow_status": "approved",
                "description": "Demo ilk ortaklik girisi.",
                "history": [demo_metadata(str(partner["scenario_key"]))],
                "approved_by": user_id("company_manager"),
                "approved_at": utc_now(-350),
                "created_by": user_id("company_manager"),
            })


def add_organization_facility_branch_records(records: list[SeedRecord], tenant_id: str) -> None:
    for unit in ORGANIZATION_UNITS:
        unit_key = str(unit["key"])
        parent_key = unit.get("parent_key")
        add(records, "organization_units", unit_key, {
            "id": id_for("organization_unit", unit_key),
            "tenant_id": tenant_id,
            "company_id": id_for("company", str(unit["company_key"])),
            "parent_unit_id": id_for("organization_unit", str(parent_key)) if parent_key else None,
            "name": unit["name"],
            "type": unit["type"],
            "short_name": unit["code"],
            "code": unit["code"],
            "status": "active",
            "active": True,
            "notes": f"Demo org scenario: {unit['scenario_key']}",
        })

    for position in POSITIONS:
        position_key = str(position["key"])
        add(records, "positions", position_key, {
            "id": id_for("position", position_key),
            "unit_id": id_for("organization_unit", str(position["unit_key"])),
            "title": position["title"],
            "grade": position["grade"],
            "is_manager": position["is_manager"],
            "status": "open",
            "notes": "Demo position",
        })

    for facility in FACILITIES:
        facility_key = str(facility["key"])
        add(records, "company_facilities", facility_key, {
            "id": id_for("facility", facility_key),
            "tenant_id": tenant_id,
            "company_id": id_for("company", str(facility["company_key"])),
            "branch_id": None,
            "facility_name": facility["facility_name"],
            "facility_type": facility["facility_type"],
            "country": "Turkiye",
            "city": facility["city"],
            "district": facility["district"],
            "address": facility["address"],
            "status": facility["status"],
            "record_status": facility["record_status"],
            "metadata_json": demo_metadata(str(facility["scenario_key"])),
        })

    for branch in BRANCHES:
        branch_key = str(branch["key"])
        unit_value = branch.get("unit_key")
        facility_value = branch.get("facility_key")
        unit_id = id_for("organization_unit", str(unit_value)) if unit_value else None
        facility_id = id_for("facility", str(facility_value)) if facility_value else None
        add(records, "company_branches", branch_key, {
            "id": id_for("branch", branch_key),
            "tenant_id": tenant_id,
            "company_id": id_for("company", str(branch["company_key"])),
            "organization_unit_id": unit_id,
            "facility_id": facility_id,
            "branch_name": branch["branch_name"],
            "branch_short_name": branch["branch_short_name"],
            "branch_type": branch["branch_type"],
            "is_official_branch": branch["is_official_branch"],
            "country": "Turkiye",
            "city": branch["city"],
            "district": branch["district"],
            "address": branch["address"],
            "status": branch["status"],
            "record_status": branch["record_status"],
            "start_date": today(-300),
            "metadata_json": demo_metadata(str(branch["scenario_key"])),
        })


def add_representative_records(records: list[SeedRecord], tenant_id: str) -> None:
    for representative in REPRESENTATIVES:
        rep_key = str(representative["key"])
        person_key = str(representative["person_key"])
        add(records, "company_representatives", rep_key, {
            "id": id_for("representative", rep_key),
            "tenant_id": tenant_id,
            "company_id": id_for("company", str(representative["company_key"])),
            "person_id": id_for("person", person_key),
            "person_kind": "person",
            "display_name": representative["display_name"],
            "full_name": representative["display_name"],
            "phone": representative["phone"],
            "email": representative["email"],
            "job_title": representative["job_title"],
            "status": "Aktif" if representative["record_status"] == "active" else "Taslak",
            "record_status": representative["record_status"],
            "notes": f"Demo representative scenario: {representative['scenario_key']}",
            "history": [demo_metadata(str(representative["scenario_key"]))],
        })
        if representative["record_status"] == "active":
            scope = {
                "type": "branch" if "branch" in rep_key else "company",
                "branch_id": id_for("branch", "ankara_branch") if "branch" in rep_key else None,
            }
            add(records, "company_representative_authority_transactions", rep_key, {
                "id": id_for("representative_authority_tx", rep_key),
                "tenant_id": tenant_id,
                "company_id": id_for("company", str(representative["company_key"])),
                "representative_id": id_for("representative", rep_key),
                "person_id": id_for("person", person_key),
                "transaction_no": f"REP-{rep_key.upper()}",
                "transaction_type": "Temsilcilik Baslatma",
                "authority_types": ["signature", "bank"] if "branch" in rep_key else ["signature"],
                "signature_type": "single",
                "transaction_limit": 500000 if "branch" in rep_key else 1500000,
                "currency": "TRY",
                "scope": scope,
                "scope_type": scope["type"],
                "branch_id": scope["branch_id"],
                "scope_label": "Ankara Subesi" if scope["branch_id"] else "Sirket Geneli",
                "can_approve_alone": True,
                "effective_date": today(-120),
                "end_date": today(25) if "branch" in rep_key else None,
                "approval_status": "approved",
                "workflow_status": "approved",
                "transaction_status": "approved",
                "authority_effect_status": "active",
                "authority_record_status": "active",
                "status": "approved",
                "new_values": demo_metadata(str(representative["scenario_key"]), scope=scope),
                "approved_by": user_id("company_manager"),
                "approved_at": utc_now(-119),
                "created_by": user_id("company_manager"),
            })


def add_accounting_records(records: list[SeedRecord], tenant_id: str) -> None:
    for account in CARI_ACCOUNTS:
        key = str(account["key"])
        add(records, "accounting_cari_accounts", key, {
            "id": id_for("cari_account", key),
            "tenant_id": tenant_id,
            "company_id": id_for("company", str(account["company_key"])),
            "account_code": account["account_code"],
            "account_name": account["account_name"],
            "account_type": account["account_type"],
            "cari_role": account["cari_role"],
            "tax_number": account["tax_number"],
            "country": "Turkiye",
            "city": account["city"],
            "currency": "TRY",
            "opening_balance": 0,
            "current_balance": account["current_balance"],
            "record_status": "active",
            "metadata_json": demo_metadata(str(account["scenario_key"])),
        })
    for transaction in CARI_TRANSACTIONS:
        key = str(transaction["key"])
        add(records, "accounting_cari_transactions", key, {
            "id": id_for("cari_transaction", key),
            "tenant_id": tenant_id,
            "company_id": id_for("company", str(transaction["company_key"])),
            "account_id": id_for("cari_account", str(transaction["account_key"])),
            "transaction_date": today(-20),
            "document_date": today(-20),
            "due_date": today(10),
            "transaction_type": transaction["transaction_type"],
            "direction": transaction["direction"],
            "amount": transaction["amount"],
            "currency": "TRY",
            "exchange_rate": 1,
            "local_amount": transaction["amount"],
            "description": transaction["description"],
            "document_status": transaction["document_status"],
            "document_no": transaction["document_no"],
            "document_type": "invoice" if transaction["document_no"] else None,
            "category": transaction["category"],
            "reconciliation_status": transaction["reconciliation_status"],
            "status": transaction["status"],
            "metadata_json": demo_metadata(str(transaction["scenario_key"])),
        })


def add_crm_records(records: list[SeedRecord], tenant_id: str) -> None:
    for master in MASTER_ORGANIZATIONS:
        key = str(master["key"])
        add(records, "master_organizations", key, {
            "id": id_for("master_organization", key),
            "tenant_id": tenant_id,
            "country": master["country"],
            "tax_number": master["tax_number"],
            "trade_name": master["trade_name"],
            "short_name": master["short_name"],
            "city": master["city"],
            "email": master["email"],
            "metadata_json": demo_metadata(str(master["scenario_key"])),
        })
    for stakeholder in STAKEHOLDERS:
        key = str(stakeholder["key"])
        related_cari_key = stakeholder.get("related_cari_account_key")
        add(records, "crm_stakeholders", key, {
            "id": id_for("crm_stakeholder", key),
            "tenant_id": tenant_id,
            "company_id": id_for("company", str(stakeholder["company_key"])),
            "master_entity_type": "organization",
            "master_entity_id": id_for("master_organization", str(stakeholder["master_key"])),
            "display_name": stakeholder["display_name"],
            "stakeholder_type": stakeholder["stakeholder_type"],
            "relationship_status": stakeholder["relationship_status"],
            "related_cari_account_id": (
                id_for("cari_account", str(related_cari_key)) if related_cari_key else None
            ),
            "tags": stakeholder["tags"],
            "lead_status": stakeholder.get("lead_status"),
            "next_followup_date": today(7) if stakeholder.get("lead_status") else None,
            "notes": f"Demo CRM scenario: {stakeholder['scenario_key']}",
            "metadata_json": demo_metadata(str(stakeholder["scenario_key"])),
        })
        if stakeholder.get("lead_status"):
            add(records, "crm_interactions", key, {
                "id": id_for("crm_interaction", key),
                "tenant_id": tenant_id,
                "stakeholder_id": id_for("crm_stakeholder", key),
                "interaction_type": "call",
                "subject": "Demo follow-up gorusmesi",
                "body": "Pilot senaryosu icin lead takip notu.",
                "next_followup_date": today(7),
                "created_by": user_id("company_manager"),
            })


def add_hr_records(records: list[SeedRecord], tenant_id: str) -> None:
    for employee in EMPLOYEES:
        key = str(employee["key"])
        add(records, "hr_employees", key, {
            "id": id_for("hr_employee", key),
            "tenant_id": tenant_id,
            "company_id": id_for("company", str(employee["company_key"])),
            "person_id": id_for("person", key),
            "employee_no": employee["employee_no"],
            "first_name": employee["first_name"],
            "last_name": employee["last_name"],
            "full_name": employee["full_name"],
            "identity_number": employee["identity_number"],
            "nationality": "TR",
            "phone": employee["phone"],
            "email": employee["email"],
            "city": "Ankara",
            "country": "Turkiye",
            "record_status": employee["record_status"],
            "employment_status": employee["employment_status"],
            "metadata_json": demo_metadata(str(employee["scenario_key"])),
        })
        position_key = employee.get("position_key")
        if position_key:
            add(records, "hr_employment_records", key, {
                "id": id_for("hr_employment_record", key),
                "tenant_id": tenant_id,
                "employee_id": id_for("hr_employee", key),
                "company_id": id_for("company", str(employee["company_key"])),
                "position_id": id_for("position", str(position_key)),
                "job_title": "Demo gorev",
                "employment_type": "full_time",
                "employment_status": "active",
                "start_date": today(-180),
                "sgk_status": (
                    "pending"
                    if employee["employment_status"] == "sgk_pending"
                    else "completed"
                ),
                "created_by": user_id("hr"),
            })
        add(records, "hr_employee_documents", key, {
            "id": id_for("hr_employee_document", key),
            "tenant_id": tenant_id,
            "employee_id": id_for("hr_employee", key),
            "company_id": id_for("company", str(employee["company_key"])),
            "document_type": "identity",
            "file_ref": demo_metadata(str(employee["scenario_key"]), file_name="demo-identity.pdf"),
            "issue_date": today(-300),
            "expiry_date": today(20) if key == "employee_technician" else None,
            "status": "missing" if key == "employee_technician" else "uploaded",
            "required": True,
            "notes": "Demo HR document slot",
        })


def add_product_after_sales_records(records: list[SeedRecord], tenant_id: str) -> None:
    for product in PRODUCTS:
        key = str(product["key"])
        add(records, "product_catalog", key, {
            "id": id_for("product", key),
            "tenant_id": tenant_id,
            "company_id": id_for("company", str(product["company_key"])),
            "product_code": product["product_code"],
            "product_name": product["product_name"],
            "product_type": product["product_type"],
            "category": product["category"],
            "brand": product["brand"],
            "model": product["model"],
            "unit": "adet",
            "serial_required": product["serial_required"],
            "warranty_months": product["warranty_months"],
            "maintenance_required": product["maintenance_required"],
            "maintenance_period_days": product["maintenance_period_days"],
            "serviceable": True,
            "active": True,
            "sale_enabled": True,
            "after_sales_enabled": product["after_sales_enabled"],
            "default_currency": "TRY",
            "default_price": 125000,
            "technical_specs": demo_metadata(str(product["scenario_key"])),
            "metadata_json": demo_metadata(str(product["scenario_key"])),
        })
    for asset in INSTALLED_ASSETS:
        key = str(asset["key"])
        add(records, "after_sales_installed_assets", key, {
            "id": id_for("installed_asset", key),
            "tenant_id": tenant_id,
            "owning_company_id": id_for("company", str(asset["company_key"])),
            "customer_account_id": id_for("cari_account", str(asset["customer_account_key"])),
            "customer_name": asset["customer_name"],
            "product_id": id_for("product", str(asset["product_key"])),
            "product_code": "PG-EDGE-100",
            "product_name": "PlaneGuard Edge Gateway",
            "serial_no": asset["serial_no"],
            "asset_tag": asset["asset_tag"],
            "installation_date": today(-100),
            "warranty_start_date": today(-100),
            "warranty_end_date": today(630),
            "warranty_status": asset["warranty_status"],
            "maintenance_required": asset["maintenance_required"],
            "next_maintenance_date": today(21),
            "city": asset["city"],
            "status": asset["status"],
            "metadata_json": demo_metadata(str(asset["scenario_key"])),
        })
    for template in CHECKLIST_TEMPLATES:
        key = str(template["key"])
        add(records, "after_sales_checklist_templates", key, {
            "id": id_for("after_sales_checklist_template", key),
            "tenant_id": tenant_id,
            "company_id": id_for("company", str(template["company_key"])),
            "product_id": id_for("product", str(template["product_key"])),
            "service_type": template["service_type"],
            "checklist_name": template["checklist_name"],
            "items": template["items"],
            "active": True,
            "metadata_json": demo_metadata(str(template["scenario_key"])),
            "created_by": user_id("admin"),
            "updated_by": user_id("admin"),
        })
    for plan in MAINTENANCE_PLANS:
        key = str(plan["key"])
        add(records, "after_sales_maintenance_plans", key, {
            "id": id_for("after_sales_maintenance_plan", key),
            "tenant_id": tenant_id,
            "company_id": id_for("company", str(plan["company_key"])),
            "product_id": id_for("product", str(plan["product_key"])),
            "plan_name": plan["plan_name"],
            "maintenance_type": plan["maintenance_type"],
            "interval_type": plan["interval_type"],
            "interval_value": plan["interval_value"],
            "checklist_template_id": id_for(
                "after_sales_checklist_template",
                "planeguard_maintenance_checklist",
            ),
            "active": True,
            "next_run_date": today(21),
            "last_run_date": today(-69),
            "default_priority": plan["default_priority"],
            "metadata_json": demo_metadata(str(plan["scenario_key"])),
            "created_by": user_id("admin"),
            "updated_by": user_id("admin"),
        })
    for due in MAINTENANCE_DUE_ITEMS:
        key = str(due["key"])
        add(records, "after_sales_maintenance_due_items", key, {
            "id": id_for("after_sales_maintenance_due_item", key),
            "tenant_id": tenant_id,
            "company_id": id_for("company", str(due["company_key"])),
            "maintenance_plan_id": id_for("after_sales_maintenance_plan", str(due["plan_key"])),
            "installed_asset_id": id_for("installed_asset", str(due["asset_key"])),
            "due_date": today(21),
            "status": due["status"],
            "notes": "Demo bakim takvimi kaydi",
            "metadata_json": demo_metadata(str(due["scenario_key"])),
            "created_by": user_id("admin"),
            "updated_by": user_id("admin"),
        })
    for request in SERVICE_REQUESTS:
        key = str(request["key"])
        add(records, "after_sales_service_requests", key, {
            "id": id_for("service_request", key),
            "tenant_id": tenant_id,
            "company_id": id_for("company", str(request["company_key"])),
            "customer_account_id": id_for("cari_account", str(request["customer_account_key"])),
            "customer_name": request["customer_name"],
            "installed_asset_id": id_for("installed_asset", str(request["asset_key"])),
            "product_id": id_for("product", str(request["product_key"])),
            "request_no": request["request_no"],
            "request_type": request["request_type"],
            "priority": request["priority"],
            "status": request["status"],
            "subject": request["subject"],
            "reported_at": utc_now(-2),
            "requested_date": today(-1),
            "due_date": today(3),
            "assigned_user_id": user_id(str(request["assigned_user_key"])),
            "source": "demo",
            "metadata_json": demo_metadata(str(request["scenario_key"])),
        })
    for record in SERVICE_RECORDS:
        key = str(record["key"])
        add(records, "after_sales_service_records", key, {
            "id": id_for("service_record", key),
            "tenant_id": tenant_id,
            "company_id": id_for("company", str(record["company_key"])),
            "service_request_id": id_for("service_request", str(record["request_key"])),
            "installed_asset_id": id_for("installed_asset", str(record["asset_key"])),
            "product_id": id_for("product", str(record["product_key"])),
            "service_no": record["service_no"],
            "service_type": record["service_type"],
            "service_date": today(-1),
            "technician_user_id": user_id("operations"),
            "status": record["status"],
            "result": record["result"],
            "warranty_covered": True,
            "photos": [
                demo_metadata(str(record["scenario_key"]), file_name="service-photo-demo.jpg")
            ],
            "metadata_json": demo_metadata(str(record["scenario_key"])),
        })
    for assignment in FIELD_ASSIGNMENTS:
        key = str(assignment["key"])
        add(records, "after_sales_field_assignments", key, {
            "id": id_for("after_sales_field_assignment", key),
            "tenant_id": tenant_id,
            "company_id": id_for("company", str(assignment["company_key"])),
            "service_request_id": id_for("service_request", str(assignment["request_key"])),
            "service_record_id": (
                id_for("service_record", str(assignment["record_key"]))
                if assignment.get("record_key")
                else None
            ),
            "installed_asset_id": id_for("installed_asset", str(assignment["asset_key"])),
            "technician_user_id": user_id(str(assignment["technician_user_key"])),
            "assigned_by": user_id("admin"),
            "assigned_at": utc_now(-1),
            "scheduled_start": utc_now(1),
            "scheduled_end": utc_now(1) + timedelta(hours=2),
            "status": assignment["status"],
            "notes": "Demo saha servis gorevi",
            "metadata_json": demo_metadata(str(assignment["scenario_key"])),
            "created_by": user_id("admin"),
            "updated_by": user_id("admin"),
        })
    for result in SERVICE_CHECKLIST_RESULTS:
        key = str(result["key"])
        add(records, "after_sales_service_checklist_results", key, {
            "id": id_for("after_sales_service_checklist_result", key),
            "tenant_id": tenant_id,
            "service_record_id": id_for("service_record", str(result["record_key"])),
            "checklist_template_id": id_for(
                "after_sales_checklist_template",
                str(result["template_key"]),
            ),
            "results": result["results"],
            "completed": result["completed"],
            "missing_required_items": result["missing_required_items"],
            "updated_by": user_id("operations"),
        })


def add_project_records(records: list[SeedRecord], tenant_id: str) -> None:
    for project in PROJECTS:
        key = str(project["key"])
        add(records, "project_projects", key, {
            "id": id_for("project", key),
            "tenant_id": tenant_id,
            "company_id": id_for("company", str(project["company_key"])),
            "project_key": project["project_key"],
            "project_name": project["project_name"],
            "project_type": project["project_type"],
            "status": project["status"],
            "priority": project["priority"],
            "progress_percent": project["progress_percent"],
            "currency": "TRY",
            "tags": ["pilot", "demo"],
            "metadata_json": demo_metadata(str(project["scenario_key"])),
            "created_by": user_id("admin"),
        })
    for task in TASKS:
        key = str(task["key"])
        add(records, "project_tasks", key, {
            "id": id_for("project_task", key),
            "tenant_id": tenant_id,
            "company_id": id_for("company", str(task["company_key"])),
            "project_id": id_for("project", str(task["project_key"])),
            "issue_key": task["issue_key"],
            "title": task["title"],
            "issue_type": task["issue_type"],
            "status": task["status"],
            "priority": task["priority"],
            "assignee_user_id": user_id(str(task["assignee_user_key"])),
            "reporter_user_id": user_id("admin"),
            "due_date": today(-2) if task["key"] == "overdue_task" else today(5),
            "labels": task["labels"],
            "related_module": "pilot",
            "metadata_json": demo_metadata(str(task["scenario_key"])),
            "created_by": user_id("admin"),
        })


def add_document_records(records: list[SeedRecord], tenant_id: str) -> None:
    for document in DOCUMENTS:
        key = str(document["key"])
        owner_entity_type = str(document["owner_entity_type"])
        owner_key = str(document["owner_key"])
        owner_id = resolve_entity_id(owner_entity_type, owner_key)
        branch_key = document.get("branch_key")
        add(records, "documents", key, {
            "id": id_for("document", key),
            "tenant_id": tenant_id,
            "company_id": id_for("company", str(document["company_key"])),
            "branch_id": id_for("branch", str(branch_key)) if branch_key else None,
            "owner_entity_type": owner_entity_type,
            "owner_entity_id": owner_id,
            "document_type": document["document_type"],
            "document_category": document["document_category"],
            "title": document["title"],
            "description": f"Demo belge: {document['scenario_key']}",
            "file_name": document["file_name"],
            "file_extension": document["file_extension"],
            "mime_type": document["mime_type"],
            "file_size": document["file_size"],
            "storage_bucket": "eden-demo-documents",
            "storage_path": f"tenant/{tenant_id}/demo/{key}/{document['file_name']}",
            "storage_provider": "supabase",
            "checksum": demo_id(f"checksum:{key}"),
            "version_no": 1,
            "status": document["status"],
            "verification_status": document["verification_status"],
            "required": document["required"],
            "issue_date": today(-120),
            "expiry_date": today(20) if key == "employee_expiring_doc" else None,
            "uploaded_by": user_id("admin"),
            "metadata_json": demo_metadata(str(document["scenario_key"])),
        })
        add(records, "document_relations", key, {
            "id": id_for("document_relation", key),
            "tenant_id": tenant_id,
            "document_id": id_for("document", key),
            "entity_type": owner_entity_type,
            "entity_id": owner_id,
            "relation_type": "primary" if document["required"] else "attachment",
        })


def add_import_export_records(records: list[SeedRecord], tenant_id: str) -> None:
    import_id = id_for("import_job", "import_customer_failed")
    add(records, "data_import_jobs", "import_customer_failed", {
        "id": import_id,
        "tenant_id": tenant_id,
        "company_id": id_for("company", "eden_tech"),
        "module_key": "importExport",
        "entity_type": "cari_account",
        "import_type": "create",
        "source_file_name": "demo-cari-import.csv",
        "source_file_ref": demo_metadata("import_source_file", file_name="demo-cari-import.csv"),
        "file_type": "csv",
        "status": "validation_failed",
        "total_rows": 24,
        "valid_rows": 19,
        "invalid_rows": 3,
        "duplicate_rows": 2,
        "warning_rows": 4,
        "field_mapping": {"account_name": "Cari Adi", "tax_number": "VKN"},
        "validation_summary": {"errors": 3, "duplicates": 2},
        "error_report_file_ref": demo_metadata("import_error_report"),
        "dry_run_result": {"would_create": 19, "would_skip": 5},
        "created_by": user_id("admin"),
        "updated_at": utc_now(-1),
    })
    add(records, "data_export_jobs", "export_company_ready", {
        "id": id_for("export_job", "export_company_ready"),
        "tenant_id": tenant_id,
        "module_key": "companies",
        "entity_type": "company",
        "report_key": "company_list",
        "filters": {"record_status": "active", "demo": True},
        "columns": ["trade_name", "tax_number", "record_status"],
        "file_type": "csv",
        "status": "completed",
        "row_count": 2,
        "file_ref": demo_metadata("export_file", file_name="company-list-demo.csv"),
        "created_by": user_id("auditor"),
        "completed_at": utc_now(-1),
    })


def add_process_records(records: list[SeedRecord], tenant_id: str) -> None:
    for operation in OPERATION_REQUESTS:
        key = str(operation["key"])
        add(records, "operation_requests", key, {
            "id": id_for("operation_request", key),
            "tenant_id": tenant_id,
            "company_id": id_for("company", str(operation["company_key"])),
            "module_key": operation["module_key"],
            "entity_type": operation["entity_type"],
            "entity_id": resolve_entity_id(
                str(operation["entity_type"]),
                str(operation["entity_key"]),
            ),
            "operation_type": operation["operation_type"],
            "operation_status": operation["operation_status"],
            "client_request_id": operation["client_request_id"],
            "requested_by": user_id("company_manager"),
            "payload_json": demo_metadata(str(operation["scenario_key"])),
            "error_json": (
                {"code": "DEMO_OPERATION_FAILED"}
                if operation["operation_status"] == "failed"
                else None
            ),
            "warning_json": {"message": "Demo precheck requires ownership review."},
            "created_at": utc_now(-2),
            "failed_at": utc_now(-1) if operation["operation_status"] == "failed" else None,
        })
    for process in PROCESS_INSTANCES:
        key = str(process["key"])
        add(records, "process_instances", key, {
            "id": id_for("process_instance", key),
            "tenant_id": tenant_id,
            "company_id": id_for("company", str(process["company_key"])),
            "module_key": process["module_key"],
            "process_key": process["process_key"],
            "process_version": "demo",
            "entity_type": process["entity_type"],
            "entity_id": resolve_entity_id(str(process["entity_type"]), str(process["entity_key"])),
            "operation_key": process["operation_key"],
            "operation_id": id_for("operation_request", str(process["operation_key_ref"])),
            "status": process["status"],
            "current_step_key": process["current_step_key"],
            "payload_json": demo_metadata(str(process["scenario_key"])),
            "started_by": user_id("company_manager"),
        })
    for task in PROCESS_TASKS:
        key = str(task["key"])
        task_id = id_for("process_task", key)
        add(records, "process_tasks", key, {
            "id": task_id,
            "tenant_id": tenant_id,
            "process_instance_id": id_for("process_instance", str(task["process_key"])),
            "company_id": id_for("company", str(task["company_key"])),
            "module_key": task["module_key"],
            "entity_type": task["entity_type"],
            "entity_id": resolve_entity_id(str(task["entity_type"]), str(task["entity_key"])),
            "step_key": task["step_key"],
            "title": task["title"],
            "description": "Demo Action Center approval task.",
            "status": task["status"],
            "assigned_to": user_id(str(task["assigned_user_key"])),
            "assigned_permission": "partners.approve",
            "due_at": utc_now(2),
            "payload_json": demo_metadata(str(task["scenario_key"])),
        })
        add(records, "process_approvals", key, {
            "id": id_for("process_approval", key),
            "tenant_id": tenant_id,
            "process_instance_id": id_for("process_instance", str(task["process_key"])),
            "task_id": task_id,
            "company_id": id_for("company", str(task["company_key"])),
            "module_key": task["module_key"],
            "approval_type": "capital_increase",
            "status": "pending",
            "requested_by": user_id("company_manager"),
            "approver_id": user_id(str(task["assigned_user_key"])),
            "approver_permission": "partners.approve",
            "payload_json": demo_metadata(str(task["scenario_key"])),
        })
    for outbox in OUTBOX_EVENTS:
        key = str(outbox["key"])
        add(records, "outbox_events", key, {
            "id": id_for("outbox_event", key),
            "tenant_id": tenant_id,
            "company_id": id_for("company", str(outbox["company_key"])),
            "module_key": outbox["module_key"],
            "event_type": outbox["event_type"],
            "aggregate_type": outbox["aggregate_type"],
            "aggregate_id": id_for("email_message", str(outbox["aggregate_key"])),
            "payload_json": demo_metadata(str(outbox["scenario_key"])),
            "status": outbox["status"],
            "retry_count": 2,
            "last_error": "Demo SMTP sandbox failure",
            "error_json": {"code": "DEMO_EMAIL_FAILED"},
        })


def add_audit_records(records: list[SeedRecord], tenant_id: str) -> None:
    for event in AUDIT_EVENTS:
        key = str(event["key"])
        add(records, "audit_logs", key, {
            "id": id_for("audit_log", key),
            "tenant_id": tenant_id,
            "company_id": id_for("company", str(event["company_key"])),
            "module_key": event["module_key"],
            "entity_type": event["entity_type"],
            "entity_id": resolve_entity_id(str(event["entity_type"]), str(event["entity_key"])),
            "action_type": event["action_type"],
            "action_key": event["action_key"],
            "user_id": user_id("auditor"),
            "request_id": f"demo-{key}",
            "old_values": {"demo": True},
            "new_values": demo_metadata(str(event["scenario_key"])),
            "changed_fields": ["demo"],
            "summary": event["summary"],
            "result_status": "success",
            "severity": event["severity"],
            "metadata_json": demo_metadata(str(event["scenario_key"])),
        })


def add_notification_records(records: list[SeedRecord], tenant_id: str) -> None:
    for notification in NOTIFICATIONS:
        key = str(notification["key"])
        add(records, "notifications", key, {
            "id": id_for("notification", key),
            "tenant_id": tenant_id,
            "user_id": user_id(str(notification["user_key"])),
            "company_id": id_for("company", str(notification["company_key"])),
            "module_key": notification["module_key"],
            "notification_type": notification["notification_type"],
            "title": notification["title"],
            "message": notification["message"],
            "severity": notification["severity"],
            "priority": notification["priority"],
            "status": "unread",
            "action_required": notification["priority"] in {"high", "urgent"},
            "target_page": notification["target_page"],
            "delivered_channels": ["in_app"],
            "delivery_status": "delivered",
            "metadata_json": demo_metadata(str(notification["scenario_key"])),
        })
    for email in EMAIL_MESSAGES:
        key = str(email["key"])
        add(records, "email_messages", key, {
            "id": id_for("email_message", key),
            "tenant_id": tenant_id,
            "user_id": user_id(str(email["user_key"])),
            "to_email": email["to_email"],
            "to_name": email["to_name"],
            "subject": email["subject"],
            "body_text": email["body_text"],
            "template_key": email["template_key"],
            "status": email["status"],
            "provider": "smtp",
            "retry_count": 3,
            "last_error": email["last_error"],
            "metadata_json": demo_metadata(str(email["scenario_key"])),
        })


def add_data_quality_records(records: list[SeedRecord], tenant_id: str) -> None:
    duplicate_group_id = id_for("duplicate_group", "glass_org")
    add(records, "duplicate_candidate_groups", "glass_org", {
        "id": duplicate_group_id,
        "tenant_id": tenant_id,
        "entity_type": "master_organization",
        "duplicate_group_key": "demo-glass-org",
        "match_score": 88,
        "match_reason": "trade_name normalized exact, same city",
        "severity": "strong",
        "status": "open",
        "suggested_master_id": id_for("master_organization", "master_glasstech"),
    }, conflict_columns=("tenant_id", "duplicate_group_key"))
    for master_key in ["master_glasstech", "master_glass_duplicate"]:
        add(records, "duplicate_candidate_items", master_key, {
            "id": id_for("duplicate_item", master_key),
            "tenant_id": tenant_id,
            "group_id": duplicate_group_id,
            "entity_type": "master_organization",
            "entity_id": id_for("master_organization", master_key),
            "display_name": "GlassTech Uretim A.S.",
            "match_fields": {"trade_name": "GlassTech Uretim A.S.", "city": "Ankara"},
            "is_suggested_master": master_key == "master_glasstech",
        })
    for finding in QUALITY_FINDINGS:
        key = str(finding["key"])
        entity_type = str(finding["entity_type"])
        entity_id = resolve_entity_id(entity_type, str(finding["entity_key"]))
        add(records, "data_quality_findings", key, {
            "id": id_for("data_quality_finding", key),
            "tenant_id": tenant_id,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "rule_key": finding["rule_key"],
            "severity": finding["severity"],
            "message": finding["message"],
            "status": "open",
            "suggested_action": demo_metadata(str(finding["scenario_key"]), action="review"),
        })
        add(records, "data_quality_scores", key, {
            "id": id_for("data_quality_score", key),
            "tenant_id": tenant_id,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "score": 62 if finding["severity"] == "warning" else 45,
            "status": "warning" if finding["severity"] == "warning" else "poor",
            "missing_fields": ["cari_account"] if "cari" in key else [],
            "duplicate_risk": {"match_score": 88} if "duplicate" in key else {},
            "relation_warnings": [finding["message"]],
            "last_checked_at": utc_now(-1),
        }, conflict_columns=("tenant_id", "entity_type", "entity_id"))


def resolve_entity_id(entity_type: str, key: str) -> str:
    mapping = {
        "company": "company",
        "branch": "branch",
        "employee": "hr_employee",
        "hr_employee": "hr_employee",
        "project_task": "project_task",
        "representative": "representative",
        "crm_stakeholder": "crm_stakeholder",
        "master_organization": "master_organization",
        "import_job": "import_job",
        "email_message": "email_message",
        "permission": "user",
    }
    return id_for(mapping.get(entity_type, entity_type), key)


def _person_identity(person_key: str) -> str | None:
    for person in PARTNER_PERSONS:
        if person["key"] == person_key:
            return str(person["national_id"])
    return None


async def run_demo_seed(options: DemoSeedOptions) -> SeedExecutionResult:
    settings = get_settings()
    assert_seed_allowed(settings.app_env, dry_run=options.dry_run)
    plan = build_demo_seed_plan(options)
    summary = plan.summary()
    if options.dry_run:
        return SeedExecutionResult(status="dry_run", summary=summary)

    async with get_session_factory()() as session:
        reset_deleted = 0
        if options.reset_demo_data:
            if not options.confirm_reset:
                raise RuntimeError("--reset-demo-data requires --confirm-reset.")
            reset_deleted = await reset_demo_data(session, plan)

        inserted_or_updated = 0
        skipped_tables: list[str] = []
        for record in plan.records:
            result = await upsert_seed_record(session, record)
            if result == "skipped":
                skipped_tables.append(record.table)
            else:
                inserted_or_updated += 1
        await session.commit()
    return SeedExecutionResult(
        status="seeded",
        summary=summary,
        inserted_or_updated=inserted_or_updated,
        skipped_tables=sorted(set(skipped_tables)),
        reset_deleted=reset_deleted,
    )


async def reset_demo_data(session: AsyncSession, plan: DemoSeedPlan) -> int:
    ids_by_table: dict[str, list[str]] = {}
    for record in plan.records:
        record_id = record.values.get("id")
        if isinstance(record_id, str):
            ids_by_table.setdefault(record.table, []).append(record_id)

    deleted = 0
    for table in RESET_ORDER:
        ids = ids_by_table.get(table)
        if not ids:
            continue
        if not await table_exists(session, table):
            continue
        params = {f"id_{index}": value for index, value in enumerate(ids)}
        placeholders = ", ".join(f":id_{index}" for index in range(len(ids)))
        result = await session.execute(
            text(f"delete from public.{quote_ident(table)} where id in ({placeholders})"),
            params,
        )
        rowcount = getattr(result, "rowcount", 0)
        deleted += int(rowcount or 0)
    return deleted


async def upsert_seed_record(session: AsyncSession, record: SeedRecord) -> str:
    columns = await table_columns(session, record.table)
    if not columns:
        return "skipped"
    values = {
        key: normalize_value(value, columns[key])
        for key, value in record.values.items()
        if key in columns
    }
    if not all(column in values for column in record.conflict_columns):
        return "skipped"
    if not values:
        return "skipped"

    column_names = list(values.keys())
    sql = build_upsert_sql(record.table, column_names, record.conflict_columns, columns)
    await session.execute(text(sql), values)
    return "upserted"


async def table_exists(session: AsyncSession, table_name: str) -> bool:
    result = await session.execute(
        text("select to_regclass(:table_name) is not null"),
        {"table_name": f"public.{table_name}"},
    )
    return bool(result.scalar_one())


async def table_columns(session: AsyncSession, table_name: str) -> dict[str, str]:
    result = await session.execute(
        text(
            """
            select column_name, udt_name
            from information_schema.columns
            where table_schema = 'public' and table_name = :table_name
            """
        ),
        {"table_name": table_name},
    )
    return {str(row["column_name"]): str(row["udt_name"]) for row in result.mappings().all()}


def normalize_value(value: Any, column_type: str) -> Any:
    if value is None:
        return None
    if column_type in {"json", "jsonb"}:
        return json.dumps(value, ensure_ascii=False, default=str)
    return value


def build_upsert_sql(
    table_name: str,
    columns: Sequence[str],
    conflict_columns: Sequence[str],
    column_types: Mapping[str, str],
) -> str:
    quoted_table = quote_ident(table_name)
    quoted_columns = ", ".join(quote_ident(column) for column in columns)
    placeholders = ", ".join(placeholder_for(column, column_types[column]) for column in columns)
    conflict = ", ".join(quote_ident(column) for column in conflict_columns)
    update_columns = [column for column in columns if column not in conflict_columns]
    if update_columns:
        updates = ", ".join(
            f"{quote_ident(column)} = excluded.{quote_ident(column)}"
            for column in update_columns
            if column not in {"created_at"}
        )
        if not updates:
            updates = (
                f"{quote_ident(conflict_columns[0])} = "
                f"excluded.{quote_ident(conflict_columns[0])}"
            )
    else:
        updates = (
            f"{quote_ident(conflict_columns[0])} = "
            f"excluded.{quote_ident(conflict_columns[0])}"
        )
    return (
        f"insert into public.{quoted_table} ({quoted_columns}) values ({placeholders}) "
        f"on conflict ({conflict}) do update set {updates}"
    )


def placeholder_for(column_name: str, column_type: str) -> str:
    if column_type in {"json", "jsonb"}:
        return f"cast(:{column_name} as jsonb)"
    return f":{column_name}"


def quote_ident(identifier: str) -> str:
    if not IDENTIFIER_PATTERN.match(identifier):
        raise ValueError(f"Invalid SQL identifier: {identifier}")
    return identifier


def build_validation_checks(tenant_id: str) -> list[ValidationCheck]:
    tenant_filter = f"tenant_id = '{tenant_id}'"
    def check(
        key: str,
        label: str,
        table: str,
        where_sql: str,
        minimum: int = 1,
    ) -> ValidationCheck:
        return ValidationCheck(key, label, table, where_sql, minimum)

    return [
        check("tenant", "Demo tenant exists", "erp_instances", f"id = '{tenant_id}'"),
        check(
            "active_company",
            "Active demo companies",
            "companies",
            f"{tenant_filter} and record_status = 'active'",
            2,
        ),
        check(
            "draft_company",
            "Draft company scenario",
            "companies",
            f"{tenant_filter} and record_status = 'draft'",
        ),
        check(
            "partners",
            "Active partners",
            "company_partners",
            f"{tenant_filter} and record_status = 'active'",
            3,
        ),
        check("representatives", "Representatives", "company_representatives", tenant_filter, 2),
        check("branches", "Branches", "company_branches", tenant_filter, 2),
        check("facilities", "Facilities", "company_facilities", tenant_filter, 2),
        check("cari", "Cari accounts", "accounting_cari_accounts", tenant_filter, 2),
        check("employees", "HR employees", "hr_employees", tenant_filter, 2),
        check("projects", "Pilot projects", "project_projects", tenant_filter, 1),
        check("tasks", "Project tasks", "project_tasks", tenant_filter, 2),
        check("products", "Product catalog", "product_catalog", tenant_filter, 1),
        check("assets", "Installed assets", "after_sales_installed_assets", tenant_filter, 1),
        check(
            "service_requests",
            "Service requests",
            "after_sales_service_requests",
            tenant_filter,
            1,
        ),
        check("crm", "CRM stakeholders", "crm_stakeholders", tenant_filter, 2),
        check("documents", "Documents", "documents", tenant_filter, 3),
        check("audit", "Audit logs", "audit_logs", tenant_filter, 3),
        check("notifications", "Notifications", "notifications", tenant_filter, 3),
        check("quality", "Data quality findings", "data_quality_findings", tenant_filter, 2),
    ]


async def validate_demo_data(tenant_id: str = DEMO_TENANT_ID) -> JsonDict:
    settings = get_settings()
    if not settings.database_url:
        return {
            "status": "not_configured",
            "message": "DATABASE_URL or SUPABASE_DB_URL is not configured.",
            "tenant_id": tenant_id,
            "checks": [],
        }
    checks = build_validation_checks(tenant_id)
    async with get_session_factory()() as session:
        results = []
        for check in checks:
            if not await table_exists(session, check.table):
                results.append({
                    "key": check.key,
                    "label": check.label,
                    "table": check.table,
                    "status": "missing_table",
                    "count": 0,
                    "minimum": check.minimum,
                })
                continue
            sql = (
                f"select count(*)::int from public.{quote_ident(check.table)} "
                f"where {check.where_sql}"
            )
            count_result = await session.execute(text(sql))
            count = int(count_result.scalar_one() or 0)
            results.append({
                "key": check.key,
                "label": check.label,
                "table": check.table,
                "status": "pass" if count >= check.minimum else "fail",
                "count": count,
                "minimum": check.minimum,
            })
    status = "pass" if all(row["status"] == "pass" for row in results) else "fail"
    return {
        "status": status,
        "tenant_id": tenant_id,
        "checks": results,
        "missing": [row for row in results if row["status"] != "pass"],
    }


def parse_args(argv: Sequence[str] | None = None) -> DemoSeedOptions:
    parser = argparse.ArgumentParser(description="Seed Eden ERP demo/pilot data.")
    parser.add_argument("--tenant-id", default=DEMO_TENANT_ID)
    parser.add_argument("--reset-demo-data", action="store_true")
    parser.add_argument("--confirm-reset", action="store_true")
    parser.add_argument("--module")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--verbose", action="store_true")
    args = parser.parse_args(argv)
    return DemoSeedOptions(
        tenant_id=str(args.tenant_id),
        reset_demo_data=bool(args.reset_demo_data),
        module=str(args.module) if args.module else None,
        dry_run=bool(args.dry_run),
        verbose=bool(args.verbose),
        confirm_reset=bool(args.confirm_reset),
    )


async def async_main(argv: Sequence[str] | None = None) -> int:
    options = parse_args(argv)
    try:
        result = await run_demo_seed(options)
    except (RuntimeError, DatabaseConfigurationError, SQLAlchemyError) as error:
        print(json.dumps({"status": "error", "message": str(error)}, indent=2, ensure_ascii=False))
        return 1
    print(json.dumps(result.__dict__, indent=2, ensure_ascii=False, default=str))
    return 0


def main(argv: Sequence[str] | None = None) -> int:
    return asyncio.run(async_main(argv))


if __name__ == "__main__":
    raise SystemExit(main())
