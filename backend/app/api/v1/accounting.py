from __future__ import annotations

from datetime import date
import json
from decimal import Decimal
from pathlib import Path
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.errors import DomainError, domain_error_to_http
from app.core.security import RequestContext, has_permission, require_access_context, require_tenant
from app.domains.accounting.bank_accounts import (
    create_bank_account,
    delete_bank_account,
    get_bank_account,
    list_bank_accounts,
    update_bank_account,
)
from app.domains.accounting.bank_transactions import (
    create_bank_transaction,
    get_bank_transaction,
    ignore_bank_transaction,
    import_bank_transactions,
    list_bank_transactions,
    match_bank_transaction,
    update_bank_transaction,
)
from app.domains.accounting.capital_reconciliation import (
    get_capital_reconciliation,
    list_capital_reconciliation,
    match_capital_payment,
)
from app.domains.accounting.card_transactions import (
    create_card_transaction,
    list_card_transactions,
)
from app.domains.accounting.cari_accounts import (
    create_cari_account,
    delete_cari_account,
    get_cari_account,
    list_cari_accounts,
    update_cari_account,
)
from app.domains.accounting.cari_transactions import (
    create_cari_transaction,
    delete_cari_transaction,
    get_cari_account_summary,
    get_cari_transaction,
    get_company_accounting_summary,
    list_cari_transactions,
    update_cari_transaction,
)
from app.domains.accounting.e_documents import (
    create_e_document,
    get_e_document,
    import_e_documents,
    list_e_documents,
    match_e_document,
    reject_e_document,
    update_e_document,
)
from app.domains.accounting.reconciliation import (
    get_reconciliation_summary,
    list_reconciliation_suggestions,
    list_unmatched_reconciliation,
    match_reconciliation_records,
    unmatch_reconciliation_records,
)
from app.domains.accounting.schemas import (
    BankAccountCreateRequest,
    BankAccountListQuery,
    BankAccountUpdateRequest,
    BankTransactionCreateRequest,
    BankTransactionImportRequest,
    BankTransactionListQuery,
    BankTransactionUpdateRequest,
    CapitalPaymentMatchRequest,
    CardTransactionCreateRequest,
    CariAccountCreateRequest,
    CariAccountListQuery,
    CariAccountUpdateRequest,
    CariTransactionCreateRequest,
    CariTransactionListQuery,
    CariTransactionUpdateRequest,
    EDocumentCreateRequest,
    EDocumentImportRequest,
    EDocumentListQuery,
    EDocumentUpdateRequest,
    ReconciliationMatchRequest,
    ReconciliationSuggestionQuery,
    ReconciliationUnmatchRequest,
)
from app.schemas.common import ApiSuccess

router = APIRouter(dependencies=[Depends(require_access_context)])
RequestContextDep = Annotated[RequestContext, Depends(require_access_context)]
SessionDep = Annotated[AsyncSession, Depends(get_session)]
DateFromQuery = Annotated[date | None, Query(alias="dateFrom")]
DateToQuery = Annotated[date | None, Query(alias="dateTo")]


def _clean_iban(value: Any) -> str:
    return "".join(char for char in str(value or "").upper() if char.isalnum())


def _is_valid_iban_mod97(iban: str) -> bool:
    rearranged = f"{iban[4:]}{iban[:4]}"
    remainder = 0
    for char in rearranged:
        value = str(ord(char) - 55) if char.isalpha() else char
        for digit in value:
            if not digit.isdigit():
                return False
            remainder = (remainder * 10 + int(digit)) % 97
    return remainder == 1


def _load_turkish_iban_banks() -> dict[str, Any]:
    data_path = Path(__file__).resolve().parents[4] / "lib" / "data" / "turkish-bank-codes.json"
    if not data_path.exists():
        return {}
    with data_path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    banks = data.get("banks")
    return banks if isinstance(banks, dict) else {}


def _resolve_turkish_iban(value: Any) -> dict[str, Any] | None:
    clean = _clean_iban(value)
    if len(clean) != 26 or not clean.startswith("TR"):
        return None
    if not clean[2:9].isdigit():
        return None
    if not _is_valid_iban_mod97(clean):
        return None
    bank_code = clean[4:9]
    banks = _load_turkish_iban_banks()
    bank = banks.get(bank_code) or {}
    return {
        "iban": clean,
        "country_code": "TR",
        "check_digits": clean[2:4],
        "bank_code": bank_code,
        "bank_name": bank.get("name") or "Bilinmeyen Banka",
        "swift_bic": bank.get("swift"),
        "account_number": clean[10:26],
        "reserved_field": clean[9:10],
        "bank_country": "Türkiye",
        "account_country": "Türkiye",
        "account_currency": "TRY",
        "preferred_currency": "TRY",
    }


@router.get("/cari-accounts", response_model=ApiSuccess[dict[str, Any]])
async def list_accounts(
    session: SessionDep,
    context: RequestContextDep,
    company_id: str | None = Query(default=None),
    cari_role: str | None = Query(default=None),
    record_status: str | None = Query(default=None),
    balance_status: str | None = Query(default=None),
    city: str | None = Query(default=None),
    search: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, alias="pageSize", ge=1, le=200),
    sort: str = Query(default="account_name"),
    direction: str = Query(default="asc"),
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "accounting.view")
    tenant_id = require_tenant(context)
    try:
        result = await list_cari_accounts(
            session,
            service_context(context, tenant_id),
            CariAccountListQuery(
                company_id=company_id,
                cari_role=cari_role,
                record_status=record_status,
                balance_status=balance_status,
                city=city,
                search=search,
                page=page,
                page_size=page_size,
                sort=sort,
                direction=direction,
            ),
        )
        return ApiSuccess(data={"data": result.data, "meta": result.meta})
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/cari-accounts", response_model=ApiSuccess[dict[str, Any]], status_code=201)
async def create_account(
    request: CariAccountCreateRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "accounting.edit")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            account = await create_cari_account(
                session,
                service_context(context, tenant_id),
                request,
            )
        return ApiSuccess(data=account, message="Cari kart olusturuldu.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/cari-accounts/{account_id}", response_model=ApiSuccess[dict[str, Any]])
async def get_account(
    account_id: str,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "accounting.view")
    tenant_id = require_tenant(context)
    try:
        account = await get_cari_account(session, tenant_id, account_id)
        if not account:
            raise DomainError("Cari kart bulunamadi.", "CARI_ACCOUNT_NOT_FOUND", 404)
        return ApiSuccess(data=account)
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.patch("/cari-accounts/{account_id}", response_model=ApiSuccess[dict[str, Any]])
async def update_account(
    account_id: str,
    payload: CariAccountUpdateRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "accounting.edit")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            account = await update_cari_account(
                session,
                service_context(context, tenant_id),
                account_id,
                payload,
            )
        return ApiSuccess(data=account, message="Cari kart guncellendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.delete("/cari-accounts/{account_id}", response_model=ApiSuccess[dict[str, Any]])
async def delete_account(
    account_id: str,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "accounting.edit")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            result = await delete_cari_account(
                session,
                service_context(context, tenant_id),
                account_id,
            )
        return ApiSuccess(data=result, message=result.get("message"))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/cari-accounts/{account_id}/summary", response_model=ApiSuccess[dict[str, Any]])
async def get_account_summary(
    account_id: str,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "accounting.view")
    tenant_id = require_tenant(context)
    try:
        summary = await get_cari_account_summary(
            session,
            service_context(context, tenant_id),
            account_id,
        )
        return ApiSuccess(data=summary.model_dump())
    except DomainError as error:
        raise domain_error_to_http(error) from error



@router.post("/entity-bank-accounts/parse-iban", response_model=ApiSuccess[dict[str, Any]])
async def parse_entity_bank_account_iban(
    payload: dict[str, Any],
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    require_tenant(context)
    details = _resolve_turkish_iban(payload.get("iban"))
    if not details:
        return ApiSuccess(data={"values": {}, "valid": False}, message="IBAN çözümlenemedi.")

    values = {
        "iban": details["iban"],
        "bank_name": details["bank_name"],
        "bank_code": details["bank_code"],
        "account_number": details["account_number"],
        "swift_bic": details.get("swift_bic") or "",
        "bank_country": details["bank_country"],
        "account_country": details["account_country"],
        "account_currency": details["account_currency"],
        "preferred_currency": details["preferred_currency"],
    }
    return ApiSuccess(data={"values": values, "details": details, "valid": True}, message="IBAN çözümlendi.")


@router.get("/company/{company_id}/summary", response_model=ApiSuccess[dict[str, Any]])
async def get_company_summary(
    company_id: str,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "accounting.view")
    tenant_id = require_tenant(context)
    try:
        summary = await get_company_accounting_summary(
            session,
            service_context(context, tenant_id),
            company_id,
        )
        return ApiSuccess(data=summary.model_dump())
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/bank-accounts", response_model=ApiSuccess[dict[str, Any]])
async def list_bank_account_records(
    session: SessionDep,
    context: RequestContextDep,
    company_id: str | None = Query(default=None),
    account_type: str | None = Query(default=None),
    is_active: bool | None = Query(default=None),
    currency: str | None = Query(default=None),
    integration_status: str | None = Query(default=None),
    search: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, alias="pageSize", ge=1, le=200),
    sort: str = Query(default="bank_name"),
    direction: str = Query(default="asc"),
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "accounting.bankAccountsView")
    tenant_id = require_tenant(context)
    try:
        result = await list_bank_accounts(
            session,
            service_context(context, tenant_id),
            BankAccountListQuery(
                company_id=company_id,
                account_type=account_type,
                is_active=is_active,
                currency=currency,
                integration_status=integration_status,
                search=search,
                page=page,
                page_size=page_size,
                sort=sort,
                direction=direction,
            ),
        )
        return ApiSuccess(data={"data": result.data, "meta": result.meta})
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/bank-accounts", response_model=ApiSuccess[dict[str, Any]], status_code=201)
async def create_bank_account_record(
    request: BankAccountCreateRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "accounting.bankAccountsEdit")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            account = await create_bank_account(
                session, service_context(context, tenant_id), request
            )
        return ApiSuccess(data=account, message="Banka hesabi olusturuldu.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/bank-accounts/{account_id}", response_model=ApiSuccess[dict[str, Any]])
async def get_bank_account_record(
    account_id: str,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "accounting.bankAccountsView")
    tenant_id = require_tenant(context)
    try:
        account = await get_bank_account(session, tenant_id, account_id)
        if not account:
            raise DomainError("Banka hesabi bulunamadi.", "BANK_ACCOUNT_NOT_FOUND", 404)
        return ApiSuccess(data=account)
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.patch("/bank-accounts/{account_id}", response_model=ApiSuccess[dict[str, Any]])
async def update_bank_account_record(
    account_id: str,
    payload: BankAccountUpdateRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "accounting.bankAccountsEdit")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            account = await update_bank_account(
                session, service_context(context, tenant_id), account_id, payload
            )
        return ApiSuccess(data=account, message="Banka hesabi guncellendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.delete("/bank-accounts/{account_id}", response_model=ApiSuccess[dict[str, Any]])
async def delete_bank_account_record(
    account_id: str,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "accounting.bankAccountsEdit")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            result = await delete_bank_account(
                session, service_context(context, tenant_id), account_id
            )
        return ApiSuccess(data=result, message=result.get("message"))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/bank-transactions", response_model=ApiSuccess[dict[str, Any]])
async def list_bank_transaction_records(
    session: SessionDep,
    context: RequestContextDep,
    company_id: str | None = Query(default=None),
    bank_account_id: str | None = Query(default=None),
    direction: str | None = Query(default=None),
    reconciliation_status: str | None = Query(default=None),
    imported_from: str | None = Query(default=None),
    date_from: DateFromQuery = None,
    date_to: DateToQuery = None,
    search: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, alias="pageSize", ge=1, le=200),
    sort: str = Query(default="transaction_date"),
    sort_direction: str = Query(default="desc", alias="sortDirection"),
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "accounting.bankTransactionsView")
    tenant_id = require_tenant(context)
    try:
        result = await list_bank_transactions(
            session,
            service_context(context, tenant_id),
            BankTransactionListQuery(
                company_id=company_id,
                bank_account_id=bank_account_id,
                direction=direction,
                reconciliation_status=reconciliation_status,
                imported_from=imported_from,
                date_from=date_from,
                date_to=date_to,
                search=search,
                page=page,
                page_size=page_size,
                sort=sort,
                direction_sort=sort_direction,
            ),
        )
        return ApiSuccess(data={"data": result.data, "meta": result.meta})
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/bank-transactions", response_model=ApiSuccess[dict[str, Any]], status_code=201)
async def create_bank_transaction_record(
    request: BankTransactionCreateRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "accounting.bankTransactionsImport")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            transaction = await create_bank_transaction(
                session, service_context(context, tenant_id), request
            )
        return ApiSuccess(data=transaction, message="Banka hareketi olusturuldu.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/bank-transactions/import", response_model=ApiSuccess[dict[str, Any]])
async def import_bank_transaction_records(
    request: BankTransactionImportRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "accounting.bankTransactionsImport")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            result = await import_bank_transactions(
                session, service_context(context, tenant_id), request
            )
        return ApiSuccess(data=result, message="Banka hareketleri kontrol edildi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/bank-transactions/{transaction_id}", response_model=ApiSuccess[dict[str, Any]])
async def get_bank_transaction_record(
    transaction_id: str,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "accounting.bankTransactionsView")
    tenant_id = require_tenant(context)
    try:
        transaction = await get_bank_transaction(session, tenant_id, transaction_id)
        if not transaction:
            raise DomainError("Banka hareketi bulunamadi.", "BANK_TRANSACTION_NOT_FOUND", 404)
        return ApiSuccess(data=transaction)
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.patch("/bank-transactions/{transaction_id}", response_model=ApiSuccess[dict[str, Any]])
async def update_bank_transaction_record(
    transaction_id: str,
    payload: BankTransactionUpdateRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "accounting.bankTransactionsImport")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            transaction = await update_bank_transaction(
                session, service_context(context, tenant_id), transaction_id, payload
            )
        return ApiSuccess(data=transaction, message="Banka hareketi guncellendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/bank-transactions/{transaction_id}/match", response_model=ApiSuccess[dict[str, Any]])
async def match_bank_transaction_record(
    transaction_id: str,
    payload: ReconciliationMatchRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "accounting.reconciliationManage")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            result = await match_bank_transaction(
                session, service_context(context, tenant_id), transaction_id, payload
            )
        return ApiSuccess(data=result, message="Banka hareketi eslestirildi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post(
    "/bank-transactions/{transaction_id}/ignore", response_model=ApiSuccess[dict[str, Any]]
)
async def ignore_bank_transaction_record(
    transaction_id: str,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "accounting.reconciliationManage")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            result = await ignore_bank_transaction(
                session, service_context(context, tenant_id), transaction_id
            )
        return ApiSuccess(data=result, message="Banka hareketi yok sayildi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/card-transactions", response_model=ApiSuccess[dict[str, Any]])
async def list_card_transaction_records(
    session: SessionDep,
    context: RequestContextDep,
    company_id: str | None = Query(default=None),
    reconciliation_status: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, alias="pageSize", ge=1, le=200),
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "accounting.bankTransactionsView")
    tenant_id = require_tenant(context)
    try:
        result = await list_card_transactions(
            session,
            service_context(context, tenant_id),
            company_id=company_id,
            reconciliation_status=reconciliation_status,
            page=page,
            page_size=page_size,
        )
        return ApiSuccess(data={"data": result.data, "meta": result.meta})
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/card-transactions", response_model=ApiSuccess[dict[str, Any]], status_code=201)
async def create_card_transaction_record(
    request: CardTransactionCreateRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "accounting.bankTransactionsImport")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            transaction = await create_card_transaction(
                session, service_context(context, tenant_id), request
            )
        return ApiSuccess(data=transaction, message="Kredi karti hareketi olusturuldu.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/e-documents", response_model=ApiSuccess[dict[str, Any]])
async def list_e_document_records(
    session: SessionDep,
    context: RequestContextDep,
    company_id: str | None = Query(default=None),
    document_kind: str | None = Query(default=None),
    direction: str | None = Query(default=None),
    status_value: str | None = Query(default=None, alias="status"),
    reconciliation_status: str | None = Query(default=None),
    related_cari_account_id: str | None = Query(default=None),
    date_from: DateFromQuery = None,
    date_to: DateToQuery = None,
    search: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, alias="pageSize", ge=1, le=200),
    sort: str = Query(default="issue_date"),
    sort_direction: str = Query(default="desc", alias="sortDirection"),
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "accounting.eDocumentsView")
    tenant_id = require_tenant(context)
    try:
        result = await list_e_documents(
            session,
            service_context(context, tenant_id),
            EDocumentListQuery(
                company_id=company_id,
                document_kind=document_kind,
                direction=direction,
                status=status_value,
                reconciliation_status=reconciliation_status,
                related_cari_account_id=related_cari_account_id,
                date_from=date_from,
                date_to=date_to,
                search=search,
                page=page,
                page_size=page_size,
                sort=sort,
                direction_sort=sort_direction,
            ),
        )
        return ApiSuccess(data={"data": result.data, "meta": result.meta})
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/e-documents", response_model=ApiSuccess[dict[str, Any]], status_code=201)
async def create_e_document_record(
    request: EDocumentCreateRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "accounting.eDocumentsImport")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            document = await create_e_document(
                session, service_context(context, tenant_id), request
            )
        return ApiSuccess(data=document, message="E-belge kaydi olusturuldu.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/e-documents/import", response_model=ApiSuccess[dict[str, Any]])
async def import_e_document_records(
    request: EDocumentImportRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "accounting.eDocumentsImport")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            result = await import_e_documents(session, service_context(context, tenant_id), request)
        return ApiSuccess(data=result, message="E-belge import kontrolu tamamlandi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/e-documents/{document_id}", response_model=ApiSuccess[dict[str, Any]])
async def get_e_document_record(
    document_id: str,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "accounting.eDocumentsView")
    tenant_id = require_tenant(context)
    try:
        document = await get_e_document(session, tenant_id, document_id)
        if not document:
            raise DomainError("E-belge bulunamadi.", "E_DOCUMENT_NOT_FOUND", 404)
        return ApiSuccess(data=document)
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.patch("/e-documents/{document_id}", response_model=ApiSuccess[dict[str, Any]])
async def update_e_document_record(
    document_id: str,
    payload: EDocumentUpdateRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "accounting.eDocumentsImport")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            document = await update_e_document(
                session, service_context(context, tenant_id), document_id, payload
            )
        return ApiSuccess(data=document, message="E-belge guncellendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/e-documents/{document_id}/match", response_model=ApiSuccess[dict[str, Any]])
async def match_e_document_record(
    document_id: str,
    payload: ReconciliationMatchRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "accounting.reconciliationManage")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            result = await match_e_document(
                session, service_context(context, tenant_id), document_id, payload
            )
        return ApiSuccess(data=result, message="E-belge eslestirildi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/e-documents/{document_id}/reject", response_model=ApiSuccess[dict[str, Any]])
async def reject_e_document_record(
    document_id: str,
    session: SessionDep,
    context: RequestContextDep,
    payload: dict[str, Any] | None = None,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "accounting.reconciliationManage")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            result = await reject_e_document(
                session,
                service_context(context, tenant_id),
                document_id,
                (payload or {}).get("reason"),
            )
        return ApiSuccess(data=result, message="E-belge reddedildi ve incelemeye alindi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/reconciliation/suggestions", response_model=ApiSuccess[dict[str, Any]])
async def list_reconciliation_suggestion_records(
    session: SessionDep,
    context: RequestContextDep,
    company_id: str | None = Query(default=None),
    source_type: str | None = Query(default=None),
    target_type: str | None = Query(default=None),
    min_confidence: float = Query(default=50, alias="minConfidence", ge=0, le=100),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, alias="pageSize", ge=1, le=200),
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "accounting.reconciliationView")
    tenant_id = require_tenant(context)
    try:
        result = await list_reconciliation_suggestions(
            session,
            service_context(context, tenant_id),
            ReconciliationSuggestionQuery(
                company_id=company_id,
                source_type=source_type,
                target_type=target_type,
                min_confidence=Decimal(str(min_confidence)),
                page=page,
                page_size=page_size,
            ),
        )
        return ApiSuccess(data={"data": result.data, "meta": result.meta})
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/reconciliation/match", response_model=ApiSuccess[dict[str, Any]])
async def match_reconciliation_record(
    payload: ReconciliationMatchRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "accounting.reconciliationManage")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            result = await match_reconciliation_records(
                session, service_context(context, tenant_id), payload
            )
        return ApiSuccess(data=result, message="Mutabakat eslestirmesi kaydedildi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/reconciliation/unmatch", response_model=ApiSuccess[dict[str, Any]])
async def unmatch_reconciliation_record(
    payload: ReconciliationUnmatchRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "accounting.reconciliationManage")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            result = await unmatch_reconciliation_records(
                session, service_context(context, tenant_id), payload
            )
        return ApiSuccess(data=result, message="Mutabakat eslestirmesi kaldirildi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/reconciliation/unmatched", response_model=ApiSuccess[dict[str, Any]])
async def list_unmatched_reconciliation_records(
    session: SessionDep,
    context: RequestContextDep,
    company_id: str | None = Query(default=None),
    limit: int = Query(default=25, ge=1, le=100),
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "accounting.reconciliationView")
    tenant_id = require_tenant(context)
    try:
        result = await list_unmatched_reconciliation(
            session, service_context(context, tenant_id), company_id=company_id, limit=limit
        )
        return ApiSuccess(data=result)
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/reconciliation/summary", response_model=ApiSuccess[dict[str, Any]])
async def get_reconciliation_summary_record(
    session: SessionDep,
    context: RequestContextDep,
    company_id: str | None = Query(default=None),
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "accounting.reconciliationView")
    tenant_id = require_tenant(context)
    try:
        result = await get_reconciliation_summary(
            session, service_context(context, tenant_id), company_id=company_id
        )
        return ApiSuccess(data=result)
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/capital-reconciliation", response_model=ApiSuccess[dict[str, Any]])
async def list_capital_reconciliation_records(
    session: SessionDep,
    context: RequestContextDep,
    company_id: str | None = Query(default=None),
    status_value: str | None = Query(default=None, alias="status"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, alias="pageSize", ge=1, le=200),
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "accounting.capitalReconciliationView")
    tenant_id = require_tenant(context)
    try:
        result = await list_capital_reconciliation(
            session,
            service_context(context, tenant_id),
            company_id=company_id,
            status_value=status_value,
            page=page,
            page_size=page_size,
        )
        return ApiSuccess(data={"data": result.data, "meta": result.meta})
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get(
    "/capital-reconciliation/{capital_transaction_id}", response_model=ApiSuccess[dict[str, Any]]
)
async def get_capital_reconciliation_record(
    capital_transaction_id: str,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "accounting.capitalReconciliationView")
    tenant_id = require_tenant(context)
    try:
        result = await get_capital_reconciliation(
            session, service_context(context, tenant_id), capital_transaction_id
        )
        return ApiSuccess(data=result)
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post(
    "/capital-reconciliation/{reconciliation_id}/match-payment",
    response_model=ApiSuccess[dict[str, Any]],
)
async def match_capital_reconciliation_payment(
    reconciliation_id: str,
    payload: CapitalPaymentMatchRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "accounting.capitalReconciliationManage")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            result = await match_capital_payment(
                session, service_context(context, tenant_id), reconciliation_id, payload
            )
        return ApiSuccess(data=result, message="Sermaye odemesi mutabakatlandi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/cari-transactions", response_model=ApiSuccess[dict[str, Any]])
async def list_transactions(
    session: SessionDep,
    context: RequestContextDep,
    company_id: str | None = Query(default=None),
    account_id: str | None = Query(default=None),
    transaction_type: str | None = Query(default=None),
    direction: str | None = Query(default=None),
    date_from: DateFromQuery = None,
    date_to: DateToQuery = None,
    document_status: str | None = Query(default=None),
    payment_method: str | None = Query(default=None),
    category: str | None = Query(default=None),
    reconciliation_status: str | None = Query(default=None),
    status_value: str | None = Query(default=None, alias="status"),
    search: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, alias="pageSize", ge=1, le=200),
    sort: str = Query(default="transaction_date"),
    sort_direction: str = Query(default="desc", alias="sortDirection"),
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "accounting.view")
    tenant_id = require_tenant(context)
    try:
        result = await list_cari_transactions(
            session,
            service_context(context, tenant_id),
            CariTransactionListQuery(
                company_id=company_id,
                account_id=account_id,
                transaction_type=transaction_type,
                direction=direction,
                date_from=date_from,
                date_to=date_to,
                document_status=document_status,
                payment_method=payment_method,
                category=category,
                reconciliation_status=reconciliation_status,
                status=status_value,
                search=search,
                page=page,
                page_size=page_size,
                sort=sort,
                direction_sort=sort_direction,
            ),
        )
        return ApiSuccess(data={"data": result.data, "meta": result.meta})
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/cari-transactions", response_model=ApiSuccess[dict[str, Any]], status_code=201)
async def create_transaction(
    request: CariTransactionCreateRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "accounting.transactionCreate")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            transaction = await create_cari_transaction(
                session,
                service_context(context, tenant_id),
                request,
            )
        return ApiSuccess(data=transaction, message="Cari hareket olusturuldu.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/cari-transactions/{transaction_id}", response_model=ApiSuccess[dict[str, Any]])
async def get_transaction(
    transaction_id: str,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "accounting.view")
    tenant_id = require_tenant(context)
    try:
        transaction = await get_cari_transaction(session, tenant_id, transaction_id)
        if not transaction:
            raise DomainError("Cari hareket bulunamadi.", "CARI_TRANSACTION_NOT_FOUND", 404)
        return ApiSuccess(data=transaction)
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.patch("/cari-transactions/{transaction_id}", response_model=ApiSuccess[dict[str, Any]])
async def update_transaction(
    transaction_id: str,
    payload: CariTransactionUpdateRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "accounting.edit")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            transaction = await update_cari_transaction(
                session,
                service_context(context, tenant_id),
                transaction_id,
                payload,
            )
        message = (
            "Cari hareket iptal edildi."
            if transaction.get("status") == "cancelled"
            else "Cari hareket guncellendi."
        )
        return ApiSuccess(data=transaction, message=message)
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.delete("/cari-transactions/{transaction_id}", response_model=ApiSuccess[dict[str, Any]])
async def delete_transaction(
    transaction_id: str,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "accounting.edit")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            result = await delete_cari_transaction(
                session,
                service_context(context, tenant_id),
                transaction_id,
            )
        return ApiSuccess(data=result, message=result.get("message"))
    except DomainError as error:
        raise domain_error_to_http(error) from error


def ensure_permission(context: RequestContext, permission_key: str) -> None:
    if not has_permission(context, permission_key):
        raise DomainError(
            "Bu islem icin yetkiniz bulunmuyor.",
            "PERMISSION_DENIED",
            status.HTTP_403_FORBIDDEN,
        )


def service_context(context: RequestContext, tenant_id: str) -> dict[str, Any]:
    return {
        "tenant_id": tenant_id,
        "user_id": context.user_id,
        "permissions": context.permissions,
        "company_scope_ids": context.company_scope_ids,
        "writable_company_scope_ids": context.writable_company_scope_ids,
    }
