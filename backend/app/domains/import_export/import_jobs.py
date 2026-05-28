# ruff: noqa: E501

from __future__ import annotations

import base64
import json
from decimal import Decimal
from typing import Any
from uuid import uuid4

from fastapi import status
from pydantic import ValidationError as PydanticValidationError
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.core.serialization import row_to_dict, rows_to_dicts
from app.domains.accounting.cari_accounts import create_cari_account
from app.domains.accounting.schemas import CariAccountCreateRequest
from app.domains.audit.service import record_audit_best_effort
from app.domains.company.service import create_company_draft
from app.domains.crm.schemas import (
    CreateCariAccountFromStakeholderRequest,
    MasterOrganizationCreateRequest,
    MasterPersonCreateRequest,
    StakeholderCreateRequest,
)
from app.domains.crm.stakeholders import create_cari_account_for_stakeholder, create_stakeholder
from app.domains.facilities.service import create_facility
from app.domains.hr.employees import create_employee
from app.domains.hr.schemas import EmployeeCreateRequest
from app.domains.import_export.duplicate_detection import (
    detect_existing_duplicate,
    detect_file_duplicate,
)
from app.domains.import_export.error_reports import build_error_report
from app.domains.import_export.events import (
    IMPORT_JOB_COMPLETED,
    IMPORT_JOB_CREATED,
    IMPORT_JOB_FAILED,
    IMPORT_JOB_VALIDATED,
)
from app.domains.import_export.parser import parse_upload
from app.domains.import_export.schemas import (
    ImportConfirmRequest,
    ImportJobCreateRequest,
    ImportMappingRequest,
    ImportUploadRequest,
    ImportValidateRequest,
)
from app.domains.import_export.templates import get_template, get_template_for_entity
from app.domains.import_export.validators import (
    auto_field_mapping,
    issue_list_to_json,
    normalize_row,
    validate_normalized_row,
)
from app.domains.operations.service import table_exists
from app.domains.organization.service import create_organization_unit
from app.domains.outbox.service import enqueue_outbox_event_best_effort
from app.domains.partners.service import create_partner_draft
from app.domains.products.catalog import create_product
from app.domains.products.schemas import ProductCreateRequest
from app.domains.projects.schemas import ProjectTaskCreateRequest
from app.domains.projects.tasks import create_project_task
from app.domains.representatives.service import create_representative_draft


async def ensure_import_tables(session: AsyncSession) -> None:
    if not await table_exists(session, "public.data_import_jobs"):
        raise DomainError(
            "Import/Export tablolari hazir degil. Migration uygulanmalidir.",
            "IMPORT_EXPORT_TABLES_MISSING",
            status.HTTP_409_CONFLICT,
        )


async def create_import_job(
    session: AsyncSession,
    context: dict[str, Any],
    request: ImportJobCreateRequest,
) -> dict[str, Any]:
    await ensure_import_tables(session)
    template = get_template(request.template_key or "") or get_template_for_entity(request.entity_type)
    if not template:
        raise DomainError("Bu veri seti icin import sablonu bulunamadi.", "IMPORT_TEMPLATE_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    job_id = str(uuid4())
    result = await session.execute(
        text(
            """
            insert into public.data_import_jobs (
              id, tenant_id, company_id, module_key, entity_type, import_type,
              source_file_ref, file_type, status, field_mapping, validation_summary,
              dry_run_result, created_by, version
            )
            values (
              :id, :tenant_id, :company_id, :module_key, :entity_type, :import_type,
              '{}'::jsonb, 'csv', 'uploaded', '{}'::jsonb, '{}'::jsonb,
              '{}'::jsonb, :created_by, 1
            )
            returning *
            """
        ),
        {
            "id": job_id,
            "tenant_id": context["tenant_id"],
            "company_id": request.company_id,
            "module_key": template.module_key,
            "entity_type": template.entity_type,
            "import_type": request.import_type,
            "created_by": context.get("user_id"),
        },
    )
    job = row_to_dict(result.mappings().one()) or {}
    await _audit(session, context, "create", "import.job.created", "Import job olusturuldu.", job)
    return job


async def get_import_job(
    session: AsyncSession,
    context: dict[str, Any],
    job_id: str,
    *,
    include_rows: bool = True,
) -> dict[str, Any]:
    await ensure_import_tables(session)
    job = await _load_job(session, context, job_id)
    if include_rows:
        rows = await session.execute(
            text(
                """
                select id, row_number, raw_data, normalized_data, status, errors, warnings, target_entity_id, created_at
                from public.data_import_job_rows
                where tenant_id = :tenant_id and import_job_id = :job_id
                order by row_number asc
                limit 200
                """
            ),
            {"tenant_id": context["tenant_id"], "job_id": job_id},
        )
        job["rows"] = rows_to_dicts(list(rows.mappings().all()))
    return job


async def upload_import_file(
    session: AsyncSession,
    context: dict[str, Any],
    job_id: str,
    request: ImportUploadRequest,
) -> dict[str, Any]:
    job = await _load_job(session, context, job_id)
    _assert_job_mutable(job)
    template = _template_for_job(job)
    parsed = parse_upload(request)
    mapping = request.field_mapping or auto_field_mapping(template, parsed.columns)

    await session.execute(
        text("delete from public.data_import_job_rows where tenant_id = :tenant_id and import_job_id = :job_id"),
        {"tenant_id": context["tenant_id"], "job_id": job_id},
    )
    for index, raw in enumerate(parsed.rows, start=2):
        await session.execute(
            text(
                """
                insert into public.data_import_job_rows (
                  id, tenant_id, import_job_id, row_number, raw_data, normalized_data,
                  status, errors, warnings, created_at
                )
                values (
                  :id, :tenant_id, :job_id, :row_number, cast(:raw_data as jsonb),
                  '{}'::jsonb, 'uploaded', '[]'::jsonb, '[]'::jsonb, now()
                )
                """
            ),
            {
                "id": str(uuid4()),
                "tenant_id": context["tenant_id"],
                "job_id": job_id,
                "row_number": index,
                "raw_data": _json(raw),
            },
        )
    source_ref = {
        "file_name": request.source_file_name,
        "columns": parsed.columns,
        "row_count": len(parsed.rows),
        "storage": "job_rows",
    }
    await session.execute(
        text(
            """
            update public.data_import_jobs
            set source_file_name = :source_file_name,
                source_file_ref = cast(:source_file_ref as jsonb),
                file_type = :file_type,
                status = 'mapping_required',
                total_rows = :total_rows,
                field_mapping = cast(:field_mapping as jsonb),
                updated_at = now(),
                version = version + 1
            where tenant_id = :tenant_id and id = :job_id
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "job_id": job_id,
            "source_file_name": request.source_file_name,
            "source_file_ref": _json(source_ref),
            "file_type": parsed.file_type,
            "total_rows": len(parsed.rows),
            "field_mapping": _json(mapping),
        },
    )
    return await get_import_job(session, context, job_id)


async def update_import_mapping(
    session: AsyncSession,
    context: dict[str, Any],
    job_id: str,
    request: ImportMappingRequest,
) -> dict[str, Any]:
    job = await _load_job(session, context, job_id)
    _assert_job_mutable(job)
    await session.execute(
        text(
            """
            update public.data_import_jobs
            set field_mapping = cast(:field_mapping as jsonb),
                status = 'mapping_required',
                updated_at = now(),
                version = version + 1
            where tenant_id = :tenant_id and id = :job_id
            """
        ),
        {"tenant_id": context["tenant_id"], "job_id": job_id, "field_mapping": _json(request.field_mapping)},
    )
    return await get_import_job(session, context, job_id)


async def validate_import_job(
    session: AsyncSession,
    context: dict[str, Any],
    job_id: str,
    request: ImportValidateRequest,
) -> dict[str, Any]:
    job = await _load_job(session, context, job_id)
    _assert_job_mutable(job)
    template = _template_for_job(job)
    mapping = request.field_mapping or dict(job.get("field_mapping") or {})
    if not mapping:
        source = dict(job.get("source_file_ref") or {})
        mapping = auto_field_mapping(template, list(source.get("columns") or []))

    await session.execute(
        text("update public.data_import_jobs set status = 'validating', field_mapping = cast(:field_mapping as jsonb), updated_at = now() where tenant_id = :tenant_id and id = :job_id"),
        {"tenant_id": context["tenant_id"], "job_id": job_id, "field_mapping": _json(mapping)},
    )
    row_result = await session.execute(
        text(
            """
            select id, row_number, raw_data
            from public.data_import_job_rows
            where tenant_id = :tenant_id and import_job_id = :job_id
            order by row_number asc
            """
        ),
        {"tenant_id": context["tenant_id"], "job_id": job_id},
    )
    rows = rows_to_dicts(list(row_result.mappings().all()))
    if not rows:
        raise DomainError("Validate edilecek import satiri bulunamadi.", "IMPORT_ROWS_MISSING", status.HTTP_400_BAD_REQUEST)

    seen_keys: set[str] = set()
    counts = {"valid": 0, "invalid": 0, "duplicate": 0, "warning": 0}
    report_rows: list[dict[str, Any]] = []
    for row in rows:
        raw = dict(row.get("raw_data") or {})
        row_number = int(row["row_number"])
        normalized = normalize_row(raw, mapping)
        normalized, errors, warnings = validate_normalized_row(template, raw, normalized, row_number=row_number)
        file_duplicate = detect_file_duplicate(seen_keys, template.entity_type, normalized, row_number)
        existing_duplicate = (
            await detect_existing_duplicate(session, context["tenant_id"], template.entity_type, normalized, row_number)
            if not errors
            else None
        )
        duplicate = file_duplicate.duplicate or bool(existing_duplicate and existing_duplicate.duplicate)
        warnings.extend(file_duplicate.issues)
        if existing_duplicate:
            warnings.extend(existing_duplicate.issues)
        row_status = "invalid" if errors else "duplicate" if duplicate else "warning" if warnings else "valid"
        counts[row_status] += 1
        await session.execute(
            text(
                """
                update public.data_import_job_rows
                set normalized_data = cast(:normalized_data as jsonb),
                    status = :status,
                    errors = cast(:errors as jsonb),
                    warnings = cast(:warnings as jsonb)
                where tenant_id = :tenant_id and id = :row_id
                """
            ),
            {
                "tenant_id": context["tenant_id"],
                "row_id": row["id"],
                "normalized_data": _json(normalized),
                "status": row_status,
                "errors": _json(issue_list_to_json(errors)),
                "warnings": _json(issue_list_to_json(warnings)),
            },
        )
        if row_status != "valid":
            report_rows.append(
                {
                    "row_number": row_number,
                    "status": row_status,
                    "errors": issue_list_to_json(errors),
                    "warnings": issue_list_to_json(warnings),
                }
            )

    valid_rows = counts["valid"] + counts["warning"]
    summary = {
        "total_rows": len(rows),
        "valid_rows": valid_rows,
        "invalid_rows": counts["invalid"],
        "duplicate_rows": counts["duplicate"],
        "warning_rows": counts["warning"],
        "blocking": valid_rows == 0,
    }
    dry_run = {
        "action": "create",
        "create_rows": valid_rows,
        "skip_duplicate_rows": counts["duplicate"],
        "skip_invalid_rows": counts["invalid"],
        "messages": _dry_run_messages(summary),
    }
    error_report = None
    if report_rows:
        report_text = build_error_report(report_rows)
        error_report = {
            "file_name": f"import-job-{job_id}-error-report.csv",
            "content_type": "text/csv",
            "content_base64": base64.b64encode(report_text.encode("utf-8")).decode("ascii"),
        }
    next_status = "ready_to_import" if valid_rows > 0 else "validation_failed"
    await session.execute(
        text(
            """
            update public.data_import_jobs
            set status = :status,
                total_rows = :total_rows,
                valid_rows = :valid_rows,
                invalid_rows = :invalid_rows,
                duplicate_rows = :duplicate_rows,
                warning_rows = :warning_rows,
                validation_summary = cast(:validation_summary as jsonb),
                dry_run_result = cast(:dry_run_result as jsonb),
                error_report_file_ref = cast(:error_report_file_ref as jsonb),
                updated_at = now(),
                version = version + 1
            where tenant_id = :tenant_id and id = :job_id
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "job_id": job_id,
            "status": next_status,
            "total_rows": len(rows),
            "valid_rows": valid_rows,
            "invalid_rows": counts["invalid"],
            "duplicate_rows": counts["duplicate"],
            "warning_rows": counts["warning"],
            "validation_summary": _json(summary),
            "dry_run_result": _json(dry_run),
            "error_report_file_ref": _json(error_report or {}),
        },
    )
    await _audit(session, context, "validate", "import.job.validated", "Import job validate edildi.", summary)
    return await get_import_job(session, context, job_id)


async def confirm_import_job(
    session: AsyncSession,
    context: dict[str, Any],
    job_id: str,
    request: ImportConfirmRequest,
) -> dict[str, Any]:
    job = await _load_job(session, context, job_id)
    if job.get("status") != "ready_to_import":
        raise DomainError("Import onayi icin job once validate edilmelidir.", "IMPORT_JOB_NOT_READY", status.HTTP_409_CONFLICT)
    await session.execute(
        text("update public.data_import_jobs set status = 'importing', confirmed_by = :confirmed_by, confirmed_at = now(), updated_at = now() where tenant_id = :tenant_id and id = :job_id"),
        {"tenant_id": context["tenant_id"], "job_id": job_id, "confirmed_by": context.get("user_id")},
    )
    row_result = await session.execute(
        text(
            """
            select id, row_number, normalized_data, status
            from public.data_import_job_rows
            where tenant_id = :tenant_id and import_job_id = :job_id
            order by row_number asc
            """
        ),
        {"tenant_id": context["tenant_id"], "job_id": job_id},
    )
    rows = rows_to_dicts(list(row_result.mappings().all()))
    imported = skipped = failed = 0
    for row in rows:
        row_status = str(row.get("status") or "")
        if row_status == "duplicate" and request.skip_duplicates:
            skipped += 1
            await _mark_row(session, context, row, "skipped", [{"code": "DUPLICATE_SKIPPED", "message": "Duplicate satir atlandi."}], None)
            continue
        if row_status == "duplicate":
            failed += 1
            await _mark_row(session, context, row, "failed", [{"code": "DUPLICATE_BLOCKED", "message": "Duplicate satir icin otomatik update yapilmaz."}], None)
            continue
        if row_status not in {"valid", "warning"}:
            if request.import_valid_rows_only:
                skipped += 1
                await _mark_row(session, context, row, "skipped", [{"code": "INVALID_SKIPPED", "message": "Gecerli olmayan satir atlandi."}], None)
                continue
            failed += 1
            await _mark_row(session, context, row, "failed", [{"code": "INVALID_BLOCKED", "message": "Gecerli olmayan satir import edilemez."}], None)
            continue
        try:
            created = await _import_row(session, context, str(job["entity_type"]), dict(row.get("normalized_data") or {}))
            imported += 1
            await _mark_row(session, context, row, "imported", [], _created_id(created))
        except (DomainError, PydanticValidationError, ValueError) as exc:
            failed += 1
            await _mark_row(session, context, row, "failed", [{"code": exc.__class__.__name__, "message": str(exc)}], None)

    final_status = "completed" if imported > 0 or failed == 0 else "failed"
    await session.execute(
        text(
            """
            update public.data_import_jobs
            set status = :status,
                imported_rows = :imported_rows,
                skipped_rows = :skipped_rows,
                failed_rows = :failed_rows,
                completed_at = now(),
                updated_at = now(),
                version = version + 1
            where tenant_id = :tenant_id and id = :job_id
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "job_id": job_id,
            "status": final_status,
            "imported_rows": imported,
            "skipped_rows": skipped,
            "failed_rows": failed,
        },
    )
    await _audit(session, context, "operation_complete", "import.job.completed" if final_status == "completed" else "import.job.failed", "Import job tamamlandi.", {"imported": imported, "skipped": skipped, "failed": failed})
    await enqueue_outbox_event_best_effort(
        session,
        {**context, "module_key": "importExport", "company_id": job.get("company_id")},
        event_type=IMPORT_JOB_COMPLETED if final_status == "completed" else IMPORT_JOB_FAILED,
        aggregate_type="data_import_job",
        aggregate_id=job_id,
        payload={"status": final_status, "imported_rows": imported, "failed_rows": failed},
    )
    return await get_import_job(session, context, job_id)


async def cancel_import_job(
    session: AsyncSession,
    context: dict[str, Any],
    job_id: str,
) -> dict[str, Any]:
    job = await _load_job(session, context, job_id)
    if job.get("status") in {"completed", "importing"}:
        raise DomainError("Bu import job iptal edilemez.", "IMPORT_JOB_CANCEL_NOT_ALLOWED", status.HTTP_409_CONFLICT)
    await session.execute(
        text("update public.data_import_jobs set status = 'cancelled', updated_at = now(), version = version + 1 where tenant_id = :tenant_id and id = :job_id"),
        {"tenant_id": context["tenant_id"], "job_id": job_id},
    )
    return await get_import_job(session, context, job_id)


async def get_import_error_report(
    session: AsyncSession,
    context: dict[str, Any],
    job_id: str,
) -> str:
    job = await _load_job(session, context, job_id)
    file_ref = dict(job.get("error_report_file_ref") or {})
    encoded = file_ref.get("content_base64")
    if not encoded:
        return "row_number,status,field,code,message,suggested_fix,original_value\n"
    return base64.b64decode(str(encoded)).decode("utf-8")


async def _load_job(session: AsyncSession, context: dict[str, Any], job_id: str) -> dict[str, Any]:
    result = await session.execute(
        text(
            """
            select *
            from public.data_import_jobs
            where tenant_id = :tenant_id and id = :job_id
            limit 1
            """
        ),
        {"tenant_id": context["tenant_id"], "job_id": job_id},
    )
    row = result.mappings().one_or_none()
    if not row:
        raise DomainError("Import job bulunamadi.", "IMPORT_JOB_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    job = row_to_dict(row) or {}
    _assert_company_scope(context, job.get("company_id"), write=False)
    return job


def _template_for_job(job: dict[str, Any]) -> Any:
    template = get_template_for_entity(str(job["entity_type"]))
    if not template:
        raise DomainError("Import sablonu bulunamadi.", "IMPORT_TEMPLATE_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    return template


def _assert_job_mutable(job: dict[str, Any]) -> None:
    if job.get("status") in {"importing", "completed", "cancelled"}:
        raise DomainError("Bu import job artik degistirilemez.", "IMPORT_JOB_LOCKED", status.HTTP_409_CONFLICT)


def _assert_company_scope(context: dict[str, Any], company_id: Any, *, write: bool) -> None:
    if not company_id:
        return
    scope_key = "writable_company_scope_ids" if write else "company_scope_ids"
    scope = context.get(scope_key) or context.get("company_scope_ids")
    if scope and str(company_id) not in {str(item) for item in scope}:
        raise DomainError("Bu kayit erisim kapsaminiz disinda.", "COMPANY_SCOPE_DENIED", status.HTTP_403_FORBIDDEN)


async def _mark_row(
    session: AsyncSession,
    context: dict[str, Any],
    row: dict[str, Any],
    status_value: str,
    issues: list[dict[str, Any]],
    target_entity_id: str | None,
) -> None:
    await session.execute(
        text(
            """
            update public.data_import_job_rows
            set status = :status,
                errors = case when :status = 'failed' then cast(:issues as jsonb) else errors end,
                warnings = case when :status <> 'failed' then warnings || cast(:issues as jsonb) else warnings end,
                target_entity_id = :target_entity_id
            where tenant_id = :tenant_id and id = :row_id
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "row_id": row["id"],
            "status": status_value,
            "issues": _json(issues),
            "target_entity_id": target_entity_id,
        },
    )


async def _import_row(
    session: AsyncSession,
    context: dict[str, Any],
    entity_type: str,
    payload: dict[str, Any],
) -> dict[str, Any]:
    payload = _strip_empty(payload)
    if entity_type == "cari_account":
        role = str(payload.get("cari_role") or "other")
        account_type = str(payload.get("account_type") or ("customer_supplier" if role == "both" else role))
        return await create_cari_account(session, context, CariAccountCreateRequest(**{**payload, "account_type": account_type, "metadata_json": {"source": "import_export"}}))
    if entity_type == "stakeholder":
        create_cari = bool(payload.pop("create_cari_account", False))
        stakeholder = await create_stakeholder(session, context, _stakeholder_request(payload))
        if create_cari:
            linked = await create_cari_account_for_stakeholder(
                session,
                context,
                str(stakeholder["id"]),
                CreateCariAccountFromStakeholderRequest(currency="TRY"),
            )
            return {"id": stakeholder["id"], "stakeholder": stakeholder, "cari_account": linked.get("cari_account")}
        return stakeholder
    if entity_type == "product_catalog":
        return await create_product(session, context, ProductCreateRequest(**{**payload, "metadata_json": {"source": "import_export"}}))
    if entity_type == "employee_draft":
        payload.pop("employment_status", None)
        payload.pop("sgk_status", None)
        return await create_employee(session, context, EmployeeCreateRequest(**{**payload, "metadata_json": {"source": "import_export"}}))
    if entity_type == "project_task":
        if isinstance(payload.get("labels"), str):
            payload["labels"] = [item.strip() for item in str(payload["labels"]).split(",") if item.strip()]
        return await create_project_task(session, context, ProjectTaskCreateRequest(**{**payload, "metadata_json": {"source": "import_export"}}))
    if entity_type == "facility":
        return await create_facility(session, context, payload)
    if entity_type == "organization_unit":
        return await create_organization_unit(session, context, payload)
    if entity_type == "company_draft":
        return await create_company_draft(session, context, payload)
    if entity_type == "partner_draft":
        return await create_partner_draft(session, context, payload)
    if entity_type == "representative_draft":
        return await create_representative_draft(session, context, payload)
    raise DomainError("Bu veri seti import adapter'i henuz hazir degil.", "IMPORT_ADAPTER_NOT_FOUND", status.HTTP_409_CONFLICT)


def _stakeholder_request(payload: dict[str, Any]) -> StakeholderCreateRequest:
    entity_type = str(payload.get("master_entity_type") or "organization")
    if entity_type == "person":
        first_name = str(payload.get("first_name") or payload.get("display_name") or "").split(" ")[0]
        last_name = str(payload.get("last_name") or " ".join(str(payload.get("display_name") or "").split(" ")[1:]) or "-")
        return StakeholderCreateRequest(
            company_id=str(payload["company_id"]),
            master_entity_type="person",
            stakeholder_type=payload["stakeholder_type"],
            display_name=payload.get("display_name"),
            master_person=MasterPersonCreateRequest(
                first_name=first_name,
                last_name=last_name,
                nationality=payload.get("nationality") or "TR",
                identity_number=payload.get("identity_number"),
                passport_no=payload.get("passport_no"),
                phone=payload.get("phone"),
                email=payload.get("email"),
                city=payload.get("city"),
                country=payload.get("country") or "TR",
            ),
            assigned_owner_user_id=payload.get("assigned_owner_user_id"),
            notes=payload.get("notes"),
            metadata_json={"source": "import_export"},
        )
    trade_name = str(payload.get("trade_name") or payload.get("display_name") or "").strip()
    return StakeholderCreateRequest(
        company_id=str(payload["company_id"]),
        master_entity_type="organization",
        stakeholder_type=payload["stakeholder_type"],
        display_name=payload.get("display_name") or trade_name,
        master_organization=MasterOrganizationCreateRequest(
            trade_name=trade_name,
            tax_number=payload.get("tax_number"),
            country=payload.get("country") or "TR",
            city=payload.get("city"),
            phone=payload.get("phone"),
            email=payload.get("email"),
        ),
        assigned_owner_user_id=payload.get("assigned_owner_user_id"),
        notes=payload.get("notes"),
        metadata_json={"source": "import_export"},
    )


def _strip_empty(payload: dict[str, Any]) -> dict[str, Any]:
    return {key: _json_safe_value(value) for key, value in payload.items() if value is not None and value != ""}


def _created_id(created: dict[str, Any]) -> str | None:
    for value in [
        created.get("id"),
        (created.get("task") or {}).get("id") if isinstance(created.get("task"), dict) else None,
        (created.get("stakeholder") or {}).get("id") if isinstance(created.get("stakeholder"), dict) else None,
        (created.get("cari_account") or {}).get("id") if isinstance(created.get("cari_account"), dict) else None,
    ]:
        if value:
            return str(value)
    return None


def _json_safe_value(value: Any) -> Any:
    if isinstance(value, Decimal):
        return str(value)
    return value


def _dry_run_messages(summary: dict[str, Any]) -> list[str]:
    messages = ["Import onayi verilene kadar kayit yazilmaz."]
    if summary["duplicate_rows"]:
        messages.append("Duplicate satirlar varsayilan olarak atlanir.")
    if summary["invalid_rows"]:
        messages.append("Hatali satirlar hata raporunda indirilebilir.")
    return messages


async def _audit(
    session: AsyncSession,
    context: dict[str, Any],
    action_type: str,
    action_key: str,
    summary: str,
    payload: dict[str, Any],
) -> None:
    await record_audit_best_effort(
        session,
        {**context, "module_key": "importExport"},
        action_type=action_type,
        action_key=action_key,
        summary=summary,
        entity_type="data_import_job",
        entity_id=str(payload.get("id") or payload.get("job_id") or ""),
        new_values=payload,
        metadata={"event_type": IMPORT_JOB_CREATED if action_key.endswith("created") else IMPORT_JOB_VALIDATED if action_key.endswith("validated") else action_key},
    )


def _json(value: Any) -> str:
    return json.dumps(value if value is not None else {}, ensure_ascii=False, default=str)
