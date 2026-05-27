from __future__ import annotations

import json
from typing import Any
from uuid import uuid4

from fastapi import status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError, map_database_error
from app.domains.audit.service import record_audit_best_effort
from app.domains.company.capital_schemas import (
    CapitalIncreasePrecheckResponse,
    CapitalIncreaseRequest,
)
from app.domains.company.official_changes import (
    insert_company_lifecycle_event,
    normalize_documents,
)
from app.domains.company.service import (
    detect_company_version_conflict,
    get_company_by_id,
    get_company_lifecycle,
)
from app.domains.operations.service import (
    create_or_get_operation_request,
    duplicate_operation_response,
    mark_operation_completed,
    table_exists,
)
from app.domains.outbox.service import enqueue_outbox_event_best_effort
from app.domains.ownership.schemas import (
    CapitalIncreaseDistributionRow,
    CurrentOwnershipRow,
)
from app.domains.ownership.service import (
    assert_current_ownership_readable,
    build_proportional_capital_distribution,
    get_current_ownership_for_company,
    is_draft_partner,
    list_partners_for_company,
    number_value,
    round_money,
    round_ratio,
    update_partner_capital_state,
    validate_current_ownership_for_capital_increase,
    validate_manual_capital_distribution,
)
from app.domains.ownership.transactions import (
    insert_capital_increase_ownership_transactions,
)


def _context(tenant_id: str, user_id: str | None, company_id: str) -> dict[str, Any]:
    return {
        "tenant_id": tenant_id,
        "user_id": user_id,
        "company_id": company_id,
        "module_key": "companies",
    }


def _company_active_for_capital(company: dict[str, Any] | None) -> None:
    lifecycle = get_company_lifecycle(company)
    if not company:
        raise DomainError(
            "Sirket kaydi bulunamadi.",
            "COMPANY_NOT_FOUND",
            status.HTTP_404_NOT_FOUND,
        )
    if lifecycle not in {"active", "aktif", "opened", "open"}:
        raise DomainError(
            "Sermaye Artirimi yalnizca aktif sirketlerde baslatilabilir.",
            "COMPANY_NOT_ACTIVE",
            status.HTTP_409_CONFLICT,
            {
                "record_status": company.get("record_status"),
                "company_status": company.get("company_status"),
            },
        )


async def _opening_capital_amount(
    session: AsyncSession,
    tenant_id: str,
    company_id: str,
) -> float:
    if not await table_exists(session, "public.company_opening_details"):
        return 0
    result = await session.execute(
        text(
            """
            select payload_json, foundation_capital_amount
            from public.company_opening_details
            where tenant_id = :tenant_id
              and company_id = :company_id
            limit 1
            """
        ),
        {"tenant_id": tenant_id, "company_id": company_id},
    )
    row = result.mappings().one_or_none()
    if not row:
        return 0
    payload_value = row.get("payload_json")
    payload: dict[str, Any] = payload_value if isinstance(payload_value, dict) else {}
    return number_value(
        payload.get("foundation_capital_amount")
        or payload.get("capital_amount")
        or row.get("foundation_capital_amount")
    )


async def _company_capital_amount(
    session: AsyncSession,
    tenant_id: str,
    company: dict[str, Any],
) -> float:
    explicit = number_value(company.get("committed_capital_amount"))
    if explicit > 0:
        return explicit
    return await _opening_capital_amount(session, tenant_id, str(company["id"]))


def _ownership_as_partner_snapshot(row: CurrentOwnershipRow) -> dict[str, Any]:
    return {
        "id": row.partner_id,
        "partner_id": row.partner_id,
        "display_name": row.display_name,
        "owner_kind": "person",
        "partner_type": "person",
        "record_status": row.record_status,
        "status": row.status,
        "share_ratio": row.current_share_ratio,
        "voting_ratio": row.current_voting_ratio,
        "profit_ratio": row.current_profit_ratio,
        "committed_capital_amount": row.current_capital_amount,
        "paid_capital_amount": row.paid_capital_amount,
        "warnings": row.warnings,
    }


async def build_capital_increase_precheck(
    session: AsyncSession,
    context: dict[str, Any],
    company_id: str,
) -> dict[str, Any]:
    company = await get_company_by_id(session, context["tenant_id"], company_id)
    warnings: list[str] = []
    blocking_reasons: list[str] = []
    dependency_code: str | None = None
    dependency_details: dict[str, Any] | None = None

    try:
        _company_active_for_capital(company)
    except DomainError as error:
        blocking_reasons.append(error.message)

    partners: list[dict[str, Any]] = []
    ownership_rows: list[CurrentOwnershipRow] = []
    if company:
        try:
            partners = await list_partners_for_company(session, context["tenant_id"], company_id)
            ownership_rows = await assert_current_ownership_readable(
                session, context["tenant_id"], company_id
            )
            validate_current_ownership_for_capital_increase(ownership_rows)
        except DomainError as error:
            dependency_code = error.code
            dependency_details = error.details or {
                "required_modules": ["partners"],
                "required_projection": "currentOwnership",
            }
            blocking_reasons.append(error.message)

    current_capital = (
        await _company_capital_amount(session, context["tenant_id"], company) if company else 0
    )
    paid_capital = number_value(company.get("paid_capital_amount")) if company else 0
    draft_partners = [partner for partner in partners if is_draft_partner(partner)]
    total_share = round_ratio(sum(row.current_share_ratio for row in ownership_rows))
    total_capital = round_money(sum(row.current_capital_amount for row in ownership_rows))
    ownership_valid = bool(ownership_rows) and abs(total_share - 100) <= 0.05
    unpaid_capital = round_money(max(0, total_capital - paid_capital))
    if unpaid_capital > 0.01:
        warnings.append(
            "Mevcut sermaye taahhutlerinde odenmemis tutar bulunuyor; "
            "muhasebe mutabakati ayri takip edilmelidir."
        )

    ok = not blocking_reasons
    response = CapitalIncreasePrecheckResponse(
        ok=ok,
        operation_enabled=ok,
        message="Sermaye Artirimi baslatilabilir." if ok else blocking_reasons[0],
        warnings=warnings,
        reasons=warnings,
        blocking_reasons=blocking_reasons,
        company=company,
        current_capital_amount=round_money(current_capital),
        paid_capital_amount=round_money(paid_capital),
        unpaid_capital_amount=unpaid_capital,
        currency=str(company.get("currency") or "TRY") if company else "TRY",
        partners=partners,
        active_partners=[_ownership_as_partner_snapshot(row) for row in ownership_rows],
        draft_partners=draft_partners,
        current_ownership=ownership_rows,
        current_ownership_distribution=[
            _ownership_as_partner_snapshot(row) for row in ownership_rows
        ],
        total_share_ratio=total_share,
        total_capital_amount=total_capital,
        ownership_valid=ownership_valid,
        has_full_share_distribution=ownership_valid,
        distribution_modes=["proportional", "manual"],
        required_documents=[
            "board_resolution",
            "financial_advisor_document",
            "registration_document",
            "trade_registry_gazette",
        ],
        module_readiness={
            "partners": {
                "ready": dependency_code is None,
                "status": "ready" if dependency_code is None else "setup_required",
            }
        },
        dependency_code=dependency_code,
        dependency_details=dependency_details,
    )
    return response.model_dump(mode="json")


def validate_capital_increase_request(
    company: dict[str, Any],
    current_ownership: list[CurrentOwnershipRow],
    request: CapitalIncreaseRequest,
) -> list[str]:
    _company_active_for_capital(company)
    validate_current_ownership_for_capital_increase(current_ownership)
    current_capital = number_value(company.get("committed_capital_amount"))
    if current_capital and abs(current_capital - request.old_capital_amount) > 0.05:
        raise DomainError(
            "Eski sermaye tutari sirket kaydindaki guncel sermaye ile uyumlu degil.",
            "OLD_CAPITAL_MISMATCH",
            status.HTTP_409_CONFLICT,
            {
                "current_capital_amount": current_capital,
                "request_old_capital_amount": request.old_capital_amount,
            },
        )
    if not request.currency:
        raise DomainError(
            "Para birimi secilmelidir.",
            "CURRENCY_REQUIRED",
            status.HTTP_400_BAD_REQUEST,
        )
    return []


async def update_company_capital(
    session: AsyncSession,
    context: dict[str, Any],
    company_id: str,
    *,
    old_capital: float,
    new_capital: float,
    paid_amount: float | None,
) -> dict[str, Any]:
    company = await get_company_by_id(session, context["tenant_id"], company_id)
    if not company:
        raise DomainError(
            "Sirket kaydi bulunamadi.",
            "COMPANY_NOT_FOUND",
            status.HTTP_404_NOT_FOUND,
        )
    paid_capital = number_value(company.get("paid_capital_amount"))
    next_paid_capital = paid_capital + number_value(paid_amount) if paid_amount else paid_capital
    field_history = dict(company.get("field_history") or {})
    field_history.setdefault("committed_capital_amount", []).append(
        {
            "old_value": old_capital,
            "new_value": new_capital,
            "source": "fastapi_capital_increase",
            "changed_by": context.get("user_id"),
        }
    )
    result = await session.execute(
        text(
            """
            update public.companies
            set committed_capital_amount = :new_capital,
                paid_capital_amount = :paid_capital,
                field_history = cast(:field_history as jsonb),
                updated_at = now(),
                updated_by = :user_id,
                version = coalesce(version, 0) + 1
            where tenant_id = :tenant_id
              and id = :company_id
              and coalesce(is_deleted, false) = false
            returning *
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "company_id": company_id,
            "new_capital": new_capital,
            "paid_capital": next_paid_capital,
            "field_history": json.dumps(field_history, ensure_ascii=False, default=str),
            "user_id": context.get("user_id"),
        },
    )
    updated = result.mappings().one_or_none()
    if not updated:
        raise DomainError(
            "Sirket sermaye bilgisi guncellenemedi.",
            "COMPANY_CAPITAL_UPDATE_FAILED",
            status.HTTP_409_CONFLICT,
        )
    return dict(updated)


async def _next_capital_increase_no(session: AsyncSession) -> str:
    result = await session.execute(
        text(
            """
            select count(*) + 1 as next_no
            from public.company_capital_increase_transactions
            """
        )
    )
    next_no = int(result.mappings().one()["next_no"] or 1)
    return f"SA-{next_no:05d}"


async def insert_capital_increase_transaction(
    session: AsyncSession,
    context: dict[str, Any],
    *,
    company_id: str,
    operation_id: str | None,
    request: CapitalIncreaseRequest,
    transaction_no: str,
    previous_ownership: list[dict[str, Any]],
    distribution_rows: list[CapitalIncreaseDistributionRow],
    ownership_transaction_ids: list[str],
    document_files: list[dict[str, Any]],
    warnings: list[str],
) -> dict[str, Any]:
    if not await table_exists(session, "public.company_capital_increase_transactions"):
        raise DomainError(
            "Sermaye Artirimi kayit altyapisi hazir degil.",
            "CAPITAL_INFRASTRUCTURE_MISSING",
            status.HTTP_409_CONFLICT,
        )
    transaction_id = str(uuid4())
    result = await session.execute(
        text(
            """
            insert into public.company_capital_increase_transactions (
              id, tenant_id, company_id, operation_id, transaction_no,
              increase_type, transaction_date, effective_date, currency,
              increase_reason, distribution_method, current_capital_amount,
              increase_amount, new_capital_amount, paid_capital_amount,
              participants, previous_ownership, new_ownership, ownership_transaction_ids,
              document_files, status, notes, warnings, history, completed_at,
              created_by, updated_by
            )
            values (
              :id, :tenant_id, :company_id, :operation_id, :transaction_no,
              :increase_type, :transaction_date, :effective_date, :currency,
              :increase_reason, :distribution_method, :current_capital_amount,
              :increase_amount, :new_capital_amount, :paid_capital_amount,
              cast(:participants as jsonb), cast(:previous_ownership as jsonb),
              cast(:new_ownership as jsonb), cast(:ownership_transaction_ids as jsonb),
              cast(:document_files as jsonb), 'completed', :notes,
              cast(:warnings as jsonb), cast(:history as jsonb), now(),
              :user_id, :user_id
            )
            returning *
            """
        ),
        {
            "id": transaction_id,
            "tenant_id": context["tenant_id"],
            "company_id": company_id,
            "operation_id": operation_id,
            "transaction_no": transaction_no,
            "increase_type": request.increase_type or "Sermaye Artirimi",
            "transaction_date": request.transaction_date,
            "effective_date": (
                request.effective_date or request.registration_date or request.transaction_date
            ),
            "currency": request.currency,
            "increase_reason": request.increase_reason,
            "distribution_method": request.distribution_mode,
            "current_capital_amount": request.old_capital_amount,
            "increase_amount": request.increase_amount,
            "new_capital_amount": request.new_capital_amount,
            "paid_capital_amount": request.paid_amount or 0,
            "participants": json.dumps(
                [row.model_dump(mode="json") for row in distribution_rows],
                ensure_ascii=False,
                default=str,
            ),
            "previous_ownership": json.dumps(previous_ownership, ensure_ascii=False, default=str),
            "new_ownership": json.dumps(
                [row.model_dump(mode="json") for row in distribution_rows],
                ensure_ascii=False,
                default=str,
            ),
            "ownership_transaction_ids": json.dumps(ownership_transaction_ids, ensure_ascii=False),
            "document_files": json.dumps(document_files, ensure_ascii=False, default=str),
            "notes": request.notes,
            "warnings": json.dumps(warnings, ensure_ascii=False, default=str),
            "history": json.dumps(
                [{"action": "Sermaye Artirimi tamamlandi"}], ensure_ascii=False, default=str
            ),
            "user_id": context.get("user_id"),
        },
    )
    return dict(result.mappings().one())


async def _update_capital_transaction_ownership_ids(
    session: AsyncSession,
    transaction_id: str,
    ownership_transaction_ids: list[str],
) -> None:
    await session.execute(
        text(
            """
            update public.company_capital_increase_transactions
            set ownership_transaction_ids = cast(:ownership_transaction_ids as jsonb)
            where id = :transaction_id
            """
        ),
        {
            "transaction_id": transaction_id,
            "ownership_transaction_ids": json.dumps(ownership_transaction_ids, ensure_ascii=False),
        },
    )


def _manual_distribution_rows(
    request: CapitalIncreaseRequest,
    current_ownership: list[CurrentOwnershipRow],
) -> list[CapitalIncreaseDistributionRow]:
    current_by_partner = {row.partner_id: row for row in current_ownership}
    rows: list[CapitalIncreaseDistributionRow] = []
    for row in request.distribution_rows:
        current = current_by_partner.get(row.partner_id)
        rows.append(
            CapitalIncreaseDistributionRow(
                partner_id=row.partner_id,
                display_name=row.display_name or (current.display_name if current else None),
                previous_share_ratio=row.previous_share_ratio
                or (current.current_share_ratio if current else 0),
                previous_capital_amount=row.previous_capital_amount
                or (current.current_capital_amount if current else 0),
                increase_amount=row.increase_amount,
                new_capital_amount=row.new_capital_amount,
                new_share_ratio=row.new_share_ratio,
                new_voting_ratio=row.new_voting_ratio or row.new_share_ratio,
                new_profit_ratio=row.new_profit_ratio or row.new_share_ratio,
                notes=row.notes,
                capital_source=row.capital_source,
            )
        )
    return rows


async def complete_capital_increase(
    session: AsyncSession,
    context: dict[str, Any],
    company_id: str,
    request: CapitalIncreaseRequest,
) -> dict[str, Any]:
    warnings: list[str] = []
    try:
        async with session.begin():
            company = await get_company_by_id(session, context["tenant_id"], company_id)
            _company_active_for_capital(company)
            if not company:
                raise DomainError(
                    "Sirket kaydi bulunamadi.", "COMPANY_NOT_FOUND", status.HTTP_404_NOT_FOUND
                )
            detect_company_version_conflict(company, request.base_version, request.base_updated_at)
            operation, operation_warnings = await create_or_get_operation_request(
                session,
                context,
                operation_type="company.capital_increase",
                client_request_id=request.client_request_id,
                payload=request.model_dump(mode="json"),
                entity_type="company",
                entity_id=company_id,
                module_key="companies",
            )
            duplicate = duplicate_operation_response(operation) if operation else None
            if duplicate:
                return duplicate
            if operation:
                context["operation_id"] = str(operation["id"])
            warnings.extend(operation_warnings)

            precheck = await build_capital_increase_precheck(session, context, company_id)
            if not precheck["ok"]:
                raise DomainError(
                    precheck["message"],
                    precheck.get("dependency_code") or "CAPITAL_INCREASE_PRECHECK_FAILED",
                    status.HTTP_409_CONFLICT,
                    {
                        "blocking_reasons": precheck["blocking_reasons"],
                        "warnings": precheck["warnings"],
                    },
                )
            current_ownership = await get_current_ownership_for_company(
                session, context["tenant_id"], company_id
            )
            warnings.extend(validate_capital_increase_request(company, current_ownership, request))
            previous_ownership = [row.model_dump(mode="json") for row in current_ownership]
            if request.distribution_mode == "proportional":
                distribution_rows = build_proportional_capital_distribution(
                    current_ownership,
                    request.increase_amount,
                    request.new_capital_amount,
                )
            else:
                distribution_rows = _manual_distribution_rows(request, current_ownership)
                summary = validate_manual_capital_distribution(
                    distribution_rows,
                    request.old_capital_amount,
                    request.increase_amount,
                    request.new_capital_amount,
                    current_ownership,
                )
                if not summary.ok:
                    raise DomainError(
                        summary.blocking_reasons[0],
                        "CAPITAL_DISTRIBUTION_INVALID",
                        status.HTTP_400_BAD_REQUEST,
                        {"blocking_reasons": summary.blocking_reasons},
                    )

            await update_partner_capital_state(session, context, distribution_rows)
            updated_company = await update_company_capital(
                session,
                context,
                company_id,
                old_capital=request.old_capital_amount,
                new_capital=request.new_capital_amount,
                paid_amount=request.paid_amount,
            )
            document_files = normalize_documents(request.document_files, request.document_meta)
            transaction_no = await _next_capital_increase_no(session)
            capital_transaction = await insert_capital_increase_transaction(
                session,
                context,
                company_id=company_id,
                operation_id=str(operation["id"]) if operation else None,
                request=request,
                transaction_no=transaction_no,
                previous_ownership=previous_ownership,
                distribution_rows=distribution_rows,
                ownership_transaction_ids=[],
                document_files=document_files,
                warnings=warnings,
            )
            ownership_transactions = await insert_capital_increase_ownership_transactions(
                session,
                context,
                company_id=company_id,
                capital_transaction_id=str(capital_transaction["id"]),
                transaction_no=transaction_no,
                transaction_date=request.transaction_date,
                effective_date=request.effective_date or request.registration_date,
                currency=request.currency,
                distribution_rows=distribution_rows,
                document_files=document_files,
                warnings=warnings,
                notes=request.notes,
            )
            ownership_ids = [str(row["id"]) for row in ownership_transactions]
            await _update_capital_transaction_ownership_ids(
                session, str(capital_transaction["id"]), ownership_ids
            )
            await insert_company_lifecycle_event(
                session,
                context,
                company_id=company_id,
                event_type="company_capital_increase_completed",
                event_date=(
                    request.effective_date or request.registration_date or request.transaction_date
                ),
                payload={
                    "capital_increase_transaction_id": capital_transaction["id"],
                    "ownership_transaction_ids": ownership_ids,
                    "old_capital_amount": request.old_capital_amount,
                    "increase_amount": request.increase_amount,
                    "new_capital_amount": request.new_capital_amount,
                },
            )
            await enqueue_outbox_event_best_effort(
                session,
                context,
                event_type="company.capital_increased",
                aggregate_type="company",
                aggregate_id=company_id,
                payload={
                    "company_id": company_id,
                    "transaction_id": capital_transaction["id"],
                    "ownership_transaction_ids": ownership_ids,
                    "old_capital_amount": request.old_capital_amount,
                    "increase_amount": request.increase_amount,
                    "new_capital_amount": request.new_capital_amount,
                },
            )
            await enqueue_outbox_event_best_effort(
                session,
                context,
                event_type="ownership.transaction_completed",
                aggregate_type="ownership_transaction",
                aggregate_id=ownership_ids[0] if ownership_ids else str(capital_transaction["id"]),
                payload={"company_id": company_id, "ownership_transaction_ids": ownership_ids},
            )
            next_ownership = [
                row.model_dump(mode="json")
                for row in await get_current_ownership_for_company(
                    session, context["tenant_id"], company_id
                )
            ]
            data = {
                "company": updated_company,
                "transaction": capital_transaction,
                "ownership_transactions": ownership_transactions,
                "current_ownership": next_ownership,
                "old_capital_amount": request.old_capital_amount,
                "increase_amount": request.increase_amount,
                "new_capital_amount": request.new_capital_amount,
                "warnings": warnings,
            }
            await mark_operation_completed(session, operation, data, warnings)
            await record_audit_best_effort(
                session,
                context,
                action_type="operation_complete",
                action_key="capital_increase",
                summary="Sermaye Artirimi tamamlandi.",
                entity_type="company",
                entity_id=company_id,
                old_values={"committed_capital_amount": request.old_capital_amount},
                new_values={"committed_capital_amount": request.new_capital_amount},
                metadata={
                    "transaction_id": capital_transaction["id"],
                    "ownership_transaction_ids": ownership_ids,
                },
            )
            return {
                "data": data,
                "operation_id": str(operation["id"]) if operation else None,
                "operation_status": "completed",
                "warnings": warnings,
                "message": "Sermaye Artirimi tamamlandi.",
            }
    except Exception as error:
        raise map_database_error(
            error,
            fallback_code="CAPITAL_INCREASE_FAILED",
            fallback_message="Sermaye Artirimi tamamlanamadi.",
        ) from error


async def build_capital_increase_precheck_for_request(
    session: AsyncSession,
    *,
    tenant_id: str,
    user_id: str | None,
    company_id: str,
) -> dict[str, Any]:
    return await build_capital_increase_precheck(
        session,
        _context(tenant_id, user_id, company_id),
        company_id,
    )


async def complete_capital_increase_for_request(
    session: AsyncSession,
    *,
    tenant_id: str,
    user_id: str | None,
    company_id: str,
    request: CapitalIncreaseRequest,
) -> dict[str, Any]:
    return await complete_capital_increase(
        session,
        _context(tenant_id, user_id, company_id),
        company_id,
        request,
    )
