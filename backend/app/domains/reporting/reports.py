# ruff: noqa: E501

from __future__ import annotations

from typing import Any

from fastapi import status
from sqlalchemy import text

from app.core.errors import DomainError
from app.domains.operations.service import table_exists
from app.domains.reporting.schemas import ReportDefinition, ReportingFilter, ReportResult
from app.domains.reporting.service import (
    ReportingQueryContext,
    can,
    meta,
    safe_scalar,
)

REPORT_DEFINITIONS: dict[str, dict[str, Any]] = {
    "company_status_report": {
        "title": "Sirket durum raporu",
        "module_key": "companies",
        "permission": "companies.view",
        "table": "public.companies",
        "columns": ["id", "trade_name", "status", "city", "updated_at"],
        "sort": "updated_at",
    },
    "official_changes_report": {
        "title": "Resmi degisiklik raporu",
        "module_key": "companies",
        "permission": "companies.view",
        "table": "public.company_official_change_transactions",
        "columns": ["id", "company_id", "transaction_type", "status", "created_at"],
        "sort": "created_at",
    },
    "company_public_registration_report": {
        "title": "Kamu/tescil raporu",
        "module_key": "companies",
        "permission": "companies.view",
        "table": "public.companies",
        "columns": ["id", "trade_name", "registry_number", "tax_number", "updated_at"],
        "sort": "updated_at",
    },
    "current_ownership_report": {
        "title": "Guncel ortaklik raporu",
        "module_key": "partners",
        "permission": "partners.view",
        "table": "public.v_current_ownership",
        "columns": ["company_id", "partner_id", "share_ratio", "voting_ratio", "profit_ratio"],
        "sort": "company_id",
    },
    "ownership_transactions_report": {
        "title": "Ortaklik islemleri raporu",
        "module_key": "partners",
        "permission": "partners.view",
        "table": "public.ownership_transactions",
        "columns": ["id", "company_id", "transaction_type", "status", "created_at"],
        "sort": "created_at",
    },
    "incomplete_ownership_distribution_report": {
        "title": "Eksik ortaklik dagilimi",
        "module_key": "partners",
        "permission": "partners.view",
        "table": "public.v_current_ownership",
        "columns": ["company_id", "share_ratio"],
        "sort": "company_id",
    },
    "representative_authority_report": {
        "title": "Temsil yetkileri raporu",
        "module_key": "representatives",
        "permission": "representatives.view",
        "table": "public.v_current_representative_authorities",
        "columns": [
            "company_id",
            "representative_id",
            "authority_status",
            "scope_type",
            "valid_until",
        ],
        "sort": "valid_until",
    },
    "expiring_authorities_report": {
        "title": "Suresi yaklasan yetkiler",
        "module_key": "representatives",
        "permission": "representatives.view",
        "table": "public.v_current_representative_authorities",
        "columns": ["company_id", "representative_id", "authority_status", "valid_until"],
        "sort": "valid_until",
        "extra_where": "valid_until between current_date and current_date + interval '30 days'",
    },
    "branch_scoped_authorities_report": {
        "title": "Sube bazli yetkiler",
        "module_key": "representatives",
        "permission": "representatives.view",
        "table": "public.v_current_representative_authorities",
        "columns": ["company_id", "representative_id", "branch_id", "authority_status"],
        "sort": "company_id",
        "extra_where": "branch_id is not null",
    },
    "branch_status_report": {
        "title": "Sube durum raporu",
        "module_key": "branches",
        "permission": "branches.view",
        "table": "public.company_branches",
        "columns": ["id", "company_id", "branch_name", "status", "city", "updated_at"],
        "sort": "updated_at",
    },
    "branch_closing_impact_report": {
        "title": "Sube kapanis etki raporu",
        "module_key": "branches",
        "permission": "branches.view",
        "table": "public.company_branches",
        "columns": ["id", "company_id", "branch_name", "status", "updated_at"],
        "sort": "updated_at",
    },
    "branch_facility_organization_report": {
        "title": "Sube tesis/organizasyon raporu",
        "module_key": "branches",
        "permission": "branches.view",
        "table": "public.company_branches",
        "columns": ["id", "company_id", "branch_name", "facility_id", "organization_unit_id"],
        "sort": "branch_name",
    },
    "cari_accounts_report": {
        "title": "Cari kartlar raporu",
        "module_key": "accounting",
        "permission": "accounting.view",
        "table": "public.accounting_cari_accounts",
        "columns": [
            "id",
            "company_id",
            "account_code",
            "account_name",
            "cari_role",
            "current_balance",
        ],
        "sort": "account_name",
    },
    "cari_transactions_report": {
        "title": "Cari hareketler raporu",
        "module_key": "accounting",
        "permission": "accounting.view",
        "table": "public.accounting_cari_transactions",
        "columns": [
            "id",
            "company_id",
            "account_id",
            "transaction_date",
            "transaction_type",
            "amount",
            "document_status",
            "reconciliation_status",
        ],
        "sort": "transaction_date",
    },
    "missing_documents_report": {
        "title": "Belge aranacak hareketler",
        "module_key": "accounting",
        "permission": "accounting.view",
        "table": "public.accounting_cari_transactions",
        "columns": [
            "id",
            "company_id",
            "account_id",
            "transaction_date",
            "amount",
            "document_status",
        ],
        "sort": "transaction_date",
        "extra_where": "document_status = 'document_needed'",
    },
    "unmatched_transactions_report": {
        "title": "Eslesmeyen hareketler",
        "module_key": "accounting",
        "permission": "accounting.view",
        "table": "public.accounting_cari_transactions",
        "columns": [
            "id",
            "company_id",
            "account_id",
            "transaction_date",
            "amount",
            "reconciliation_status",
        ],
        "sort": "transaction_date",
        "extra_where": "reconciliation_status = 'unmatched'",
    },
    "unmatched_bank_transactions_report": {
        "title": "Eslesmeyen banka hareketleri",
        "module_key": "accounting",
        "permission": "accounting.reconciliationView",
        "table": "public.accounting_bank_transactions",
        "columns": [
            "id",
            "company_id",
            "bank_account_id",
            "transaction_date",
            "amount",
            "direction",
            "reconciliation_status",
        ],
        "sort": "transaction_date",
        "extra_where": "reconciliation_status in ('unmatched','needs_review')",
    },
    "unmatched_invoices_report": {
        "title": "Eslesmeyen e-belgeler",
        "module_key": "accounting",
        "permission": "accounting.reconciliationView",
        "table": "public.accounting_e_documents",
        "columns": [
            "id",
            "company_id",
            "invoice_no",
            "issue_date",
            "payable_amount",
            "status",
            "reconciliation_status",
        ],
        "sort": "issue_date",
        "extra_where": "reconciliation_status in ('unmatched','needs_review')",
    },
    "capital_reconciliation_report": {
        "title": "Sermaye mutabakati",
        "module_key": "accounting",
        "permission": "accounting.capitalReconciliationView",
        "table": "public.accounting_capital_reconciliation",
        "columns": [
            "id",
            "company_id",
            "capital_transaction_id",
            "partner_id",
            "expected_amount",
            "paid_amount",
            "outstanding_amount",
            "reconciliation_status",
        ],
        "sort": "updated_at",
    },
    "rejected_documents_report": {
        "title": "Reddedilen e-belgeler",
        "module_key": "accounting",
        "permission": "accounting.eDocumentsView",
        "table": "public.accounting_e_documents",
        "columns": ["id", "company_id", "invoice_no", "issue_date", "payable_amount", "status"],
        "sort": "issue_date",
        "extra_where": "status = 'rejected'",
    },
    "employee_status_report": {
        "title": "Calisan durum raporu",
        "module_key": "hr",
        "permission": "hr.view",
        "table": "public.hr_employees",
        "columns": [
            "id",
            "company_id",
            "employee_no",
            "full_name",
            "record_status",
            "employment_status",
        ],
        "sort": "full_name",
    },
    "sgk_pending_report": {
        "title": "SGK bekleyen raporu",
        "module_key": "hr",
        "permission": "hr.view",
        "table": "public.hr_employment_records",
        "columns": ["id", "company_id", "employee_id", "start_date", "sgk_status"],
        "sort": "start_date",
        "extra_where": "sgk_status = 'pending'",
    },
    "employee_documents_report": {
        "title": "Ozluk belge raporu",
        "module_key": "hr",
        "permission": "hr.view",
        "table": "public.hr_employee_documents",
        "columns": ["id", "company_id", "employee_id", "document_type", "status", "expiry_date"],
        "sort": "expiry_date",
    },
    "leave_balance_report": {
        "title": "Izin bakiyesi raporu",
        "module_key": "hr",
        "permission": "hr.leaveView",
        "table": "public.hr_leave_balances",
        "columns": [
            "id",
            "company_id",
            "employee_id",
            "leave_type_id",
            "period_year",
            "entitled_days",
            "used_days",
            "pending_days",
            "remaining_days",
            "status",
        ],
        "sort": "remaining_days",
    },
    "leave_requests_report": {
        "title": "Izin talepleri raporu",
        "module_key": "hr",
        "permission": "hr.leaveView",
        "table": "public.hr_leave_requests",
        "columns": [
            "id",
            "company_id",
            "employee_id",
            "leave_type_id",
            "request_no",
            "start_date",
            "end_date",
            "total_days",
            "status",
        ],
        "sort": "start_date",
    },
    "attendance_report": {
        "title": "Devam devamsizlik raporu",
        "module_key": "hr",
        "permission": "hr.attendanceView",
        "table": "public.hr_attendance_records",
        "columns": [
            "id",
            "company_id",
            "employee_id",
            "work_date",
            "status",
            "planned_hours",
            "actual_hours",
            "overtime_hours",
            "missing_hours",
            "approved",
        ],
        "sort": "work_date",
    },
    "overtime_report": {
        "title": "Fazla mesai raporu",
        "module_key": "hr",
        "permission": "hr.attendanceView",
        "table": "public.hr_attendance_records",
        "columns": [
            "id",
            "company_id",
            "employee_id",
            "work_date",
            "status",
            "planned_hours",
            "actual_hours",
            "overtime_hours",
            "approved",
        ],
        "sort": "work_date",
        "extra_where": "coalesce(overtime_hours, 0) > 0",
    },
    "timesheet_period_report": {
        "title": "Puantaj donemi raporu",
        "module_key": "hr",
        "permission": "hr.timesheetView",
        "table": "public.hr_timesheet_periods",
        "columns": [
            "id",
            "company_id",
            "period_key",
            "period_start",
            "period_end",
            "status",
            "employee_count",
            "total_leave_days",
            "total_absent_days",
            "total_overtime_hours",
        ],
        "sort": "period_start",
    },
    "payroll_preparation_report": {
        "title": "Bordro hazirlik raporu",
        "module_key": "hr",
        "permission": "hr.payrollPrepView",
        "table": "public.hr_payroll_preparation_rows",
        "columns": [
            "id",
            "company_id",
            "period_id",
            "employee_id",
            "worked_days",
            "leave_days",
            "unpaid_leave_days",
            "sick_leave_days",
            "absent_days",
            "overtime_hours",
            "payroll_status",
        ],
        "sort": "updated_at",
    },
    "project_status_report": {
        "title": "Proje durum raporu",
        "module_key": "project_management",
        "permission": "projects.view",
        "table": "public.project_projects",
        "columns": [
            "id",
            "company_id",
            "project_key",
            "project_name",
            "status",
            "progress_percent",
        ],
        "sort": "project_key",
    },
    "overdue_tasks_report": {
        "title": "Geciken gorevler",
        "module_key": "project_management",
        "permission": "tasks.view",
        "table": "public.project_tasks",
        "columns": ["id", "company_id", "issue_key", "title", "status", "priority", "due_date"],
        "sort": "due_date",
        "extra_where": "due_date < current_date and status not in ('done','cancelled')",
    },
    "assignee_workload_report": {
        "title": "Atanan is yuku",
        "module_key": "project_management",
        "permission": "tasks.view",
        "table": "public.project_tasks",
        "columns": [
            "id",
            "company_id",
            "issue_key",
            "title",
            "status",
            "assignee_user_id",
            "assignee_employee_id",
        ],
        "sort": "status",
    },
    "installed_assets_report": {
        "title": "Kurulu urunler raporu",
        "module_key": "after_sales",
        "permission": "afterSales.view",
        "table": "public.after_sales_installed_assets",
        "columns": [
            "id",
            "owning_company_id",
            "customer_name",
            "product_name",
            "serial_no",
            "warranty_status",
            "next_maintenance_date",
        ],
        "sort": "customer_name",
    },
    "open_service_requests_report": {
        "title": "Acik servis talepleri",
        "module_key": "after_sales",
        "permission": "afterSales.view",
        "table": "public.after_sales_service_requests",
        "columns": [
            "id",
            "company_id",
            "request_no",
            "customer_name",
            "priority",
            "status",
            "due_date",
        ],
        "sort": "due_date",
        "extra_where": "status in ('new','triage','assigned','in_progress','waiting_customer')",
    },
    "maintenance_due_report": {
        "title": "Bakimi gelenler",
        "module_key": "after_sales",
        "permission": "afterSales.view",
        "table": "public.after_sales_maintenance_due_items",
        "columns": [
            "id",
            "company_id",
            "maintenance_plan_id",
            "installed_asset_id",
            "due_date",
            "status",
        ],
        "sort": "due_date",
        "extra_where": "status in ('scheduled','due_soon','overdue') and due_date <= current_date + interval '30 days'",
    },
    "field_assignment_report": {
        "title": "Saha servis gorevleri",
        "module_key": "after_sales",
        "permission": "afterSales.fieldServiceView",
        "table": "public.after_sales_field_assignments",
        "columns": [
            "id",
            "company_id",
            "service_request_id",
            "service_record_id",
            "technician_user_id",
            "technician_employee_id",
            "scheduled_start",
            "status",
        ],
        "sort": "scheduled_start",
    },
    "technician_workload_report": {
        "title": "Teknisyen is yuku",
        "module_key": "after_sales",
        "permission": "afterSales.fieldServiceView",
        "table": "public.after_sales_field_assignments",
        "columns": [
            "id",
            "company_id",
            "technician_user_id",
            "technician_employee_id",
            "scheduled_start",
            "scheduled_end",
            "status",
        ],
        "sort": "scheduled_start",
    },
    "warranty_service_report": {
        "title": "Garanti kapsamli servisler",
        "module_key": "after_sales",
        "permission": "afterSales.serviceReportView",
        "table": "public.after_sales_service_records",
        "columns": [
            "id",
            "company_id",
            "service_no",
            "service_type",
            "service_date",
            "warranty_covered",
            "result",
        ],
        "sort": "service_date",
    },
    "stakeholder_report": {
        "title": "Paydas raporu",
        "module_key": "crm",
        "permission": "crm.view",
        "table": "public.crm_stakeholders",
        "columns": [
            "id",
            "company_id",
            "display_name",
            "stakeholder_type",
            "relationship_status",
            "customer_status",
            "supplier_status",
        ],
        "sort": "display_name",
    },
    "lead_followup_report": {
        "title": "Lead takip raporu",
        "module_key": "crm",
        "permission": "crm.view",
        "table": "public.crm_stakeholders",
        "columns": [
            "id",
            "company_id",
            "display_name",
            "lead_status",
            "next_followup_date",
            "assigned_owner_user_id",
        ],
        "sort": "next_followup_date",
        "extra_where": "stakeholder_type = 'lead' or customer_status in ('lead','prospect')",
    },
    "customer_supplier_report": {
        "title": "Musteri/Tedarikci raporu",
        "module_key": "crm",
        "permission": "crm.view",
        "table": "public.crm_stakeholders",
        "columns": [
            "id",
            "company_id",
            "display_name",
            "stakeholder_type",
            "related_cari_account_id",
        ],
        "sort": "display_name",
        "extra_where": "stakeholder_type in ('customer','supplier','customer_supplier')",
    },
    "audit_summary_report": {
        "title": "Audit ozet raporu",
        "module_key": "audit",
        "permission": "reporting.viewAuditSummary",
        "table": "public.audit_logs",
        "columns": ["id", "created_at", "actor_user_id", "action_type", "entity_type", "entity_id"],
        "sort": "created_at",
    },
    "permission_denied_report": {
        "title": "Yetki reddi raporu",
        "module_key": "audit",
        "permission": "reporting.viewAuditSummary",
        "table": "public.audit_logs",
        "columns": ["id", "created_at", "actor_user_id", "action_type", "entity_type"],
        "sort": "created_at",
        "extra_where": "action_type ilike '%permission%'",
    },
    "operation_failures_report": {
        "title": "Tamamlanamayan islemler",
        "module_key": "system",
        "permission": "reporting.viewSystem",
        "table": "public.operation_requests",
        "columns": [
            "id",
            "company_id",
            "module_key",
            "operation_type",
            "operation_status",
            "started_at",
        ],
        "sort": "started_at",
        "extra_where": "operation_status in ('failed','stuck')",
    },
}


def list_report_definitions(ctx: ReportingQueryContext) -> list[ReportDefinition]:
    return [
        to_definition(key, item)
        for key, item in REPORT_DEFINITIONS.items()
        if can(ctx.request_context, item["permission"])
        or can(ctx.request_context, "reporting.admin")
    ]


def get_report_definition(ctx: ReportingQueryContext, report_key: str) -> ReportDefinition:
    item = REPORT_DEFINITIONS.get(report_key)
    if not item:
        raise DomainError("Rapor tanimi bulunamadi.", "REPORT_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    if not can(ctx.request_context, item["permission"]) and not can(
        ctx.request_context, "reporting.admin"
    ):
        raise DomainError(
            "Bu rapor icin yetkiniz bulunmuyor.",
            "REPORT_PERMISSION_DENIED",
            status.HTTP_403_FORBIDDEN,
        )
    return to_definition(report_key, item)


async def query_report(
    ctx: ReportingQueryContext, report_key: str, filters: ReportingFilter | None = None
) -> ReportResult:
    definition = get_report_definition(ctx, report_key)
    if filters:
        ctx.filters = filters
    item = REPORT_DEFINITIONS[report_key]
    table = item["table"]
    if not await table_exists(ctx.session, table):
        return ReportResult(
            data=[],
            meta=meta(ctx.filters.page, ctx.filters.page_size, 0),
            columns=definition.columns,
            warnings=[f"{definition.title} verisi hazir degil."],
        )

    columns = item["columns"]
    select_columns = ", ".join(columns)
    where, params = build_report_where(ctx, item)
    total = await safe_scalar(
        ctx,
        table,
        f"select count(*) from {table} where {' and '.join(where)}",
        params,
        label=definition.title,
    )
    params["limit"] = ctx.filters.page_size
    params["offset"] = (ctx.filters.page - 1) * ctx.filters.page_size
    sort = item.get("sort") or columns[0]
    rows = []
    try:
        result = await ctx.session.execute(
            text(
                f"select {select_columns} from {table} where {' and '.join(where)} order by {sort} desc limit :limit offset :offset"
            ),
            params,
        )
        rows = [dict(row) for row in result.mappings()]
    except Exception:
        await ctx.session.rollback()
        ctx.warnings.append(f"{definition.title} sonucu su anda getirilemedi.")
    return ReportResult(
        data=rows,
        meta=meta(ctx.filters.page, ctx.filters.page_size, int(total)),
        columns=definition.columns,
        summary={"total": int(total)},
        warnings=ctx.warnings,
    )


def to_definition(key: str, item: dict[str, Any]) -> ReportDefinition:
    return ReportDefinition(
        report_key=key,
        title=item["title"],
        description=f"{item['title']} icin filtrelenebilir, export hazir MVP rapor.",
        module_key=item["module_key"],
        required_permission=item["permission"],
        filters=["company_id", "branch_id", "date_from", "date_to", "status"],
        columns=[
            {"key": column, "label": column.replace("_", " ").title()} for column in item["columns"]
        ],
        default_sort=item.get("sort"),
        export_enabled=True,
    )


def build_report_where(
    ctx: ReportingQueryContext, item: dict[str, Any]
) -> tuple[list[str], dict[str, Any]]:
    table = item["table"]
    params: dict[str, Any] = {"tenant_id": ctx.tenant_id}
    where = ["tenant_id = :tenant_id"]
    if "companies" not in table and "v_current_ownership" not in table:
        where.append("coalesce(is_deleted, false) = false")
    company_column = (
        "owning_company_id" if "after_sales_installed_assets" in table else "company_id"
    )
    if ctx.filters.company_id:
        where.append(f"{company_column} = :company_id")
        params["company_id"] = ctx.filters.company_id
    elif ctx.request_context.company_scope_ids and company_column in item["columns"]:
        where.append(f"{company_column} = any(cast(:company_scope_ids as uuid[]))")
        params["company_scope_ids"] = ctx.request_context.company_scope_ids
    if ctx.filters.status and "status" in item["columns"]:
        where.append("status = :status")
        params["status"] = ctx.filters.status
    if item.get("extra_where"):
        where.append(f"({item['extra_where']})")
    return where, params
