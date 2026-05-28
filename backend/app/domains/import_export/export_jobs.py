# ruff: noqa: E501

from __future__ import annotations

import base64
import json
from dataclasses import dataclass
from typing import Any
from uuid import uuid4

from fastapi import status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.core.serialization import row_to_dict, rows_to_dicts
from app.domains.audit.service import record_audit_best_effort
from app.domains.import_export.error_reports import rows_to_csv
from app.domains.import_export.events import EXPORT_JOB_COMPLETED
from app.domains.import_export.import_jobs import ensure_import_tables
from app.domains.operations.service import table_exists
from app.domains.outbox.service import enqueue_outbox_event_best_effort

MAX_EXPORT_ROWS = 10000


@dataclass(frozen=True, slots=True)
class ExportDataset:
    entity_type: str
    module_key: str
    table_name: str
    columns: list[str]
    sensitive_columns: set[str]
    company_column: str | None = "company_id"
    deleted_filter: bool = True


EXPORT_DATASETS: dict[str, ExportDataset] = {
    "company": ExportDataset("company", "companies", "public.companies", ["id", "trade_name", "short_name", "tax_number", "tax_office", "company_type", "city", "record_status", "company_status", "created_at", "updated_at"], {"tax_number"}, company_column="id"),
    "partner": ExportDataset("partner", "partners", "public.company_partners", ["id", "company_id", "display_name", "partner_type", "identity_number", "identity_tax_number", "status", "record_status", "created_at", "updated_at"], {"identity_number", "identity_tax_number"}),
    "representative": ExportDataset("representative", "representatives", "public.company_representatives", ["id", "company_id", "display_name", "full_name", "phone", "email", "status", "record_status", "created_at", "updated_at"], {"phone", "email"}),
    "branch": ExportDataset("branch", "branches", "public.company_branches", ["id", "company_id", "branch_name", "branch_type", "city", "district", "record_status", "status", "created_at", "updated_at"], set()),
    "cari_account": ExportDataset("cari_account", "accounting", "public.accounting_cari_accounts", ["id", "company_id", "account_code", "account_name", "cari_role", "tax_number", "identity_number", "city", "email", "phone", "currency", "current_balance", "record_status", "updated_at"], {"identity_number", "email", "phone"}),
    "cari_transaction": ExportDataset("cari_transaction", "accounting", "public.accounting_cari_transactions", ["id", "company_id", "account_id", "transaction_date", "transaction_type", "direction", "debit", "credit", "currency", "status", "created_at"], set()),
    "employee": ExportDataset("employee", "hr", "public.hr_employees", ["id", "company_id", "employee_no", "full_name", "identity_number", "email", "phone", "record_status", "employment_status", "created_at", "updated_at"], {"identity_number", "email", "phone"}),
    "product_catalog": ExportDataset("product_catalog", "product_services", "public.product_catalog", ["id", "company_id", "product_code", "product_name", "product_type", "category", "brand", "model", "active", "updated_at"], set()),
    "installed_asset": ExportDataset("installed_asset", "after_sales", "public.after_sales_installed_assets", ["id", "company_id", "asset_tag", "customer_name", "product_id", "serial_number", "warranty_status", "status", "created_at"], {"serial_number"}),
    "service_request": ExportDataset("service_request", "after_sales", "public.after_sales_service_requests", ["id", "company_id", "request_no", "customer_name", "title", "status", "priority", "created_at", "updated_at"], set()),
    "stakeholder": ExportDataset("stakeholder", "crm", "public.crm_stakeholders", ["id", "company_id", "display_name", "stakeholder_type", "relationship_status", "customer_status", "supplier_status", "assigned_owner_user_id", "created_at", "updated_at"], set()),
    "project_task": ExportDataset("project_task", "project_management", "public.project_tasks", ["id", "company_id", "issue_key", "title", "status", "priority", "assignee_user_id", "due_date", "created_at", "updated_at"], set()),
    "audit_log": ExportDataset("audit_log", "audit", "public.audit_logs", ["id", "module_key", "entity_type", "entity_id", "action_type", "action_key", "user_id", "result_status", "severity", "summary", "created_at"], {"user_id"}, company_column="company_id", deleted_filter=False),
}


async def create_export_job(
    session: AsyncSession,
    context: dict[str, Any],
    request: Any,
) -> dict[str, Any]:
    await ensure_import_tables(session)
    dataset = EXPORT_DATASETS.get(str(request.entity_type))
    if not dataset:
        raise DomainError("Bu veri seti export icin desteklenmiyor.", "EXPORT_DATASET_NOT_SUPPORTED", status.HTTP_404_NOT_FOUND)
    if not await table_exists(session, dataset.table_name):
        raise DomainError("Export veri kaynagi hazir degil.", "EXPORT_SOURCE_NOT_READY", status.HTTP_409_CONFLICT, {"table": dataset.table_name})

    job_id = str(uuid4())
    await session.execute(
        text(
            """
            insert into public.data_export_jobs (
              id, tenant_id, module_key, entity_type, report_key, filters, columns,
              file_type, status, created_by, created_at
            )
            values (
              :id, :tenant_id, :module_key, :entity_type, :report_key, cast(:filters as jsonb),
              cast(:columns as jsonb), 'csv', 'processing', :created_by, now()
            )
            """
        ),
        {
            "id": job_id,
            "tenant_id": context["tenant_id"],
            "module_key": dataset.module_key,
            "entity_type": dataset.entity_type,
            "report_key": request.report_key,
            "filters": json.dumps(request.filters, ensure_ascii=False, default=str),
            "columns": json.dumps(request.columns or dataset.columns, ensure_ascii=False),
            "created_by": context.get("user_id"),
        },
    )
    rows, columns = await _query_dataset(session, context, dataset, request.filters, request.columns)
    csv_text = rows_to_csv(_mask_rows(rows, dataset, context), columns)
    file_ref = {
        "file_name": f"{dataset.entity_type}-export-{job_id}.csv",
        "content_type": "text/csv",
        "content_base64": base64.b64encode(csv_text.encode("utf-8")).decode("ascii"),
    }
    await session.execute(
        text(
            """
            update public.data_export_jobs
            set status = 'completed',
                row_count = :row_count,
                file_ref = cast(:file_ref as jsonb),
                completed_at = now()
            where tenant_id = :tenant_id and id = :job_id
            """
        ),
        {"tenant_id": context["tenant_id"], "job_id": job_id, "row_count": len(rows), "file_ref": json.dumps(file_ref, ensure_ascii=False)},
    )
    await record_audit_best_effort(
        session,
        {**context, "module_key": "importExport"},
        action_type="export",
        action_key="export.created",
        summary="Export job olusturuldu.",
        entity_type="data_export_job",
        entity_id=job_id,
        metadata={"entity_type": dataset.entity_type, "row_count": len(rows)},
    )
    await enqueue_outbox_event_best_effort(
        session,
        {**context, "module_key": "importExport"},
        event_type=EXPORT_JOB_COMPLETED,
        aggregate_type="data_export_job",
        aggregate_id=job_id,
        payload={"entity_type": dataset.entity_type, "row_count": len(rows)},
    )
    return await get_export_job(session, context, job_id)


async def get_export_job(
    session: AsyncSession,
    context: dict[str, Any],
    job_id: str,
) -> dict[str, Any]:
    await ensure_import_tables(session)
    result = await session.execute(
        text("select * from public.data_export_jobs where tenant_id = :tenant_id and id = :job_id limit 1"),
        {"tenant_id": context["tenant_id"], "job_id": job_id},
    )
    row = result.mappings().one_or_none()
    if not row:
        raise DomainError("Export job bulunamadi.", "EXPORT_JOB_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    return row_to_dict(row) or {}


async def download_export_job(
    session: AsyncSession,
    context: dict[str, Any],
    job_id: str,
) -> str:
    job = await get_export_job(session, context, job_id)
    file_ref = dict(job.get("file_ref") or {})
    encoded = file_ref.get("content_base64")
    if not encoded:
        raise DomainError("Export dosyasi henuz hazir degil.", "EXPORT_FILE_NOT_READY", status.HTTP_409_CONFLICT)
    await record_audit_best_effort(
        session,
        {**context, "module_key": "importExport"},
        action_type="download",
        action_key="export.downloaded",
        summary="Export dosyasi indirildi.",
        entity_type="data_export_job",
        entity_id=job_id,
        metadata={"entity_type": job.get("entity_type")},
    )
    return base64.b64decode(str(encoded)).decode("utf-8")


async def _query_dataset(
    session: AsyncSession,
    context: dict[str, Any],
    dataset: ExportDataset,
    filters: dict[str, Any],
    requested_columns: list[str],
) -> tuple[list[dict[str, Any]], list[str]]:
    columns = [column for column in (requested_columns or dataset.columns) if column in dataset.columns]
    if not columns:
        columns = dataset.columns
    where = ["tenant_id = :tenant_id"]
    params: dict[str, Any] = {"tenant_id": context["tenant_id"], "limit": MAX_EXPORT_ROWS}
    if dataset.deleted_filter:
        where.append("coalesce(is_deleted, false) = false")
    company_id = filters.get("company_id")
    if company_id and dataset.company_column:
        where.append(f"{dataset.company_column} = cast(:company_id as uuid)")
        params["company_id"] = company_id
    elif dataset.company_column and context.get("company_scope_ids"):
        where.append(f"{dataset.company_column} = any(cast(:company_scope_ids as uuid[]))")
        params["company_scope_ids"] = context["company_scope_ids"]
    search = filters.get("search")
    if search:
        searchable = [column for column in columns if column.endswith("name") or column in {"trade_name", "title", "summary", "account_name", "product_name", "display_name"}]
        if searchable:
            where.append("(" + " or ".join(f"coalesce({column}::text, '') ilike :search" for column in searchable) + ")")
            params["search"] = f"%{search}%"
    result = await session.execute(
        text(
            f"""
            select {", ".join(columns)}
            from {dataset.table_name}
            where {" and ".join(where)}
            order by created_at desc nulls last
            limit :limit
            """
        ),
        params,
    )
    return rows_to_dicts(list(result.mappings().all())), columns


def _mask_rows(
    rows: list[dict[str, Any]],
    dataset: ExportDataset,
    context: dict[str, Any],
) -> list[dict[str, Any]]:
    permissions = set(context.get("permissions") or [])
    can_view_sensitive = bool(permissions.intersection({"system.admin", "hr.sensitiveView", "audit.export", "reporting.exportSensitive"}))
    if can_view_sensitive:
        return rows
    masked: list[dict[str, Any]] = []
    for row in rows:
        next_row = dict(row)
        for column in dataset.sensitive_columns:
            if column in next_row and next_row[column]:
                next_row[column] = _mask(next_row[column])
        masked.append(next_row)
    return masked


def _mask(value: Any) -> str:
    text_value = str(value)
    if len(text_value) <= 4:
        return "*" * len(text_value)
    return f"{text_value[:2]}{'*' * max(2, len(text_value) - 4)}{text_value[-2:]}"
