from __future__ import annotations

import json
import time
from datetime import datetime
from typing import Any
from uuid import uuid4

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.contracts.datetime_normalization import normalize_optional_datetime
from app.core.errors import DomainError
from app.core.logging import bind_log_context, log_info, log_warning
from app.core.metrics import record_operation
from app.domains.operations.payload_registry import normalize_operation_payload


async def table_exists(session: AsyncSession, table_name: str) -> bool:
    result = await session.execute(
        text("select to_regclass(:table_name) as table_ref"), {"table_name": table_name}
    )
    row = result.mappings().one()
    return row["table_ref"] is not None


def _coerce_base_updated_at(value: Any) -> datetime | None:
    return normalize_optional_datetime(value, field_name="base_updated_at")


async def create_or_get_operation_request(
    session: AsyncSession,
    context: dict[str, Any],
    *,
    operation_type: str,
    client_request_id: str | None,
    payload: dict[str, Any],
    entity_type: str,
    entity_id: str,
    module_key: str = "branches",
) -> tuple[dict[str, Any] | None, list[str]]:
    started = time.perf_counter()
    log_info(
        "Operation request started.",
        logger_name="eden.operation",
        tenant_id=context.get("tenant_id"),
        user_id=context.get("user_id"),
        company_id=context.get("company_id"),
        module_key=module_key,
        action_key=operation_type,
    )
    if not await table_exists(session, "public.operation_requests"):
        log_warning(
            "Operation infrastructure missing.",
            logger_name="eden.operation",
            tenant_id=context.get("tenant_id"),
            company_id=context.get("company_id"),
            action_key=operation_type,
            error_code="OPERATION_INFRASTRUCTURE_MISSING",
        )
        return None, [
            "İşlem takip altyapısı hazır olmadığı için işlem yalnızca ana kayıt üzerinden "
            "yürütüldü."
        ]

    request_id = client_request_id or str(uuid4())
    try:
        payload = normalize_operation_payload(operation_type, payload)
    except ValueError as exc:
        raise DomainError(
            'Operation payload sozlesmesi tanimli degil veya gecersiz.',
            'OPERATION_PAYLOAD_CONTRACT_INVALID',
            400,
        ) from exc

    duplicate = await session.execute(
        text(
            """
            select *
            from public.operation_requests
            where tenant_id = :tenant_id
              and operation_type = :operation_type
              and entity_type = :entity_type
              and entity_id = :entity_id
              and client_request_id = :client_request_id
              and requested_by is not distinct from :requested_by
            limit 1
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "operation_type": operation_type,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "client_request_id": request_id,
            "requested_by": context.get("user_id"),
        },
    )
    duplicate_row = duplicate.mappings().one_or_none()
    if duplicate_row:
        duplicate_operation = dict(duplicate_row)
        duplicate_operation["_is_duplicate"] = True
        bind_log_context(operation_id=str(duplicate_operation.get("id")))
        record_operation(operation_type, "duplicate", (time.perf_counter() - started) * 1000)
        log_info(
            "Duplicate operation request returned.",
            logger_name="eden.operation",
            operation_id=str(duplicate_operation.get("id")),
            action_key=operation_type,
        )
        return duplicate_operation, []

    operation_id = str(uuid4())
    result = await session.execute(
        text(
            """
            insert into public.operation_requests (
              id, tenant_id, company_id, module_key, entity_type, entity_id, operation_type,
              operation_status, client_request_id, base_version, base_updated_at, requested_by,
              payload_json, started_at
            )
            values (
              :id, :tenant_id, :company_id, :module_key, :entity_type, :entity_id, :operation_type,
              'processing', :client_request_id, :base_version, :base_updated_at, :requested_by,
              cast(:payload_json as jsonb), now()
            )
            returning *
            """
        ),
        {
            "id": operation_id,
            "tenant_id": context["tenant_id"],
            "company_id": context.get("company_id"),
            "module_key": module_key,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "operation_type": operation_type,
            "client_request_id": request_id,
            "base_version": payload.get("base_version"),
            "base_updated_at": _coerce_base_updated_at(payload.get("base_updated_at")),
            "requested_by": context.get("user_id"),
            "payload_json": json.dumps(payload, ensure_ascii=False, default=str),
        },
    )
    operation = dict(result.mappings().one())
    operation["_is_duplicate"] = False
    bind_log_context(operation_id=str(operation.get("id")))
    record_operation(operation_type, "processing", (time.perf_counter() - started) * 1000)
    log_info(
        "Operation request created.",
        logger_name="eden.operation",
        operation_id=str(operation.get("id")),
        action_key=operation_type,
    )
    return operation, []


async def mark_operation_completed(
    session: AsyncSession,
    operation: dict[str, Any] | None,
    result_payload: dict[str, Any],
    warnings: list[str],
) -> None:
    if not operation or not operation.get("id"):
        return
    log_info(
        "Operation completed.",
        logger_name="eden.operation",
        operation_id=str(operation["id"]),
        warnings_count=len(warnings),
    )
    record_operation(str(operation.get("operation_type") or "unknown"), "completed")
    await session.execute(
        text(
            """
            update public.operation_requests
            set operation_status = 'completed',
                result_json = cast(:result_json as jsonb),
                warning_json = cast(:warning_json as jsonb),
                completed_at = now()
            where id = :operation_id
            """
        ),
        {
            "operation_id": operation["id"],
            "result_json": json.dumps(result_payload, ensure_ascii=False, default=str),
            "warning_json": json.dumps(warnings, ensure_ascii=False),
        },
    )


async def mark_operation_failed(
    session: AsyncSession,
    operation: dict[str, Any] | None,
    *,
    code: str,
    message: str,
    details: dict[str, Any] | None = None,
) -> None:
    if not operation or not operation.get("id"):
        return
    log_warning(
        "Operation failed.",
        logger_name="eden.operation",
        operation_id=str(operation["id"]),
        error_code=code,
    )
    record_operation(str(operation.get("operation_type") or "unknown"), "failed")
    await session.execute(
        text(
            """
            update public.operation_requests
            set operation_status = 'failed',
                error_json = cast(:error_json as jsonb),
                failed_at = now()
            where id = :operation_id
            """
        ),
        {
            "operation_id": operation["id"],
            "error_json": json.dumps(
                {"code": code, "message": message, "details": details or {}},
                ensure_ascii=False,
                default=str,
            ),
        },
    )


def duplicate_operation_response(operation: dict[str, Any]) -> dict[str, Any] | None:
    if not operation.get("_is_duplicate"):
        return None
    status_value = operation.get("operation_status")
    if status_value == "completed":
        return {
            "data": operation.get("result_json") or {},
            "operation_id": str(operation["id"]),
            "operation_status": "completed",
            "warnings": operation.get("warning_json") or [],
            "message": "Bu işlem daha önce tamamlanmış.",
        }
    if status_value == "processing":
        return {
            "data": operation.get("result_json") or {},
            "operation_id": str(operation["id"]),
            "operation_status": "processing",
            "warnings": [],
            "message": "Bu işlem halen yürütülüyor.",
        }
    return None
