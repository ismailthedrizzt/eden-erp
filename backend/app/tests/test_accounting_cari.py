from __future__ import annotations

from datetime import date
from decimal import Decimal

from app.domains.accounting.cari_transactions import normalize_transaction_payload
from app.domains.accounting.reconciliation import calculate_balance, derive_debit_credit
from app.domains.accounting.schemas import CariAccountCreateRequest, CariTransactionCreateRequest
from app.policies.permissions import permission_exists, resolve_permission_with_fallback


def test_cari_account_schema_supports_miscellaneous_supplier() -> None:
    account = CariAccountCreateRequest(
        company_id="00000000-0000-0000-0000-000000000001",
        account_name="Muhtelif Tedarikciler",
        account_type="miscellaneous",
        cari_role="miscellaneous",
        linked_entity_type="miscellaneous",
        currency="try",
    )

    assert account.currency == "TRY"
    assert account.cari_role == "miscellaneous"


def test_transaction_schema_derives_amount_from_debit() -> None:
    transaction = CariTransactionCreateRequest(
        company_id="00000000-0000-0000-0000-000000000001",
        account_id="00000000-0000-0000-0000-000000000002",
        transaction_date=date(2026, 5, 28),
        transaction_type="expense",
        debit=Decimal("500"),
        description="Kurulus gideri - fotografci",
        payment_method="personal_payment",
        document_status="document_needed",
    )

    assert transaction.direction == "debit"
    assert transaction.amount == Decimal("500")
    assert transaction.local_amount == Decimal("500")


def test_balance_uses_opening_debit_minus_credit() -> None:
    assert calculate_balance(Decimal("100"), Decimal("500"), Decimal("125")) == Decimal("475")


def test_debit_credit_projection_is_derived_from_direction() -> None:
    row = derive_debit_credit({"direction": "credit", "amount": Decimal("250")})

    assert row["debit"] == Decimal("0")
    assert row["credit"] == Decimal("250")


def test_transaction_patch_can_accept_credit_without_amount() -> None:
    patch = normalize_transaction_payload({"credit": Decimal("300"), "exchange_rate": Decimal("1")})

    assert patch["amount"] == Decimal("300")
    assert patch["direction"] == "credit"
    assert patch["local_amount"] == Decimal("300")


def test_accounting_permissions_are_registered_with_fallbacks() -> None:
    assert permission_exists("accounting.transactionCreate")
    assert "accounting.edit" in resolve_permission_with_fallback("accounting.transactionCreate")
