# ruff: noqa: E501
from __future__ import annotations

import re
from datetime import date
from decimal import Decimal, InvalidOperation
from typing import Any

from app.domains.import_export.schemas import ImportTemplate, ValidationIssue

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
FORMULA_PREFIXES = ("=", "+", "-", "@")


def auto_field_mapping(template: ImportTemplate, columns: list[str]) -> dict[str, str]:
    normalized_columns = {_normalize_key(column): column for column in columns}
    mapping: dict[str, str] = {}
    for field, hints in template.field_mapping_hints.items():
        candidates = [field, *hints]
        for candidate in candidates:
            source = normalized_columns.get(_normalize_key(candidate))
            if source:
                mapping[field] = source
                break
    return mapping


def normalize_row(raw: dict[str, Any], mapping: dict[str, str]) -> dict[str, Any]:
    source_by_normalized = {_normalize_key(key): key for key in raw}
    normalized: dict[str, Any] = {}
    for target, source in mapping.items():
        source_key = raw.get(source)
        if source_key is not None:
            normalized[target] = _blank_to_none(source_key)
            continue
        raw_key = source_by_normalized.get(_normalize_key(source)) or source_by_normalized.get(
            _normalize_key(target)
        )
        if raw_key:
            normalized[target] = _blank_to_none(raw.get(raw_key))
    return normalized


def validate_normalized_row(
    template: ImportTemplate,
    raw: dict[str, Any],
    normalized: dict[str, Any],
    *,
    row_number: int,
) -> tuple[dict[str, Any], list[ValidationIssue], list[ValidationIssue]]:
    errors: list[ValidationIssue] = []
    warnings: list[ValidationIssue] = []
    next_row = dict(normalized)
    raw_columns = {_normalize_key(column): column for column in raw}

    for blocked_field in template.operation_controlled_fields:
        raw_column = raw_columns.get(_normalize_key(blocked_field))
        value = normalized.get(blocked_field) if blocked_field in normalized else raw.get(raw_column or "")
        if _has_value(value):
            errors.append(
                ValidationIssue(
                    row_number=row_number,
                    field=blocked_field,
                    code="OPERATION_CONTROLLED_FIELD",
                    message=(
                        "Bu alan resmi/lifecycle islem kontrolludur; import veya bulk update ile "
                        "degistirilemez."
                    ),
                    suggested_fix="Ilgili islem sihirbazini kullanin veya kolonu dosyadan kaldirin.",
                    original_value=value,
                )
            )

    for rule in template.validation_rules:
        value = next_row.get(rule.field)
        if rule.required and not _has_value(value):
            errors.append(
                ValidationIssue(
                    row_number=row_number,
                    field=rule.field,
                    code="REQUIRED_FIELD",
                    message=f"{rule.label} zorunludur.",
                    suggested_fix="Kolonu doldurun veya dogru alan eslestirmesi yapin.",
                    original_value=value,
                )
            )
            continue
        if not _has_value(value):
            continue
        converted, issue = convert_value(rule.data_type, value, row_number, rule.field)
        if issue:
            errors.append(issue)
            continue
        next_row[rule.field] = converted
        if rule.enum_values and str(converted) not in rule.enum_values:
            errors.append(
                ValidationIssue(
                    row_number=row_number,
                    field=rule.field,
                    code="INVALID_ENUM",
                    message=f"{rule.label} icin gecersiz deger.",
                    suggested_fix=f"Gecerli degerler: {', '.join(rule.enum_values)}",
                    original_value=value,
                )
            )
        if isinstance(value, str) and value.startswith(FORMULA_PREFIXES):
            warnings.append(
                ValidationIssue(
                    row_number=row_number,
                    field=rule.field,
                    code="FORMULA_LIKE_VALUE",
                    message="Hucre formulu gibi gorunuyor; metin olarak alinacak.",
                    suggested_fix="Excel formulu yerine duz metin kullanin.",
                    original_value=value,
                )
            )
        if rule.data_type == "phone" and isinstance(converted, str) and converted != value:
            warnings.append(
                ValidationIssue(
                    row_number=row_number,
                    field=rule.field,
                    code="PHONE_NORMALIZED",
                    message="Telefon numarasi normalize edildi.",
                    original_value=value,
                )
            )
    return next_row, errors, warnings


def convert_value(
    data_type: str,
    value: Any,
    row_number: int,
    field: str,
) -> tuple[Any, ValidationIssue | None]:
    if data_type == "string":
        return value, None
    if data_type == "email":
        text = str(value).strip()
        if not EMAIL_RE.match(text):
            return None, ValidationIssue(
                row_number=row_number,
                field=field,
                code="INVALID_EMAIL",
                message="E-posta formati gecersiz.",
                suggested_fix="ornek: ad@firma.com",
                original_value=value,
            )
        return text, None
    if data_type == "phone":
        text = re.sub(r"[^\d+]", "", str(value))
        return text, None
    if data_type == "currency":
        text = str(value).strip().upper()
        if len(text) != 3 or not text.isalpha():
            return None, ValidationIssue(
                row_number=row_number,
                field=field,
                code="INVALID_CURRENCY",
                message="Para birimi ISO 4217 formatinda olmalidir.",
                suggested_fix="TRY, USD, EUR gibi 3 harfli kod kullanin.",
                original_value=value,
            )
        return text, None
    if data_type == "decimal":
        try:
            return Decimal(str(value).replace(",", ".")), None
        except (InvalidOperation, ValueError):
            return None, ValidationIssue(
                row_number=row_number,
                field=field,
                code="INVALID_NUMBER",
                message="Sayi formati gecersiz.",
                original_value=value,
            )
    if data_type == "integer":
        try:
            return int(str(value).strip()), None
        except ValueError:
            return None, ValidationIssue(
                row_number=row_number,
                field=field,
                code="INVALID_INTEGER",
                message="Tam sayi formati gecersiz.",
                original_value=value,
            )
    if data_type == "boolean":
        parsed = parse_bool(value)
        if parsed is None:
            return None, ValidationIssue(
                row_number=row_number,
                field=field,
                code="INVALID_BOOLEAN",
                message="Boolean alan icin true/false, evet/hayir veya 1/0 kullanin.",
                original_value=value,
            )
        return parsed, None
    if data_type == "date":
        if isinstance(value, date):
            return value.isoformat(), None
        text = str(value).strip()
        try:
            return date.fromisoformat(text).isoformat(), None
        except ValueError:
            return None, ValidationIssue(
                row_number=row_number,
                field=field,
                code="INVALID_DATE",
                message="Tarih formati gecersiz.",
                suggested_fix="YYYY-MM-DD formatini kullanin.",
                original_value=value,
            )
    return value, None


def parse_bool(value: Any) -> bool | None:
    if isinstance(value, bool):
        return value
    text = str(value).strip().lower()
    if text in {"true", "1", "yes", "y", "evet", "e"}:
        return True
    if text in {"false", "0", "no", "n", "hayir", "h"}:
        return False
    return None


def issue_list_to_json(issues: list[ValidationIssue]) -> list[dict[str, Any]]:
    return [issue.model_dump(mode="json") for issue in issues]


def _normalize_key(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", value.strip().lower())


def _blank_to_none(value: Any) -> Any:
    if isinstance(value, str):
        stripped = value.strip()
        return stripped if stripped else None
    return value


def _has_value(value: Any) -> bool:
    if value is None:
        return False
    if isinstance(value, str):
        return bool(value.strip())
    return True
