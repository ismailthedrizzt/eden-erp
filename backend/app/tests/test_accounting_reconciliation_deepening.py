from __future__ import annotations

from datetime import date
from decimal import Decimal

from app.domains.accounting.matching import build_match_score
from app.domains.accounting.schemas import (
    BankAccountCreateRequest,
    BankTransactionCreateRequest,
    EDocumentCreateRequest,
    ReconciliationMatchRequest,
)
from app.domains.accounting.service import mask_financial_identifier
from app.policies.permissions import permission_exists, resolve_permission_with_fallback
from app.setup.readiness_registry import get_readiness_definition


def test_bank_account_schema_masks_and_normalizes_currency() -> None:
    account = BankAccountCreateRequest(
        company_id="00000000-0000-0000-0000-000000000001",
        bank_name="Demo Bank",
        account_name="Ana hesap",
        iban="tr00 0000 0000 0000 0000 0000 01",
        currency="try",
    )

    assert account.currency == "TRY"
    assert account.iban == "TR000000000000000000000001"
    assert mask_financial_identifier(account.iban) == "**********************0001"


def test_bank_transaction_schema_defaults_local_amount() -> None:
    transaction = BankTransactionCreateRequest(
        company_id="00000000-0000-0000-0000-000000000001",
        bank_account_id="00000000-0000-0000-0000-000000000002",
        transaction_date=date(2026, 5, 29),
        description="ABC Musteri tahsilati",
        amount=Decimal("10000"),
        direction="credit",
    )

    assert transaction.currency == "TRY"
    assert transaction.local_amount == Decimal("10000")


def test_e_document_schema_defaults_payable_amount() -> None:
    document = EDocumentCreateRequest(
        company_id="00000000-0000-0000-0000-000000000001",
        invoice_no="EAR202600001",
        issue_date=date(2026, 5, 29),
        total_amount=Decimal("1000"),
        tax_amount=Decimal("200"),
    )

    assert document.document_kind == "e_invoice"
    assert document.payable_amount == Decimal("1000")


def test_matching_score_uses_amount_invoice_tax_and_date() -> None:
    source = {
        "amount": Decimal("5900"),
        "transaction_date": date(2026, 5, 29),
        "counterparty_name": "ABC Tedarik A.S.",
        "sender_tax_number": "1234567890",
        "invoice_no": "EAR202600001",
    }
    target = {
        "amount": Decimal("5900"),
        "document_date": date(2026, 5, 29),
        "account_name": "ABC Tedarik AS",
        "tax_number": "1234567890",
        "document_no": "EAR202600001",
    }

    score, reasons = build_match_score(source, target)

    assert score >= Decimal("90")
    assert {reason["key"] for reason in reasons}.issuperset(
        {"amount_exact", "invoice_no", "tax_number"}
    )


def test_reconciliation_match_request_normalizes_currency() -> None:
    request = ReconciliationMatchRequest(
        company_id="00000000-0000-0000-0000-000000000001",
        source_type="bank_transaction",
        source_id="00000000-0000-0000-0000-000000000002",
        target_type="cari_transaction",
        target_id="00000000-0000-0000-0000-000000000003",
        currency="try",
    )

    assert request.currency == "TRY"


def test_accounting_deepening_permissions_and_readiness_are_registered() -> None:
    assert permission_exists("accounting.reconciliationManage")
    assert "accounting.reconcile" in resolve_permission_with_fallback(
        "accounting.reconciliationManage"
    )
    definition = get_readiness_definition("accounting")

    assert definition is not None
    assert "accounting_bank_transactions" in definition.optional_tables
    assert "accounting_e_documents" in definition.optional_tables
