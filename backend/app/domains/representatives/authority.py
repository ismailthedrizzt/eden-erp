from __future__ import annotations

import json
from typing import Any
from uuid import uuid4

from fastapi import status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError, map_database_error
from app.domains.audit.service import record_audit_best_effort
from app.domains.operations.service import (
    create_or_get_operation_request,
    duplicate_operation_response,
    mark_operation_completed,
    table_exists,
)
from app.domains.outbox.service import enqueue_outbox_event_best_effort
from app.domains.representatives.schemas import (
    AUTHORITY_TRANSACTION_TYPES,
    RepresentativeAuthorityScope,
    RepresentativeAuthorityTransactionRequest,
)
from app.domains.representatives.scope import validate_authority_scope
from app.domains.representatives.service import (
    ACTIVE_AUTHORITY_STATUSES,
    DRAFT_CARD_STATUSES,
    SUSPENDED_AUTHORITY_STATUSES,
    authority_status,
    get_current_authority,
    get_representative_by_id,
    representative_card_status,
)
from app.policies.operation_guards import guard_operation


def _context(
    tenant_id: str,
    user_id: str | None,
    company_id: str | None = None,
) -> dict[str, Any]:
    return {
        "tenant_id": tenant_id,
        "user_id": user_id,
        "company_id": company_id,
        "module_key": "representatives",
    }


def _effect_status(transaction_type: str) -> str:
    if transaction_type == "Askıya Alma":
        return "suspended"
    if transaction_type in {"Sonlandırma", "Ters Kayıt"}:
        return "terminated"
    return "active"


def _outbox_event_type(transaction_type: str) -> str:
    if transaction_type == "Temsilcilik Başlatma":
        return "representative.authority_started"
    if transaction_type == "Askıya Alma":
        return "representative.authority_suspended"
    if transaction_type == "Sonlandırma":
        return "representative.authority_terminated"
    return "representative.authority_updated"


def _operation_type(transaction_type: str) -> str:
    return {
        "Temsilcilik Başlatma": "representative.authority_start",
        "Yetki Yenileme": "representative.authority_renew",
        "Yetki Kapsamı Değişikliği": "representative.authority_scope_change",
        "Limit Değişikliği": "representative.authority_limit_change",
        "Askıya Alma": "representative.authority_suspend",
        "Sonlandırma": "representative.authority_terminate",
        "Düzeltme Kaydı": "representative.authority_correction",
        "Ters Kayıt": "representative.authority_reverse",
    }.get(transaction_type, "representative.authority_transaction")


def _required_permission(transaction_type: str) -> str:
    operation_type = _operation_type(transaction_type)
    if operation_type.endswith("authority_start"):
        return "representatives.authorityStart"
    if operation_type.endswith("authority_suspend"):
        return "representatives.authoritySuspend"
    if operation_type.endswith("authority_terminate"):
        return "representatives.authorityTerminate"
    return "representatives.authorityUpdate"


def _request_has_explicit_scope(request: RepresentativeAuthorityTransactionRequest) -> bool:
    return any(
        [
            request.scope_type != "company_wide",
            request.branch_id,
            request.organization_unit_id,
            request.facility_id,
            request.scope_label,
            request.scope_notes,
        ]
    )


def _scope_from_current(current_authority: dict[str, Any] | None) -> RepresentativeAuthorityScope:
    if not current_authority:
        return RepresentativeAuthorityScope(scope_type="company_wide")
    return RepresentativeAuthorityScope(
        scope_type=current_authority.get("scope_type") or "company_wide",
        branch_id=current_authority.get("branch_id"),
        organization_unit_id=current_authority.get("organization_unit_id"),
        facility_id=current_authority.get("facility_id"),
        scope_label=current_authority.get("scope_label"),
        scope_notes=current_authority.get("scope_notes"),
    )


def _scope_for_transaction(
    request: RepresentativeAuthorityTransactionRequest,
    current_authority: dict[str, Any] | None,
) -> RepresentativeAuthorityScope:
    if request.transaction_type in {
        "Askıya Alma",
        "Sonlandırma",
        "Ters Kayıt",
    } and not _request_has_explicit_scope(request):
        return _scope_from_current(current_authority)
    return request.scope_model()


def validate_transaction_allowed(
    representative: dict[str, Any],
    current_authority: dict[str, Any] | None,
    transaction_type: str,
) -> None:
    card_status = representative_card_status(representative)
    current_status = authority_status(current_authority)
    if transaction_type == "Temsilcilik Başlatma" and card_status not in DRAFT_CARD_STATUSES:
        raise DomainError(
            "Temsilcilik Baslatma yalnizca taslak temsilci kartinda yapilabilir.",
            "REPRESENTATIVE_START_REQUIRES_DRAFT",
            status.HTTP_409_CONFLICT,
        )
    if transaction_type in {
        "Yetki Yenileme",
        "Yetki Kapsamı Değişikliği",
        "Limit Değişikliği",
        "Düzeltme Kaydı",
    }:
        if card_status not in ACTIVE_AUTHORITY_STATUSES:
            raise DomainError(
                "Bu yetki islemi aktif temsilci karti gerektirir.",
                "REPRESENTATIVE_ACTIVE_REQUIRED",
                status.HTTP_409_CONFLICT,
            )
        if current_status not in ACTIVE_AUTHORITY_STATUSES:
            raise DomainError(
                "Bu yetki islemi aktif temsil yetkisi gerektirir.",
                "REPRESENTATIVE_AUTHORITY_ACTIVE_REQUIRED",
                status.HTTP_409_CONFLICT,
            )
    if transaction_type == "Askıya Alma" and current_status not in ACTIVE_AUTHORITY_STATUSES:
        raise DomainError(
            "Askıya Alma yalnizca aktif temsil yetkisi icin yapilabilir.",
            "REPRESENTATIVE_SUSPEND_REQUIRES_ACTIVE",
            status.HTTP_409_CONFLICT,
        )
    if transaction_type == "Sonlandırma" and current_status not in (
        ACTIVE_AUTHORITY_STATUSES | SUSPENDED_AUTHORITY_STATUSES
    ):
        raise DomainError(
            "Sonlandirma yalnizca aktif veya askida temsil yetkisi icin yapilabilir.",
            "REPRESENTATIVE_TERMINATE_REQUIRES_ACTIVE",
            status.HTTP_409_CONFLICT,
        )


def _validate_payload(
    request: RepresentativeAuthorityTransactionRequest,
    current_authority: dict[str, Any] | None,
) -> None:
    if request.transaction_type not in AUTHORITY_TRANSACTION_TYPES:
        raise DomainError("Gecersiz temsil yetkisi islemi.", "INVALID_TRANSACTION_TYPE", 400)
    if not request.effective_date:
        raise DomainError("Yururluk tarihi zorunludur.", "EFFECTIVE_DATE_REQUIRED", 400)
    if request.transaction_type not in {"Sonlandırma", "Askıya Alma", "Ters Kayıt"}:
        authority_types = request.authority_types or (
            current_authority.get("authority_types", []) if current_authority else []
        )
        if not authority_types:
            raise DomainError("En az bir yetki tipi secilmelidir.", "AUTHORITY_TYPE_REQUIRED", 400)
    if request.transaction_type == "Temsilcilik Başlatma" and not request.document_list():
        raise DomainError(
            "Aktivasyon icin en az bir yetki belgesi gereklidir.",
            "AUTHORITY_DOCUMENT_REQUIRED",
            400,
        )
    if request.transaction_type == "Sonlandırma" and not (
        request.reason or request.termination_reason or request.notes
    ):
        raise DomainError(
            "Sonlandirma nedeni zorunludur.",
            "TERMINATION_REASON_REQUIRED",
            400,
        )


async def _next_transaction_no(session: AsyncSession) -> str:
    result = await session.execute(
        text(
            """
            select count(*) + 1 as next_no
            from public.company_representative_authority_transactions
            """
        )
    )
    next_no = int(result.mappings().one()["next_no"] or 1)
    return f"RT-{next_no:05d}"


async def _conflicting_authority_exists(
    session: AsyncSession,
    context: dict[str, Any],
    representative_id: str,
    scope: RepresentativeAuthorityScope,
    authority_types: list[str],
) -> bool:
    if not authority_types:
        return False
    result = await session.execute(
        text(
            """
            select authority_types
            from public.company_representative_authority_transactions
            where tenant_id = :tenant_id
              and representative_id = :representative_id
              and coalesce(is_deleted, false) = false
              and approval_status = 'approved'
              and workflow_status = 'approved'
              and authority_record_status = 'active'
              and scope_type = :scope_type
              and coalesce(branch_id::text, '') = coalesce(:branch_id, '')
              and coalesce(organization_unit_id::text, '') = coalesce(:organization_unit_id, '')
              and coalesce(facility_id::text, '') = coalesce(:facility_id, '')
            limit 50
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "representative_id": representative_id,
            "scope_type": scope.scope_type,
            "branch_id": scope.branch_id,
            "organization_unit_id": scope.organization_unit_id,
            "facility_id": scope.facility_id,
        },
    )
    requested = set(authority_types)
    for row in result.mappings().all():
        existing = row.get("authority_types") or []
        if isinstance(existing, list) and requested.intersection(str(item) for item in existing):
            return True
    return False


def _limits_payload(request: RepresentativeAuthorityTransactionRequest) -> dict[str, Any]:
    return {
        "transaction_limit": request.transaction_limit or request.authority_limit,
        "payment_approval_limit": request.payment_approval_limit,
        "purchase_approval_limit": request.purchase_approval_limit,
        "bank_transaction_limit": request.bank_transaction_limit,
        "contract_signature_limit": request.contract_signature_limit,
    }


async def insert_authority_transaction(
    session: AsyncSession,
    context: dict[str, Any],
    representative: dict[str, Any],
    request: RepresentativeAuthorityTransactionRequest,
    scope: RepresentativeAuthorityScope,
    *,
    transaction_no: str,
    effect_status: str,
) -> dict[str, Any]:
    if not await table_exists(session, "public.company_representative_authority_transactions"):
        raise DomainError(
            "Temsil yetkisi islem altyapisi hazir degil.",
            "REPRESENTATIVE_AUTHORITY_INFRASTRUCTURE_MISSING",
            status.HTTP_409_CONFLICT,
        )
    transaction_id = str(uuid4())
    authority_types = request.authority_types or (
        [request.primary_authority_type] if request.primary_authority_type else []
    )
    limits = _limits_payload(request)
    scope_payload = {
        **scope.model_dump(mode="json"),
        "bank_authority_level": request.bank_authority_level,
        "department_scope": request.department_scope,
        "gib_permissions": request.gib_permissions,
        "sgk_permissions": request.sgk_permissions,
    }
    result = await session.execute(
        text(
            """
            insert into public.company_representative_authority_transactions (
              id, tenant_id, company_id, representative_id, person_id, organization_id,
              transaction_no, transaction_type, transaction_status, authority_effect_status,
              authority_record_status, authority_types, signature_type, transaction_limit,
              payment_approval_limit, purchase_approval_limit, bank_transaction_limit,
              contract_signature_limit, currency, limits, scope, scope_type, branch_id,
              organization_unit_id, facility_id, scope_label, scope_notes,
              requires_joint_signature, can_approve_alone, document_files, effective_date,
              end_date, approval_status, workflow_status, status, notes, warnings,
              reversal_transaction_id, new_values, approved_by, approved_at, created_by, updated_by
            )
            values (
              :id, :tenant_id, :company_id, :representative_id, :person_id, :organization_id,
              :transaction_no, :transaction_type, 'approved', :effect_status,
              :effect_status, cast(:authority_types as jsonb), :signature_type,
              :transaction_limit, :payment_approval_limit, :purchase_approval_limit,
              :bank_transaction_limit, :contract_signature_limit, :currency,
              cast(:limits as jsonb), cast(:scope as jsonb), :scope_type, :branch_id,
              :organization_unit_id, :facility_id, :scope_label, :scope_notes,
              :requires_joint_signature, :can_approve_alone, cast(:document_files as jsonb),
              :effective_date, :end_date, 'approved', 'approved', 'approved', :notes,
              cast(:warnings as jsonb), :reversal_transaction_id, cast(:new_values as jsonb),
              :user_id, now(), :user_id, :user_id
            )
            returning *
            """
        ),
        {
            "id": transaction_id,
            "tenant_id": context["tenant_id"],
            "company_id": representative["company_id"],
            "representative_id": representative["id"],
            "person_id": representative.get("person_id"),
            "organization_id": representative.get("organization_id"),
            "transaction_no": transaction_no,
            "transaction_type": request.transaction_type,
            "effect_status": effect_status,
            "authority_types": json.dumps(authority_types, ensure_ascii=False),
            "signature_type": request.signature_type,
            "transaction_limit": request.transaction_limit or request.authority_limit,
            "payment_approval_limit": request.payment_approval_limit,
            "purchase_approval_limit": request.purchase_approval_limit,
            "bank_transaction_limit": request.bank_transaction_limit,
            "contract_signature_limit": request.contract_signature_limit,
            "currency": request.currency or "TRY",
            "limits": json.dumps(limits, ensure_ascii=False, default=str),
            "scope": json.dumps(scope_payload, ensure_ascii=False, default=str),
            "scope_type": scope.scope_type,
            "branch_id": scope.branch_id,
            "organization_unit_id": scope.organization_unit_id,
            "facility_id": scope.facility_id,
            "scope_label": scope.scope_label,
            "scope_notes": scope.scope_notes,
            "requires_joint_signature": request.requires_joint_signature,
            "can_approve_alone": request.can_approve_alone,
            "document_files": json.dumps(request.document_list(), ensure_ascii=False, default=str),
            "effective_date": request.effective_date,
            "end_date": request.end_date,
            "notes": request.notes or request.reason or request.termination_reason,
            "warnings": json.dumps([], ensure_ascii=False),
            "reversal_transaction_id": request.reversal_transaction_id,
            "new_values": json.dumps(
                request.model_dump(mode="json"), ensure_ascii=False, default=str
            ),
            "user_id": context.get("user_id"),
        },
    )
    return dict(result.mappings().one())


async def update_representative_after_authority(
    session: AsyncSession,
    context: dict[str, Any],
    representative_id: str,
    transaction_type: str,
) -> dict[str, Any]:
    card_status = "passive" if transaction_type == "Sonlandırma" else "active"
    status_label = "Pasif" if card_status == "passive" else "Aktif"
    result = await session.execute(
        text(
            """
            update public.company_representatives
            set record_status = :record_status,
                status = :status_label,
                updated_at = now(),
                updated_by = :user_id,
                version = coalesce(version, 0) + 1
            where tenant_id = :tenant_id
              and id = :representative_id
              and coalesce(is_deleted, false) = false
            returning *
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "representative_id": representative_id,
            "record_status": card_status,
            "status_label": status_label,
            "user_id": context.get("user_id"),
        },
    )
    row = result.mappings().one_or_none()
    if not row:
        raise DomainError("Temsilci kaydi bulunamadi.", "REPRESENTATIVE_NOT_FOUND", 404)
    return dict(row)


async def get_current_authority_after_transaction(
    session: AsyncSession,
    context: dict[str, Any],
    representative_id: str,
) -> dict[str, Any] | None:
    return await get_current_authority(session, context, representative_id)


async def perform_authority_transaction(
    session: AsyncSession,
    context: dict[str, Any],
    representative_id: str,
    request: RepresentativeAuthorityTransactionRequest,
) -> dict[str, Any]:
    warnings: list[str] = []
    try:
        async with session.begin():
            representative = await get_representative_by_id(
                session, context["tenant_id"], representative_id
            )
            if not representative:
                raise DomainError("Temsilci kaydi bulunamadi.", "REPRESENTATIVE_NOT_FOUND", 404)
            context["company_id"] = str(representative["company_id"])
            warnings.extend(
                await guard_operation(
                    session,
                    context,
                    operation_key=_operation_type(request.transaction_type),
                    module_key="representatives",
                    required_permissions=[_required_permission(request.transaction_type)],
                    readiness_modules=["companies", "representatives"],
                    integrity_operation_key="representative_authority",
                    resource={
                        "company_id": str(representative["company_id"]),
                        "representative_id": representative_id,
                    },
                )
            )
            operation, operation_warnings = await create_or_get_operation_request(
                session,
                context,
                operation_type=_operation_type(request.transaction_type),
                client_request_id=request.client_request_id,
                payload=request.model_dump(mode="json"),
                entity_type="company_representative",
                entity_id=representative_id,
                module_key="representatives",
            )
            duplicate = duplicate_operation_response(operation) if operation else None
            if duplicate:
                return duplicate
            if operation:
                context["operation_id"] = str(operation["id"])
            warnings.extend(operation_warnings)

            current_authority = await get_current_authority(session, context, representative_id)
            validate_transaction_allowed(
                representative, current_authority, request.transaction_type
            )
            _validate_payload(request, current_authority)
            scope = _scope_for_transaction(request, current_authority)
            validated_scope = await validate_authority_scope(
                session, context, str(representative["company_id"]), scope
            )
            authority_types = request.authority_types or (
                current_authority.get("authority_types", []) if current_authority else []
            )
            if request.transaction_type in {"Temsilcilik Başlatma", "Yetki Kapsamı Değişikliği"}:
                if await _conflicting_authority_exists(
                    session, context, representative_id, validated_scope, authority_types
                ):
                    raise DomainError(
                        "Ayni temsilci, kapsam ve yetki tipi icin aktif yetki zaten var.",
                        "REPRESENTATIVE_AUTHORITY_CONFLICT",
                        status.HTTP_409_CONFLICT,
                    )
            transaction = await insert_authority_transaction(
                session,
                context,
                representative,
                request,
                validated_scope,
                transaction_no=await _next_transaction_no(session),
                effect_status=_effect_status(request.transaction_type),
            )
            updated_representative = await update_representative_after_authority(
                session, context, representative_id, request.transaction_type
            )
            current_after = await get_current_authority_after_transaction(
                session, context, representative_id
            )
            data = {
                "representative": updated_representative,
                "transaction": transaction,
                "current_authority": current_after,
                "warnings": warnings,
            }
            await mark_operation_completed(session, operation, data, warnings)
            await enqueue_outbox_event_best_effort(
                session,
                context,
                event_type=_outbox_event_type(request.transaction_type),
                aggregate_type="company_representative",
                aggregate_id=representative_id,
                payload={
                    "representative_id": representative_id,
                    "company_id": representative["company_id"],
                    "transaction_id": transaction["id"],
                    "transaction_type": request.transaction_type,
                    "authority_status": _effect_status(request.transaction_type),
                    "scope_type": validated_scope.scope_type,
                    "branch_id": validated_scope.branch_id,
                    "organization_unit_id": validated_scope.organization_unit_id,
                    "facility_id": validated_scope.facility_id,
                    "authority_types": authority_types,
                },
            )
            await record_audit_best_effort(
                session,
                context,
                action_type="operation_complete",
                action_key=_operation_type(request.transaction_type),
                summary="Temsil yetkisi islemi tamamlandi.",
                entity_type="company_representative",
                entity_id=representative_id,
                old_values=current_authority or {},
                new_values=current_after or {},
                metadata={"transaction_id": transaction["id"]},
            )
            return {
                "data": data,
                "operation_id": str(operation["id"]) if operation else None,
                "operation_status": "completed",
                "warnings": warnings,
                "message": "Temsil yetkisi islemi tamamlandi.",
            }
    except Exception as error:
        raise map_database_error(
            error,
            fallback_code="REPRESENTATIVE_AUTHORITY_TRANSACTION_FAILED",
            fallback_message="Temsil yetkisi islemi tamamlanamadi.",
        ) from error


async def start_authority(
    session: AsyncSession,
    context: dict[str, Any],
    representative: dict[str, Any],
    request: RepresentativeAuthorityTransactionRequest,
) -> dict[str, Any]:
    return await perform_authority_transaction(session, context, str(representative["id"]), request)


async def renew_authority(
    session: AsyncSession,
    context: dict[str, Any],
    representative: dict[str, Any],
    request: RepresentativeAuthorityTransactionRequest,
) -> dict[str, Any]:
    return await perform_authority_transaction(session, context, str(representative["id"]), request)


async def change_authority_scope(
    session: AsyncSession,
    context: dict[str, Any],
    representative: dict[str, Any],
    request: RepresentativeAuthorityTransactionRequest,
) -> dict[str, Any]:
    return await perform_authority_transaction(session, context, str(representative["id"]), request)


async def change_authority_limit(
    session: AsyncSession,
    context: dict[str, Any],
    representative: dict[str, Any],
    request: RepresentativeAuthorityTransactionRequest,
) -> dict[str, Any]:
    return await perform_authority_transaction(session, context, str(representative["id"]), request)


async def suspend_authority(
    session: AsyncSession,
    context: dict[str, Any],
    representative: dict[str, Any],
    request: RepresentativeAuthorityTransactionRequest,
) -> dict[str, Any]:
    return await perform_authority_transaction(session, context, str(representative["id"]), request)


async def terminate_authority(
    session: AsyncSession,
    context: dict[str, Any],
    representative: dict[str, Any],
    request: RepresentativeAuthorityTransactionRequest,
) -> dict[str, Any]:
    return await perform_authority_transaction(session, context, str(representative["id"]), request)


async def correct_authority(
    session: AsyncSession,
    context: dict[str, Any],
    representative: dict[str, Any],
    request: RepresentativeAuthorityTransactionRequest,
) -> dict[str, Any]:
    return await perform_authority_transaction(session, context, str(representative["id"]), request)


async def reverse_authority(
    session: AsyncSession,
    context: dict[str, Any],
    representative: dict[str, Any],
    request: RepresentativeAuthorityTransactionRequest,
) -> dict[str, Any]:
    return await perform_authority_transaction(session, context, str(representative["id"]), request)


async def perform_authority_transaction_for_request(
    session: AsyncSession,
    *,
    tenant_id: str,
    user_id: str | None,
    representative_id: str,
    request: RepresentativeAuthorityTransactionRequest,
) -> dict[str, Any]:
    return await perform_authority_transaction(
        session,
        _context(tenant_id, user_id),
        representative_id,
        request,
    )
