# ruff: noqa: E501

from __future__ import annotations

import json
from typing import Any
from uuid import uuid4

from fastapi import status
from pydantic import ValidationError as PydanticValidationError
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.core.serialization import row_to_dict, rows_to_dicts
from app.domains.accounting.cari_accounts import update_cari_account
from app.domains.accounting.schemas import CariAccountUpdateRequest
from app.domains.audit.service import record_audit_best_effort
from app.domains.crm.schemas import StakeholderUpdateRequest
from app.domains.crm.stakeholders import update_stakeholder
from app.domains.facilities.service import update_facility_card
from app.domains.hr.employees import update_employee
from app.domains.hr.schemas import EmployeeUpdateRequest
from app.domains.import_export.events import BULK_ACTION_COMPLETED
from app.domains.import_export.import_jobs import ensure_import_tables
from app.domains.operations.service import table_exists
from app.domains.outbox.service import enqueue_outbox_event_best_effort
from app.domains.products.catalog import update_product
from app.domains.products.schemas import ProductUpdateRequest
from app.domains.projects.schemas import TaskAssignRequest, TaskTransitionRequest
from app.domains.projects.tasks import assign_project_task, transition_project_task

MAX_BULK_BATCH_SIZE = 200

ACTION_ENTITY_TABLES: dict[str, str] = {
    "cari_account": "public.accounting_cari_accounts",
    "stakeholder": "public.crm_stakeholders",
    "product_catalog": "public.product_catalog",
    "facility": "public.company_facilities",
    "employee": "public.hr_employees",
    "project_task": "public.project_tasks",
}

ACTION_ALLOWED: dict[str, set[str]] = {
    "passivate_selected": {"cari_account", "stakeholder", "product_catalog"},
    "task.assign": {"project_task"},
    "task.transition": {"project_task"},
    "cari.add_tags": {"cari_account"},
    "stakeholder.assign_owner": {"stakeholder"},
    "product.set_active": {"product_catalog"},
    "facility.update_metadata": {"facility"},
    "employee.update_notes": {"employee"},
}


async def create_bulk_action_job(
    session: AsyncSession,
    context: dict[str, Any],
    request: Any,
) -> dict[str, Any]:
    await ensure_import_tables(session)
    _guard_bulk_request(request.entity_type, request.action_key, request.selected_ids, request.payload)
    existing_ids = await _filter_existing_ids(session, context, request.entity_type, request.selected_ids)
    missing = [item for item in request.selected_ids if item not in existing_ids]
    status_value = "ready_to_confirm" if existing_ids and not missing else "validation_failed"
    job_id = str(uuid4())
    await session.execute(
        text(
            """
            insert into public.data_bulk_action_jobs (
              id, tenant_id, module_key, entity_type, action_key, selected_ids, payload,
              status, total_count, success_count, failed_count, skipped_count,
              created_by, created_at
            )
            values (
              :id, :tenant_id, :module_key, :entity_type, :action_key, cast(:selected_ids as jsonb),
              cast(:payload as jsonb), :status, :total_count, 0, :failed_count,
              :skipped_count, :created_by, now()
            )
            """
        ),
        {
            "id": job_id,
            "tenant_id": context["tenant_id"],
            "module_key": request.module_key,
            "entity_type": request.entity_type,
            "action_key": request.action_key,
            "selected_ids": json.dumps(request.selected_ids, ensure_ascii=False),
            "payload": json.dumps(request.payload, ensure_ascii=False, default=str),
            "status": status_value,
            "total_count": len(request.selected_ids),
            "failed_count": 0 if status_value == "ready_to_confirm" else len(missing),
            "skipped_count": len(missing),
            "created_by": context.get("user_id"),
        },
    )
    for missing_id in missing:
        await _insert_result(session, context, job_id, missing_id, "failed", "Kayit bulunamadi.", [])
    await record_audit_best_effort(
        session,
        {**context, "module_key": "importExport"},
        action_type="bulk_precheck",
        action_key="bulk.action.created",
        summary="Bulk action dry-run olusturuldu.",
        entity_type="data_bulk_action_job",
        entity_id=job_id,
        metadata={"entity_type": request.entity_type, "action_key": request.action_key, "total_count": len(request.selected_ids), "missing": missing},
    )
    return await get_bulk_action_job(session, context, job_id)


async def get_bulk_action_job(
    session: AsyncSession,
    context: dict[str, Any],
    job_id: str,
) -> dict[str, Any]:
    await ensure_import_tables(session)
    result = await session.execute(
        text("select * from public.data_bulk_action_jobs where tenant_id = :tenant_id and id = :job_id limit 1"),
        {"tenant_id": context["tenant_id"], "job_id": job_id},
    )
    row = result.mappings().one_or_none()
    if not row:
        raise DomainError("Bulk action job bulunamadi.", "BULK_JOB_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    job = row_to_dict(row) or {}
    rows = await session.execute(
        text("select * from public.data_bulk_action_results where tenant_id = :tenant_id and bulk_job_id = :job_id order by created_at asc"),
        {"tenant_id": context["tenant_id"], "job_id": job_id},
    )
    job["results"] = rows_to_dicts(list(rows.mappings().all()))
    return job


async def confirm_bulk_action_job(
    session: AsyncSession,
    context: dict[str, Any],
    job_id: str,
) -> dict[str, Any]:
    job = await get_bulk_action_job(session, context, job_id)
    if job.get("status") != "ready_to_confirm":
        raise DomainError("Bulk action onayi icin dry-run basarili olmalidir.", "BULK_JOB_NOT_READY", status.HTTP_409_CONFLICT)
    selected_ids = [str(item) for item in (job.get("selected_ids") or [])]
    payload = dict(job.get("payload") or {})
    await session.execute(
        text("update public.data_bulk_action_jobs set status = 'processing', confirmed_by = :confirmed_by where tenant_id = :tenant_id and id = :job_id"),
        {"tenant_id": context["tenant_id"], "job_id": job_id, "confirmed_by": context.get("user_id")},
    )
    success = failed = skipped = 0
    for entity_id in selected_ids:
        try:
            await _apply_action(session, context, str(job["entity_type"]), str(job["action_key"]), entity_id, payload)
            success += 1
            await _insert_result(session, context, job_id, entity_id, "success", None, [])
        except (DomainError, PydanticValidationError, ValueError) as exc:
            failed += 1
            await _insert_result(session, context, job_id, entity_id, "failed", str(exc), [])
    status_value = "completed" if failed == 0 or success > 0 else "failed"
    await session.execute(
        text(
            """
            update public.data_bulk_action_jobs
            set status = :status,
                success_count = :success_count,
                failed_count = :failed_count,
                skipped_count = :skipped_count,
                completed_at = now()
            where tenant_id = :tenant_id and id = :job_id
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "job_id": job_id,
            "status": status_value,
            "success_count": success,
            "failed_count": failed,
            "skipped_count": skipped,
        },
    )
    await record_audit_best_effort(
        session,
        {**context, "module_key": "importExport"},
        action_type="bulk_operation",
        action_key="bulk.action.completed",
        summary="Bulk action tamamlandi.",
        entity_type="data_bulk_action_job",
        entity_id=job_id,
        metadata={"success": success, "failed": failed, "skipped": skipped},
    )
    await enqueue_outbox_event_best_effort(
        session,
        {**context, "module_key": "importExport"},
        event_type=BULK_ACTION_COMPLETED,
        aggregate_type="data_bulk_action_job",
        aggregate_id=job_id,
        payload={"success": success, "failed": failed, "skipped": skipped},
    )
    return await get_bulk_action_job(session, context, job_id)


async def bulk_action_report(
    session: AsyncSession,
    context: dict[str, Any],
    job_id: str,
) -> dict[str, Any]:
    return await get_bulk_action_job(session, context, job_id)


def _guard_bulk_request(
    entity_type: str,
    action_key: str,
    selected_ids: list[str],
    payload: dict[str, Any],
) -> None:
    if not selected_ids:
        raise DomainError("Bulk action icin en az bir kayit secilmelidir.", "BULK_SELECTION_REQUIRED", status.HTTP_400_BAD_REQUEST)
    if len(selected_ids) > MAX_BULK_BATCH_SIZE:
        raise DomainError("Bulk action secim limiti asildi.", "BULK_BATCH_LIMIT_EXCEEDED", status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, {"max_batch_size": MAX_BULK_BATCH_SIZE})
    if entity_type not in ACTION_ALLOWED.get(action_key, set()):
        raise DomainError("Bu bulk action veri seti icin desteklenmiyor.", "BULK_ACTION_NOT_SUPPORTED", status.HTTP_409_CONFLICT)
    if entity_type == "facility" and any(field in payload for field in {"status", "record_status", "start_date", "end_date"}):
        raise DomainError("Tesis/lokasyon lifecycle alanlari bulk action ile degistirilemez.", "OPERATION_CONTROLLED_FIELDS", status.HTTP_409_CONFLICT)
    if entity_type in {"company", "partner", "representative", "branch"}:
        raise DomainError("Bu veri seti resmi islem dogurdugu icin bulk action ile degistirilemez. Ilgili islem sihirbazi kullanilmalidir.", "BULK_OPERATION_CONTROLLED_ENTITY", status.HTTP_409_CONFLICT)


async def _filter_existing_ids(
    session: AsyncSession,
    context: dict[str, Any],
    entity_type: str,
    selected_ids: list[str],
) -> list[str]:
    table_name = ACTION_ENTITY_TABLES.get(entity_type)
    if not table_name or not await table_exists(session, table_name):
        return []
    result = await session.execute(
        text(
            f"""
            select id::text as id
            from {table_name}
            where tenant_id = :tenant_id
              and id = any(cast(:selected_ids as uuid[]))
              and coalesce(is_deleted, false) = false
            """
        ),
        {"tenant_id": context["tenant_id"], "selected_ids": selected_ids},
    )
    return [str(row["id"]) for row in result.mappings().all()]


async def _apply_action(
    session: AsyncSession,
    context: dict[str, Any],
    entity_type: str,
    action_key: str,
    entity_id: str,
    payload: dict[str, Any],
) -> None:
    if action_key == "task.assign":
        await assign_project_task(session, context, entity_id, TaskAssignRequest(**payload))
        return
    if action_key == "task.transition":
        await transition_project_task(session, context, entity_id, TaskTransitionRequest(status=payload["status"], reason=payload.get("reason")))
        return
    if action_key == "product.set_active":
        await update_product(session, context, entity_id, ProductUpdateRequest(active=bool(payload.get("active"))))
        return
    if action_key == "passivate_selected" and entity_type == "product_catalog":
        await update_product(session, context, entity_id, ProductUpdateRequest(active=False))
        return
    if action_key == "passivate_selected" and entity_type == "cari_account":
        await update_cari_account(session, context, entity_id, CariAccountUpdateRequest(record_status="passive"))
        return
    if action_key == "passivate_selected" and entity_type == "stakeholder":
        await update_stakeholder(session, context, entity_id, StakeholderUpdateRequest(relationship_status="passive"))
        return
    if action_key == "cari.add_tags":
        tags = payload.get("tags") or []
        await update_cari_account(session, context, entity_id, CariAccountUpdateRequest(metadata_json={"bulk_tags": tags}))
        return
    if action_key == "stakeholder.assign_owner":
        await update_stakeholder(session, context, entity_id, StakeholderUpdateRequest(assigned_owner_user_id=payload.get("assigned_owner_user_id")))
        return
    if action_key == "facility.update_metadata":
        await update_facility_card(session, context, entity_id, {"metadata_json": payload.get("metadata_json") or {"bulk_tags": payload.get("tags") or []}, "notes": payload.get("notes")})
        return
    if action_key == "employee.update_notes":
        await update_employee(session, context, entity_id, EmployeeUpdateRequest(notes=payload.get("notes"), metadata_json={"bulk_tags": payload.get("tags") or []}))
        return
    raise DomainError("Bulk action handler bulunamadi.", "BULK_ACTION_HANDLER_NOT_FOUND", status.HTTP_409_CONFLICT)


async def _insert_result(
    session: AsyncSession,
    context: dict[str, Any],
    job_id: str,
    entity_id: str,
    status_value: str,
    error: str | None,
    warnings: list[dict[str, Any]],
) -> None:
    await session.execute(
        text(
            """
            insert into public.data_bulk_action_results (
              id, tenant_id, bulk_job_id, entity_id, status, error, warnings, created_at
            )
            values (
              :id, :tenant_id, :bulk_job_id, :entity_id, :status, :error,
              cast(:warnings as jsonb), now()
            )
            """
        ),
        {
            "id": str(uuid4()),
            "tenant_id": context["tenant_id"],
            "bulk_job_id": job_id,
            "entity_id": entity_id,
            "status": status_value,
            "error": error,
            "warnings": json.dumps(warnings, ensure_ascii=False, default=str),
        },
    )

