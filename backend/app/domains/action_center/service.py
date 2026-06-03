from __future__ import annotations

from datetime import UTC, date, datetime
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.serialization import row_to_dict, rows_to_dicts
from app.domains.operations.service import table_exists

DEFAULT_PAGE_SIZE = 50
STUCK_OPERATION_MINUTES = 10
STALE_OUTBOX_MINUTES = 15
SYSTEM_PERMISSIONS = {
    "__eden_demo_allow_all__",
    "settings.view",
    "settings.edit",
    "settings.modulesManage",
    "settings.usersManage",
    "audit.view",
    "dataQuality.view",
    "dataQuality.reviewDuplicates",
    "dataQuality.merge",
    "admin",
}
ACCOUNTING_PERMISSIONS = {
    "__eden_demo_allow_all__",
    "accounting.view",
    "accounting.reconciliationView",
    "accounting.reconciliationManage",
    "accounting.bankTransactionsView",
    "accounting.eDocumentsView",
    "accounting.capitalReconciliationView",
    "accounting.edit",
    "system.admin",
}


def filter_record_items(
    items: list[dict[str, Any]],
    *,
    entity_type: str,
    entity_id: str,
) -> list[dict[str, Any]]:
    return [
        item
        for item in items
        if _same_entity_type(item.get("entity_type"), entity_type)
        and (
            item.get("entity_id") == entity_id
            or item.get("company_id") == entity_id
            or item.get("branch_id") == entity_id
        )
    ]


async def list_action_center_items(
    session: AsyncSession,
    context: dict[str, Any],
    query: dict[str, Any],
) -> dict[str, Any]:
    page = max(1, int(query.get("page") or 1))
    requested_page_size = int(query.get("pageSize") or query.get("limit") or DEFAULT_PAGE_SIZE)
    page_size = min(max(1, requested_page_size), 200)
    limit = max(page_size, int(query.get("limit") or page_size))
    items: list[dict[str, Any]] = []
    warnings: list[str] = []

    if await table_exists(session, "public.process_tasks"):
        task_result = await session.execute(
            text(
                """
                select id, tenant_id, process_instance_id, company_id, module_key,
                       entity_type, entity_id, step_key, title, description, status,
                       assigned_to, assigned_role, assigned_permission, due_at,
                       completed_at, updated_at, created_at
                from public.process_tasks
                where tenant_id = :tenant_id
                  and status in ('open', 'in_progress', 'overdue')
                  and coalesce(is_deleted, false) = false
                order by coalesce(due_at, created_at) asc
                limit :limit
                """
            ),
            {"tenant_id": context["tenant_id"], "limit": limit},
        )
        items.extend(
            _normalize_task(row, str(context["tenant_id"]))
            for row in rows_to_dicts(list(task_result.mappings().all()))
        )
    else:
        warnings.append("Gorev kaynagi hazir degil.")

    if await table_exists(session, "public.project_tasks"):
        project_task_result = await session.execute(
            text(
                """
                select t.id, t.tenant_id, t.company_id, t.project_id, t.branch_id,
                       t.organization_unit_id, t.facility_id, t.issue_key, t.title,
                       t.description, t.status, t.priority, t.assignee_user_id,
                       t.assignee_employee_id, t.due_date, t.related_module,
                       t.related_entity_type, t.related_entity_id, t.updated_at,
                       t.created_at, p.project_key, p.project_name
                from public.project_tasks t
                left join public.project_projects p
                  on p.tenant_id = t.tenant_id and p.id = t.project_id
                where t.tenant_id = :tenant_id
                  and t.status in ('backlog','todo','in_progress','blocked','review')
                  and (
                    cast(:user_id as uuid) is null
                    or t.assignee_user_id = cast(:user_id as uuid)
                  )
                  and coalesce(t.is_deleted, false) = false
                order by coalesce(t.due_date, t.created_at::date) asc
                limit :limit
                """
            ),
            {
                "tenant_id": context["tenant_id"],
                "user_id": context.get("user_id"),
                "limit": limit,
            },
        )
        items.extend(
            _normalize_project_task(row, str(context["tenant_id"]))
            for row in rows_to_dicts(list(project_task_result.mappings().all()))
        )

    if await table_exists(session, "public.process_approvals"):
        approval_result = await session.execute(
            text(
                """
                select id, tenant_id, process_instance_id, task_id, company_id,
                       module_key, approval_type, status, requested_by, approver_id,
                       approver_role, approver_permission, requested_at, decided_at,
                       payload_json, created_at, updated_at
                from public.process_approvals
                where tenant_id = :tenant_id
                  and status = 'pending'
                order by requested_at desc
                limit :limit
                """
            ),
            {"tenant_id": context["tenant_id"], "limit": limit},
        )
        items.extend(
            _normalize_approval(row, str(context["tenant_id"]))
            for row in rows_to_dicts(list(approval_result.mappings().all()))
        )
    else:
        warnings.append("Onay kaynagi hazir degil.")

    if await table_exists(session, "public.operation_requests"):
        operation_result = await session.execute(
            text(
                """
                select id, tenant_id, company_id, module_key, entity_type, entity_id,
                       operation_type, operation_status, requested_by, error_json,
                       warning_json, created_at, started_at, completed_at, failed_at
                from public.operation_requests
                where tenant_id = :tenant_id
                  and operation_status in (
                    'failed', 'requires_action', 'accepted', 'processing', 'pending'
                  )
                order by created_at desc
                limit :limit
                """
            ),
            {"tenant_id": context["tenant_id"], "limit": limit},
        )
        for row in rows_to_dicts(list(operation_result.mappings().all())):
            if (
                row.get("operation_status") in {"failed", "requires_action"}
                or _minutes_since(row.get("started_at") or row.get("created_at"))
                >= STUCK_OPERATION_MINUTES
            ):
                items.append(_normalize_operation(row, str(context["tenant_id"])))

    if await table_exists(session, "public.data_import_jobs"):
        import_result = await session.execute(
            text(
                """
                select id, tenant_id, company_id, module_key, entity_type, status,
                       total_rows, valid_rows, invalid_rows, duplicate_rows, warning_rows,
                       imported_rows, failed_rows, created_at, updated_at, completed_at
                from public.data_import_jobs
                where tenant_id = :tenant_id
                  and status in (
                    'validating',
                    'validation_failed',
                    'ready_to_import',
                    'importing',
                    'failed'
                  )
                order by updated_at desc
                limit :limit
                """
            ),
            {"tenant_id": context["tenant_id"], "limit": limit},
        )
        items.extend(
            _normalize_data_job(row, str(context["tenant_id"]), "import")
            for row in rows_to_dicts(list(import_result.mappings().all()))
        )

    if await table_exists(session, "public.data_export_jobs"):
        export_result = await session.execute(
            text(
                """
                select id, tenant_id, module_key, entity_type, status, row_count,
                       created_at, completed_at
                from public.data_export_jobs
                where tenant_id = :tenant_id
                  and status in ('completed','failed')
                order by completed_at desc nulls last, created_at desc
                limit :limit
                """
            ),
            {"tenant_id": context["tenant_id"], "limit": limit},
        )
        items.extend(
            _normalize_data_job(row, str(context["tenant_id"]), "export")
            for row in rows_to_dicts(list(export_result.mappings().all()))
        )

    if await table_exists(session, "public.data_bulk_action_jobs"):
        bulk_result = await session.execute(
            text(
                """
                select id, tenant_id, module_key, entity_type, action_key, status,
                       total_count, success_count, failed_count, skipped_count,
                       created_at, completed_at
                from public.data_bulk_action_jobs
                where tenant_id = :tenant_id
                  and status in (
                    'validation_failed',
                    'ready_to_confirm',
                    'processing',
                    'completed',
                    'failed'
                  )
                order by created_at desc
                limit :limit
                """
            ),
            {"tenant_id": context["tenant_id"], "limit": limit},
        )
        items.extend(
            _normalize_data_job(row, str(context["tenant_id"]), "bulk")
            for row in rows_to_dicts(list(bulk_result.mappings().all()))
        )

    if await table_exists(session, "public.documents"):
        document_result = await session.execute(
            text(
                """
                select id, tenant_id, company_id, branch_id, owner_entity_type,
                       owner_entity_id, document_type, title, status,
                       verification_status, required, expiry_date, updated_at,
                       created_at, rejected_reason
                from public.documents
                where tenant_id = :tenant_id
                  and coalesce(is_deleted, false) = false
                  and (
                    status in ('rejected', 'expired')
                    or verification_status in ('pending', 'rejected')
                    or (
                      expiry_date is not null
                      and expiry_date <= current_date + interval '30 days'
                    )
                  )
                order by coalesce(expiry_date, updated_at::date, created_at::date) asc
                limit :limit
                """
            ),
            {"tenant_id": context["tenant_id"], "limit": limit},
        )
        items.extend(
            _normalize_document_item(row, str(context["tenant_id"]))
            for row in rows_to_dicts(list(document_result.mappings().all()))
        )

    hr_scope_sql = ""
    hr_params: dict[str, Any] = {
        "tenant_id": context["tenant_id"],
        "user_id": context.get("user_id"),
        "limit": limit,
    }
    if context.get("company_scope_ids"):
        hr_scope_sql = "and company_id = any(cast(:hr_company_scope_ids as uuid[]))"
        hr_params["hr_company_scope_ids"] = context["company_scope_ids"]

    if _can_see_hr_items(context) and await table_exists(session, "public.hr_leave_requests"):
        leave_user_filter = (
            ""
            if _can_manage_hr_items(context)
            else "and (approver_id = :user_id or requested_by = :user_id)"
        )
        leave_result = await session.execute(
            text(
                f"""
                select id, tenant_id, company_id, employee_id, request_no, start_date,
                       end_date, total_days, status, approver_id, requested_by,
                       created_at, updated_at
                from public.hr_leave_requests
                where tenant_id = :tenant_id
                  and coalesce(is_deleted, false) = false
                  and status = 'pending_approval'
                  {hr_scope_sql}
                  {leave_user_filter}
                order by created_at asc
                limit :limit
                """
            ),
            hr_params,
        )
        items.extend(
            _normalize_hr_leave_request(row, str(context["tenant_id"]))
            for row in rows_to_dicts(list(leave_result.mappings().all()))
        )

    if _can_manage_hr_items(context) and await table_exists(
        session,
        "public.hr_timesheet_periods",
    ):
        timesheet_result = await session.execute(
            text(
                f"""
                select id, tenant_id, company_id, period_key, period_start, period_end,
                       status, employee_count, created_at, updated_at
                from public.hr_timesheet_periods
                where tenant_id = :tenant_id
                  and coalesce(is_deleted, false) = false
                  and status = 'ready_for_review'
                  {hr_scope_sql}
                order by period_end asc
                limit :limit
                """
            ),
            hr_params,
        )
        items.extend(
            _normalize_hr_timesheet_review(row, str(context["tenant_id"]))
            for row in rows_to_dicts(list(timesheet_result.mappings().all()))
        )

    if _can_see_hr_items(context) and await table_exists(session, "public.hr_attendance_records"):
        attendance_result = await session.execute(
            text(
                f"""
                select id, tenant_id, company_id, employee_id, work_date, status,
                       overtime_hours, missing_hours, approved, notes, created_at, updated_at
                from public.hr_attendance_records
                where tenant_id = :tenant_id
                  and coalesce(is_deleted, false) = false
                  and (
                    status in ('absent','late','early_leave')
                    or overtime_hours > 0
                    or missing_hours > 0
                  )
                  and approved = false
                  {hr_scope_sql}
                order by work_date desc
                limit :limit
                """
            ),
            hr_params,
        )
        items.extend(
            _normalize_hr_attendance_issue(row, str(context["tenant_id"]))
            for row in rows_to_dicts(list(attendance_result.mappings().all()))
        )

    if _can_see_hr_items(context) and await table_exists(session, "public.hr_employee_documents"):
        hr_document_result = await session.execute(
            text(
                f"""
                select id, tenant_id, company_id, employee_id, document_type, status,
                       required, expiry_date, created_at, updated_at
                from public.hr_employee_documents
                where tenant_id = :tenant_id
                  and required = true
                  and status in ('missing','expired','rejected')
                  {hr_scope_sql}
                order by coalesce(expiry_date, updated_at::date, created_at::date) asc
                limit :limit
                """
            ),
            hr_params,
        )
        items.extend(
            _normalize_hr_document_missing(row, str(context["tenant_id"]))
            for row in rows_to_dicts(list(hr_document_result.mappings().all()))
        )

    if _can_see_after_sales_items(context) and await table_exists(
        session,
        "public.after_sales_maintenance_due_items",
    ):
        maintenance_due_result = await session.execute(
            text(
                """
                select d.id, d.tenant_id, d.company_id, d.installed_asset_id,
                       d.maintenance_plan_id, d.due_date, d.status, d.created_at,
                       d.updated_at, p.plan_name, a.customer_name, a.product_name,
                       a.serial_no
                from public.after_sales_maintenance_due_items d
                join public.after_sales_maintenance_plans p
                  on p.tenant_id = d.tenant_id and p.id = d.maintenance_plan_id
                join public.after_sales_installed_assets a
                  on a.tenant_id = d.tenant_id and a.id = d.installed_asset_id
                where d.tenant_id = :tenant_id
                  and coalesce(d.is_deleted, false) = false
                  and d.status in ('scheduled','due_soon','overdue')
                  and d.due_date <= current_date + interval '30 days'
                order by d.due_date asc
                limit :limit
                """
            ),
            {"tenant_id": context["tenant_id"], "limit": limit},
        )
        items.extend(
            _normalize_after_sales_maintenance_due(row, str(context["tenant_id"]))
            for row in rows_to_dicts(list(maintenance_due_result.mappings().all()))
        )

    if _can_see_after_sales_items(context) and await table_exists(
        session,
        "public.after_sales_field_assignments",
    ):
        assignment_user_filter = (
            "" if _can_manage_after_sales_items(context) else "and a.technician_user_id = :user_id"
        )
        assignment_result = await session.execute(
            text(
                f"""
                select a.id, a.tenant_id, a.company_id, a.service_request_id,
                       a.service_record_id, a.installed_asset_id, a.technician_user_id,
                       a.technician_employee_id, a.scheduled_start, a.scheduled_end,
                       a.status, a.created_at, a.updated_at, r.request_no, r.subject,
                       r.customer_name, r.priority
                from public.after_sales_field_assignments a
                left join public.after_sales_service_requests r
                  on r.tenant_id = a.tenant_id and r.id = a.service_request_id
                where a.tenant_id = :tenant_id
                  and coalesce(a.is_deleted, false) = false
                  and a.status in ('assigned','accepted','on_the_way','arrived','in_progress')
                  {assignment_user_filter}
                order by coalesce(a.scheduled_start, a.created_at) asc
                limit :limit
                """
            ),
            {"tenant_id": context["tenant_id"], "user_id": context.get("user_id"), "limit": limit},
        )
        items.extend(
            _normalize_after_sales_assignment(row, str(context["tenant_id"]))
            for row in rows_to_dicts(list(assignment_result.mappings().all()))
        )

    if _can_see_after_sales_items(context) and await table_exists(
        session,
        "public.after_sales_service_requests",
    ):
        overdue_request_result = await session.execute(
            text(
                """
                select id, tenant_id, company_id, request_no, subject, customer_name,
                       priority, status, due_date, updated_at, created_at
                from public.after_sales_service_requests
                where tenant_id = :tenant_id
                  and coalesce(is_deleted, false) = false
                  and due_date < current_date
                  and status in (
                    'new', 'triage', 'assigned', 'scheduled', 'in_progress',
                    'waiting_customer', 'waiting_parts'
                  )
                order by due_date asc
                limit :limit
                """
            ),
            {"tenant_id": context["tenant_id"], "limit": limit},
        )
        items.extend(
            _normalize_after_sales_overdue_request(row, str(context["tenant_id"]))
            for row in rows_to_dicts(list(overdue_request_result.mappings().all()))
        )

    if _can_see_after_sales_items(context) and await table_exists(
        session,
        "public.after_sales_installed_assets",
    ):
        warranty_result = await session.execute(
            text(
                """
                select id, tenant_id, owning_company_id as company_id, customer_name,
                       product_name, serial_no, warranty_end_date, updated_at, created_at
                from public.after_sales_installed_assets
                where tenant_id = :tenant_id
                  and coalesce(is_deleted, false) = false
                  and status = 'active'
                  and warranty_end_date is not null
                  and warranty_end_date between current_date and current_date + interval '30 days'
                order by warranty_end_date asc
                limit :limit
                """
            ),
            {"tenant_id": context["tenant_id"], "limit": limit},
        )
        items.extend(
            _normalize_after_sales_warranty(row, str(context["tenant_id"]))
            for row in rows_to_dicts(list(warranty_result.mappings().all()))
        )

    crm_scope_sql = ""
    crm_params: dict[str, Any] = {
        "tenant_id": context["tenant_id"],
        "user_id": context.get("user_id"),
        "limit": limit,
    }
    if context.get("company_scope_ids"):
        crm_scope_sql = "and company_id = any(cast(:crm_company_scope_ids as uuid[]))"
        crm_params["crm_company_scope_ids"] = context["company_scope_ids"]

    if _can_see_crm_items(context) and await table_exists(session, "public.crm_leads"):
        owner_filter = (
            "" if _can_manage_crm_items(context) else "and assigned_owner_user_id = :user_id"
        )
        lead_followup_result = await session.execute(
            text(
                f"""
                select id, tenant_id, company_id, lead_name, lead_status,
                       source, assigned_owner_user_id, next_followup_date,
                       last_contacted_at, created_at, updated_at
                from public.crm_leads
                where tenant_id = :tenant_id
                  and coalesce(is_deleted, false) = false
                  and lead_status not in ('converted','lost','unqualified')
                  and next_followup_date is not null
                  and next_followup_date <= current_date
                  {crm_scope_sql}
                  {owner_filter}
                order by next_followup_date asc
                limit :limit
                """
            ),
            crm_params,
        )
        items.extend(
            _normalize_crm_followup(row, str(context["tenant_id"]), "lead")
            for row in rows_to_dicts(list(lead_followup_result.mappings().all()))
        )
        untouched_result = await session.execute(
            text(
                f"""
                select id, tenant_id, company_id, lead_name, lead_status,
                       source, assigned_owner_user_id, next_followup_date,
                       last_contacted_at, created_at, updated_at
                from public.crm_leads
                where tenant_id = :tenant_id
                  and coalesce(is_deleted, false) = false
                  and lead_status in ('new','contacted')
                  and coalesce(last_contacted_at, created_at) < now() - interval '14 days'
                  {crm_scope_sql}
                  {owner_filter}
                order by coalesce(last_contacted_at, created_at) asc
                limit :limit
                """
            ),
            crm_params,
        )
        items.extend(
            _normalize_crm_untouched_lead(row, str(context["tenant_id"]))
            for row in rows_to_dicts(list(untouched_result.mappings().all()))
        )

    if _can_see_crm_items(context) and await table_exists(session, "public.crm_opportunities"):
        owner_filter = (
            "" if _can_manage_crm_items(context) else "and assigned_owner_user_id = :user_id"
        )
        opportunity_followup_result = await session.execute(
            text(
                f"""
                select id, tenant_id, company_id, opportunity_no, opportunity_name,
                       status, assigned_owner_user_id, next_followup_date,
                       expected_close_date, proposal_status, proposal_valid_until,
                       created_at, updated_at
                from public.crm_opportunities
                where tenant_id = :tenant_id
                  and coalesce(is_deleted, false) = false
                  and status = 'open'
                  and next_followup_date is not null
                  and next_followup_date <= current_date
                  {crm_scope_sql}
                  {owner_filter}
                order by next_followup_date asc
                limit :limit
                """
            ),
            crm_params,
        )
        items.extend(
            _normalize_crm_followup(row, str(context["tenant_id"]), "opportunity")
            for row in rows_to_dicts(list(opportunity_followup_result.mappings().all()))
        )
        expected_close_result = await session.execute(
            text(
                f"""
                select id, tenant_id, company_id, opportunity_no, opportunity_name,
                       status, assigned_owner_user_id, next_followup_date,
                       expected_close_date, proposal_status, proposal_valid_until,
                       created_at, updated_at
                from public.crm_opportunities
                where tenant_id = :tenant_id
                  and coalesce(is_deleted, false) = false
                  and status = 'open'
                  and expected_close_date < current_date
                  {crm_scope_sql}
                  {owner_filter}
                order by expected_close_date asc
                limit :limit
                """
            ),
            crm_params,
        )
        items.extend(
            _normalize_crm_expected_close(row, str(context["tenant_id"]))
            for row in rows_to_dicts(list(expected_close_result.mappings().all()))
        )
        proposal_result = await session.execute(
            text(
                f"""
                select id, tenant_id, company_id, opportunity_no, opportunity_name,
                       status, assigned_owner_user_id, next_followup_date,
                       expected_close_date, proposal_status, proposal_valid_until,
                       created_at, updated_at
                from public.crm_opportunities
                where tenant_id = :tenant_id
                  and coalesce(is_deleted, false) = false
                  and status = 'open'
                  and proposal_status = 'sent'
                  and proposal_valid_until between current_date and current_date + interval '7 days'
                  {crm_scope_sql}
                  {owner_filter}
                order by proposal_valid_until asc
                limit :limit
                """
            ),
            crm_params,
        )
        items.extend(
            _normalize_crm_proposal_expiring(row, str(context["tenant_id"]))
            for row in rows_to_dicts(list(proposal_result.mappings().all()))
        )

    accounting_scope_sql = ""
    accounting_params: dict[str, Any] = {"tenant_id": context["tenant_id"], "limit": limit}
    if context.get("company_scope_ids"):
        accounting_scope_sql = (
            " and company_id = any(cast(:accounting_company_scope_ids as uuid[]))"
        )
        accounting_params["accounting_company_scope_ids"] = context["company_scope_ids"]

    if _can_see_accounting_items(context) and await table_exists(
        session,
        "public.accounting_bank_transactions",
    ):
        accounting_bank_result = await session.execute(
            text(
                f"""
                select id, tenant_id, company_id, bank_account_id, transaction_date,
                       description, counterparty_name, amount, currency, direction,
                       reconciliation_status, updated_at, created_at
                from public.accounting_bank_transactions
                where tenant_id = :tenant_id
                  and coalesce(is_deleted, false) = false
                  and reconciliation_status in ('unmatched', 'needs_review')
                  {accounting_scope_sql}
                order by transaction_date desc, created_at desc
                limit :limit
                """
            ),
            accounting_params,
        )
        items.extend(
            _normalize_accounting_item(row, str(context["tenant_id"]), "bank_transaction")
            for row in rows_to_dicts(list(accounting_bank_result.mappings().all()))
        )

    if _can_see_accounting_items(context) and await table_exists(
        session,
        "public.accounting_e_documents",
    ):
        accounting_document_result = await session.execute(
            text(
                f"""
                select id, tenant_id, company_id, invoice_no, issue_date,
                       sender_name, receiver_name, payable_amount as amount,
                       currency, status, reconciliation_status, updated_at, created_at
                from public.accounting_e_documents
                where tenant_id = :tenant_id
                  and coalesce(is_deleted, false) = false
                  and (
                    reconciliation_status in ('unmatched', 'needs_review')
                    or status = 'rejected'
                  )
                  {accounting_scope_sql}
                order by issue_date desc, created_at desc
                limit :limit
                """
            ),
            accounting_params,
        )
        items.extend(
            _normalize_accounting_item(row, str(context["tenant_id"]), "e_document")
            for row in rows_to_dicts(list(accounting_document_result.mappings().all()))
        )

    if _can_see_accounting_items(context) and await table_exists(
        session,
        "public.accounting_capital_reconciliation",
    ):
        capital_result = await session.execute(
            text(
                f"""
                select id, tenant_id, company_id, capital_transaction_id, partner_id,
                       expected_amount, paid_amount, outstanding_amount as amount,
                       currency, reconciliation_status, updated_at, created_at
                from public.accounting_capital_reconciliation
                where tenant_id = :tenant_id
                  and coalesce(is_deleted, false) = false
                  and reconciliation_status <> 'matched'
                  and outstanding_amount > 0
                  {accounting_scope_sql}
                order by updated_at desc
                limit :limit
                """
            ),
            accounting_params,
        )
        items.extend(
            _normalize_accounting_item(row, str(context["tenant_id"]), "capital_reconciliation")
            for row in rows_to_dicts(list(capital_result.mappings().all()))
        )

    if _can_see_reporting_items(context) and await table_exists(
        session,
        "public.reporting_scheduled_reports",
    ):
        scheduled_report_result = await session.execute(
            text(
                """
                select id, tenant_id, report_key, schedule_name, status, next_run_at,
                       last_run_at, last_result_status, last_error, updated_at, created_at
                from public.reporting_scheduled_reports
                where tenant_id = :tenant_id
                  and (
                    status = 'failed'
                    or last_result_status in ('failed','skipped_recipients')
                    or last_error is not null
                  )
                order by coalesce(last_run_at, updated_at, created_at) desc
                limit :limit
                """
            ),
            {"tenant_id": context["tenant_id"], "limit": limit},
        )
        items.extend(
            _normalize_reporting_schedule(row, str(context["tenant_id"]))
            for row in rows_to_dicts(list(scheduled_report_result.mappings().all()))
        )

    if _can_see_reporting_items(context) and await table_exists(
        session,
        "public.reporting_export_jobs",
    ):
        reporting_export_result = await session.execute(
            text(
                """
                select id, tenant_id, report_key, requested_by, export_format, status,
                       row_count, error_message, created_at, completed_at
                from public.reporting_export_jobs
                where tenant_id = :tenant_id
                  and status in ('failed','expired')
                order by coalesce(completed_at, created_at) desc
                limit :limit
                """
            ),
            {"tenant_id": context["tenant_id"], "limit": limit},
        )
        items.extend(
            _normalize_reporting_export_job(row, str(context["tenant_id"]))
            for row in rows_to_dicts(list(reporting_export_result.mappings().all()))
        )

    if await table_exists(session, "public.notifications") and context.get("user_id"):
        notification_result = await session.execute(
            text(
                """
                select id, tenant_id, user_id, company_id, branch_id, module_key,
                       notification_type, title, message, severity, priority, status,
                       action_required, action_key, action_label, target_page,
                       related_entity_type, related_entity_id, related_record_label,
                       process_instance_id, task_id, approval_id, operation_id,
                       due_at, expires_at, created_at
                from public.notifications
                where tenant_id = :tenant_id
                  and user_id = :user_id
                  and status = 'unread'
                  and action_required = true
                order by coalesce(due_at, expires_at, created_at) asc
                limit :limit
                """
            ),
            {
                "tenant_id": context["tenant_id"],
                "user_id": context["user_id"],
                "limit": limit,
            },
        )
        items.extend(
            _normalize_notification_item(row, str(context["tenant_id"]))
            for row in rows_to_dicts(list(notification_result.mappings().all()))
        )

    if _can_see_data_quality_items(context) and await table_exists(
        session,
        "public.data_quality_findings",
    ):
        quality_result = await session.execute(
            text(
                """
                select id, tenant_id, entity_type, entity_id, rule_key, severity,
                       message, status, suggested_action, created_at, resolved_at
                from public.data_quality_findings
                where tenant_id = :tenant_id
                  and status = 'open'
                order by
                  case severity when 'critical' then 1 when 'warning' then 2 else 3 end,
                  created_at desc
                limit :limit
                """
            ),
            {"tenant_id": context["tenant_id"], "limit": limit},
        )
        items.extend(
            _normalize_data_quality_item(row, str(context["tenant_id"]))
            for row in rows_to_dicts(list(quality_result.mappings().all()))
        )

    if _can_see_data_quality_items(context) and await table_exists(
        session,
        "public.duplicate_candidate_groups",
    ):
        duplicate_result = await session.execute(
            text(
                """
                select g.id, g.tenant_id, g.entity_type, g.match_score,
                       g.match_reason, g.severity, g.status, g.suggested_master_id,
                       g.created_at, count(i.id)::int as candidate_count
                from public.duplicate_candidate_groups g
                left join public.duplicate_candidate_items i
                  on i.tenant_id = g.tenant_id and i.group_id = g.id
                where g.tenant_id = :tenant_id
                  and g.status = 'open'
                group by g.id
                order by
                  case g.severity when 'exact' then 1 when 'strong' then 2 else 3 end,
                  g.match_score desc
                limit :limit
                """
            ),
            {"tenant_id": context["tenant_id"], "limit": limit},
        )
        items.extend(
            _normalize_duplicate_quality_item(row, str(context["tenant_id"]))
            for row in rows_to_dicts(list(duplicate_result.mappings().all()))
        )

    has_onboarding_state = await table_exists(session, "public.workspace_onboarding_state")
    if _can_see_system_items(context) and has_onboarding_state:
        onboarding_result = await session.execute(
            text(
                """
                select id, tenant_id, status, current_step, completed_steps,
                       dismissed_steps, recommended_steps, updated_at, created_at
                from public.workspace_onboarding_state
                where tenant_id = :tenant_id
                  and status in ('not_started', 'in_progress')
                order by updated_at desc
                limit 1
                """
            ),
            {"tenant_id": context["tenant_id"]},
        )
        onboarding_row = row_to_dict(onboarding_result.mappings().first())
        if onboarding_row:
            company_summary = await _onboarding_company_summary(session, str(context["tenant_id"]))
            items.extend(
                _normalize_onboarding_items(
                    onboarding_row,
                    company_summary,
                    str(context["tenant_id"]),
                )
            )

    if _can_see_system_items(context) and await table_exists(session, "public.outbox_events"):
        outbox_result = await session.execute(
            text(
                """
                select id, tenant_id, company_id, module_key, event_type, aggregate_type,
                       aggregate_id, operation_id, process_instance_id, status,
                       retry_count, max_retries, last_error, locked_at, occurred_at,
                       created_at, updated_at
                from public.outbox_events
                where tenant_id = :tenant_id
                  and status in ('failed', 'dead_letter', 'skipped', 'pending', 'processing')
                order by created_at desc
                limit :limit
                """
            ),
            {"tenant_id": context["tenant_id"], "limit": limit},
        )
        for row in rows_to_dicts(list(outbox_result.mappings().all())):
            if (
                row.get("status") in {"failed", "dead_letter", "skipped"}
                or _minutes_since(
                    row.get("locked_at") or row.get("created_at") or row.get("occurred_at")
                )
                >= STALE_OUTBOX_MINUTES
            ):
                items.append(_normalize_outbox(row, str(context["tenant_id"])))

    if _can_see_integration_items(context) and await table_exists(
        session,
        "public.integration_webhook_deliveries",
    ):
        delivery_result = await session.execute(
            text(
                """
                select d.id, d.tenant_id, d.integration_app_id, d.subscription_id,
                       d.event_type, d.event_id, d.status, d.attempt_count,
                       d.response_status_code, d.error_message, d.created_at,
                       d.last_attempt_at, a.app_name, s.subscription_name
                from public.integration_webhook_deliveries d
                left join public.integration_apps a
                  on a.tenant_id = d.tenant_id and a.id = d.integration_app_id
                left join public.integration_webhook_subscriptions s
                  on s.tenant_id = d.tenant_id and s.id = d.subscription_id
                where d.tenant_id = :tenant_id
                  and d.status in ('failed','dead_letter')
                order by d.created_at desc
                limit :limit
                """
            ),
            {"tenant_id": context["tenant_id"], "limit": limit},
        )
        items.extend(
            _normalize_integration_delivery(row, str(context["tenant_id"]))
            for row in rows_to_dicts(list(delivery_result.mappings().all()))
        )

    if _can_see_integration_items(context) and await table_exists(
        session,
        "public.integration_inbound_events",
    ):
        inbound_result = await session.execute(
            text(
                """
                select e.id, e.tenant_id, e.integration_app_id, e.inbound_event_type,
                       e.source_event_id, e.status, e.signature_valid, e.error_message,
                       e.related_entity_type, e.related_entity_id, e.created_at,
                       e.updated_at, a.app_name
                from public.integration_inbound_events e
                left join public.integration_apps a
                  on a.tenant_id = e.tenant_id and a.id = e.integration_app_id
                where e.tenant_id = :tenant_id
                  and e.status in ('rejected','failed')
                order by e.created_at desc
                limit :limit
                """
            ),
            {"tenant_id": context["tenant_id"], "limit": limit},
        )
        items.extend(
            _normalize_integration_inbound(row, str(context["tenant_id"]))
            for row in rows_to_dicts(list(inbound_result.mappings().all()))
        )

    filtered = _filter_items(items, query)
    sorted_items = _sort_items(filtered)
    offset = (page - 1) * page_size
    data = sorted_items[offset : offset + page_size]
    return {
        "data": data,
        "items": data,
        "count": len(filtered),
        "meta": {
            "page": page,
            "pageSize": page_size,
            "total": len(filtered),
            "totalPages": max(1, (len(filtered) + page_size - 1) // page_size),
        },
        "summary": _summary(filtered),
        **({"warnings": warnings} if warnings else {}),
    }


async def action_center_counts(session: AsyncSession, context: dict[str, Any]) -> dict[str, int]:
    result = await list_action_center_items(session, context, {"limit": 500})
    summary = dict(result["summary"])
    summary["total"] = summary["total_open"]
    summary["tasks"] = summary["task_count"]
    summary["approvals"] = summary["approval_count"]
    return summary


async def action_center_summary(session: AsyncSession, context: dict[str, Any]) -> dict[str, Any]:
    summary = await action_center_counts(session, context)
    return {**summary, "has_pending_work": summary["total_open"] > 0}


async def action_center_by_record(
    session: AsyncSession,
    context: dict[str, Any],
    *,
    entity_type: str,
    entity_id: str,
) -> dict[str, Any]:
    result = await list_action_center_items(session, context, {"limit": 500})
    items = filter_record_items(result["items"], entity_type=entity_type, entity_id=entity_id)
    return {
        "data": items,
        "items": items,
        "count": len(items),
        "summary": _summary(items),
    }


def _normalize_task(row: dict[str, Any], tenant_id: str) -> dict[str, Any]:
    overdue = row.get("status") == "overdue" or _is_past_due(row.get("due_at"))
    entity_type = row.get("entity_type")
    entity_id = row.get("entity_id")
    process_id = row.get("process_instance_id")
    return {
        "id": f"process_task:{row.get('id')}",
        "tenant_id": row.get("tenant_id") or tenant_id,
        "company_id": row.get("company_id"),
        "branch_id": entity_id if _same_entity_type(entity_type, "branch") else None,
        "module_key": row.get("module_key") or "process",
        "source_type": "process_task",
        "source_id": str(row.get("id")),
        "title": row.get("title") or "Tamamlanacak gorev var",
        "description": row.get("description")
        or f"{_module_label(row.get('module_key'))} icin surec gorevi bekliyor.",
        "status": "in_progress" if row.get("status") == "in_progress" else "open",
        "severity": "warning" if overdue else "info",
        "priority": "high" if overdue else "normal",
        "process_instance_id": process_id,
        "task_id": row.get("id"),
        "entity_type": entity_type,
        "entity_id": entity_id,
        "record_label": _record_label(entity_type, entity_id),
        "due_at": row.get("due_at"),
        "created_at": row.get("created_at") or _now_iso(),
        "updated_at": row.get("updated_at"),
        "target_page": f"/app/surecler/{process_id}"
        if process_id
        else _record_target_page(
            entity_type,
            entity_id,
            row.get("company_id"),
        ),
        "suggested_actions": [
            {
                "label": "Sureci Ac",
                "action_type": "open_process",
                "target_page": f"/app/surecler/{process_id}" if process_id else "/app/surecler",
                "process_instance_id": process_id,
            },
            {
                "label": "Gorevi Tamamla",
                "action_type": "navigate",
                "target_page": f"/app/surecler/{process_id}" if process_id else "/app/surecler",
            },
        ],
    }


def _normalize_project_task(row: dict[str, Any], tenant_id: str) -> dict[str, Any]:
    overdue = _is_past_due(row.get("due_date"))
    urgent = row.get("priority") in {"urgent", "highest"} or overdue
    task_id = row.get("id")
    entity_type = row.get("related_entity_type")
    entity_id = row.get("related_entity_id")
    return {
        "id": f"project_task:{task_id}",
        "tenant_id": row.get("tenant_id") or tenant_id,
        "company_id": row.get("company_id"),
        "branch_id": row.get("branch_id")
        or (entity_id if _same_entity_type(entity_type, "branch") else None),
        "module_key": "project_management",
        "source_type": "project_task",
        "source_id": str(task_id),
        "title": row.get("title") or "Proje gorevi var",
        "description": _project_task_description(row),
        "status": "in_progress" if row.get("status") == "in_progress" else "open",
        "severity": "warning" if urgent else "info",
        "priority": "urgent" if row.get("priority") == "urgent" else "high" if urgent else "normal",
        "task_id": task_id,
        "project_id": row.get("project_id"),
        "issue_key": row.get("issue_key"),
        "entity_type": entity_type,
        "entity_id": entity_id,
        "record_label": _record_label(entity_type, entity_id),
        "due_at": row.get("due_date"),
        "created_at": row.get("created_at") or _now_iso(),
        "updated_at": row.get("updated_at"),
        "target_page": f"/app/gorev-ve-proje-yonetimi/gorevler?id={task_id}",
        "suggested_actions": [
            {
                "label": "Gorevi Ac",
                "action_type": "open_project_task",
                "target_page": f"/app/gorev-ve-proje-yonetimi/gorevler?id={task_id}",
                "task_id": task_id,
            },
            {
                "label": "Durumu Guncelle",
                "action_type": "transition_project_task",
                "target_page": f"/app/gorev-ve-proje-yonetimi/gorevler?id={task_id}",
                "task_id": task_id,
            },
            {
                "label": "Yorum Ekle",
                "action_type": "comment_project_task",
                "target_page": f"/app/gorev-ve-proje-yonetimi/gorevler?id={task_id}",
                "task_id": task_id,
            },
        ],
    }


def _normalize_approval(row: dict[str, Any], tenant_id: str) -> dict[str, Any]:
    payload = row.get("payload_json") or {}
    entity_type = payload.get("entity_type")
    entity_id = payload.get("entity_id")
    process_id = row.get("process_instance_id")
    return {
        "id": f"approval:{row.get('id')}",
        "tenant_id": row.get("tenant_id") or tenant_id,
        "company_id": row.get("company_id"),
        "module_key": row.get("module_key") or "process",
        "source_type": "approval",
        "source_id": str(row.get("id")),
        "title": "Onay bekleyen islem var",
        "description": (
            f"{_module_label(row.get('module_key'))} icin "
            f"{_operation_label(row.get('approval_type'))} karari bekliyor."
        ),
        "status": "waiting",
        "severity": "warning",
        "priority": "high",
        "process_instance_id": process_id,
        "task_id": row.get("task_id"),
        "approval_id": row.get("id"),
        "entity_type": entity_type,
        "entity_id": entity_id,
        "record_label": _record_label(entity_type, entity_id),
        "created_at": row.get("requested_at") or row.get("created_at") or _now_iso(),
        "updated_at": row.get("updated_at"),
        "target_page": f"/app/surecler/{process_id}" if process_id else "/app/surecler",
        "suggested_actions": [
            {
                "label": "Sureci Ac",
                "action_type": "open_process",
                "target_page": f"/app/surecler/{process_id}" if process_id else "/app/surecler",
                "process_instance_id": process_id,
            },
            {
                "label": "Onayla",
                "action_type": "navigate",
                "target_page": f"/app/surecler/{process_id}" if process_id else "/app/surecler",
            },
            {
                "label": "Reddet",
                "action_type": "navigate",
                "target_page": f"/app/surecler/{process_id}" if process_id else "/app/surecler",
            },
        ],
    }


def _normalize_operation(row: dict[str, Any], tenant_id: str) -> dict[str, Any]:
    status = str(row.get("operation_status") or "")
    failed = status == "failed"
    requires_action = status == "requires_action"
    entity_type = row.get("entity_type")
    entity_id = row.get("entity_id")
    return {
        "id": f"operation:{row.get('id')}",
        "tenant_id": row.get("tenant_id") or tenant_id,
        "company_id": row.get("company_id"),
        "module_key": row.get("module_key") or "system",
        "source_type": "operation",
        "source_id": str(row.get("id")),
        "title": _operation_title(status),
        "description": (
            f"{_operation_label(row.get('operation_type'))} tamamlanamadi. Detayi acin."
            if failed
            else f"{_operation_label(row.get('operation_type'))} icin kullanici adimi bekleniyor."
            if requires_action
            else f"{_operation_label(row.get('operation_type'))} beklenenden uzun surdu."
        ),
        "status": "failed" if failed else "waiting" if requires_action else "in_progress",
        "severity": "error" if failed else "warning",
        "priority": "high" if failed else "normal",
        "action_key": row.get("operation_type"),
        "operation_id": row.get("id"),
        "entity_type": entity_type,
        "entity_id": entity_id,
        "record_label": _record_label(entity_type, entity_id),
        "created_at": row.get("created_at") or _now_iso(),
        "updated_at": row.get("failed_at") or row.get("completed_at") or row.get("started_at"),
        "target_page": _record_target_page(entity_type, entity_id, row.get("company_id")),
        "suggested_actions": [
            {
                "label": "Kaydi Gor",
                "action_type": "open_record",
                "target_page": _record_target_page(entity_type, entity_id, row.get("company_id")),
                "record_id": entity_id or row.get("company_id"),
                "operation_id": row.get("id"),
            },
            {
                "label": "Tekrar Dene",
                "action_type": "retry",
                "operation_id": row.get("id"),
                "disabled": True,
                "disabled_reason": "Bu islem otomatik tekrar denemeyi henuz desteklemiyor.",
            },
        ],
    }


def _normalize_data_job(row: dict[str, Any], tenant_id: str, source_type: str) -> dict[str, Any]:
    status_value = str(row.get("status") or "")
    failed = status_value in {"failed", "validation_failed"}
    ready = status_value in {"ready_to_import", "ready_to_confirm", "completed"}
    title_by_source = {
        "import": "Import isi dikkat bekliyor" if failed or ready else "Import isi suruyor",
        "export": (
            "Export dosyasi hazir" if status_value == "completed" else "Export isi tamamlanamadi"
        ),
        "bulk": "Bulk action dikkat bekliyor" if failed or ready else "Bulk action suruyor",
    }
    description_by_source = {
        "import": (
            f"{row.get('entity_type')} import: {row.get('valid_rows') or 0} gecerli, "
            f"{row.get('invalid_rows') or 0} hatali, "
            f"{row.get('duplicate_rows') or 0} duplicate."
        ),
        "export": f"{row.get('entity_type')} export: {row.get('row_count') or 0} satir.",
        "bulk": (
            f"{row.get('action_key') or 'bulk action'}: "
            f"{row.get('success_count') or 0} basarili, "
            f"{row.get('failed_count') or 0} hatali."
        ),
    }
    target_page = (
        "/app/sistem/import" if source_type in {"import", "bulk"} else "/app/sistem/export"
    )
    return {
        "id": f"data_{source_type}:{row.get('id')}",
        "tenant_id": row.get("tenant_id") or tenant_id,
        "company_id": row.get("company_id"),
        "module_key": "importExport",
        "source_type": f"data_{source_type}",
        "source_id": str(row.get("id")),
        "title": title_by_source.get(source_type, "Veri yonetimi isi"),
        "description": description_by_source.get(source_type, "Veri yonetimi isi guncellendi."),
        "status": "failed" if failed else "waiting" if ready else "in_progress",
        "severity": "error" if failed else "warning" if ready else "info",
        "priority": "high" if failed else "normal",
        "action_key": row.get("action_key") or source_type,
        "entity_type": row.get("entity_type"),
        "entity_id": row.get("id"),
        "record_label": f"{source_type}: {row.get('entity_type')}",
        "created_at": row.get("created_at") or _now_iso(),
        "updated_at": row.get("completed_at") or row.get("updated_at"),
        "target_page": target_page,
        "suggested_actions": [
            {
                "label": "Veri Yonetimini Ac",
                "action_type": "navigate",
                "target_page": target_page,
            }
        ],
    }


def _normalize_document_item(row: dict[str, Any], tenant_id: str) -> dict[str, Any]:
    status_value = str(row.get("status") or "")
    verification_status = str(row.get("verification_status") or "")
    expired = status_value == "expired" or _is_past_due(row.get("expiry_date"))
    rejected = status_value == "rejected" or verification_status == "rejected"
    pending = verification_status == "pending"
    if rejected:
        title = "Reddedilen belge var"
        severity = "warning"
        description = (
            row.get("rejected_reason")
            or f"{row.get('title') or row.get('document_type')} reddedildi."
        )
    elif expired:
        title = "Suresi dolan belge var"
        severity = "warning"
        description = (
            f"{row.get('title') or row.get('document_type')} suresi doldu veya dolmak uzere."
        )
    elif pending:
        title = "Dogrulama bekleyen belge var"
        severity = "info"
        description = f"{row.get('title') or row.get('document_type')} dogrulama bekliyor."
    else:
        title = "Belge uyarisi"
        severity = "info"
        description = f"{row.get('title') or row.get('document_type')} kontrol edilmeli."
    return {
        "id": f"document:{row.get('id')}",
        "tenant_id": row.get("tenant_id") or tenant_id,
        "company_id": row.get("company_id"),
        "branch_id": row.get("branch_id"),
        "module_key": "documents",
        "source_type": "document",
        "source_id": str(row.get("id")),
        "title": title,
        "description": description,
        "status": "waiting",
        "severity": severity,
        "priority": "high" if rejected or expired else "normal",
        "action_key": "document.review",
        "entity_type": row.get("owner_entity_type"),
        "entity_id": row.get("owner_entity_id"),
        "record_label": _record_label(row.get("owner_entity_type"), row.get("owner_entity_id")),
        "created_at": row.get("created_at") or _now_iso(),
        "updated_at": row.get("updated_at"),
        "target_page": "/app/belgeler",
        "suggested_actions": [
            {
                "label": "Belgeyi Ac",
                "action_type": "navigate",
                "target_page": "/app/belgeler",
            }
        ],
    }


def _normalize_notification_item(row: dict[str, Any], tenant_id: str) -> dict[str, Any]:
    return {
        "id": f"notification:{row.get('id')}",
        "tenant_id": row.get("tenant_id") or tenant_id,
        "company_id": row.get("company_id"),
        "branch_id": row.get("branch_id"),
        "module_key": row.get("module_key") or "notifications",
        "source_type": "notification",
        "source_id": str(row.get("id")),
        "title": row.get("title") or "Aksiyon gerektiren bildirim var",
        "description": row.get("message") or "",
        "status": "waiting",
        "severity": row.get("severity") or "info",
        "priority": row.get("priority") or "normal",
        "action_key": row.get("action_key") or row.get("notification_type"),
        "process_instance_id": row.get("process_instance_id"),
        "task_id": row.get("task_id"),
        "approval_id": row.get("approval_id"),
        "operation_id": row.get("operation_id"),
        "entity_type": row.get("related_entity_type"),
        "entity_id": row.get("related_entity_id"),
        "record_label": row.get("related_record_label")
        or _record_label(row.get("related_entity_type"), row.get("related_entity_id")),
        "due_at": row.get("due_at") or row.get("expires_at"),
        "created_at": row.get("created_at") or _now_iso(),
        "target_page": row.get("target_page") or "/app",
        "suggested_actions": [
            {
                "label": row.get("action_label") or "Ac",
                "action_type": "navigate",
                "target_page": row.get("target_page") or "/app",
            }
        ],
    }


def _normalize_reporting_schedule(row: dict[str, Any], tenant_id: str) -> dict[str, Any]:
    permission_issue = row.get("last_result_status") == "skipped_recipients"
    return {
        "id": f"reporting_scheduled_report:{row.get('id')}",
        "tenant_id": row.get("tenant_id") or tenant_id,
        "module_key": "reporting",
        "source_type": "report_permission_issue" if permission_issue else "failed_scheduled_report",
        "source_id": str(row.get("id")),
        "title": (
            "Rapor alici yetkisi kontrol edilmeli"
            if permission_issue
            else "Zamanlanmis rapor basarisiz"
        ),
        "description": row.get("last_error")
        or f"{row.get('schedule_name') or row.get('report_key')} son calismada dikkat bekliyor.",
        "status": "waiting",
        "severity": "warning",
        "priority": "high",
        "action_key": "reporting.schedule.review",
        "entity_type": "scheduled_report",
        "entity_id": row.get("id"),
        "record_label": row.get("schedule_name") or row.get("report_key"),
        "due_at": row.get("next_run_at"),
        "created_at": row.get("created_at") or _now_iso(),
        "updated_at": row.get("updated_at") or row.get("last_run_at"),
        "target_page": "/app/raporlama/zamanlanmis-raporlar",
        "suggested_actions": [
            {
                "label": "Zamanlamayi Ac",
                "action_type": "navigate",
                "target_page": "/app/raporlama/zamanlanmis-raporlar",
            },
            {
                "label": "Simdi Calistir",
                "action_type": "navigate",
                "target_page": "/app/raporlama/zamanlanmis-raporlar",
            },
        ],
    }


def _normalize_reporting_export_job(row: dict[str, Any], tenant_id: str) -> dict[str, Any]:
    expired = row.get("status") == "expired"
    return {
        "id": f"reporting_export_job:{row.get('id')}",
        "tenant_id": row.get("tenant_id") or tenant_id,
        "module_key": "reporting",
        "source_type": "report_export_failed",
        "source_id": str(row.get("id")),
        "title": "Export suresi doldu" if expired else "Rapor export tamamlanamadi",
        "description": row.get("error_message")
        or f"{row.get('report_key')} export job {row.get('status') or 'failed'} durumunda.",
        "status": "waiting",
        "severity": "warning",
        "priority": "high",
        "action_key": "reporting.export.review",
        "entity_type": "report_export_job",
        "entity_id": row.get("id"),
        "record_label": row.get("report_key"),
        "created_at": row.get("created_at") or _now_iso(),
        "updated_at": row.get("completed_at"),
        "target_page": "/app/raporlama/ozel-raporlar",
        "suggested_actions": [
            {
                "label": "Exportlari Ac",
                "action_type": "navigate",
                "target_page": "/app/raporlama/ozel-raporlar",
            },
        ],
    }


def _normalize_hr_leave_request(row: dict[str, Any], tenant_id: str) -> dict[str, Any]:
    label = row.get("request_no") or "Izin talebi"
    description = (
        f"{label} {row.get('start_date')} - {row.get('end_date')} icin onay bekliyor."
    )
    return {
        "id": f"hr_leave_request:{row.get('id')}",
        "tenant_id": row.get("tenant_id") or tenant_id,
        "company_id": row.get("company_id"),
        "module_key": "hr",
        "source_type": "leave_request",
        "source_id": str(row.get("id")),
        "title": "Izin talebi onay bekliyor",
        "description": description,
        "status": "waiting",
        "severity": "warning",
        "priority": "high",
        "action_key": "hr.leave.approve",
        "entity_type": "leave_request",
        "entity_id": row.get("id"),
        "record_label": label,
        "due_at": row.get("start_date"),
        "created_at": row.get("created_at") or _now_iso(),
        "updated_at": row.get("updated_at"),
        "target_page": "/app/ik/izinler",
        "suggested_actions": [
            {"label": "Izinleri Ac", "action_type": "navigate", "target_page": "/app/ik/izinler"},
            {"label": "Onayla", "action_type": "navigate", "target_page": "/app/ik/izinler"},
        ],
    }


def _normalize_hr_timesheet_review(row: dict[str, Any], tenant_id: str) -> dict[str, Any]:
    label = row.get("period_key") or "Puantaj"
    return {
        "id": f"hr_timesheet_review:{row.get('id')}",
        "tenant_id": row.get("tenant_id") or tenant_id,
        "company_id": row.get("company_id"),
        "module_key": "hr",
        "source_type": "timesheet_review",
        "source_id": str(row.get("id")),
        "title": "Puantaj inceleme bekliyor",
        "description": f"{label} donemi onay veya kilit icin hazir.",
        "status": "waiting",
        "severity": "info",
        "priority": "high",
        "action_key": "hr.timesheet.review",
        "entity_type": "hr_timesheet_period",
        "entity_id": row.get("id"),
        "record_label": label,
        "due_at": row.get("period_end"),
        "created_at": row.get("created_at") or _now_iso(),
        "updated_at": row.get("updated_at"),
        "target_page": "/app/ik/puantaj",
        "suggested_actions": [
            {"label": "Puantaji Ac", "action_type": "navigate", "target_page": "/app/ik/puantaj"},
        ],
    }


def _normalize_hr_attendance_issue(row: dict[str, Any], tenant_id: str) -> dict[str, Any]:
    status_value = row.get("status") or "attendance"
    return {
        "id": f"hr_attendance_issue:{row.get('id')}",
        "tenant_id": row.get("tenant_id") or tenant_id,
        "company_id": row.get("company_id"),
        "module_key": "hr",
        "source_type": "attendance_issue",
        "source_id": str(row.get("id")),
        "title": "Devam kaydi inceleme bekliyor",
        "description": f"{row.get('work_date')} tarihli {status_value} kaydi onay bekliyor.",
        "status": "waiting",
        "severity": "warning" if status_value == "absent" else "info",
        "priority": "high" if status_value == "absent" else "normal",
        "action_key": "hr.attendance.review",
        "entity_type": "hr_attendance_record",
        "entity_id": row.get("id"),
        "record_label": str(row.get("work_date") or status_value),
        "due_at": row.get("work_date"),
        "created_at": row.get("created_at") or _now_iso(),
        "updated_at": row.get("updated_at"),
        "target_page": "/app/ik/devam-devamsizlik",
        "suggested_actions": [
            {
                "label": "Devam Kayitlarini Ac",
                "action_type": "navigate",
                "target_page": "/app/ik/devam-devamsizlik",
            }
        ],
    }


def _normalize_hr_document_missing(row: dict[str, Any], tenant_id: str) -> dict[str, Any]:
    description = (
        f"{row.get('document_type') or 'Belge'} durumu {row.get('status') or 'eksik'}."
    )
    return {
        "id": f"hr_document_missing:{row.get('id')}",
        "tenant_id": row.get("tenant_id") or tenant_id,
        "company_id": row.get("company_id"),
        "module_key": "hr",
        "source_type": "document_missing",
        "source_id": str(row.get("id")),
        "title": "Calisan belge eksigi var",
        "description": description,
        "status": "waiting",
        "severity": "warning",
        "priority": "high",
        "action_key": "hr.document.complete",
        "entity_type": "hr_employee_document",
        "entity_id": row.get("id"),
        "record_label": row.get("document_type"),
        "due_at": row.get("expiry_date"),
        "created_at": row.get("created_at") or _now_iso(),
        "updated_at": row.get("updated_at"),
        "target_page": "/app/ik/calisanlar",
        "suggested_actions": [
            {
                "label": "Calisanlari Ac",
                "action_type": "navigate",
                "target_page": "/app/ik/calisanlar",
            },
        ],
    }


def _normalize_after_sales_maintenance_due(row: dict[str, Any], tenant_id: str) -> dict[str, Any]:
    overdue = row.get("status") == "overdue" or _is_past_due(row.get("due_date"))
    title = "Bakim gecikti" if overdue else "Bakim zamani yaklasiyor"
    label = row.get("product_name") or row.get("serial_no") or row.get("plan_name") or "Kurulu urun"
    return {
        "id": f"after_sales_maintenance_due:{row.get('id')}",
        "tenant_id": row.get("tenant_id") or tenant_id,
        "company_id": row.get("company_id"),
        "module_key": "after_sales",
        "source_type": "maintenance_due",
        "source_id": str(row.get("id")),
        "title": title,
        "description": f"{row.get('customer_name') or 'Musteri'} icin {label} bakimi bekliyor.",
        "status": "waiting",
        "severity": "warning" if overdue else "info",
        "priority": "urgent" if overdue else "high",
        "action_key": "afterSales.maintenanceDue.open",
        "entity_type": "maintenance_due",
        "entity_id": row.get("id"),
        "record_label": row.get("plan_name") or label,
        "due_at": row.get("due_date"),
        "created_at": row.get("created_at") or _now_iso(),
        "updated_at": row.get("updated_at"),
        "target_page": "/app/satis-sonrasi/bakimi-gelenler",
        "suggested_actions": [
            {
                "label": "Bakimi Ac",
                "action_type": "navigate",
                "target_page": "/app/satis-sonrasi/bakimi-gelenler",
            },
            {
                "label": "Servis Talebi Olustur",
                "action_type": "navigate",
                "target_page": "/app/satis-sonrasi/bakimi-gelenler",
            },
        ],
    }


def _normalize_after_sales_assignment(row: dict[str, Any], tenant_id: str) -> dict[str, Any]:
    overdue = _is_past_due(row.get("scheduled_start"))
    target_page = f"/app/satis-sonrasi/mobil-servis/{row.get('id')}"
    subject = row.get("subject") or row.get("request_no") or "servis"
    return {
        "id": f"after_sales_field_assignment:{row.get('id')}",
        "tenant_id": row.get("tenant_id") or tenant_id,
        "company_id": row.get("company_id"),
        "module_key": "after_sales",
        "source_type": "field_assignment_assigned" if not overdue else "field_assignment_overdue",
        "source_id": str(row.get("id")),
        "title": "Geciken saha servis gorevi" if overdue else "Saha servis gorevi var",
        "description": f"{row.get('customer_name') or 'Musteri'} - {subject}",
        "status": "in_progress" if row.get("status") == "in_progress" else "open",
        "severity": "warning" if overdue else "info",
        "priority": "urgent" if overdue or row.get("priority") == "urgent" else "high",
        "action_key": "afterSales.fieldAssignment.open",
        "entity_type": "field_assignment",
        "entity_id": row.get("id"),
        "record_label": row.get("request_no"),
        "due_at": row.get("scheduled_start"),
        "created_at": row.get("created_at") or _now_iso(),
        "updated_at": row.get("updated_at"),
        "target_page": target_page,
        "suggested_actions": [
            {"label": "Gorevi Ac", "action_type": "navigate", "target_page": target_page},
            {
                "label": "Saha Gorevleri",
                "action_type": "navigate",
                "target_page": "/app/satis-sonrasi/saha-gorevleri",
            },
        ],
    }


def _normalize_after_sales_overdue_request(row: dict[str, Any], tenant_id: str) -> dict[str, Any]:
    return {
        "id": f"after_sales_service_request_overdue:{row.get('id')}",
        "tenant_id": row.get("tenant_id") or tenant_id,
        "company_id": row.get("company_id"),
        "module_key": "after_sales",
        "source_type": "service_request_overdue",
        "source_id": str(row.get("id")),
        "title": "Geciken servis talebi",
        "description": (
            f"{row.get('customer_name') or 'Musteri'} - "
            f"{row.get('subject') or row.get('request_no')}"
        ),
        "status": "waiting",
        "severity": "warning",
        "priority": "urgent" if row.get("priority") == "urgent" else "high",
        "action_key": "afterSales.serviceRequest.review",
        "entity_type": "service_request",
        "entity_id": row.get("id"),
        "record_label": row.get("request_no"),
        "due_at": row.get("due_date"),
        "created_at": row.get("created_at") or _now_iso(),
        "updated_at": row.get("updated_at"),
        "target_page": "/app/satis-sonrasi/servis-talepleri",
        "suggested_actions": [
            {
                "label": "Talebi Ac",
                "action_type": "navigate",
                "target_page": "/app/satis-sonrasi/servis-talepleri",
            }
        ],
    }


def _normalize_after_sales_warranty(row: dict[str, Any], tenant_id: str) -> dict[str, Any]:
    label = row.get("product_name") or row.get("serial_no") or "Kurulu urun"
    return {
        "id": f"after_sales_warranty_expiring:{row.get('id')}",
        "tenant_id": row.get("tenant_id") or tenant_id,
        "company_id": row.get("company_id"),
        "module_key": "after_sales",
        "source_type": "warranty_expiring",
        "source_id": str(row.get("id")),
        "title": "Garanti suresi yaklasiyor",
        "description": (
            f"{row.get('customer_name') or 'Musteri'} icin {label} garanti bitisine yaklasiyor."
        ),
        "status": "waiting",
        "severity": "info",
        "priority": "normal",
        "action_key": "afterSales.warranty.review",
        "entity_type": "installed_asset",
        "entity_id": row.get("id"),
        "record_label": label,
        "due_at": row.get("warranty_end_date"),
        "created_at": row.get("created_at") or _now_iso(),
        "updated_at": row.get("updated_at"),
        "target_page": "/app/satis-sonrasi/kurulu-urunler",
        "suggested_actions": [
            {
                "label": "Kurulu Urunu Ac",
                "action_type": "navigate",
                "target_page": "/app/satis-sonrasi/kurulu-urunler",
            }
        ],
    }


def _normalize_crm_followup(
    row: dict[str, Any], tenant_id: str, entity_type: str
) -> dict[str, Any]:
    overdue = _is_past_due(row.get("next_followup_date"))
    title = "CRM takibi gecikti" if overdue else "CRM takibi geldi"
    label = (
        row.get("lead_name")
        or row.get("opportunity_name")
        or row.get("opportunity_no")
        or "CRM kaydi"
    )
    target_page = "/app/crm/leadler" if entity_type == "lead" else "/app/crm/firsatlar"
    return {
        "id": f"crm_followup_{entity_type}:{row.get('id')}",
        "tenant_id": row.get("tenant_id") or tenant_id,
        "company_id": row.get("company_id"),
        "module_key": "crm",
        "source_type": "followup_overdue" if overdue else "followup_due",
        "source_id": str(row.get("id")),
        "title": title,
        "description": f"{label} icin takip aksiyonu bekliyor.",
        "status": "waiting",
        "severity": "warning" if overdue else "info",
        "priority": "urgent" if overdue else "high",
        "action_key": "crm.followup.open",
        "entity_type": entity_type,
        "entity_id": row.get("id"),
        "record_label": label,
        "due_at": row.get("next_followup_date"),
        "created_at": row.get("created_at") or _now_iso(),
        "updated_at": row.get("updated_at"),
        "target_page": target_page,
        "suggested_actions": [
            {"label": "Kaydi Ac", "action_type": "navigate", "target_page": target_page},
            {
                "label": "Takibi Tamamla",
                "action_type": "navigate",
                "target_page": "/app/crm/takipler",
            },
        ],
    }


def _normalize_crm_untouched_lead(row: dict[str, Any], tenant_id: str) -> dict[str, Any]:
    label = row.get("lead_name") or "Lead"
    return {
        "id": f"crm_lead_untouched:{row.get('id')}",
        "tenant_id": row.get("tenant_id") or tenant_id,
        "company_id": row.get("company_id"),
        "module_key": "crm",
        "source_type": "lead_untouched",
        "source_id": str(row.get("id")),
        "title": "Lead uzun suredir temas bekliyor",
        "description": f"{label} icin yeni temas veya kaybetme/qualify karari bekleniyor.",
        "status": "waiting",
        "severity": "warning",
        "priority": "normal",
        "action_key": "crm.lead.review",
        "entity_type": "lead",
        "entity_id": row.get("id"),
        "record_label": label,
        "due_at": row.get("next_followup_date") or row.get("created_at"),
        "created_at": row.get("created_at") or _now_iso(),
        "updated_at": row.get("updated_at"),
        "target_page": "/app/crm/leadler",
        "suggested_actions": [
            {"label": "Lead'i Ac", "action_type": "navigate", "target_page": "/app/crm/leadler"},
        ],
    }


def _normalize_crm_expected_close(row: dict[str, Any], tenant_id: str) -> dict[str, Any]:
    label = row.get("opportunity_no") or row.get("opportunity_name") or "Firsat"
    return {
        "id": f"crm_opportunity_close_overdue:{row.get('id')}",
        "tenant_id": row.get("tenant_id") or tenant_id,
        "company_id": row.get("company_id"),
        "module_key": "crm",
        "source_type": "opportunity_expected_close_overdue",
        "source_id": str(row.get("id")),
        "title": "Firsat kapanis tarihi gecmis",
        "description": f"{label} icin beklenen kapanis tarihi guncellenmeli.",
        "status": "waiting",
        "severity": "warning",
        "priority": "high",
        "action_key": "crm.opportunity.closeDate.review",
        "entity_type": "opportunity",
        "entity_id": row.get("id"),
        "record_label": label,
        "due_at": row.get("expected_close_date"),
        "created_at": row.get("created_at") or _now_iso(),
        "updated_at": row.get("updated_at"),
        "target_page": "/app/crm/firsatlar",
        "suggested_actions": [
            {"label": "Firsati Ac", "action_type": "navigate", "target_page": "/app/crm/firsatlar"},
        ],
    }


def _normalize_crm_proposal_expiring(row: dict[str, Any], tenant_id: str) -> dict[str, Any]:
    label = row.get("opportunity_no") or row.get("opportunity_name") or "Teklif"
    return {
        "id": f"crm_proposal_expiring:{row.get('id')}",
        "tenant_id": row.get("tenant_id") or tenant_id,
        "company_id": row.get("company_id"),
        "module_key": "crm",
        "source_type": "proposal_validity_expiring",
        "source_id": str(row.get("id")),
        "title": "Teklif gecerliligi yaklasiyor",
        "description": f"{label} teklif gecerlilik tarihi yaklasti.",
        "status": "waiting",
        "severity": "info",
        "priority": "normal",
        "action_key": "crm.proposal.review",
        "entity_type": "opportunity",
        "entity_id": row.get("id"),
        "record_label": label,
        "due_at": row.get("proposal_valid_until"),
        "created_at": row.get("created_at") or _now_iso(),
        "updated_at": row.get("updated_at"),
        "target_page": "/app/crm/firsatlar",
        "suggested_actions": [
            {"label": "Teklifi Ac", "action_type": "navigate", "target_page": "/app/crm/firsatlar"},
        ],
    }


def _normalize_accounting_item(
    row: dict[str, Any], tenant_id: str, source_kind: str
) -> dict[str, Any]:
    if source_kind == "bank_transaction":
        title = "Eslesmeyen banka hareketi var"
        label = row.get("description") or row.get("counterparty_name") or "Banka hareketi"
        description = f"{label} mutabakat bekliyor."
        target_page = "/app/muhasebe/mutabakat"
        action_key = "accounting.reconciliation.bank"
    elif source_kind == "e_document":
        rejected = row.get("status") == "rejected"
        title = "Reddedilen e-belge var" if rejected else "Eslesmeyen e-belge var"
        description = f"{row.get('invoice_no') or 'E-belge'} cari/banka hareketiyle eslestirilmeli."
        target_page = "/app/muhasebe/e-fatura-e-arsiv"
        action_key = "accounting.reconciliation.document"
    else:
        title = "Sermaye odeme mutabakati bekliyor"
        label = row.get("capital_transaction_id") or "Sermaye islemi"
        description = f"{label} icin odeme mutabakati tamamlanmadi."
        target_page = "/app/muhasebe/sermaye-mutabakati"
        action_key = "accounting.capital_reconciliation"
    amount_label = ""
    if row.get("amount") is not None:
        amount_label = f" Tutar: {row.get('amount')} {row.get('currency') or ''}".strip()
    return {
        "id": f"accounting_{source_kind}:{row.get('id')}",
        "tenant_id": row.get("tenant_id") or tenant_id,
        "company_id": row.get("company_id"),
        "module_key": "accounting",
        "source_type": f"accounting_{source_kind}",
        "source_id": str(row.get("id")),
        "title": title,
        "description": f"{description}{(' ' + amount_label) if amount_label else ''}",
        "status": "waiting",
        "severity": "warning",
        "priority": "high"
        if source_kind == "capital_reconciliation" or row.get("status") == "rejected"
        else "normal",
        "action_key": action_key,
        "entity_type": f"accounting_{source_kind}",
        "entity_id": row.get("id"),
        "record_label": row.get("invoice_no")
        or row.get("description")
        or row.get("capital_transaction_id")
        or str(row.get("id")),
        "created_at": row.get("created_at") or _now_iso(),
        "updated_at": row.get("updated_at"),
        "target_page": target_page,
        "suggested_actions": [
            {
                "label": "Incele",
                "action_type": "navigate",
                "target_page": target_page,
            }
        ],
    }


def _normalize_data_quality_item(row: dict[str, Any], tenant_id: str) -> dict[str, Any]:
    severity_value = row.get("severity")
    if severity_value == "critical":
        severity = "critical"
    elif severity_value == "warning":
        severity = "warning"
    else:
        severity = "info"
    entity_type = row.get("entity_type")
    entity_id = row.get("entity_id")
    return {
        "id": f"data_quality_finding:{row.get('id')}",
        "tenant_id": row.get("tenant_id") or tenant_id,
        "module_key": "dataQuality",
        "source_type": "data_quality",
        "source_id": str(row.get("id")),
        "title": _data_quality_title(row),
        "description": row.get("message") or "Veri kalitesi bulgusu incelenmeli.",
        "status": "waiting",
        "severity": severity,
        "priority": "high" if severity == "critical" else "normal",
        "action_key": row.get("rule_key") or "data_quality.review",
        "entity_type": entity_type,
        "entity_id": entity_id,
        "record_label": _record_label(entity_type, entity_id),
        "created_at": row.get("created_at") or _now_iso(),
        "target_page": "/app/sistem/veri-kalitesi",
        "suggested_actions": [
            {
                "label": "Incele",
                "action_type": "navigate",
                "target_page": "/app/sistem/veri-kalitesi",
            },
            {
                "label": "Ilgili Kaydi Ac",
                "action_type": "navigate",
                "target_page": _record_target_page(entity_type, entity_id, None),
            },
        ],
    }


def _normalize_duplicate_quality_item(row: dict[str, Any], tenant_id: str) -> dict[str, Any]:
    severity_value = str(row.get("severity") or "")
    severity = "critical" if severity_value == "exact" else "warning"
    entity_type = row.get("entity_type")
    candidate_count = row.get("candidate_count") or 0
    description = (
        f"{entity_type} icin {candidate_count} kayit ayni olabilir. {row.get('match_reason') or ''}"
    ).strip()
    return {
        "id": f"data_quality_duplicate:{row.get('id')}",
        "tenant_id": row.get("tenant_id") or tenant_id,
        "module_key": "dataQuality",
        "source_type": "data_quality",
        "source_id": str(row.get("id")),
        "title": "Duplicate adaylari incelenmeli",
        "description": description,
        "status": "waiting",
        "severity": severity,
        "priority": "high" if severity_value in {"exact", "strong"} else "normal",
        "action_key": "data_quality.duplicates.review",
        "entity_type": entity_type,
        "entity_id": row.get("suggested_master_id"),
        "record_label": f"{entity_type}: duplicate grup",
        "created_at": row.get("created_at") or _now_iso(),
        "target_page": "/app/sistem/veri-kalitesi",
        "suggested_actions": [
            {
                "label": "Merge Incele",
                "action_type": "navigate",
                "target_page": "/app/sistem/veri-kalitesi",
            },
            {
                "label": "Yok Say",
                "action_type": "navigate",
                "target_page": "/app/sistem/veri-kalitesi",
            },
        ],
    }


def _normalize_onboarding_items(
    row: dict[str, Any],
    company_summary: dict[str, int],
    tenant_id: str,
) -> list[dict[str, Any]]:
    created_at = row.get("updated_at") or row.get("created_at") or _now_iso()
    if company_summary.get("total", 0) <= 0:
        return [
            _onboarding_item(
                row,
                tenant_id,
                "first_company_draft",
                "Ilk sirket taslagi olusturulmadi",
                (
                    "Eden ERP islemleri sirket karti uzerinden ilerler. "
                    "Baslamak icin ilk sirket taslagini olusturun."
                ),
                "Sirket Taslagi Olustur",
                "/app/sirket/companies?action=create",
                created_at,
            )
        ]
    if company_summary.get("active", 0) <= 0 and company_summary.get("draft", 0) > 0:
        return [
            _onboarding_item(
                row,
                tenant_id,
                "first_company_opening",
                "Ilk sirket acilisi tamamlanmadi",
                (
                    "Taslak sirket aktif islem yapilabilir sirket degildir. "
                    "Sirket Acilisi sihirbazini tamamlayin."
                ),
                "Sirket Acilisina Git",
                "/app/sirket/companies?action=opening",
                created_at,
            )
        ]
    if row.get("status") != "completed":
        return [
            _onboarding_item(
                row,
                tenant_id,
                "finish",
                "Calisma alani kurulumu tamamlanmadi",
                "Temel tur, modul kontrolu ve baslangic adimlari henuz tamamlanmadi.",
                "Kuruluma Devam Et",
                "/app/onboarding",
                created_at,
            )
        ]
    return []


def _onboarding_item(
    row: dict[str, Any],
    tenant_id: str,
    action_key: str,
    title: str,
    description: str,
    action_label: str,
    target_page: str,
    created_at: object,
) -> dict[str, Any]:
    return {
        "id": f"onboarding:{action_key}",
        "tenant_id": row.get("tenant_id") or tenant_id,
        "module_key": "settings",
        "source_type": "onboarding",
        "source_id": str(row.get("id") or action_key),
        "title": title,
        "description": description,
        "status": "waiting",
        "severity": "warning",
        "priority": "normal",
        "action_key": action_key,
        "entity_type": "workspace",
        "entity_id": tenant_id,
        "record_label": "Calisma alani kurulumu",
        "created_at": created_at,
        "target_page": target_page,
        "suggested_actions": [
            {
                "label": action_label,
                "action_type": "navigate",
                "target_page": target_page,
            }
        ],
    }


def _normalize_outbox(row: dict[str, Any], tenant_id: str) -> dict[str, Any]:
    status = str(row.get("status") or "")
    return {
        "id": f"outbox:{row.get('id')}",
        "tenant_id": row.get("tenant_id") or tenant_id,
        "company_id": row.get("company_id"),
        "module_key": row.get("module_key") or "system",
        "source_type": "outbox",
        "source_id": str(row.get("id")),
        "title": (
            "Sistem guncellemesi tamamlanamadi"
            if status in {"failed", "dead_letter", "skipped"}
            else "Sistem guncellemesi bekliyor"
        ),
        "description": "Kayitlar korunur; sistem guncellemesi arka planda tekrar denenebilir.",
        "status": "failed" if status in {"failed", "dead_letter", "skipped"} else "waiting",
        "severity": "error" if status in {"failed", "dead_letter"} else "warning",
        "priority": "high" if status in {"failed", "dead_letter"} else "normal",
        "operation_id": row.get("operation_id"),
        "process_instance_id": row.get("process_instance_id"),
        "outbox_event_id": row.get("id"),
        "entity_type": row.get("aggregate_type"),
        "entity_id": row.get("aggregate_id"),
        "record_label": _record_label(row.get("aggregate_type"), row.get("aggregate_id")),
        "created_at": row.get("created_at") or row.get("occurred_at") or _now_iso(),
        "updated_at": row.get("updated_at") or row.get("locked_at"),
        "target_page": "/app/sistem/kurulum",
        "suggested_actions": [
            {
                "label": "Sistem Durumunu Ac",
                "action_type": "navigate",
                "target_page": "/app/sistem/kurulum",
            }
        ],
    }


def _normalize_integration_delivery(row: dict[str, Any], tenant_id: str) -> dict[str, Any]:
    dead_letter = row.get("status") == "dead_letter"
    title = (
        "Webhook teslimati dead-letter oldu"
        if dead_letter
        else "Webhook teslimati basarisiz"
    )
    description = (
        row.get("error_message")
        or "Webhook hedefi yanit vermedi veya hata dondurdu."
    )
    return {
        "id": f"integration_delivery:{row.get('id')}",
        "tenant_id": row.get("tenant_id") or tenant_id,
        "module_key": "integrations",
        "source_type": "webhook_delivery_dead_letter" if dead_letter else "webhook_delivery_failed",
        "source_id": str(row.get("id")),
        "title": title,
        "description": description,
        "status": "failed",
        "severity": "error",
        "priority": "high" if dead_letter else "normal",
        "entity_type": "webhook_delivery",
        "entity_id": str(row.get("id")),
        "record_label": row.get("subscription_name") or row.get("event_type") or row.get("id"),
        "created_at": row.get("created_at") or _now_iso(),
        "updated_at": row.get("last_attempt_at"),
        "target_page": "/app/sistem/entegrasyonlar",
        "suggested_actions": [
            {
                "label": "Teslimati Gor",
                "action_type": "navigate",
                "target_page": "/app/sistem/entegrasyonlar",
            }
        ],
    }


def _normalize_integration_inbound(row: dict[str, Any], tenant_id: str) -> dict[str, Any]:
    invalid_signature = row.get("signature_valid") is False and row.get("status") == "rejected"
    source_type = (
        "invalid_signature_repeated"
        if invalid_signature
        else "inbound_event_needs_review"
    )
    title = (
        "Inbound webhook imzasi reddedildi"
        if invalid_signature
        else "Inbound olay inceleme bekliyor"
    )
    record_label = (
        row.get("inbound_event_type")
        or row.get("source_event_id")
        or row.get("id")
    )
    return {
        "id": f"integration_inbound:{row.get('id')}",
        "tenant_id": row.get("tenant_id") or tenant_id,
        "module_key": "integrations",
        "source_type": source_type,
        "source_id": str(row.get("id")),
        "title": title,
        "description": row.get("error_message") or "Inbound payload otomatik islenemedi.",
        "status": "failed" if invalid_signature else "waiting",
        "severity": "error" if invalid_signature else "warning",
        "priority": "high" if invalid_signature else "normal",
        "entity_type": "integration_inbound_event",
        "entity_id": str(row.get("id")),
        "record_label": record_label,
        "created_at": row.get("created_at") or _now_iso(),
        "updated_at": row.get("updated_at"),
        "target_page": "/app/sistem/entegrasyonlar",
        "suggested_actions": [
            {
                "label": "Inbound Olayi Incele",
                "action_type": "navigate",
                "target_page": "/app/sistem/entegrasyonlar",
            }
        ],
    }


def _filter_items(items: list[dict[str, Any]], query: dict[str, Any]) -> list[dict[str, Any]]:
    return [
        item
        for item in items
        if (not query.get("source_type") or item.get("source_type") == query["source_type"])
        and (not query.get("status") or item.get("status") == query["status"])
        and (not query.get("severity") or item.get("severity") == query["severity"])
        and (not query.get("priority") or item.get("priority") == query["priority"])
        and (not query.get("module_key") or item.get("module_key") == query["module_key"])
        and (not query.get("company_id") or item.get("company_id") == query["company_id"])
        and (
            not query.get("entity_type")
            or _same_entity_type(item.get("entity_type"), query["entity_type"])
        )
        and (
            not query.get("entity_id")
            or item.get("entity_id") == query["entity_id"]
            or item.get("company_id") == query["entity_id"]
            or item.get("branch_id") == query["entity_id"]
        )
    ]


def _sort_items(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    severity_rank = {"critical": 4, "error": 3, "warning": 2, "info": 1}
    priority_rank = {"urgent": 4, "high": 3, "normal": 2, "low": 1}
    return sorted(
        items,
        key=lambda item: (
            severity_rank.get(str(item.get("severity")), 0)
            + priority_rank.get(str(item.get("priority")), 0),
            str(item.get("created_at") or ""),
        ),
        reverse=True,
    )


def _summary(items: list[dict[str, Any]]) -> dict[str, Any]:
    by_module: dict[str, int] = {}
    by_severity: dict[str, int] = {}
    total_open = 0
    urgent_count = 0
    approval_count = 0
    task_count = 0
    failed_operation_count = 0
    system_warning_count = 0
    for item in items:
        if item.get("status") not in {"completed", "dismissed"}:
            total_open += 1
        if item.get("priority") == "urgent" or item.get("severity") == "critical":
            urgent_count += 1
        if item.get("source_type") == "approval":
            approval_count += 1
        if item.get("source_type") == "process_task":
            task_count += 1
        if item.get("source_type") == "project_task":
            task_count += 1
        if item.get("source_type") == "operation" and item.get("status") == "failed":
            failed_operation_count += 1
        if (
            item.get("source_type")
            in {
                "outbox",
                "projection",
                "integrity_warning",
                "module_readiness",
                "onboarding",
                "data_quality",
                "system",
                "failed_scheduled_report",
                "report_export_failed",
                "report_permission_issue",
            }
            and item.get("status") != "completed"
        ):
            system_warning_count += 1
        module_key = str(item.get("module_key") or "system")
        severity = str(item.get("severity") or "info")
        by_module[module_key] = by_module.get(module_key, 0) + 1
        by_severity[severity] = by_severity.get(severity, 0) + 1
    return {
        "total_open": total_open,
        "urgent_count": urgent_count,
        "approval_count": approval_count,
        "task_count": task_count,
        "failed_operation_count": failed_operation_count,
        "system_warning_count": system_warning_count,
        "by_module": by_module,
        "by_severity": by_severity,
    }


def _can_see_system_items(context: dict[str, Any]) -> bool:
    if context.get("is_internal"):
        return True
    permissions = set(context.get("permissions") or [])
    return bool(permissions.intersection(SYSTEM_PERMISSIONS))


def _can_see_integration_items(context: dict[str, Any]) -> bool:
    if context.get("is_internal"):
        return True
    permissions = set(context.get("permissions") or [])
    return bool(
        permissions.intersection(
            {
                "__eden_demo_allow_all__",
                "system.admin",
                "integrations.view",
                "integrations.viewDeliveries",
                "integrations.viewInbound",
                "integrations.admin",
            }
        )
    )


def _can_see_data_quality_items(context: dict[str, Any]) -> bool:
    if context.get("is_internal"):
        return True
    permissions = set(context.get("permissions") or [])
    return bool(
        permissions.intersection(
            {
                "__eden_demo_allow_all__",
                "system.admin",
                "settings.view",
                "dataQuality.view",
                "dataQuality.reviewDuplicates",
                "dataQuality.merge",
                "dataQuality.admin",
            }
        )
    )


def _can_see_accounting_items(context: dict[str, Any]) -> bool:
    if context.get("is_internal"):
        return True
    permissions = set(context.get("permissions") or [])
    return bool(permissions.intersection(ACCOUNTING_PERMISSIONS))


def _can_see_hr_items(context: dict[str, Any]) -> bool:
    if context.get("is_internal"):
        return True
    permissions = set(context.get("permissions") or [])
    return bool(
        permissions.intersection(
            {
                "__eden_demo_allow_all__",
                "hr.view",
                "hr.leaveView",
                "hr.leaveApprove",
                "hr.attendanceView",
                "hr.timesheetView",
                "hr.payrollPrepView",
                "hr.edit",
            }
        )
    )


def _can_manage_hr_items(context: dict[str, Any]) -> bool:
    if context.get("is_internal"):
        return True
    permissions = set(context.get("permissions") or [])
    return bool(
        permissions.intersection(
            {
                "__eden_demo_allow_all__",
                "hr.edit",
                "hr.leaveApprove",
                "hr.leaveAdmin",
                "hr.attendanceEdit",
                "hr.timesheetManage",
                "hr.timesheetApprove",
                "hr.payrollPrepManage",
            }
        )
    )


def _can_see_after_sales_items(context: dict[str, Any]) -> bool:
    if context.get("is_internal"):
        return True
    permissions = set(context.get("permissions") or [])
    return bool(
        permissions.intersection(
            {
                "__eden_demo_allow_all__",
                "afterSales.view",
                "afterSales.maintenanceView",
                "afterSales.fieldServiceView",
                "afterSales.fieldServiceExecute",
                "afterSales.admin",
                "after_sales.view",
            }
        )
    )


def _can_manage_after_sales_items(context: dict[str, Any]) -> bool:
    if context.get("is_internal"):
        return True
    permissions = set(context.get("permissions") or [])
    return bool(
        permissions.intersection(
            {
                "__eden_demo_allow_all__",
                "afterSales.requestAssign",
                "afterSales.fieldServiceAssign",
                "afterSales.admin",
                "after_sales.manage",
            }
        )
    )


def _can_see_crm_items(context: dict[str, Any]) -> bool:
    if context.get("is_internal"):
        return True
    permissions = set(context.get("permissions") or [])
    return bool(
        permissions.intersection(
            {
                "__eden_demo_allow_all__",
                "crm.view",
                "crm.leadsView",
                "crm.opportunitiesView",
                "crm.followupManage",
                "crm.edit",
            }
        )
    )


def _can_manage_crm_items(context: dict[str, Any]) -> bool:
    if context.get("is_internal"):
        return True
    permissions = set(context.get("permissions") or [])
    return bool(
        permissions.intersection(
            {
                "__eden_demo_allow_all__",
                "crm.edit",
                "crm.leadsEdit",
                "crm.opportunitiesEdit",
                "crm.followupManage",
                "crm.pipelineManage",
            }
        )
    )


def _can_see_reporting_items(context: dict[str, Any]) -> bool:
    if context.get("is_internal"):
        return True
    permissions = set(context.get("permissions") or [])
    return bool(
        permissions.intersection(
            {
                "__eden_demo_allow_all__",
                "reporting.view",
                "reporting.admin",
                "reporting.scheduledReportsManage",
                "reporting.exportManage",
                "system.admin",
            }
        )
    )


async def _onboarding_company_summary(session: AsyncSession, tenant_id: str) -> dict[str, int]:
    if not await table_exists(session, "public.companies"):
        return {"total": 0, "draft": 0, "active": 0}
    result = await session.execute(
        text(
            """
            select
              count(*) filter (where coalesce(is_deleted, false) = false) as total,
              count(*) filter (
                where coalesce(is_deleted, false) = false
                  and coalesce(record_status, company_status, 'draft') = 'draft'
              ) as draft,
              count(*) filter (
                where coalesce(is_deleted, false) = false
                  and coalesce(record_status, company_status, 'draft') = 'active'
              ) as active
            from public.companies
            where tenant_id = :tenant_id
            """
        ),
        {"tenant_id": tenant_id},
    )
    row = row_to_dict(result.mappings().one()) or {}
    return {key: int(row.get(key) or 0) for key in ["total", "draft", "active"]}


def _same_entity_type(left: object, right: object) -> bool:
    left_value = str(left or "")
    right_value = str(right or "")
    if not left_value or not right_value:
        return False

    def normalize(value: str) -> str:
        return value.replace("company_", "").replace("_branch", "branch")

    return left_value == right_value or normalize(left_value) == normalize(right_value)


def _is_past_due(value: object) -> bool:
    date = _parse_datetime(value)
    return bool(date and date < datetime.now(UTC))


def _minutes_since(value: object) -> int:
    date = _parse_datetime(value)
    if not date:
        return 0
    return int((datetime.now(UTC) - date).total_seconds() // 60)


def _parse_datetime(value: object) -> datetime | None:
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=UTC)
    if isinstance(value, date):
        return datetime.combine(value, datetime.min.time(), tzinfo=UTC)
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=UTC)
    except ValueError:
        return None


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


def _module_label(module_key: object) -> str:
    labels = {
        "companies": "Sirketlerimiz",
        "branches": "Subelerimiz",
        "partners": "Ortaklarimiz",
        "representatives": "Temsilcilerimiz",
        "organization": "Teskilat/Kadro",
        "facilities": "Tesisler/Lokasyonlar",
        "process": "Surecler",
        "system": "Sistem",
        "settings": "Sistem",
        "sirket": "Sirketlerimiz",
        "project_management": "Proje ve Gorevler",
        "hr": "Insan Kaynaklari",
        "documents": "Belgeler",
        "notifications": "Bildirimler",
        "dataQuality": "Veri Kalitesi",
    }
    return labels.get(str(module_key or ""), "Eden ERP")


def _operation_label(operation_type: object) -> str:
    labels = {
        "branch_opening": "Sube Acilisi",
        "branch_closing": "Sube Kapanisi",
        "capital_increase": "Sermaye Artirimi",
        "representative_authority": "Temsil Yetkisi",
        "ownership_transaction": "Ortaklik Islemi",
        "opening": "Sirket Acilisi",
        "title_change": "Unvan Degisikligi",
        "address_change": "Adres Degisikligi",
        "nace_change": "NACE Guncelleme",
        "activity_subject_change": "Faaliyet Konusu Degisikligi",
    }
    key = str(operation_type or "")
    return labels.get(key, key.replace("_", " ") if key else "Islem")


def _operation_title(status: str) -> str:
    if status == "failed":
        return "Tamamlanamayan islem var"
    if status == "requires_action":
        return "Kullanici adimi bekleyen islem var"
    return "Islem hala isleniyor"


def _record_target_page(entity_type: object, entity_id: object, company_id: object) -> str:
    record_id = str(entity_id or company_id or "")
    entity = str(entity_type or "")
    if entity == "company":
        return f"/app/sirket/companies?id={record_id}" if record_id else "/app/sirket/companies"
    if entity in {"company_branch", "branch"}:
        return (
            f"/app/sirket/companies/branches?id={record_id}"
            if record_id
            else "/app/sirket/companies/branches"
        )
    if entity in {"company_partner", "partner"}:
        return (
            f"/app/sirket/companies/partners?id={record_id}"
            if record_id
            else "/app/sirket/companies/partners"
        )
    if entity in {"company_representative", "representative"}:
        return (
            f"/app/sirket/companies/representatives?id={record_id}"
            if record_id
            else "/app/sirket/companies/representatives"
        )
    if entity == "employee":
        return f"/app/ik/calisanlar?id={record_id}" if record_id else "/app/ik/calisanlar"
    if entity in {"leave_request", "hr_leave_request"}:
        return "/app/ik/izinler"
    if entity in {"hr_attendance_record", "attendance_issue"}:
        return "/app/ik/devam-devamsizlik"
    if entity in {"hr_timesheet_period", "timesheet_review"}:
        return "/app/ik/puantaj"
    if entity in {"hr_employee_document", "document_missing"}:
        return "/app/ik/calisanlar"
    if entity in {"service_request", "after_sales_service_request"}:
        return "/app/satis-sonrasi/servis-talepleri"
    if entity in {"service_record", "after_sales_service_record"}:
        return "/app/satis-sonrasi/servis-kayitlari"
    if entity in {"field_assignment", "after_sales_field_assignment"}:
        return (
            f"/app/satis-sonrasi/mobil-servis/{record_id}"
            if record_id
            else "/app/satis-sonrasi/saha-gorevleri"
        )
    if entity in {"maintenance_due", "after_sales_maintenance_due_item"}:
        return "/app/satis-sonrasi/bakimi-gelenler"
    if entity in {"lead", "crm_lead"}:
        return "/app/crm/leadler"
    if entity in {"opportunity", "crm_opportunity"}:
        return "/app/crm/firsatlar"
    return "/app"


def _record_label(entity_type: object, entity_id: object) -> str | None:
    if not entity_id:
        return None
    labels = {
        "company": "Sirket",
        "company_branch": "Sube",
        "branch": "Sube",
        "company_partner": "Ortak",
        "partner": "Ortak",
        "company_representative": "Temsilci",
        "representative": "Temsilci",
        "process_instance": "Surec",
        "employee": "Calisan",
        "leave_request": "Izin Talebi",
        "hr_leave_request": "Izin Talebi",
        "hr_attendance_record": "Devam Kaydi",
        "hr_timesheet_period": "Puantaj",
        "hr_employee_document": "Calisan Belgesi",
        "organization_unit": "Organizasyon Birimi",
        "facility": "Tesis/Lokasyon",
        "document": "Belge",
        "data_quality": "Veri Kalitesi",
        "master_person": "Master Kisi",
        "master_organization": "Master Kurum",
        "stakeholder": "Paydas",
        "cari_account": "Cari Kart",
        "installed_asset": "Kurulu Urun",
        "service_request": "Servis Talebi",
        "service_record": "Servis Kaydi",
        "field_assignment": "Saha Gorevi",
        "maintenance_due": "Bakim Takvimi",
        "lead": "Lead",
        "crm_lead": "Lead",
        "opportunity": "Firsat",
        "crm_opportunity": "Firsat",
    }
    return f"{labels.get(str(entity_type or ''), 'Kayit')}: {entity_id}"


def _data_quality_title(row: dict[str, Any]) -> str:
    rule_key = str(row.get("rule_key") or "")
    if "duplicate" in rule_key:
        return "Duplicate veri kalite uyarisi"
    if "missing" in rule_key:
        return "Eksik veri kalite uyarisi"
    if "expired" in rule_key:
        return "Suresi dolan belge uyarisi"
    return "Veri kalitesi uyarisi"


def _project_task_description(row: dict[str, Any]) -> str:
    project = row.get("project_name") or row.get("project_key") or "Bagimsiz gorev"
    due = row.get("due_date")
    if due:
        return f"{project} - son tarih {due}"
    return f"{project} icin proje gorevi."
