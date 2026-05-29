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

BankAccountType = Literal["checking", "deposit", "credit_card", "loan", "pos", "other"]
BankIntegrationStatus = Literal["manual", "connected", "error", "disabled"]
ImportSource = Literal["manual", "csv", "xlsx", "bank_api", "open_banking"]
EDocumentKind = Literal["e_invoice", "e_archive", "paper_invoice", "receipt", "other"]
EDocumentDirection = Literal["incoming", "outgoing"]
EDocumentStatus = Literal[
    "received",
    "issued",
    "accepted",
    "rejected",
    "cancelled",
    "matched",
    "needs_review",
]
MatchType = Literal["automatic", "manual", "partial"]
MatchLinkStatus = Literal["active", "removed"]
SuggestionStatus = Literal["open", "accepted", "rejected", "expired"]

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


class BankAccountCreateRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    company_id: str
    bank_name: str = Field(min_length=1, max_length=180)
    bank_code: str | None = Field(default=None, max_length=40)
    branch_name: str | None = Field(default=None, max_length=180)
    branch_code: str | None = Field(default=None, max_length=40)
    account_name: str = Field(min_length=1, max_length=220)
    account_no: str | None = Field(default=None, max_length=80)
    iban: str | None = Field(default=None, max_length=64)
    currency: str = Field(default="TRY", min_length=3, max_length=3)
    account_type: BankAccountType = "checking"
    is_active: bool = True
    opening_balance: Decimal = Decimal("0")
    current_balance: Decimal | None = None
    integration_status: BankIntegrationStatus = "manual"
    notes: str | None = None
    metadata_json: dict[str, Any] = Field(default_factory=dict)

    @field_validator("currency")
    @classmethod
    def normalize_currency(cls, value: str) -> str:
        return value.upper()

    @field_validator("iban")
    @classmethod
    def normalize_iban(cls, value: str | None) -> str | None:
        return value.replace(" ", "").upper() if value else value

    @model_validator(mode="after")
    def default_current_balance(self) -> Self:
        self.current_balance = (
            self.current_balance if self.current_balance is not None else self.opening_balance
        )
        return self


class BankAccountUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    bank_name: str | None = Field(default=None, min_length=1, max_length=180)
    bank_code: str | None = Field(default=None, max_length=40)
    branch_name: str | None = Field(default=None, max_length=180)
    branch_code: str | None = Field(default=None, max_length=40)
    account_name: str | None = Field(default=None, min_length=1, max_length=220)
    account_no: str | None = Field(default=None, max_length=80)
    iban: str | None = Field(default=None, max_length=64)
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    account_type: BankAccountType | None = None
    is_active: bool | None = None
    opening_balance: Decimal | None = None
    current_balance: Decimal | None = None
    integration_status: BankIntegrationStatus | None = None
    notes: str | None = None
    metadata_json: dict[str, Any] | None = None
    base_version: int | None = None

    @field_validator("currency")
    @classmethod
    def normalize_currency(cls, value: str | None) -> str | None:
        return value.upper() if value else value

    @field_validator("iban")
    @classmethod
    def normalize_iban(cls, value: str | None) -> str | None:
        return value.replace(" ", "").upper() if value else value


class BankAccountListQuery(BaseModel):
    company_id: str | None = None
    account_type: str | None = None
    is_active: bool | None = None
    currency: str | None = None
    integration_status: str | None = None
    search: str | None = None
    page: int = 1
    page_size: int = 50
    sort: str = "bank_name"
    direction: str = "asc"


class BankTransactionCreateRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    company_id: str
    bank_account_id: str
    transaction_date: date
    value_date: date | None = None
    description: str = Field(min_length=1)
    counterparty_name: str | None = Field(default=None, max_length=300)
    counterparty_iban: str | None = Field(default=None, max_length=64)
    amount: Decimal = Field(gt=0)
    direction: Direction
    currency: str = Field(default="TRY", min_length=3, max_length=3)
    local_amount: Decimal | None = None
    balance_after: Decimal | None = None
    bank_reference_no: str | None = Field(default=None, max_length=160)
    raw_reference: str | None = None
    transaction_code: str | None = Field(default=None, max_length=80)
    imported_from: ImportSource = "manual"
    import_job_id: str | None = None
    reconciliation_status: ReconciliationStatus = "unmatched"
    matched_cari_transaction_id: str | None = None
    matched_invoice_id: str | None = None
    confidence_score: Decimal | None = None
    notes: str | None = None
    metadata_json: dict[str, Any] = Field(default_factory=dict)

    @field_validator("currency")
    @classmethod
    def normalize_currency(cls, value: str) -> str:
        return value.upper()

    @field_validator("counterparty_iban")
    @classmethod
    def normalize_iban(cls, value: str | None) -> str | None:
        return value.replace(" ", "").upper() if value else value

    @model_validator(mode="after")
    def default_local_amount(self) -> Self:
        self.local_amount = self.local_amount if self.local_amount is not None else self.amount
        return self


class BankTransactionUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    transaction_date: date | None = None
    value_date: date | None = None
    description: str | None = Field(default=None, min_length=1)
    counterparty_name: str | None = Field(default=None, max_length=300)
    counterparty_iban: str | None = Field(default=None, max_length=64)
    amount: Decimal | None = Field(default=None, gt=0)
    direction: Direction | None = None
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    local_amount: Decimal | None = None
    balance_after: Decimal | None = None
    bank_reference_no: str | None = Field(default=None, max_length=160)
    raw_reference: str | None = None
    transaction_code: str | None = Field(default=None, max_length=80)
    reconciliation_status: ReconciliationStatus | None = None
    matched_cari_transaction_id: str | None = None
    matched_invoice_id: str | None = None
    confidence_score: Decimal | None = None
    notes: str | None = None
    metadata_json: dict[str, Any] | None = None
    base_version: int | None = None

    @field_validator("currency")
    @classmethod
    def normalize_currency(cls, value: str | None) -> str | None:
        return value.upper() if value else value

    @field_validator("counterparty_iban")
    @classmethod
    def normalize_iban(cls, value: str | None) -> str | None:
        return value.replace(" ", "").upper() if value else value


class BankTransactionListQuery(BaseModel):
    company_id: str | None = None
    bank_account_id: str | None = None
    direction: str | None = None
    reconciliation_status: str | None = None
    imported_from: str | None = None
    date_from: date | None = None
    date_to: date | None = None
    search: str | None = None
    page: int = 1
    page_size: int = 50
    sort: str = "transaction_date"
    direction_sort: str = "desc"


class BankTransactionImportRequest(BaseModel):
    bank_account_id: str
    imported_from: ImportSource = "csv"
    dry_run: bool = False
    rows: list[BankTransactionCreateRequest] = Field(default_factory=list)


class CardTransactionCreateRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    company_id: str
    card_account_id: str
    card_holder_entity_type: str | None = None
    card_holder_entity_id: str | None = None
    transaction_date: date
    posting_date: date | None = None
    merchant_name: str | None = Field(default=None, max_length=300)
    description: str = Field(min_length=1)
    amount: Decimal = Field(gt=0)
    currency: str = Field(default="TRY", min_length=3, max_length=3)
    installment_count: int | None = Field(default=None, ge=1)
    installment_no: int | None = Field(default=None, ge=1)
    category: str | None = Field(default=None, max_length=160)
    document_status: DocumentStatus = "document_needed"
    reconciliation_status: ReconciliationStatus = "unmatched"
    matched_cari_transaction_id: str | None = None
    matched_invoice_id: str | None = None
    import_job_id: str | None = None
    notes: str | None = None
    metadata_json: dict[str, Any] = Field(default_factory=dict)

    @field_validator("currency")
    @classmethod
    def normalize_currency(cls, value: str) -> str:
        return value.upper()


class EDocumentCreateRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    company_id: str
    document_kind: EDocumentKind = "e_invoice"
    direction: EDocumentDirection = "incoming"
    invoice_uuid: str | None = Field(default=None, max_length=160)
    invoice_no: str = Field(min_length=1, max_length=160)
    issue_date: date
    due_date: date | None = None
    sender_tax_number: str | None = Field(default=None, max_length=32)
    sender_name: str | None = Field(default=None, max_length=300)
    receiver_tax_number: str | None = Field(default=None, max_length=32)
    receiver_name: str | None = Field(default=None, max_length=300)
    total_amount: Decimal = Field(ge=0)
    tax_amount: Decimal = Field(default=Decimal("0"), ge=0)
    payable_amount: Decimal | None = Field(default=None, ge=0)
    currency: str = Field(default="TRY", min_length=3, max_length=3)
    status: EDocumentStatus = "received"
    gib_status: str | None = Field(default=None, max_length=120)
    scenario_type: str | None = Field(default=None, max_length=120)
    invoice_type: str | None = Field(default=None, max_length=120)
    xml_document_id: str | None = None
    pdf_document_id: str | None = None
    related_cari_account_id: str | None = None
    matched_cari_transaction_id: str | None = None
    matched_bank_transaction_id: str | None = None
    reconciliation_status: ReconciliationStatus = "unmatched"
    import_job_id: str | None = None
    raw_data: dict[str, Any] = Field(default_factory=dict)
    notes: str | None = None
    metadata_json: dict[str, Any] = Field(default_factory=dict)

    @field_validator("currency")
    @classmethod
    def normalize_currency(cls, value: str) -> str:
        return value.upper()

    @model_validator(mode="after")
    def default_payable_amount(self) -> Self:
        self.payable_amount = (
            self.payable_amount if self.payable_amount is not None else self.total_amount
        )
        return self


class EDocumentUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    document_kind: EDocumentKind | None = None
    direction: EDocumentDirection | None = None
    invoice_uuid: str | None = Field(default=None, max_length=160)
    invoice_no: str | None = Field(default=None, min_length=1, max_length=160)
    issue_date: date | None = None
    due_date: date | None = None
    sender_tax_number: str | None = Field(default=None, max_length=32)
    sender_name: str | None = Field(default=None, max_length=300)
    receiver_tax_number: str | None = Field(default=None, max_length=32)
    receiver_name: str | None = Field(default=None, max_length=300)
    total_amount: Decimal | None = Field(default=None, ge=0)
    tax_amount: Decimal | None = Field(default=None, ge=0)
    payable_amount: Decimal | None = Field(default=None, ge=0)
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    status: EDocumentStatus | None = None
    gib_status: str | None = Field(default=None, max_length=120)
    scenario_type: str | None = Field(default=None, max_length=120)
    invoice_type: str | None = Field(default=None, max_length=120)
    xml_document_id: str | None = None
    pdf_document_id: str | None = None
    related_cari_account_id: str | None = None
    matched_cari_transaction_id: str | None = None
    matched_bank_transaction_id: str | None = None
    reconciliation_status: ReconciliationStatus | None = None
    raw_data: dict[str, Any] | None = None
    notes: str | None = None
    metadata_json: dict[str, Any] | None = None
    base_version: int | None = None

    @field_validator("currency")
    @classmethod
    def normalize_currency(cls, value: str | None) -> str | None:
        return value.upper() if value else value


class EDocumentListQuery(BaseModel):
    company_id: str | None = None
    document_kind: str | None = None
    direction: str | None = None
    status: str | None = None
    reconciliation_status: str | None = None
    related_cari_account_id: str | None = None
    date_from: date | None = None
    date_to: date | None = None
    search: str | None = None
    page: int = 1
    page_size: int = 50
    sort: str = "issue_date"
    direction_sort: str = "desc"


class EDocumentImportRequest(BaseModel):
    dry_run: bool = False
    rows: list[EDocumentCreateRequest] = Field(default_factory=list)


class ReconciliationSuggestionQuery(BaseModel):
    company_id: str | None = None
    source_type: str | None = None
    target_type: str | None = None
    min_confidence: Decimal = Field(default=Decimal("50"), ge=0, le=100)
    page: int = 1
    page_size: int = 50


class ReconciliationMatchRequest(BaseModel):
    company_id: str
    source_type: str
    source_id: str
    target_type: str
    target_id: str
    match_type: MatchType = "manual"
    confidence_score: Decimal | None = Field(default=None, ge=0, le=100)
    amount_matched: Decimal | None = Field(default=None, gt=0)
    currency: str = Field(default="TRY", min_length=3, max_length=3)
    notes: str | None = None

    @field_validator("currency")
    @classmethod
    def normalize_currency(cls, value: str) -> str:
        return value.upper()


class ReconciliationUnmatchRequest(BaseModel):
    link_id: str | None = None
    source_type: str | None = None
    source_id: str | None = None
    target_type: str | None = None
    target_id: str | None = None
    notes: str | None = None


class CapitalPaymentMatchRequest(BaseModel):
    related_bank_transaction_id: str | None = None
    related_cari_transaction_id: str | None = None
    paid_amount: Decimal = Field(gt=0)
    currency: str = Field(default="TRY", min_length=3, max_length=3)
    notes: str | None = None

    @field_validator("currency")
    @classmethod
    def normalize_currency(cls, value: str) -> str:
        return value.upper()


class ListResult(BaseModel):
    data: list[dict[str, Any]]
    meta: dict[str, Any]


class AccountingEvent(BaseModel):
    event_type: str
    aggregate_type: str
    aggregate_id: str
    occurred_at: datetime
    payload: dict[str, Any] = Field(default_factory=dict)
