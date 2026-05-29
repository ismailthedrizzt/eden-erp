from __future__ import annotations

from typing import Any

CARI_ACCOUNTS: list[dict[str, Any]] = [
    {
        "key": "cari_glass_customer",
        "company_key": "eden_tech",
        "account_code": "120.0001",
        "account_name": "GlassTech Uretim A.S.",
        "account_type": "customer",
        "cari_role": "customer",
        "tax_number": "9990002002",
        "city": "Ankara",
        "current_balance": 250000,
        "scenario_key": "linked_customer_cari",
    },
    {
        "key": "cari_supplier_misc",
        "company_key": "eden_tech",
        "account_code": "320.0001",
        "account_name": "Muhtelif Tedarikciler",
        "account_type": "supplier",
        "cari_role": "supplier",
        "tax_number": None,
        "city": "Ankara",
        "current_balance": -18500,
        "scenario_key": "misc_supplier",
    },
    {
        "key": "cari_setup_vendor",
        "company_key": "quattro",
        "account_code": "320.0101",
        "account_name": "Kurulus Giderleri Tedarikcisi",
        "account_type": "supplier",
        "cari_role": "supplier",
        "tax_number": "9990010101",
        "city": "Ankara",
        "current_balance": -7200,
        "scenario_key": "company_opening_expense",
    },
]

CARI_TRANSACTIONS: list[dict[str, Any]] = [
    {
        "key": "missing_document_expense",
        "company_key": "eden_tech",
        "account_key": "cari_supplier_misc",
        "transaction_type": "expense",
        "direction": "credit",
        "amount": 18500,
        "description": "Belge aranacak kurulum gideri",
        "document_status": "document_required",
        "document_no": None,
        "category": "startup_expense",
        "reconciliation_status": "unmatched",
        "status": "draft",
        "scenario_key": "missing_accounting_document",
    },
    {
        "key": "customer_balance_invoice",
        "company_key": "eden_tech",
        "account_key": "cari_glass_customer",
        "transaction_type": "invoice",
        "direction": "debit",
        "amount": 250000,
        "description": "PlaneGuard kurulum faturasi demo",
        "document_status": "documented",
        "document_no": "EDN-2026-0001",
        "category": "sales",
        "reconciliation_status": "unmatched",
        "status": "confirmed",
        "scenario_key": "customer_balance",
    },
]

