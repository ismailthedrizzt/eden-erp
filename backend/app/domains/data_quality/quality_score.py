# ruff: noqa: E501

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.domains.data_quality.schemas import DataQualityScore


@dataclass(frozen=True)
class ScoreComponent:
    key: str
    fields: tuple[str, ...]
    points: int
    any_field: bool = False


SCORE_RULES: dict[str, tuple[ScoreComponent, ...]] = {
    "master_person": (
        ScoreComponent("identity_or_passport", ("identity_number", "passport_no"), 25, True),
        ScoreComponent("full_name", ("full_name",), 20),
        ScoreComponent("birth_date", ("birth_date",), 10),
        ScoreComponent("contact", ("phone", "email"), 20, True),
        ScoreComponent("address", ("address", "city"), 10, True),
        ScoreComponent("no_duplicate_risk", (), 15),
    ),
    "master_organization": (
        ScoreComponent("tax_number", ("tax_number",), 30),
        ScoreComponent("trade_name", ("trade_name",), 20),
        ScoreComponent("address", ("address", "city"), 15, True),
        ScoreComponent("contact", ("phone", "email"), 15, True),
        ScoreComponent("no_duplicate_risk", (), 20),
    ),
    "stakeholder": (
        ScoreComponent("master_link", ("master_entity_id", "master_entity_type"), 30),
        ScoreComponent("stakeholder_type", ("stakeholder_type",), 20),
        ScoreComponent("relationship_status", ("relationship_status",), 15),
        ScoreComponent("contact_or_owner", ("related_cari_account_id", "assigned_owner_user_id"), 20, True),
        ScoreComponent("no_duplicate_risk", (), 15),
    ),
    "cari_account": (
        ScoreComponent("account_code", ("account_code",), 25),
        ScoreComponent("account_name", ("account_name",), 20),
        ScoreComponent("linked_entity", ("linked_entity_type", "linked_entity_id"), 20),
        ScoreComponent("tax_or_identity", ("tax_number", "identity_number"), 15, True),
        ScoreComponent("no_duplicate_risk", (), 20),
    ),
    "employee": (
        ScoreComponent("identity_or_passport", ("identity_number", "passport_no"), 25, True),
        ScoreComponent("company", ("company_id",), 15),
        ScoreComponent("employment_status", ("employment_status",), 20),
        ScoreComponent("contact", ("phone", "email"), 15, True),
        ScoreComponent("no_duplicate_risk", (), 25),
    ),
    "installed_asset": (
        ScoreComponent("product", ("product_id", "product_name"), 25, True),
        ScoreComponent("customer", ("customer_name", "customer_account_id"), 25, True),
        ScoreComponent("serial_or_tag", ("serial_no", "asset_tag"), 20, True),
        ScoreComponent("warranty", ("warranty_start_date", "warranty_end_date"), 10, True),
        ScoreComponent("no_duplicate_risk", (), 20),
    ),
    "document": (
        ScoreComponent("owner", ("owner_entity_type", "owner_entity_id"), 25),
        ScoreComponent("type", ("document_type", "document_category"), 20, True),
        ScoreComponent("file", ("file_name", "mime_type", "file_size"), 25),
        ScoreComponent("status", ("status",), 10),
        ScoreComponent("no_duplicate_risk", (), 20),
    ),
    "product": (
        ScoreComponent("product_code", ("product_code",), 25),
        ScoreComponent("product_name", ("product_name",), 25),
        ScoreComponent("type", ("product_type",), 15),
        ScoreComponent("brand_or_category", ("brand", "category"), 15, True),
        ScoreComponent("no_duplicate_risk", (), 20),
    ),
}


def calculate_quality_score(
    entity_type: str,
    row: dict[str, Any],
    *,
    duplicate_risk: dict[str, Any] | None = None,
    relation_warnings: list[str] | None = None,
) -> DataQualityScore:
    duplicate_risk = duplicate_risk or {}
    relation_warnings = relation_warnings or []
    rules = SCORE_RULES.get(entity_type, _generic_rules())
    missing: list[str] = []
    score = 0

    for component in rules:
        if component.key == "no_duplicate_risk":
            if not duplicate_risk:
                score += component.points
            else:
                missing.append("duplicate_risk")
            continue
        ok = any(_present(row.get(field)) for field in component.fields) if component.any_field else all(_present(row.get(field)) for field in component.fields)
        if ok:
            score += component.points
        else:
            missing.append(component.key)

    if relation_warnings:
        score = max(0, score - min(20, 5 * len(relation_warnings)))
    status = "good" if score >= 80 else "warning" if score >= 60 else "poor" if score >= 35 else "critical"
    return DataQualityScore(
        entity_type=entity_type,
        entity_id=str(row.get("id") or ""),
        score=float(min(100, score)),
        status=status,
        missing_fields=missing,
        duplicate_risk=duplicate_risk,
        relation_warnings=relation_warnings,
    )


def _generic_rules() -> tuple[ScoreComponent, ...]:
    return (
        ScoreComponent("name", ("display_name", "name", "title", "full_name"), 35, True),
        ScoreComponent("status", ("status", "record_status"), 20, True),
        ScoreComponent("contact", ("phone", "email"), 15, True),
        ScoreComponent("no_duplicate_risk", (), 30),
    )


def _present(value: Any) -> bool:
    if value is None:
        return False
    if isinstance(value, str):
        return bool(value.strip())
    return True
