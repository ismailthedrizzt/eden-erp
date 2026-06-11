from __future__ import annotations

from datetime import date, datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

REPRESENTATIVE_AUTHORITY_TRANSACTION_LABELS = {
    'Temsilcilik Başlatma': 'authority_start',
    'Yetki Yenileme': 'authority_renew',
    'Yetki Kapsamı Değişikliği': 'authority_scope_change',
    'Limit Değişikliği': 'authority_limit_change',
    'Askıya Alma': 'authority_suspend',
    'Sonlandırma': 'authority_terminate',
    'Düzeltme Kaydı': 'authority_correction',
    'Ters Kayıt': 'authority_reverse',
}
REPRESENTATIVE_AUTHORITY_VALUES = set(REPRESENTATIVE_AUTHORITY_TRANSACTION_LABELS.values())


class OperationPayload(BaseModel):
    model_config = ConfigDict(extra='allow')

    client_request_id: str | None = None
    base_version: int | None = None
    base_updated_at: datetime | None = None


class RepresentativeAuthorityPayload(OperationPayload):
    transaction_type: str
    effective_date: date | None = None
    end_date: date | None = None
    representative_id: UUID | None = None
    company_id: UUID | None = None
    authority_types: list[str] = Field(default_factory=list)

    @field_validator('transaction_type', mode='before')
    @classmethod
    def normalize_transaction_type(cls, value: Any) -> str:
        raw = str(value or '').strip()
        canonical = REPRESENTATIVE_AUTHORITY_TRANSACTION_LABELS.get(raw, raw)
        if canonical not in REPRESENTATIVE_AUTHORITY_VALUES:
            raise ValueError('Invalid representative authority transaction_type')
        return canonical


STRICT_OPERATION_TYPES = {
    'branch_opening': OperationPayload,
    'branch_closing': OperationPayload,
    'company.capital_increase': OperationPayload,
}


def operation_payload_model(operation_type: str) -> type[OperationPayload]:
    if operation_type.startswith('representative.authority_'):
        return RepresentativeAuthorityPayload
    if operation_type.startswith('ownership.'):
        return OperationPayload
    if operation_type.startswith('company.'):
        return OperationPayload
    if operation_type in STRICT_OPERATION_TYPES:
        return STRICT_OPERATION_TYPES[operation_type]
    raise ValueError('Operation type has no typed payload model: ' + operation_type)


def normalize_operation_payload(operation_type: str, payload: dict[str, Any]) -> dict[str, Any]:
    model = operation_payload_model(operation_type)
    return model.model_validate(payload).model_dump(mode='python', exclude_none=False)
