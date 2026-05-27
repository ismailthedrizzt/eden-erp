from __future__ import annotations

from typing import Any

from fastapi import status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError, map_database_error
from app.domains.audit.service import record_audit_best_effort
from app.domains.branches.schemas import BranchClosingRequest, BranchOpeningRequest
from app.domains.branches.service import (
    assert_branch_active,
    assert_branch_belongs_to_company,
    create_branch,
    find_active_branch_by_name,
    get_branch_by_id,
    list_branches_for_company,
)
from app.domains.branches.service import (
    close_branch as close_branch_record,
)
from app.domains.company.official_changes import (
    insert_company_lifecycle_event,
    insert_official_change_transaction,
)
from app.domains.company.service import assert_company_active, get_company_by_id
from app.domains.facilities.service import (
    create_facility_for_branch,
    keep_facility_open_after_branch_closing,
    link_facility_to_branch,
    mark_facility_reusable,
    set_facility_passive,
)
from app.domains.operations.service import (
    create_or_get_operation_request,
    duplicate_operation_response,
    mark_operation_completed,
)
from app.domains.organization.service import (
    create_branch_organization_unit,
    keep_organization_unit_open_after_branch_closing,
    list_units_for_company,
    reassign_organization_unit,
    set_organization_unit_passive,
)
from app.domains.outbox.service import enqueue_outbox_event_best_effort
from app.policies.operation_guards import guard_operation


def _context(tenant_id: str, user_id: str | None, company_id: str) -> dict[str, Any]:
    return {"tenant_id": tenant_id, "user_id": user_id, "company_id": company_id}


async def build_branch_opening_precheck(
    session: AsyncSession,
    *,
    tenant_id: str,
    company_id: str,
    branch_name: str | None = None,
    address: str | None = None,
) -> dict[str, Any]:
    warnings: list[str] = []
    blocking_reasons: list[str] = []
    company = await get_company_by_id(session, tenant_id, company_id)
    try:
        assert_company_active(company)
    except DomainError as error:
        blocking_reasons.append(error.message)

    branches = await list_branches_for_company(session, tenant_id, company_id)
    units = await list_units_for_company(session, tenant_id, company_id)
    duplicate = None
    if branch_name:
        duplicate = await find_active_branch_by_name(session, tenant_id, company_id, branch_name)
    if duplicate:
        blocking_reasons.append("Aynı şirket altında aynı isimle aktif şube bulunuyor.")
    if address and any(
        str(branch.get("address") or "").lower() == address.lower() for branch in branches
    ):
        warnings.append("Aynı adreste kayıtlı bir şube bulunuyor; bilgileri kontrol edin.")

    ok = not blocking_reasons
    return {
        "ok": ok,
        "operation_enabled": ok,
        "message": "Şube açılışı başlatılabilir." if ok else blocking_reasons[0],
        "warnings": warnings,
        "blocking_reasons": blocking_reasons,
        "current": company,
        "branches": branches,
        "organization_units": units,
        "facilities": [],
        "impact": {},
    }


async def build_branch_closing_precheck(
    session: AsyncSession,
    *,
    tenant_id: str,
    company_id: str,
    branch_id: str | None = None,
) -> dict[str, Any]:
    warnings: list[str] = []
    blocking_reasons: list[str] = []
    company = await get_company_by_id(session, tenant_id, company_id)
    try:
        assert_company_active(company)
    except DomainError as error:
        blocking_reasons.append(error.message)

    branches = await list_branches_for_company(session, tenant_id, company_id)
    units = await list_units_for_company(session, tenant_id, company_id)
    selected = await get_branch_by_id(session, tenant_id, branch_id) if branch_id else None
    if branch_id and not selected:
        blocking_reasons.append("Kapatılacak şube bulunamadı.")
    if selected:
        try:
            assert_branch_belongs_to_company(selected, company_id)
            assert_branch_active(selected)
        except DomainError as error:
            blocking_reasons.append(error.message)

    ok = not blocking_reasons
    return {
        "ok": ok,
        "operation_enabled": ok,
        "message": "Şube kapanışı başlatılabilir." if ok else blocking_reasons[0],
        "warnings": warnings,
        "blocking_reasons": blocking_reasons,
        "current": company,
        "branches": branches,
        "organization_units": units,
        "facilities": [],
        "selected_branch": selected,
        "impact": {
            "organization_unit_id": selected.get("organization_unit_id") if selected else None,
            "facility_id": selected.get("facility_id") if selected else None,
        },
    }


async def open_branch(
    session: AsyncSession,
    *,
    tenant_id: str,
    user_id: str | None,
    company_id: str,
    request: BranchOpeningRequest,
) -> dict[str, Any]:
    if request.company_id and request.company_id != company_id:
        raise DomainError(
            "Şube açılışı bağlı şirketi endpoint şirketiyle uyuşmuyor.", "COMPANY_ID_MISMATCH"
        )

    context = _context(tenant_id, user_id, company_id)
    warnings: list[str] = []
    try:
        async with session.begin():
            company = await get_company_by_id(session, tenant_id, company_id)
            assert_company_active(company)
            warnings.extend(
                await guard_operation(
                    session,
                    context,
                    operation_key="branch_opening",
                    module_key="branches",
                    required_permissions=["branches.openingStart"],
                    readiness_modules=["companies", "branches"],
                    integrity_operation_key="branch_opening",
                    resource={
                        "company_id": company_id,
                        "company": company,
                        "branch_name": request.branch_name,
                    },
                )
            )
            operation, operation_warnings = await create_or_get_operation_request(
                session,
                context,
                operation_type="branch_opening",
                client_request_id=request.client_request_id,
                payload=request.model_dump(mode="json"),
                entity_type="company",
                entity_id=company_id,
            )
            warnings.extend(operation_warnings)
            duplicate = duplicate_operation_response(operation) if operation else None
            if duplicate:
                return duplicate
            context["operation_id"] = str(operation["id"]) if operation else None

            await record_audit_best_effort(
                session,
                context,
                action_type="operation_start",
                action_key="branch_opening",
                summary="Şube Açılışı işlemi başlatıldı.",
                entity_type="company_branch",
                new_values={"branch_name": request.branch_name, "branch_type": request.branch_type},
            )

            precheck = await build_branch_opening_precheck(
                session,
                tenant_id=tenant_id,
                company_id=company_id,
                branch_name=request.branch_name,
                address=request.address,
            )
            if not precheck["ok"]:
                raise DomainError(
                    precheck["message"],
                    "BRANCH_OPENING_PRECHECK_FAILED",
                    status.HTTP_409_CONFLICT,
                    {
                        "blocking_reasons": precheck["blocking_reasons"],
                        "warnings": precheck["warnings"],
                    },
                )
            warnings.extend(precheck["warnings"])

            start_date = request.opening_registration_date or request.opening_decision_date
            organization_unit = None
            if request.create_organization_unit:
                organization_unit = await create_branch_organization_unit(
                    session,
                    context,
                    {
                        "company_id": company_id,
                        "branch_name": request.organization_unit_name or request.branch_name,
                        "branch_short_name": request.branch_short_name,
                        "parent_unit_id": request.parent_organization_unit_id,
                        "start_date": start_date,
                        "location_name": ", ".join(
                            item for item in [request.district, request.city] if item
                        )
                        or None,
                        "notes": request.notes,
                    },
                )

            facility = None
            if request.create_facility:
                facility = await create_facility_for_branch(
                    session,
                    context,
                    {
                        "company_id": company_id,
                        "branch_name": request.branch_name,
                        "facility_name": request.facility_name,
                        "country": request.country,
                        "city": request.city,
                        "district": request.district,
                        "neighborhood": request.neighborhood,
                        "address": request.address,
                        "postal_code": request.postal_code,
                        "phone": request.phone,
                        "email": request.email,
                        "start_date": start_date,
                        "notes": request.notes,
                    },
                )

            branch = await create_branch(
                session,
                context,
                {
                    **request.model_dump(mode="json"),
                    "company_id": company_id,
                    "organization_unit_id": organization_unit.get("id")
                    if organization_unit
                    else None,
                    "facility_id": facility.get("id") if facility else None,
                    "start_date": start_date,
                    "metadata_json": {
                        "operation_type": "branch_opening",
                        "facility_requested": request.create_facility,
                        "organization_unit_requested": request.create_organization_unit,
                    },
                },
            )
            if facility:
                facility = await link_facility_to_branch(
                    session, context, str(facility["id"]), str(branch["id"])
                )

            transaction = await insert_official_change_transaction(
                session,
                context,
                company_id=company_id,
                branch_id=str(branch["id"]),
                operation_id=context.get("operation_id"),
                transaction_type="branch_opening",
                old_values={},
                new_values=branch,
                changed_fields=list(branch.keys()),
                document_files=request.document_files,
                decision_date=request.opening_decision_date,
                registration_date=request.opening_registration_date,
                trade_registry_gazette_date=request.trade_registry_gazette_date,
                trade_registry_gazette_number=request.trade_registry_gazette_number,
                effective_date=start_date,
                notes=request.notes,
                warnings=warnings,
            )
            await insert_company_lifecycle_event(
                session,
                context,
                company_id=company_id,
                event_type="company_branch_opening_completed",
                event_date=start_date,
                payload={"branch_id": branch["id"], "transaction_id": transaction["id"]},
            )
            await enqueue_outbox_event_best_effort(
                session,
                context,
                event_type="company.branch_opened",
                aggregate_type="company_branch",
                aggregate_id=str(branch["id"]),
                payload={
                    "company_id": company_id,
                    "branch_id": branch["id"],
                    "transaction_id": transaction["id"],
                },
            )
            data = {
                "company": company,
                "transaction": transaction,
                "branch": branch,
                "organization_unit": organization_unit,
                "facility": facility,
            }
            await mark_operation_completed(session, operation, data, warnings)
            await record_audit_best_effort(
                session,
                context,
                action_type="operation_complete",
                action_key="branch_opening",
                summary=f"{branch.get('branch_name') or 'Şube'} açıldı.",
                entity_type="company_branch",
                entity_id=str(branch["id"]),
                branch_id=str(branch["id"]),
                new_values=branch,
                metadata={"transaction_id": transaction["id"]},
            )
            return {
                "data": data,
                "operation_id": context.get("operation_id"),
                "operation_status": "completed",
                "warnings": warnings,
                "message": "Şube açılışı tamamlandı.",
            }
    except Exception as error:
        mapped = map_database_error(
            error,
            fallback_code="BRANCH_OPENING_FAILED",
            fallback_message="Şube açılışı tamamlanamadı.",
        )
        raise mapped from error


async def close_branch(
    session: AsyncSession,
    *,
    tenant_id: str,
    user_id: str | None,
    company_id: str,
    request: BranchClosingRequest,
) -> dict[str, Any]:
    if not request.branch_id:
        raise DomainError("Kapatılacak şube seçilmelidir.", "BRANCH_REQUIRED")
    context = _context(tenant_id, user_id, company_id)
    warnings: list[str] = []
    try:
        async with session.begin():
            company = await get_company_by_id(session, tenant_id, company_id)
            assert_company_active(company)
            branch = await get_branch_by_id(session, tenant_id, request.branch_id)
            if not branch:
                raise DomainError(
                    "Şube kaydı bulunamadı.", "BRANCH_NOT_FOUND", status.HTTP_404_NOT_FOUND
                )
            assert_branch_belongs_to_company(branch, company_id)
            assert_branch_active(branch)
            context["branch_id"] = request.branch_id
            warnings.extend(
                await guard_operation(
                    session,
                    context,
                    operation_key="branch_closing",
                    module_key="branches",
                    required_permissions=["branches.closingStart"],
                    readiness_modules=["companies", "branches"],
                    integrity_operation_key="branch_closing",
                    resource={
                        "company_id": company_id,
                        "branch_id": request.branch_id,
                        "company": company,
                        "branch": branch,
                    },
                )
            )

            operation, operation_warnings = await create_or_get_operation_request(
                session,
                context,
                operation_type="branch_closing",
                client_request_id=request.client_request_id,
                payload=request.model_dump(mode="json"),
                entity_type="company_branch",
                entity_id=request.branch_id,
            )
            warnings.extend(operation_warnings)
            duplicate = duplicate_operation_response(operation) if operation else None
            if duplicate:
                return duplicate
            context["operation_id"] = str(operation["id"]) if operation else None

            await record_audit_best_effort(
                session,
                context,
                action_type="operation_start",
                action_key="branch_closing",
                summary="Şube Kapanışı işlemi başlatıldı.",
                entity_type="company_branch",
                entity_id=request.branch_id,
                branch_id=request.branch_id,
                new_values=request.model_dump(mode="json"),
            )

            precheck = await build_branch_closing_precheck(
                session,
                tenant_id=tenant_id,
                company_id=company_id,
                branch_id=request.branch_id,
            )
            if not precheck["ok"]:
                raise DomainError(
                    precheck["message"],
                    "BRANCH_CLOSING_PRECHECK_FAILED",
                    status.HTTP_409_CONFLICT,
                    {
                        "blocking_reasons": precheck["blocking_reasons"],
                        "warnings": precheck["warnings"],
                    },
                )
            warnings.extend(precheck["warnings"])

            end_date = request.closing_registration_date or request.closing_decision_date
            organization_unit = None
            if branch.get("organization_unit_id"):
                unit_id = str(branch["organization_unit_id"])
                if request.organization_unit_action == "deactivate":
                    organization_unit = await set_organization_unit_passive(
                        session, context, unit_id, end_date
                    )
                elif (
                    request.organization_unit_action == "reassign"
                    and request.target_organization_unit_id
                ):
                    organization_unit = await reassign_organization_unit(
                        session,
                        context,
                        unit_id,
                        request.target_organization_unit_id,
                    )
                else:
                    organization_unit = await keep_organization_unit_open_after_branch_closing(
                        session,
                        context,
                        unit_id,
                        {"end_date": end_date},
                    )

            facility = None
            if branch.get("facility_id"):
                facility_id = str(branch["facility_id"])
                if request.facility_action == "deactivate":
                    facility = await set_facility_passive(session, context, facility_id, end_date)
                elif request.facility_action == "reuse":
                    facility = await mark_facility_reusable(
                        session,
                        context,
                        facility_id,
                        {"end_date": end_date},
                    )
                else:
                    facility = await keep_facility_open_after_branch_closing(
                        session,
                        context,
                        facility_id,
                        {"end_date": end_date},
                    )

            closing = await close_branch_record(
                session,
                context,
                request.branch_id,
                request.model_dump(mode="json"),
            )
            updated_branch = closing["branch"]
            transaction = await insert_official_change_transaction(
                session,
                context,
                company_id=company_id,
                branch_id=request.branch_id,
                operation_id=context.get("operation_id"),
                transaction_type="branch_closing",
                old_values=closing["old_values"],
                new_values=closing["new_values"],
                changed_fields=closing["changed_fields"],
                document_files=request.document_files,
                decision_date=request.closing_decision_date,
                registration_date=request.closing_registration_date,
                trade_registry_gazette_date=request.trade_registry_gazette_date,
                trade_registry_gazette_number=request.trade_registry_gazette_number,
                effective_date=end_date,
                notes=request.notes or request.closing_reason,
                warnings=warnings,
            )
            await insert_company_lifecycle_event(
                session,
                context,
                company_id=company_id,
                event_type="company_branch_closing_completed",
                event_date=end_date,
                payload={"branch_id": request.branch_id, "transaction_id": transaction["id"]},
            )
            await enqueue_outbox_event_best_effort(
                session,
                context,
                event_type="company.branch_closed",
                aggregate_type="company_branch",
                aggregate_id=request.branch_id,
                payload={
                    "company_id": company_id,
                    "branch_id": request.branch_id,
                    "transaction_id": transaction["id"],
                    "organization_unit_action": request.organization_unit_action,
                    "facility_action": request.facility_action,
                },
            )
            data = {
                "company": company,
                "transaction": transaction,
                "branch": updated_branch,
                "organization_unit": organization_unit,
                "facility": facility,
            }
            await mark_operation_completed(session, operation, data, warnings)
            await record_audit_best_effort(
                session,
                context,
                action_type="operation_complete",
                action_key="branch_closing",
                summary=f"{updated_branch.get('branch_name') or 'Şube'} kapatıldı.",
                entity_type="company_branch",
                entity_id=request.branch_id,
                branch_id=request.branch_id,
                old_values=closing["old_values"],
                new_values=updated_branch,
                metadata={"transaction_id": transaction["id"]},
            )
            return {
                "data": data,
                "operation_id": context.get("operation_id"),
                "operation_status": "completed",
                "warnings": warnings,
                "message": "Şube kapanışı tamamlandı.",
            }
    except Exception as error:
        mapped = map_database_error(
            error,
            fallback_code="BRANCH_CLOSING_FAILED",
            fallback_message="Şube kapanışı tamamlanamadı.",
        )
        raise mapped from error
