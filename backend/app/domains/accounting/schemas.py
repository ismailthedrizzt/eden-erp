from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any, Literal, Self

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

CariRole = Literal[
    "customer",
    "supplier",
    "both",
    "employee",
    "partner",
    "stakeholder",
    "public_institution",
    "bank",
    "miscellaneous",
    "related_company",
    "other",
]

AccountType = Literal[
    "customer",
    "supplier",
    "customer_supplier",
    "employee",
    "partner",
    "stakeholder",
    "public_institution",
    "bank",
    "miscellaneous",
    "related_company",
    "other",
]

LinkedEntityType = Literal[
    "company",
    "person",
    "organization",
    "stakeholder",
    "partner",
    "representative",
    "employee",
    "bank",
    "public_institution",
    "miscellaneous",
    "related_company",
    "other",
]

TransactionType = Literal[
    "expense",
    "income",
    "invoice",
    "payment",
    "collection",
    "bank_transaction",
    "card_transaction",
    "cash_transaction",
    "capital_payment",
    "capital_collection",
    "adjustment",
    "opening_balance",
    "transfer",
    "refund",
    "other",
]

Direction = Literal["debit", "credit"]
RecordStatus = Literal["active", "passive", "draft"]
TransactionStatus = Literal["draft", "confirmed", "cancelled"]
DocumentStatus = Literal[
    "no_document",
    "document_needed",
    "document_uploaded",
    "e_invoice_pending",
    "e_archive_pending",
    "invoice_matched",
    "rejected",
]
ReconciliationStatus = Literal[
    "unmatched",
    "matched",
    "partially_matched",
    "needs_review",
    "ignored",
]

RelatedModule = Literal[
    "ownership",
    "capital",
    "company",
    "partner",
    "representative",
    "branch",
    "accounting",
]


class CariAccountCreateRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    company_id: str
    account_code: str | None = Field(default=None, max_length=64)
    account_name: str = Field(min_length=1, max_length=300)
    account_type: AccountType = "other"
    cari_role: CariRole = "other"
    linked_entity_type: LinkedEntityType | None = None
    linked_entity_id: str | None = None
    tax_number: str | None = Field(default=None, max_length=32)
    tax_office: str | None = Field(default=None, max_length=160)
    identity_number: str | None = Field(default=None, max_length=32)
    country: str | None = Field(default="TR", max_length=80)
    city: str | None = Field(default=None, max_length=120)
    district: str | None = Field(default=None, max_length=120)
    address: str | None = None
    phone: str | None = Field(default=None, max_length=80)
    email: str | None = Field(default=None, max_length=254)
    iban: str | None = Field(default=None, max_length=64)
    bank_account_references: list[dict[str, Any]] = Field(default_factory=list)
    currency: str = Field(default="TRY", min_length=3, max_length=3)
    opening_balance: Decimal = Decimal("0")
    risk_limit: Decimal | None = None
    payment_terms: str | None = None
    record_status: RecordStatus = "active"
    notes: str | None = None
    metadata_json: dict[str, Any] = Field(default_factory=dict)

    @field_validator("currency")
    @classmethod
    def normalize_currency(cls, value: str) -> str:
        return value.upper()


class CariAccountUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    account_code: str | None = Field(default=None, max_length=64)
    account_name: str | None = Field(default=None, min_length=1, max_length=300)
    account_type: AccountType | None = None
    cari_role: CariRole | None = None
    linked_entity_type: LinkedEntityType | None = None
    linked_entity_id: str | None = None
    tax_number: str | None = Field(default=None, max_length=32)
    tax_office: str | None = Field(default=None, max_length=160)
    identity_number: str | None = Field(default=None, max_length=32)
    country: str | None = Field(default=None, max_length=80)
    city: str | None = Field(default=None, max_length=120)
    district: str | None = Field(default=None, max_length=120)
    address: str | None = None
    phone: str | None = Field(default=None, max_length=80)
    email: str | None = Field(default=None, max_length=254)
    iban: str | None = Field(default=None, max_length=64)
    bank_account_references: list[dict[str, Any]] | None = None
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    opening_balance: Decimal | None = None
    risk_limit: Decimal | None = None
    payment_terms: str | None = None
    record_status: RecordStatus | None = None
    notes: str | None = None
    metadata_json: dict[str, Any] | None = None
    base_version: int | None = None

    @field_validator("currency")
    @classmethod
    def normalize_currency(cls, value: str | None) -> str | None:
        return value.upper() if value else value


class CariTransactionCreateRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    company_id: str
    account_id: str
    transaction_date: date
    document_date: date | None = None
    due_date: date | None = None
    transaction_type: TransactionType
    direction: Direction | None = None
    debit: Decimal | None = Field(default=None, ge=0)
    credit: Decimal | None = Field(default=None, ge=0)
    amount: Decimal | None = Field(default=None, gt=0)
    currency: str = Field(default="TRY", min_length=3, max_length=3)
    exchange_rate: Decimal = Field(default=Decimal("1"), gt=0)
    local_amount: Decimal | None = None
    description: str = Field(min_length=1)
    document_status: DocumentStatus = "no_document"
    document_no: str | None = Field(default=None, max_length=120)
    document_type: str | None = Field(default=None, max_length=80)
    real_counterparty_name: str | None = Field(default=None, max_length=300)
    category: str | None = Field(default=None, max_length=160)
    payment_method: str | None = Field(default=None, max_length=120)
    paid_by_entity_type: LinkedEntityType | None = None
    paid_by_entity_id: str | None = None
    paid_to_entity_type: LinkedEntityType | None = None
    paid_to_entity_id: str | None = None
    related_module: RelatedModule | None = None
    related_entity_type: str | None = Field(default=None, max_length=120)
    related_entity_id: str | None = None
    reconciliation_status: ReconciliationStatus = "unmatched"
    matched_bank_transaction_id: str | None = None
    matched_invoice_id: str | None = None
    attachment_files: list[dict[str, Any]] = Field(default_factory=list)
    status: TransactionStatus = "draft"
    metadata_json: dict[str, Any] = Field(default_factory=dict)

    @field_validator("currency")
    @classmethod
    def normalize_currency(cls, value: str) -> str:
        return value.upper()

    @model_validator(mode="after")
    def normalize_amount_and_direction(self) -> Self:
        if self.amount is None:
            if self.debit and self.debit > 0:
                self.amount = self.debit
                self.direction = self.direction or "debit"
            elif self.credit and self.credit > 0:
                self.amount = self.credit
                self.direction = self.direction or "credit"
        if self.direction is None:
            raise ValueError("Borc/alacak yonu secilmelidir.")
        if self.amount is None or self.amount <= 0:
            raise ValueError("Tutar sifirdan buyuk olmalidir.")
        self.local_amount = self.local_amount or self.amount * self.exchange_rate
        return self


class CariTransactionUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    transaction_date: date | None = None
    document_date: date | None = None
    due_date: date | None = None
    transaction_type: TransactionType | None = None
    direction: Direction | None = None
    debit: Decimal | None = Field(default=None, ge=0)
    credit: Decimal | None = Field(default=None, ge=0)
    amount: Decimal | None = Field(default=None, gt=0)
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    exchange_rate: Decimal | None = Field(default=None, gt=0)
    local_amount: Decimal | None = None
    description: str | None = Field(default=None, min_length=1)
    document_status: DocumentStatus | None = None
    document_no: str | None = Field(default=None, max_length=120)
    document_type: str | None = Field(default=None, max_length=80)
    real_counterparty_name: str | None = Field(default=None, max_length=300)
    category: str | None = Field(default=None, max_length=160)
    payment_method: str | None = Field(default=None, max_length=120)
    paid_by_entity_type: LinkedEntityType | None = None
    paid_by_entity_id: str | None = None
    paid_to_entity_type: LinkedEntityType | None = None
    paid_to_entity_id: str | None = None
    related_module: RelatedModule | None = None
    related_entity_type: str | None = Field(default=None, max_length=120)
    related_entity_id: str | None = None
    reconciliation_status: ReconciliationStatus | None = None
    matched_bank_transaction_id: str | None = None
    matched_invoice_id: str | None = None
    attachment_files: list[dict[str, Any]] | None = None
    status: TransactionStatus | None = None
    metadata_json: dict[str, Any] | None = None
    base_version: int | None = None

    @field_validator("currency")
    @classmethod
    def normalize_currency(cls, value: str | None) -> str | None:
        return value.upper() if value else value


class CariAccountSummary(BaseModel):
    total_debit: Decimal = Decimal("0")
    total_credit: Decimal = Decimal("0")
    balance: Decimal = Decimal("0")
    opening_balance: Decimal = Decimal("0")
    last_transaction_date: date | None = None
    unmatched_count: int = 0
    overdue_count: int = 0


class CompanyAccountingSummary(BaseModel):
    total_accounts: int = 0
    total_debit: Decimal = Decimal("0")
    total_credit: Decimal = Decimal("0")
    balance: Decimal = Decimal("0")
    unmatched_count: int = 0
    overdue_count: int = 0
    last_transaction_date: date | None = None


class CariAccountListQuery(BaseModel):
    company_id: str | None = None
    cari_role: str | None = None
    record_status: str | None = None
    balance_status: str | None = None
    city: str | None = None
    search: str | None = None
    page: int = 1
    page_size: int = 50
    sort: str = "account_name"
    direction: str = "asc"


class CariTransactionListQuery(BaseModel):
    company_id: str | None = None
    account_id: str | None = None
    transaction_type: str | None = None
    direction: str | None = None
    date_from: date | None = None
    date_to: date | None = None
    document_status: str | None = None
    payment_method: str | None = None
    category: str | None = None
    reconciliation_status: str | None = None
    status: str | None = None
    search: str | None = None
    page: int = 1
    page_size: int = 50
    sort: str = "transaction_date"
    direction_sort: str = "desc"


class ListResult(BaseModel):
    data: list[dict[str, Any]]
    meta: dict[str, Any]


class AccountingEvent(BaseModel):
    event_type: str
    aggregate_type: str
    aggregate_id: str
    occurred_at: datetime
    payload: dict[str, Any] = Field(default_factory=dict)
