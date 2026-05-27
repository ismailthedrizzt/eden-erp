from __future__ import annotations

from typing import Any

from fastapi import status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError, map_database_error
from app.domains.audit.service import record_audit_best_effort
from app.domains.company.nace import (
    active_nace_rows,
    load_company_nace_codes,
    resolve_nace_rows,
    same_nace_selection,
    summarize_nace_rows,
    sync_company_nace_codes,
    sync_sgk_risk_class_from_primary_nace,
)
from app.domains.company.official_changes import (
    build_changed_values,
    build_official_change_precheck,
    insert_company_lifecycle_event,
    insert_official_change_transaction,
    normalize_documents,
    validate_official_dates,
)
from app.domains.company.schemas import (
    ActivitySubjectChangeRequest,
    AddressChangeRequest,
    NaceChangeRequest,
    PublicRegistrationUpdateRequest,
    TitleChangeRequest,
)
from app.domains.company.service import (
    assert_company_active_for_official_change,
    get_company_by_id,
    sync_public_channels_row,
    sync_public_registry_row,
    sync_public_sgk_row,
    sync_public_tax_row,
    update_company_official_fields,
)
from app.domains.operations.service import (
    create_or_get_operation_request,
    duplicate_operation_response,
    mark_operation_completed,
)
from app.domains.outbox.service import enqueue_outbox_event_best_effort

LIFECYCLE_EVENTS = {
    "title_change": "company_title_change_completed",
    "address_change": "company_address_change_completed",
    "public_registration_update": "company_public_registration_update_completed",
    "nace_change": "company_nace_change_completed",
    "activity_subject_change": "company_activity_subject_change_completed",
}

OUTBOX_EVENTS = {
    "title_change": "company.title_changed",
    "address_change": "company.address_changed",
    "public_registration_update": "company.public_registration_updated",
    "nace_change": "company.nace_changed",
    "activity_subject_change": "company.activity_subject_changed",
}


def _context(tenant_id: str, user_id: str | None, company_id: str) -> dict[str, Any]:
    return {
        "tenant_id": tenant_id,
        "user_id": user_id,
        "company_id": company_id,
        "module_key": "companies",
    }


def _operation_type(change_type: str) -> str:
    return f"company.{change_type}"


async def build_company_official_change_precheck(
    session: AsyncSession,
    *,
    tenant_id: str,
    user_id: str | None,
    company_id: str,
    change_type: str,
) -> dict[str, Any]:
    context = _context(tenant_id, user_id, company_id)
    return await build_official_change_precheck(session, context, company_id, change_type)


async def build_nace_change_precheck(
    session: AsyncSession,
    *,
    tenant_id: str,
    user_id: str | None,
    company_id: str,
) -> dict[str, Any]:
    precheck = await build_company_official_change_precheck(
        session=session,
        tenant_id=tenant_id,
        user_id=user_id,
        company_id=company_id,
        change_type="nace_change",
    )
    current_rows = await load_company_nace_codes(session, tenant_id, company_id)
    active_rows = active_nace_rows(current_rows)
    precheck.update(
        {
            "nace_codes": summarize_nace_rows(active_rows),
            "primary_nace": next((row for row in active_rows if row.get("is_primary")), None),
            "secondary_nace_codes": [row for row in active_rows if not row.get("is_primary")],
            "activity_subject": (precheck.get("current") or {}).get("activity_subject"),
        }
    )
    return precheck


async def build_activity_subject_change_precheck(
    session: AsyncSession,
    *,
    tenant_id: str,
    user_id: str | None,
    company_id: str,
) -> dict[str, Any]:
    precheck = await build_nace_change_precheck(
        session=session,
        tenant_id=tenant_id,
        user_id=user_id,
        company_id=company_id,
    )
    precheck["change_type"] = "activity_subject_change"
    return precheck


def _request_payload(request: Any) -> dict[str, Any]:
    return dict(request.model_dump(mode="json"))


async def _create_operation(
    session: AsyncSession,
    context: dict[str, Any],
    change_type: str,
    request: Any,
) -> tuple[dict[str, Any] | None, list[str], dict[str, Any] | None]:
    operation, warnings = await create_or_get_operation_request(
        session,
        context,
        operation_type=_operation_type(change_type),
        client_request_id=request.client_request_id,
        payload=_request_payload(request),
        entity_type="company",
        entity_id=context["company_id"],
        module_key="companies",
    )
    duplicate = duplicate_operation_response(operation) if operation else None
    if operation:
        context["operation_id"] = str(operation["id"])
    return operation, warnings, duplicate


async def _record_transaction_and_side_effects(
    session: AsyncSession,
    context: dict[str, Any],
    *,
    change_type: str,
    company_id: str,
    previous_company: dict[str, Any],
    updated_company: dict[str, Any],
    changed_fields: list[str],
    document_files: list[dict[str, Any]],
    decision_date: str | None,
    registration_date: str | None,
    trade_registry_gazette_date: str | None,
    trade_registry_gazette_number: str | None,
    effective_date: str | None,
    notes: str | None,
    warnings: list[str],
) -> dict[str, Any]:
    changed_values = build_changed_values(previous_company, updated_company, changed_fields)
    transaction = await insert_official_change_transaction(
        session,
        context,
        company_id=company_id,
        branch_id=None,
        operation_id=context.get("operation_id"),
        transaction_type=change_type,
        old_values={field: data["old"] for field, data in changed_values.items()},
        new_values={field: data["new"] for field, data in changed_values.items()},
        changed_fields=changed_fields,
        document_files=document_files,
        decision_date=decision_date,
        registration_date=registration_date,
        trade_registry_gazette_date=trade_registry_gazette_date,
        trade_registry_gazette_number=trade_registry_gazette_number,
        effective_date=effective_date,
        notes=notes,
        warnings=warnings,
    )
    await insert_company_lifecycle_event(
        session,
        context,
        company_id=company_id,
        event_type=LIFECYCLE_EVENTS[change_type],
        event_date=effective_date or registration_date or decision_date,
        payload={"transaction_id": transaction["id"], "changed_fields": changed_fields},
    )
    await enqueue_outbox_event_best_effort(
        session,
        context,
        event_type=OUTBOX_EVENTS[change_type],
        aggregate_type="company",
        aggregate_id=company_id,
        payload={"company_id": company_id, "transaction_id": transaction["id"]},
    )
    return transaction


def _response(
    data: dict[str, Any],
    operation: dict[str, Any] | None,
    warnings: list[str],
    message: str,
) -> dict[str, Any]:
    return {
        "data": data,
        "operation_id": str(operation["id"]) if operation else None,
        "operation_status": "completed",
        "warnings": warnings,
        "message": message,
    }


async def complete_title_change(
    session: AsyncSession,
    *,
    tenant_id: str,
    user_id: str | None,
    company_id: str,
    request: TitleChangeRequest,
) -> dict[str, Any]:
    context = _context(tenant_id, user_id, company_id)
    warnings: list[str] = []
    try:
        async with session.begin():
            company = await get_company_by_id(session, tenant_id, company_id)
            assert_company_active_for_official_change(company, "title_change")
            operation, operation_warnings, duplicate = await _create_operation(
                session, context, "title_change", request
            )
            warnings.extend(operation_warnings)
            if duplicate:
                return duplicate
            warnings.extend(
                validate_official_dates(
                    request.decision_date,
                    request.registration_date,
                    request.trade_registry_gazette_date,
                )
            )
            patch = {
                "trade_name": request.resolved_trade_name,
                "short_name": request.resolved_short_name,
            }
            if request.mersis_changed or request.resolved_mersis_number:
                patch["mersis_number"] = request.resolved_mersis_number
            if request.new_trade_registry_number:
                patch["trade_registry_number"] = request.new_trade_registry_number
            patch = {key: value for key, value in patch.items() if value is not None}
            update = await update_company_official_fields(
                session,
                context,
                company_id,
                patch,
                request.base_version,
                request.base_updated_at,
            )
            transaction = await _record_transaction_and_side_effects(
                session,
                context,
                change_type="title_change",
                company_id=company_id,
                previous_company=update["previous_company"],
                updated_company=update["company"],
                changed_fields=update["changed_fields"],
                document_files=normalize_documents(request.document_files, request.document_meta),
                decision_date=request.decision_date,
                registration_date=request.registration_date,
                trade_registry_gazette_date=request.trade_registry_gazette_date,
                trade_registry_gazette_number=request.trade_registry_gazette_number,
                effective_date=request.registration_date or request.decision_date,
                notes=request.notes,
                warnings=warnings,
            )
            data = {"company": update["company"], "transaction": transaction, "warnings": warnings}
            await mark_operation_completed(session, operation, data, warnings)
            await record_audit_best_effort(
                session,
                context,
                action_type="operation_complete",
                action_key="title_change",
                summary="Şirket unvan değişikliği tamamlandı.",
                entity_type="company",
                entity_id=company_id,
                old_values=update["previous_company"],
                new_values=update["patch"],
                metadata={"transaction_id": transaction["id"]},
            )
            return _response(data, operation, warnings, "Unvan değişikliği tamamlandı.")
    except Exception as error:
        raise map_database_error(
            error,
            fallback_code="TITLE_CHANGE_FAILED",
            fallback_message="Unvan değişikliği tamamlanamadı.",
        ) from error


async def complete_address_change(
    session: AsyncSession,
    *,
    tenant_id: str,
    user_id: str | None,
    company_id: str,
    request: AddressChangeRequest,
) -> dict[str, Any]:
    context = _context(tenant_id, user_id, company_id)
    warnings: list[str] = []
    try:
        async with session.begin():
            company = await get_company_by_id(session, tenant_id, company_id)
            assert_company_active_for_official_change(company, "address_change")
            operation, operation_warnings, duplicate = await _create_operation(
                session, context, "address_change", request
            )
            warnings.extend(operation_warnings)
            if duplicate:
                return duplicate
            warnings.extend(
                validate_official_dates(
                    request.decision_date,
                    request.registration_date,
                    request.trade_registry_gazette_date,
                )
            )
            patch = {
                "country": request.resolved_country or "Turkiye",
                "city": request.resolved_city,
                "district": request.resolved_district,
                "address": request.resolved_address,
                "postal_code": request.postal_code,
            }
            patch = {key: value for key, value in patch.items() if value is not None}
            update = await update_company_official_fields(
                session,
                context,
                company_id,
                patch,
                request.base_version,
                request.base_updated_at,
            )
            transaction = await _record_transaction_and_side_effects(
                session,
                context,
                change_type="address_change",
                company_id=company_id,
                previous_company=update["previous_company"],
                updated_company=update["company"],
                changed_fields=update["changed_fields"],
                document_files=normalize_documents(request.document_files, request.document_meta),
                decision_date=request.decision_date,
                registration_date=request.registration_date,
                trade_registry_gazette_date=request.trade_registry_gazette_date,
                trade_registry_gazette_number=request.trade_registry_gazette_number,
                effective_date=request.registration_date or request.decision_date,
                notes=request.notes,
                warnings=warnings,
            )
            data = {"company": update["company"], "transaction": transaction, "warnings": warnings}
            await mark_operation_completed(session, operation, data, warnings)
            await record_audit_best_effort(
                session,
                context,
                action_type="operation_complete",
                action_key="address_change",
                summary="Şirket adres değişikliği tamamlandı.",
                entity_type="company",
                entity_id=company_id,
                old_values=update["previous_company"],
                new_values=update["patch"],
                metadata={"transaction_id": transaction["id"]},
            )
            return _response(data, operation, warnings, "Adres değişikliği tamamlandı.")
    except Exception as error:
        raise map_database_error(
            error,
            fallback_code="ADDRESS_CHANGE_FAILED",
            fallback_message="Adres değişikliği tamamlanamadı.",
        ) from error


async def complete_public_registration_update(
    session: AsyncSession,
    *,
    tenant_id: str,
    user_id: str | None,
    company_id: str,
    request: PublicRegistrationUpdateRequest,
) -> dict[str, Any]:
    context = _context(tenant_id, user_id, company_id)
    warnings: list[str] = []
    try:
        async with session.begin():
            company = await get_company_by_id(session, tenant_id, company_id)
            assert_company_active_for_official_change(company, "public_registration_update")
            operation, operation_warnings, duplicate = await _create_operation(
                session, context, "public_registration_update", request
            )
            warnings.extend(operation_warnings)
            if duplicate:
                return duplicate
            patch = {
                field: getattr(request, field)
                for field in (
                    "tax_office",
                    "trade_registry_office",
                    "trade_registry_number",
                    "mersis_number",
                    "electronic_notification_address",
                    "e_invoice_taxpayer",
                    "e_archive_taxpayer",
                    "e_waybill_taxpayer",
                    "sgk_workplace_registry_no",
                    "sgk_province",
                    "sgk_branch",
                )
                if field in request.model_fields_set
            }
            update = await update_company_official_fields(
                session,
                context,
                company_id,
                patch,
                request.base_version,
                request.base_updated_at,
            )
            public_tax, tax_warnings = await sync_public_tax_row(
                session,
                context,
                company_id,
                update["patch"],
            )
            public_sgk, sgk_warnings = await sync_public_sgk_row(
                session,
                context,
                company_id,
                update["patch"],
            )
            public_registry, registry_warnings = await sync_public_registry_row(
                session, context, company_id, update["patch"]
            )
            public_channels, channel_warnings = await sync_public_channels_row(
                session, context, company_id, update["patch"]
            )
            warnings.extend([*tax_warnings, *sgk_warnings, *registry_warnings, *channel_warnings])
            transaction = await _record_transaction_and_side_effects(
                session,
                context,
                change_type="public_registration_update",
                company_id=company_id,
                previous_company=update["previous_company"],
                updated_company=update["company"],
                changed_fields=update["changed_fields"],
                document_files=normalize_documents(request.document_files, request.document_meta),
                decision_date=None,
                registration_date=None,
                trade_registry_gazette_date=None,
                trade_registry_gazette_number=None,
                effective_date=None,
                notes=request.notes,
                warnings=warnings,
            )
            data = {
                "company": update["company"],
                "transaction": transaction,
                "public_tax": public_tax,
                "public_sgk": public_sgk,
                "public_registry": public_registry,
                "public_channels": public_channels,
                "warnings": warnings,
            }
            await mark_operation_completed(session, operation, data, warnings)
            await record_audit_best_effort(
                session,
                context,
                action_type="operation_complete",
                action_key="public_registration_update",
                summary="Kamu ve tescil bilgileri güncellendi.",
                entity_type="company",
                entity_id=company_id,
                old_values=update["previous_company"],
                new_values=update["patch"],
                metadata={"transaction_id": transaction["id"]},
            )
            return _response(data, operation, warnings, "Kamu ve tescil bilgileri güncellendi.")
    except Exception as error:
        raise map_database_error(
            error,
            fallback_code="PUBLIC_REGISTRATION_UPDATE_FAILED",
            fallback_message="Kamu ve tescil bilgileri güncellenemedi.",
        ) from error


def _nace_rows_from_request(request: NaceChangeRequest | ActivitySubjectChangeRequest) -> list[Any]:
    if request.nace_codes:
        return list(request.nace_codes)
    rows: list[dict[str, Any]] = []
    if request.primary_nace_code_id:
        rows.append({"nace_code_id": request.primary_nace_code_id, "is_primary": True})
    rows.extend(
        {"nace_code_id": item, "is_primary": False} for item in request.secondary_nace_code_ids
    )
    return rows


def _primary_nace(rows: list[dict[str, Any]]) -> dict[str, Any]:
    primary = next((row for row in rows if row.get("is_primary")), None)
    if not primary:
        raise DomainError(
            "Tam olarak bir birincil NACE kodu seçilmelidir.",
            "PRIMARY_NACE_REQUIRED",
            status.HTTP_400_BAD_REQUEST,
        )
    return primary


async def complete_nace_change(
    session: AsyncSession,
    *,
    tenant_id: str,
    user_id: str | None,
    company_id: str,
    request: NaceChangeRequest,
) -> dict[str, Any]:
    context = _context(tenant_id, user_id, company_id)
    warnings: list[str] = []
    try:
        async with session.begin():
            company = await get_company_by_id(session, tenant_id, company_id)
            assert_company_active_for_official_change(company, "nace_change")
            operation, operation_warnings, duplicate = await _create_operation(
                session, context, "nace_change", request
            )
            warnings.extend(operation_warnings)
            if duplicate:
                return duplicate
            resolved_rows = await resolve_nace_rows(session, _nace_rows_from_request(request))
            current_rows = active_nace_rows(
                await load_company_nace_codes(session, tenant_id, company_id)
            )
            if same_nace_selection(current_rows, resolved_rows):
                raise DomainError(
                    "NACE seçiminde değişiklik bulunamadı.",
                    "NO_CHANGED_FIELDS",
                    status.HTTP_400_BAD_REQUEST,
                )
            primary = _primary_nace(resolved_rows)
            warnings.extend(
                await sync_sgk_risk_class_from_primary_nace(
                    session,
                    context,
                    company_id,
                    primary,
                )
            )
            synced_rows = await sync_company_nace_codes(
                session, context, company_id, resolved_rows, request.effective_date
            )
            patch = {
                "nace_codes": summarize_nace_rows(resolved_rows),
                "risk_class": primary.get("hazard_class"),
            }
            update = await update_company_official_fields(
                session,
                context,
                company_id,
                patch,
                request.base_version,
                request.base_updated_at,
            )
            transaction = await _record_transaction_and_side_effects(
                session,
                context,
                change_type="nace_change",
                company_id=company_id,
                previous_company=update["previous_company"],
                updated_company=update["company"],
                changed_fields=update["changed_fields"],
                document_files=normalize_documents(request.document_files, request.document_meta),
                decision_date=None,
                registration_date=None,
                trade_registry_gazette_date=None,
                trade_registry_gazette_number=None,
                effective_date=request.effective_date,
                notes=request.notes,
                warnings=warnings,
            )
            data = {
                "company": update["company"],
                "transaction": transaction,
                "nace_codes": summarize_nace_rows(synced_rows),
                "warnings": warnings,
            }
            await mark_operation_completed(session, operation, data, warnings)
            await record_audit_best_effort(
                session,
                context,
                action_type="operation_complete",
                action_key="nace_change",
                summary="NACE bilgileri güncellendi.",
                entity_type="company",
                entity_id=company_id,
                old_values={"nace_codes": summarize_nace_rows(current_rows)},
                new_values={"nace_codes": summarize_nace_rows(resolved_rows)},
                metadata={"transaction_id": transaction["id"]},
            )
            return _response(data, operation, warnings, "NACE bilgileri güncellendi.")
    except Exception as error:
        raise map_database_error(
            error,
            fallback_code="NACE_CHANGE_FAILED",
            fallback_message="NACE bilgileri güncellenemedi.",
        ) from error


async def complete_activity_subject_change(
    session: AsyncSession,
    *,
    tenant_id: str,
    user_id: str | None,
    company_id: str,
    request: ActivitySubjectChangeRequest,
) -> dict[str, Any]:
    context = _context(tenant_id, user_id, company_id)
    warnings: list[str] = []
    try:
        async with session.begin():
            company = await get_company_by_id(session, tenant_id, company_id)
            assert_company_active_for_official_change(company, "activity_subject_change")
            operation, operation_warnings, duplicate = await _create_operation(
                session, context, "activity_subject_change", request
            )
            warnings.extend(operation_warnings)
            if duplicate:
                return duplicate
            warnings.extend(
                validate_official_dates(
                    request.decision_date,
                    request.registration_date,
                    request.trade_registry_gazette_date,
                )
            )
            resolved_rows = await resolve_nace_rows(session, _nace_rows_from_request(request))
            primary = _primary_nace(resolved_rows)
            warnings.extend(
                await sync_sgk_risk_class_from_primary_nace(
                    session,
                    context,
                    company_id,
                    primary,
                )
            )
            synced_rows = await sync_company_nace_codes(
                session,
                context,
                company_id,
                resolved_rows,
                request.registration_date or request.decision_date,
            )
            new_activity_subject = request.resolved_activity_subject
            patch = {
                "activity_subject": new_activity_subject,
                "nace_codes": summarize_nace_rows(resolved_rows),
                "risk_class": primary.get("hazard_class"),
            }
            update = await update_company_official_fields(
                session,
                context,
                company_id,
                patch,
                request.base_version,
                request.base_updated_at,
            )
            transaction = await _record_transaction_and_side_effects(
                session,
                context,
                change_type="activity_subject_change",
                company_id=company_id,
                previous_company=update["previous_company"],
                updated_company=update["company"],
                changed_fields=update["changed_fields"],
                document_files=normalize_documents(request.document_files, request.document_meta),
                decision_date=request.decision_date,
                registration_date=request.registration_date,
                trade_registry_gazette_date=request.trade_registry_gazette_date,
                trade_registry_gazette_number=request.trade_registry_gazette_number,
                effective_date=request.registration_date or request.decision_date,
                notes=request.notes,
                warnings=warnings,
            )
            data = {
                "company": update["company"],
                "transaction": transaction,
                "nace_codes": summarize_nace_rows(synced_rows),
                "warnings": warnings,
            }
            await mark_operation_completed(session, operation, data, warnings)
            await record_audit_best_effort(
                session,
                context,
                action_type="operation_complete",
                action_key="activity_subject_change",
                summary="Faaliyet konusu değişikliği tamamlandı.",
                entity_type="company",
                entity_id=company_id,
                old_values={
                    "activity_subject": company.get("activity_subject") if company else None
                },
                new_values={"activity_subject": new_activity_subject},
                metadata={"transaction_id": transaction["id"]},
            )
            return _response(data, operation, warnings, "Faaliyet konusu değişikliği tamamlandı.")
    except Exception as error:
        raise map_database_error(
            error,
            fallback_code="ACTIVITY_SUBJECT_CHANGE_FAILED",
            fallback_message="Faaliyet konusu değişikliği tamamlanamadı.",
        ) from error
