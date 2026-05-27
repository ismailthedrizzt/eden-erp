from __future__ import annotations

import json
from typing import Any
from uuid import uuid4

from fastapi import status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError, map_database_error
from app.domains.audit.service import record_audit_best_effort
from app.domains.company.service import assert_company_active, get_company_by_id
from app.domains.operations.service import (
    create_or_get_operation_request,
    duplicate_operation_response,
    mark_operation_completed,
    table_exists,
)
from app.domains.outbox.service import enqueue_outbox_event_best_effort
from app.domains.ownership.current import (
    build_current_ownership_snapshot,
    get_current_ownership_for_company,
    ownership_row_by_partner,
    total_share_ratio,
    validate_current_ownership_distribution,
)
from app.domains.ownership.schemas import (
    CapitalIncreaseDistributionRow,
    CurrentOwnershipRow,
    OwnershipTransactionRequest,
)
from app.domains.ownership.service import number_value, ownership_transaction_payload, round_money
from app.domains.partners.service import (
    activate_partner_card,
    assert_partner_belongs_to_company,
    assert_partner_card_status,
    get_partner_by_id,
    is_partner_active,
    set_partner_passive,
)
from app.policies.operation_guards import guard_operation

TRANSACTION_TYPE_LABELS = {
    "initial_partnership_entry": "initial_partnership_entry",
    "share_transfer": "Pay Devri",
    "partial_share_transfer": "Kısmi Pay Devri",
    "ownership_exit": "Ortaklıktan Çıkış",
    "share_ratio_change": "Düzeltme Kaydı",
    "voting_ratio_change": "Oy Hakkı Değişikliği",
    "profit_ratio_change": "Kar Payı Oranı Değişikliği",
    "privilege_change": "İmtiyazlı Pay Tanımı",
    "control_right_change": "İmtiyazlı Pay Tanımı",
    "capital_increase": "capital_increase",
    "correction_entry": "Düzeltme Kaydı",
    "reversal_entry": "Ters Kayıt",
}

RIGHTS_CHANGE_TYPES = {
    "share_ratio_change",
    "voting_ratio_change",
    "profit_ratio_change",
    "privilege_change",
    "control_right_change",
}


def _required_permission(transaction_type: str) -> str:
    if transaction_type == "reversal_entry":
        return "partners.ownershipReverse"
    if transaction_type in RIGHTS_CHANGE_TYPES or transaction_type == "correction_entry":
        return "partners.ownershipUpdate"
    return "partners.ownershipStart"


async def insert_ownership_transaction(
    session: AsyncSession,
    context: dict[str, Any],
    payload: dict[str, Any],
) -> dict[str, Any]:
    if not await table_exists(session, "public.ownership_transactions"):
        raise DomainError(
            "Ortaklik islem altyapisi hazir olmadigi icin Sermaye Artirimi baslatilamaz.",
            "OWNERSHIP_INFRASTRUCTURE_MISSING",
            status.HTTP_409_CONFLICT,
        )

    transaction_id = str(uuid4())
    params = {
        "id": transaction_id,
        "tenant_id": payload.get("tenant_id") or context["tenant_id"],
        "company_id": payload.get("company_id") or context.get("company_id"),
        "transaction_no": payload.get("transaction_no"),
        "transaction_type": payload.get("transaction_type"),
        "transaction_date": payload.get("transaction_date"),
        "effective_date": payload.get("effective_date") or payload.get("transaction_date"),
        "from_partner_id": payload.get("from_partner_id"),
        "to_partner_id": payload.get("to_partner_id"),
        "affected_partner_id": payload.get("affected_partner_id"),
        "share_ratio": payload.get("share_ratio"),
        "voting_ratio": payload.get("voting_ratio"),
        "profit_ratio": payload.get("profit_ratio"),
        "share_units": payload.get("share_units"),
        "nominal_value": payload.get("nominal_value"),
        "capital_amount": payload.get("capital_amount"),
        "transfer_price": payload.get("transfer_price"),
        "currency": payload.get("currency") or "TRY",
        "has_control_right": bool(payload.get("has_control_right") or False),
        "control_type": payload.get("control_type"),
        "has_veto_right": bool(payload.get("has_veto_right") or False),
        "has_board_nomination_right": bool(payload.get("has_board_nomination_right") or False),
        "has_privileged_share": bool(payload.get("has_privileged_share") or False),
        "privilege_type": payload.get("privilege_type"),
        "is_beneficial_owner": bool(payload.get("is_beneficial_owner") or False),
        "beneficial_ratio": payload.get("beneficial_ratio"),
        "committed_capital_amount": payload.get("committed_capital_amount"),
        "new_capital_amount": payload.get("new_capital_amount"),
        "commitment_date": payload.get("commitment_date"),
        "old_voting_ratio": payload.get("old_voting_ratio"),
        "new_voting_ratio": payload.get("new_voting_ratio"),
        "old_profit_ratio": payload.get("old_profit_ratio"),
        "new_profit_ratio": payload.get("new_profit_ratio"),
        "correction_transaction_id": payload.get("correction_transaction_id"),
        "correction_reason": payload.get("correction_reason"),
        "reversal_transaction_id": payload.get("reversal_transaction_id"),
        "reversal_reason": payload.get("reversal_reason"),
        "document_status": payload.get("document_status") or "Belge Yok",
        "document_reference_id": payload.get("document_reference_id"),
        "decision_reference_id": payload.get("decision_reference_id"),
        "status": payload.get("status") or "active",
        "approval_status": payload.get("approval_status") or "approved",
        "workflow_status": payload.get("workflow_status") or "approved",
        "description": payload.get("description"),
        "transaction_reason": payload.get("transaction_reason"),
        "exit_reason": payload.get("exit_reason"),
        "justification": payload.get("justification"),
        "notes": payload.get("notes"),
        "approved_by": payload.get("approved_by") or context.get("user_id"),
        "created_by": payload.get("created_by") or context.get("user_id"),
        "updated_by": payload.get("updated_by") or context.get("user_id"),
        "capital_distribution": json.dumps(
            payload.get("capital_distribution") or [], ensure_ascii=False, default=str
        ),
        "new_values": json.dumps(payload.get("new_values") or {}, ensure_ascii=False, default=str),
        "document_files": json.dumps(
            payload.get("document_files") or [], ensure_ascii=False, default=str
        ),
        "warnings": json.dumps(payload.get("warnings") or [], ensure_ascii=False, default=str),
        "history": json.dumps(payload.get("history") or [], ensure_ascii=False, default=str),
    }
    result = await session.execute(
        text(
            """
            insert into public.ownership_transactions (
              id, tenant_id, company_id, transaction_no, transaction_type, transaction_date,
              effective_date, from_partner_id, to_partner_id, affected_partner_id, share_ratio,
              voting_ratio, profit_ratio, share_units, nominal_value, capital_amount,
              transfer_price, currency, has_control_right, control_type, has_veto_right,
              has_board_nomination_right, has_privileged_share, privilege_type,
              is_beneficial_owner, beneficial_ratio, committed_capital_amount,
              new_capital_amount, commitment_date, old_voting_ratio, new_voting_ratio,
              old_profit_ratio, new_profit_ratio, capital_distribution, correction_transaction_id,
              correction_reason, new_values, reversal_transaction_id, reversal_reason,
              document_status, document_reference_id, decision_reference_id, document_files,
              status, approval_status, workflow_status, description, transaction_reason,
              exit_reason, justification, notes, warnings, history, approved_by,
              approved_at, created_by, updated_by
            )
            values (
              :id, :tenant_id, :company_id, :transaction_no, :transaction_type, :transaction_date,
              :effective_date, :from_partner_id, :to_partner_id, :affected_partner_id,
              :share_ratio, :voting_ratio, :profit_ratio, :share_units, :nominal_value,
              :capital_amount, :transfer_price, :currency, :has_control_right, :control_type,
              :has_veto_right, :has_board_nomination_right, :has_privileged_share,
              :privilege_type, :is_beneficial_owner, :beneficial_ratio,
              :committed_capital_amount, :new_capital_amount, :commitment_date,
              :old_voting_ratio, :new_voting_ratio, :old_profit_ratio, :new_profit_ratio,
              cast(:capital_distribution as jsonb), :correction_transaction_id,
              :correction_reason, cast(:new_values as jsonb), :reversal_transaction_id,
              :reversal_reason, :document_status, :document_reference_id,
              :decision_reference_id, cast(:document_files as jsonb), :status,
              :approval_status, :workflow_status, :description, :transaction_reason,
              :exit_reason, :justification, :notes, cast(:warnings as jsonb),
              cast(:history as jsonb), :approved_by, now(), :created_by, :updated_by
            )
            returning id, transaction_no, transaction_type, from_partner_id, to_partner_id,
              affected_partner_id, share_ratio, capital_amount, approval_status, workflow_status
            """
        ),
        params,
    )
    return dict(result.mappings().one())


async def insert_capital_increase_ownership_transactions(
    session: AsyncSession,
    context: dict[str, Any],
    *,
    company_id: str,
    capital_transaction_id: str | None,
    transaction_no: str,
    transaction_date: str,
    effective_date: str | None,
    currency: str,
    distribution_rows: list[CapitalIncreaseDistributionRow],
    document_files: list[dict[str, Any]],
    warnings: list[str],
    notes: str | None,
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for index, row in enumerate(distribution_rows, start=1):
        payload = ownership_transaction_payload(
            context,
            transaction_no=f"{transaction_no}-OI-{index:02d}",
            company_id=company_id,
            capital_transaction_id=capital_transaction_id,
            transaction_date=transaction_date,
            effective_date=effective_date,
            currency=currency,
            row=row,
            distribution_rows=distribution_rows,
            document_files=document_files,
            warnings=warnings,
            notes=notes,
        )
        rows.append(await insert_ownership_transaction(session, context, payload))
    return rows


async def perform_ownership_transaction(
    session: AsyncSession,
    context: dict[str, Any],
    request: OwnershipTransactionRequest,
) -> dict[str, Any]:
    try:
        if request.transaction_type == "initial_partnership_entry":
            return await initial_partnership_entry(session, context, request)
        if request.transaction_type in {"share_transfer", "partial_share_transfer"}:
            return await share_transfer(session, context, request)
        if request.transaction_type == "ownership_exit":
            return await ownership_exit(session, context, request)
        if request.transaction_type in RIGHTS_CHANGE_TYPES:
            return await rights_change(session, context, request)
        if request.transaction_type == "correction_entry":
            return await correction_entry(session, context, request)
        if request.transaction_type == "reversal_entry":
            return await reversal_entry(session, context, request)
        raise DomainError(
            "Bu ortaklik islem tipi henuz FastAPI tarafinda desteklenmiyor.",
            "OWNERSHIP_TRANSACTION_TYPE_UNSUPPORTED",
            status.HTTP_400_BAD_REQUEST,
            {"transaction_type": request.transaction_type},
        )
    except Exception as error:
        raise map_database_error(
            error,
            fallback_code="OWNERSHIP_TRANSACTION_FAILED",
            fallback_message="Ortaklik islemi tamamlanamadi.",
        ) from error


async def initial_partnership_entry(
    session: AsyncSession,
    context: dict[str, Any],
    request: OwnershipTransactionRequest,
) -> dict[str, Any]:
    async with session.begin():
        company, partner, current_rows, operation, warnings = await _prepare_transaction(
            session, context, request, partner_id=request.partner_id or request.target_partner_id
        )
        assert_partner_card_status(partner, {"draft"})
        share_ratio = _positive_number(
            request.share_ratio_after or request.transferred_share_ratio,
            "SHARE_RATIO_REQUIRED",
            "Ilk ortaklik girisi icin pay orani zorunludur.",
        )
        capital_amount = max(number_value(request.capital_amount_after), 0)
        total_after = total_share_ratio(current_rows) + share_ratio
        if total_after > 100.05:
            raise DomainError(
                "Girilen hisse orani sirket pay dagilimini %100 uzerine cikariyor.",
                "SHARE_DISTRIBUTION_EXCEEDS_100",
                status.HTTP_409_CONFLICT,
                {
                    "current_total": total_share_ratio(current_rows),
                    "requested_share_ratio": share_ratio,
                },
            )
        if total_share_ratio(current_rows) >= 99.99:
            raise DomainError(
                "Sirketin pay dagilimi zaten %100. Yeni ortak girisi icin pay devri "
                "veya sermaye artirimi kullanin.",
                "COMPANY_OWNERSHIP_ALREADY_FULL",
                status.HTTP_409_CONFLICT,
            )
        await validate_no_active_transaction_conflict(
            session, context, request.company_id, [str(partner["id"])]
        )
        transaction = await insert_ownership_transaction(
            session,
            context,
            _transaction_payload(
                context,
                request,
                transaction_type=TRANSACTION_TYPE_LABELS["initial_partnership_entry"],
                affected_partner_id=str(partner["id"]),
                to_partner_id=str(partner["id"]),
                share_ratio=share_ratio,
                voting_ratio=request.voting_ratio_after or share_ratio,
                profit_ratio=request.profit_ratio_after or share_ratio,
                capital_amount=capital_amount,
                share_units=request.share_units_after,
                new_values={
                    "partner_id": str(partner["id"]),
                    "current_share_ratio": share_ratio,
                    "current_voting_ratio": request.voting_ratio_after or share_ratio,
                    "current_profit_ratio": request.profit_ratio_after or share_ratio,
                    "current_capital_amount": capital_amount,
                    "current_share_units": request.share_units_after or 0,
                },
            ),
        )
        partner = await _update_partner_ownership_fields(
            session,
            context,
            str(partner["id"]),
            {
                "share_ratio": share_ratio,
                "voting_ratio": request.voting_ratio_after or share_ratio,
                "profit_ratio": request.profit_ratio_after or share_ratio,
                "capital_amount": capital_amount,
                "share_units": request.share_units_after,
                "share_class": request.share_class,
                "has_control_right": request.has_control_right,
                "control_type": request.control_type,
                "has_veto_right": request.has_veto_right,
                "has_board_nomination_right": request.has_board_nomination_right,
                "has_privileged_share": request.has_privileged_share,
                "is_beneficial_owner": request.is_beneficial_owner,
                "beneficial_ratio": request.beneficial_ratio,
            },
        )
        partner = await activate_partner_card(
            session,
            context,
            str(partner["id"]),
            request.model_dump(mode="json"),
        )
        return await _complete_transaction_response(
            session,
            context,
            request,
            company,
            partner,
            [transaction],
            operation,
            warnings,
            "Ilk Ortaklik Girisi tamamlandi.",
        )


async def share_transfer(
    session: AsyncSession,
    context: dict[str, Any],
    request: OwnershipTransactionRequest,
) -> dict[str, Any]:
    async with session.begin():
        company, _partner, current_rows, operation, warnings = await _prepare_transaction(
            session, context, request, partner_id=request.source_partner_id
        )
        source_partner = await get_partner_by_id(
            session, context["tenant_id"], str(request.source_partner_id or "")
        )
        target_partner = await get_partner_by_id(
            session, context["tenant_id"], str(request.target_partner_id or "")
        )
        assert_partner_belongs_to_company(source_partner, request.company_id)
        assert_partner_belongs_to_company(target_partner, request.company_id)
        assert source_partner is not None
        assert target_partner is not None
        if not is_partner_active(source_partner):
            raise DomainError(
                "Pay devri icin devreden ortak aktif olmalidir.",
                "SOURCE_PARTNER_ACTIVE_REQUIRED",
                status.HTTP_409_CONFLICT,
            )
        share_ratio = _positive_number(
            request.transferred_share_ratio,
            "TRANSFER_SHARE_RATIO_REQUIRED",
            "Pay devri icin devredilen pay orani zorunludur.",
        )
        source_ownership = ownership_row_by_partner(current_rows, str(source_partner["id"]))
        if not source_ownership or source_ownership.current_share_ratio + 0.001 < share_ratio:
            raise DomainError(
                "Devreden ortagin mevcut payi devredilen paydan kucuk olamaz.",
                "INSUFFICIENT_SHARE",
                status.HTTP_409_CONFLICT,
                {
                    "current_share_ratio": (
                        source_ownership.current_share_ratio if source_ownership else 0
                    ),
                    "transferred_share_ratio": share_ratio,
                },
            )
        target_ownership = ownership_row_by_partner(current_rows, str(target_partner["id"]))
        capital_amount = number_value(request.transferred_capital_amount)
        if capital_amount <= 0 and source_ownership.current_share_ratio:
            capital_amount = round_money(
                source_ownership.current_capital_amount
                * share_ratio
                / source_ownership.current_share_ratio
            )
        transaction = await insert_ownership_transaction(
            session,
            context,
            _transaction_payload(
                context,
                request,
                transaction_type=TRANSACTION_TYPE_LABELS[request.transaction_type],
                from_partner_id=str(source_partner["id"]),
                to_partner_id=str(target_partner["id"]),
                share_ratio=share_ratio,
                voting_ratio=request.voting_ratio_after or share_ratio,
                profit_ratio=request.profit_ratio_after or share_ratio,
                capital_amount=capital_amount,
                share_units=request.transferred_share_units,
                transfer_price=getattr(request, "consideration_amount", None),
                new_values={
                    "source_partner_id": str(source_partner["id"]),
                    "target_partner_id": str(target_partner["id"]),
                    "transferred_share_ratio": share_ratio,
                    "target_current_share_ratio": round(
                        (target_ownership.current_share_ratio if target_ownership else 0)
                        + share_ratio,
                        4,
                    ),
                },
            ),
        )
        source_voting_delta = request.voting_ratio_after or share_ratio
        source_profit_delta = request.profit_ratio_after or share_ratio
        await _update_partner_ownership_fields(
            session,
            context,
            str(source_partner["id"]),
            {
                "share_ratio": max(0, source_ownership.current_share_ratio - share_ratio),
                "voting_ratio": max(0, source_ownership.current_voting_ratio - source_voting_delta),
                "profit_ratio": max(0, source_ownership.current_profit_ratio - source_profit_delta),
                "capital_amount": max(0, source_ownership.current_capital_amount - capital_amount),
                "share_units": max(
                    0,
                    source_ownership.current_share_units
                    - number_value(request.transferred_share_units),
                ),
            },
        )
        target_share = target_ownership.current_share_ratio if target_ownership else 0
        target_voting = target_ownership.current_voting_ratio if target_ownership else 0
        target_profit = target_ownership.current_profit_ratio if target_ownership else 0
        target_capital = target_ownership.current_capital_amount if target_ownership else 0
        target_units = target_ownership.current_share_units if target_ownership else 0
        target_partner = await _update_partner_ownership_fields(
            session,
            context,
            str(target_partner["id"]),
            {
                "share_ratio": target_share + share_ratio,
                "voting_ratio": target_voting + source_voting_delta,
                "profit_ratio": target_profit + source_profit_delta,
                "capital_amount": target_capital + capital_amount,
                "share_units": target_units + number_value(request.transferred_share_units),
            },
        )
        if not is_partner_active(target_partner):
            target_partner = await activate_partner_card(
                session,
                context,
                str(target_partner["id"]),
                request.model_dump(mode="json"),
            )
        return await _complete_transaction_response(
            session,
            context,
            request,
            company,
            target_partner,
            [transaction],
            operation,
            warnings,
            "Pay Devri tamamlandi.",
        )


async def ownership_exit(
    session: AsyncSession,
    context: dict[str, Any],
    request: OwnershipTransactionRequest,
) -> dict[str, Any]:
    if request.target_partner_id:
        transfer_request = request.model_copy(
            update={
                "transaction_type": "share_transfer",
                "source_partner_id": request.partner_id or request.source_partner_id,
                "target_partner_id": request.target_partner_id,
            }
        )
        response = await share_transfer(session, context, transfer_request)
        partner_id = str(request.partner_id or request.source_partner_id)
        async with session.begin():
            partner = await set_partner_passive(
                session,
                context,
                partner_id,
                request.model_dump(mode="json"),
            )
            response["data"]["partner"] = partner
            response["message"] = "Ortakliktan Cikis tamamlandi."
        return response

    async with session.begin():
        company, partner, current_rows, operation, warnings = await _prepare_transaction(
            session, context, request, partner_id=request.partner_id or request.source_partner_id
        )
        assert_partner_card_status(partner, {"active"})
        current = ownership_row_by_partner(current_rows, str(partner["id"]))
        if not current or current.current_share_ratio <= 0:
            raise DomainError(
                "Cikis yapilacak ortagin aktif payi bulunmuyor.",
                "PARTNER_ACTIVE_SHARE_REQUIRED",
                status.HTTP_409_CONFLICT,
            )
        if len([row for row in current_rows if row.current_share_ratio > 0.001]) <= 1:
            raise DomainError(
                "Tek ortakli sirkette ortakliktan cikis icin yeni ortak girisi "
                "veya pay devri plani gereklidir.",
                "OWNERLESS_COMPANY_BLOCKED",
                status.HTTP_409_CONFLICT,
            )
        transaction = await insert_ownership_transaction(
            session,
            context,
            _transaction_payload(
                context,
                request,
                transaction_type=TRANSACTION_TYPE_LABELS["ownership_exit"],
                from_partner_id=str(partner["id"]),
                affected_partner_id=str(partner["id"]),
                share_ratio=current.current_share_ratio,
                voting_ratio=current.current_voting_ratio,
                profit_ratio=current.current_profit_ratio,
                capital_amount=current.current_capital_amount,
                share_units=current.current_share_units,
                exit_reason=request.reason,
                new_values={"partner_id": str(partner["id"]), "current_share_ratio": 0},
            ),
        )
        await _update_partner_ownership_fields(
            session,
            context,
            str(partner["id"]),
            {
                "share_ratio": 0,
                "voting_ratio": 0,
                "profit_ratio": 0,
                "capital_amount": 0,
                "share_units": 0,
            },
        )
        partner = await set_partner_passive(
            session,
            context,
            str(partner["id"]),
            request.model_dump(mode="json"),
        )
        return await _complete_transaction_response(
            session,
            context,
            request,
            company,
            partner,
            [transaction],
            operation,
            warnings,
            "Ortakliktan Cikis tamamlandi.",
        )


async def rights_change(
    session: AsyncSession,
    context: dict[str, Any],
    request: OwnershipTransactionRequest,
) -> dict[str, Any]:
    async with session.begin():
        company, partner, current_rows, operation, warnings = await _prepare_transaction(
            session, context, request, partner_id=request.partner_id
        )
        assert_partner_card_status(partner, {"active"})
        current = ownership_row_by_partner(current_rows, str(partner["id"]))
        if not current:
            raise DomainError(
                "Ortagin guncel ortaklik hakki okunamadigi icin islem baslatilamaz.",
                "CURRENT_OWNERSHIP_UNAVAILABLE",
                status.HTTP_409_CONFLICT,
            )
        next_values = _rights_next_values(request, current)
        if not next_values:
            raise DomainError(
                "Degisen ortaklik hakki alani bulunamadi.",
                "NO_CHANGED_FIELDS",
                status.HTTP_400_BAD_REQUEST,
            )
        if "share_ratio" in next_values:
            total_next = (
                total_share_ratio(current_rows)
                - current.current_share_ratio
                + number_value(next_values["share_ratio"])
            )
            if abs(total_next - 100) > 0.05:
                raise DomainError(
                    "Pay orani degisikligi sonrasi toplam hisse %100 olmalidir.",
                    "SHARE_DISTRIBUTION_INVALID",
                    status.HTTP_409_CONFLICT,
                    {"total_share_ratio": total_next},
                )
        transaction = await insert_ownership_transaction(
            session,
            context,
            _transaction_payload(
                context,
                request,
                transaction_type=TRANSACTION_TYPE_LABELS[request.transaction_type],
                affected_partner_id=str(partner["id"]),
                share_ratio=next_values.get("share_ratio", current.current_share_ratio),
                voting_ratio=next_values.get("voting_ratio", current.current_voting_ratio),
                profit_ratio=next_values.get("profit_ratio", current.current_profit_ratio),
                capital_amount=next_values.get("capital_amount", current.current_capital_amount),
                share_units=next_values.get("share_units", current.current_share_units),
                new_voting_ratio=next_values.get("voting_ratio"),
                new_profit_ratio=next_values.get("profit_ratio"),
                new_values={"partner_id": str(partner["id"]), **next_values},
            ),
        )
        partner = await _update_partner_ownership_fields(
            session,
            context,
            str(partner["id"]),
            next_values,
        )
        return await _complete_transaction_response(
            session,
            context,
            request,
            company,
            partner,
            [transaction],
            operation,
            warnings,
            "Ortaklik hakki degisikligi tamamlandi.",
        )


async def correction_entry(
    session: AsyncSession,
    context: dict[str, Any],
    request: OwnershipTransactionRequest,
) -> dict[str, Any]:
    return await rights_change(
        session,
        context,
        request.model_copy(update={"transaction_type": "correction_entry"}),
    )


async def reversal_entry(
    session: AsyncSession,
    context: dict[str, Any],
    request: OwnershipTransactionRequest,
) -> dict[str, Any]:
    async with session.begin():
        company, partner, _current_rows, operation, warnings = await _prepare_transaction(
            session, context, request, partner_id=request.partner_id or request.source_partner_id
        )
        if not request.reversed_transaction_id:
            raise DomainError(
                "Ters kayit icin terslenecek islem secilmelidir.",
                "REVERSAL_TRANSACTION_REQUIRED",
                status.HTTP_400_BAD_REQUEST,
            )
        reversed_transaction = await _load_reversed_transaction(
            session,
            context,
            request.company_id,
            request.reversed_transaction_id,
        )
        if await _is_already_reversed(session, context, request.reversed_transaction_id):
            raise DomainError(
                "Secilen islem daha once ters kayitla kapatilmis.",
                "TRANSACTION_ALREADY_REVERSED",
                status.HTTP_409_CONFLICT,
            )
        transaction = await insert_ownership_transaction(
            session,
            context,
            _transaction_payload(
                context,
                request,
                transaction_type=TRANSACTION_TYPE_LABELS["reversal_entry"],
                affected_partner_id=str(
                    reversed_transaction.get("affected_partner_id")
                    or reversed_transaction.get("to_partner_id")
                    or reversed_transaction.get("from_partner_id")
                    or partner.get("id")
                ),
                reversal_transaction_id=request.reversed_transaction_id,
                reversal_reason=request.reason,
                new_values={
                    "reversed_transaction_id": request.reversed_transaction_id,
                    "partner_id": str(partner["id"]),
                },
            ),
        )
        return await _complete_transaction_response(
            session,
            context,
            request,
            company,
            partner,
            [transaction],
            operation,
            warnings,
            "Ters Kayit tamamlandi.",
            extra_events=["ownership.transaction_reversed"],
        )


async def validate_no_active_transaction_conflict(
    session: AsyncSession,
    context: dict[str, Any],
    company_id: str,
    partner_ids: list[str],
) -> None:
    if not partner_ids or not await table_exists(session, "public.ownership_transactions"):
        return
    result = await session.execute(
        text(
            """
            select id
            from public.ownership_transactions
            where tenant_id = :tenant_id
              and company_id = :company_id
              and coalesce(is_deleted, false) = false
              and approval_status in ('draft', 'pending', 'in_review')
              and (
                affected_partner_id = any(:partner_ids)
                or from_partner_id = any(:partner_ids)
                or to_partner_id = any(:partner_ids)
              )
            limit 1
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "company_id": company_id,
            "partner_ids": partner_ids,
        },
    )
    if result.mappings().one_or_none():
        raise DomainError(
            "Secilen ortak icin acik ortaklik islemi var.",
            "ACTIVE_OWNERSHIP_TRANSACTION_CONFLICT",
            status.HTTP_409_CONFLICT,
        )


async def refresh_or_read_current_ownership(
    session: AsyncSession,
    context: dict[str, Any],
    company_id: str,
) -> list[dict[str, Any]]:
    return await build_current_ownership_snapshot(session, context["tenant_id"], company_id)


async def _prepare_transaction(
    session: AsyncSession,
    context: dict[str, Any],
    request: OwnershipTransactionRequest,
    *,
    partner_id: str | None,
) -> tuple[
    dict[str, Any],
    dict[str, Any],
    list[CurrentOwnershipRow],
    dict[str, Any] | None,
    list[str],
]:
    context["company_id"] = request.company_id
    context["module_key"] = "ownership"
    company = await get_company_by_id(session, context["tenant_id"], request.company_id)
    assert_company_active(company)
    if not company:
        raise DomainError(
            "Sirket kaydi bulunamadi.",
            "COMPANY_NOT_FOUND",
            status.HTTP_404_NOT_FOUND,
        )
    if not partner_id:
        raise DomainError(
            "Ortak secimi zorunludur.",
            "PARTNER_REQUIRED",
            status.HTTP_400_BAD_REQUEST,
        )
    partner = await get_partner_by_id(session, context["tenant_id"], partner_id)
    assert_partner_belongs_to_company(partner, request.company_id)
    assert partner is not None
    guard_warnings = await guard_operation(
        session,
        context,
        operation_key=f"ownership.{request.transaction_type}",
        module_key="partners",
        required_permissions=[_required_permission(request.transaction_type)],
        readiness_modules=["companies", "partners"],
        integrity_operation_key="ownership_transaction",
        resource={
            "company_id": request.company_id,
            "partner_id": partner_id,
            "transaction_type": request.transaction_type,
        },
    )
    operation, operation_warnings = await create_or_get_operation_request(
        session,
        context,
        operation_type=f"ownership.{request.transaction_type}",
        client_request_id=request.client_request_id,
        payload=request.model_dump(mode="json"),
        entity_type="ownership_transaction",
        entity_id=partner_id,
        module_key="ownership",
    )
    duplicate = duplicate_operation_response(operation) if operation else None
    if duplicate:
        raise DomainError(
            duplicate.get("message") or "Bu islem daha once tamamlanmis.",
            "DUPLICATE_OPERATION",
            status.HTTP_409_CONFLICT,
            duplicate,
        )
    if operation:
        context["operation_id"] = str(operation["id"])
    current_rows = await get_current_ownership_for_company(
        session,
        context["tenant_id"],
        request.company_id,
    )
    warnings = [
        *guard_warnings,
        *operation_warnings,
        *validate_current_ownership_distribution(current_rows),
    ]
    return company, partner, current_rows, operation, warnings


def _transaction_payload(
    context: dict[str, Any],
    request: OwnershipTransactionRequest,
    *,
    transaction_type: str,
    from_partner_id: str | None = None,
    to_partner_id: str | None = None,
    affected_partner_id: str | None = None,
    share_ratio: float | None = None,
    voting_ratio: float | None = None,
    profit_ratio: float | None = None,
    capital_amount: float | None = None,
    share_units: float | None = None,
    transfer_price: float | None = None,
    new_voting_ratio: float | None = None,
    new_profit_ratio: float | None = None,
    reversal_transaction_id: str | None = None,
    reversal_reason: str | None = None,
    exit_reason: str | None = None,
    new_values: dict[str, Any] | None = None,
) -> dict[str, Any]:
    transaction_no = f"OI-{request.transaction_date or request.effective_date}-{str(uuid4())[:8]}"
    return {
        "tenant_id": context["tenant_id"],
        "company_id": request.company_id,
        "transaction_no": transaction_no,
        "transaction_type": transaction_type,
        "transaction_date": request.transaction_date,
        "effective_date": request.effective_date,
        "from_partner_id": from_partner_id,
        "to_partner_id": to_partner_id,
        "affected_partner_id": affected_partner_id,
        "share_ratio": share_ratio,
        "voting_ratio": voting_ratio,
        "profit_ratio": profit_ratio,
        "share_units": share_units,
        "capital_amount": capital_amount,
        "committed_capital_amount": capital_amount,
        "transfer_price": transfer_price,
        "currency": "TRY",
        "has_control_right": request.has_control_right,
        "control_type": request.control_type,
        "has_veto_right": request.has_veto_right,
        "has_board_nomination_right": request.has_board_nomination_right,
        "has_privileged_share": request.has_privileged_share,
        "is_beneficial_owner": request.is_beneficial_owner,
        "beneficial_ratio": request.beneficial_ratio,
        "new_voting_ratio": new_voting_ratio,
        "new_profit_ratio": new_profit_ratio,
        "reversal_transaction_id": reversal_transaction_id,
        "reversal_reason": reversal_reason,
        "exit_reason": exit_reason,
        "new_values": new_values or {},
        "document_status": "Belge Eklendi" if request.document_files else "Belge Yok",
        "document_files": request.document_files,
        "status": "active",
        "approval_status": "approved",
        "workflow_status": "approved",
        "description": request.notes,
        "transaction_reason": request.reason,
        "notes": request.notes,
        "warnings": [],
        "history": [{"action": "ownership_transaction_completed"}],
        "created_by": context.get("user_id"),
        "updated_by": context.get("user_id"),
    }


async def _complete_transaction_response(
    session: AsyncSession,
    context: dict[str, Any],
    request: OwnershipTransactionRequest,
    company: dict[str, Any],
    partner: dict[str, Any],
    transactions: list[dict[str, Any]],
    operation: dict[str, Any] | None,
    warnings: list[str],
    message: str,
    *,
    extra_events: list[str] | None = None,
) -> dict[str, Any]:
    current_ownership = await refresh_or_read_current_ownership(
        session,
        context,
        request.company_id,
    )
    data = {
        "transaction": transactions[0],
        "transactions": transactions,
        "partner": partner,
        "company": company,
        "current_ownership": current_ownership,
        "warnings": warnings,
    }
    await mark_operation_completed(session, operation, data, warnings)
    aggregate_id = str(transactions[0]["id"]) if transactions else str(uuid4())
    for event_type in [
        "ownership.transaction_created",
        "ownership.transaction_completed",
        "ownership.current_changed",
        *(extra_events or []),
    ]:
        await enqueue_outbox_event_best_effort(
            session,
            context,
            event_type=event_type,
            aggregate_type="ownership_transaction",
            aggregate_id=aggregate_id,
            payload={
                "company_id": request.company_id,
                "partner_id": partner.get("id"),
                "transaction_ids": [row.get("id") for row in transactions],
                "transaction_type": request.transaction_type,
            },
        )
    await record_audit_best_effort(
        session,
        context,
        action_type="operation_complete",
        action_key=request.transaction_type,
        summary=message,
        entity_type="ownership_transaction",
        entity_id=aggregate_id,
        new_values={
            "transaction_type": request.transaction_type,
            "partner_id": partner.get("id"),
        },
        metadata={"transaction_ids": [row.get("id") for row in transactions]},
    )
    return {
        "data": data,
        "operation_id": str(operation["id"]) if operation else None,
        "operation_status": "completed",
        "warnings": warnings,
        "message": message,
    }


def _positive_number(value: float | None, code: str, message: str) -> float:
    number = number_value(value)
    if number <= 0:
        raise DomainError(message, code, status.HTTP_400_BAD_REQUEST)
    return number


def _rights_next_values(
    request: OwnershipTransactionRequest,
    current: CurrentOwnershipRow,
) -> dict[str, Any]:
    values: dict[str, Any] = {}
    mapping = {
        "share_ratio": request.share_ratio_after,
        "voting_ratio": request.voting_ratio_after,
        "profit_ratio": request.profit_ratio_after,
        "capital_amount": request.capital_amount_after,
        "share_units": request.share_units_after,
        "share_class": request.share_class,
        "has_privileged_share": request.has_privileged_share,
        "has_control_right": request.has_control_right,
        "control_type": request.control_type,
        "has_board_nomination_right": request.has_board_nomination_right,
        "has_veto_right": request.has_veto_right,
        "is_beneficial_owner": request.is_beneficial_owner,
        "beneficial_ratio": request.beneficial_ratio,
    }
    current_values = {
        "share_ratio": current.current_share_ratio,
        "voting_ratio": current.current_voting_ratio,
        "profit_ratio": current.current_profit_ratio,
        "capital_amount": current.current_capital_amount,
        "share_units": current.current_share_units,
        "has_privileged_share": current.has_privileged_share,
        "has_control_right": current.has_control_right,
        "control_type": current.control_type,
        "has_board_nomination_right": current.has_board_nomination_right,
        "has_veto_right": current.has_veto_right,
        "is_beneficial_owner": current.is_beneficial_owner,
        "beneficial_ratio": current.beneficial_ratio,
    }
    for field, value in mapping.items():
        if value is not None and current_values.get(field) != value:
            values[field] = value
    return values


async def _update_partner_ownership_fields(
    session: AsyncSession,
    context: dict[str, Any],
    partner_id: str,
    values: dict[str, Any],
) -> dict[str, Any]:
    patch = {key: value for key, value in values.items() if value is not None}
    if not patch:
        partner = await get_partner_by_id(session, context["tenant_id"], partner_id)
        if not partner:
            raise DomainError(
                "Ortak kaydi bulunamadi.",
                "PARTNER_NOT_FOUND",
                status.HTTP_404_NOT_FOUND,
            )
        return partner
    assignments = [f"{key} = :{key}" for key in patch]
    assignments.extend(["updated_at = now()", "version = coalesce(version, 0) + 1"])
    params = {"tenant_id": context["tenant_id"], "partner_id": partner_id, **patch}
    result = await session.execute(
        text(
            f"""
            update public.company_partners
            set {", ".join(assignments)}
            where tenant_id = :tenant_id
              and id = :partner_id
              and coalesce(is_deleted, false) = false
            returning *
            """
        ),
        params,
    )
    row = result.mappings().one_or_none()
    if not row:
        raise DomainError("Ortak kaydi bulunamadi.", "PARTNER_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    return dict(row)


async def _load_reversed_transaction(
    session: AsyncSession,
    context: dict[str, Any],
    company_id: str,
    transaction_id: str,
) -> dict[str, Any]:
    result = await session.execute(
        text(
            """
            select *
            from public.ownership_transactions
            where tenant_id = :tenant_id
              and company_id = :company_id
              and id = :transaction_id
              and coalesce(is_deleted, false) = false
            limit 1
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "company_id": company_id,
            "transaction_id": transaction_id,
        },
    )
    row = result.mappings().one_or_none()
    if not row:
        raise DomainError(
            "Ters kayit icin secilen ortaklik islemi bulunamadi.",
            "REVERSAL_SOURCE_NOT_FOUND",
            status.HTTP_404_NOT_FOUND,
        )
    return dict(row)


async def _is_already_reversed(
    session: AsyncSession,
    context: dict[str, Any],
    transaction_id: str,
) -> bool:
    result = await session.execute(
        text(
            """
            select id
            from public.ownership_transactions
            where tenant_id = :tenant_id
              and reversal_transaction_id = :transaction_id
              and coalesce(is_deleted, false) = false
            limit 1
            """
        ),
        {"tenant_id": context["tenant_id"], "transaction_id": transaction_id},
    )
    return result.mappings().one_or_none() is not None
