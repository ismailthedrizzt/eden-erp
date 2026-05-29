from __future__ import annotations

from datetime import date
from decimal import Decimal
from difflib import SequenceMatcher
from typing import Any


def normalize_text(value: Any) -> str:
    return " ".join(str(value or "").lower().strip().split())


def decimal_value(value: Any) -> Decimal:
    try:
        return Decimal(str(value or "0"))
    except Exception:
        return Decimal("0")


def date_distance_days(left: Any, right: Any) -> int | None:
    if not isinstance(left, date) or not isinstance(right, date):
        return None
    return abs((left - right).days)


def build_match_score(
    source: dict[str, Any], target: dict[str, Any]
) -> tuple[Decimal, list[dict[str, Any]]]:
    score = Decimal("0")
    reasons: list[dict[str, Any]] = []

    source_amount = decimal_value(source.get("amount") or source.get("payable_amount"))
    target_amount = decimal_value(target.get("amount") or target.get("payable_amount"))
    if source_amount > 0 and target_amount > 0:
        if source_amount == target_amount:
            score += Decimal("40")
            reasons.append({"key": "amount_exact", "label": "Tutar birebir eslesti", "score": 40})
        elif min(source_amount, target_amount) / max(source_amount, target_amount) >= Decimal(
            "0.8"
        ):
            score += Decimal("18")
            reasons.append(
                {"key": "amount_close", "label": "Tutar kismi eslesmeye yakin", "score": 18}
            )

    source_date = source.get("transaction_date") or source.get("issue_date")
    target_date = (
        target.get("transaction_date") or target.get("issue_date") or target.get("document_date")
    )
    distance = date_distance_days(source_date, target_date)
    if distance is not None:
        if distance == 0:
            score += Decimal("15")
            reasons.append({"key": "date_exact", "label": "Tarih ayni", "score": 15})
        elif distance <= 7:
            score += Decimal("8")
            reasons.append({"key": "date_close", "label": "Tarih 7 gun icinde", "score": 8})

    invoice_no = normalize_text(source.get("invoice_no") or source.get("document_no"))
    target_invoice_no = normalize_text(target.get("invoice_no") or target.get("document_no"))
    if invoice_no and target_invoice_no and invoice_no == target_invoice_no:
        score += Decimal("30")
        reasons.append({"key": "invoice_no", "label": "Fatura/belge numarasi eslesti", "score": 30})

    source_tax = normalize_text(
        source.get("sender_tax_number")
        or source.get("receiver_tax_number")
        or source.get("tax_number")
    )
    target_tax = normalize_text(
        target.get("sender_tax_number")
        or target.get("receiver_tax_number")
        or target.get("tax_number")
    )
    if source_tax and target_tax and source_tax == target_tax:
        score += Decimal("20")
        reasons.append({"key": "tax_number", "label": "Vergi numarasi eslesti", "score": 20})

    source_iban = normalize_text(source.get("counterparty_iban") or source.get("iban"))
    target_iban = normalize_text(target.get("counterparty_iban") or target.get("iban"))
    if source_iban and target_iban and source_iban == target_iban:
        score += Decimal("20")
        reasons.append({"key": "iban", "label": "IBAN eslesti", "score": 20})

    source_direction = source.get("direction")
    target_direction = target.get("direction")
    if source_direction and target_direction and source_direction != target_direction:
        score += Decimal("15")
        reasons.append(
            {"key": "direction_compatible", "label": "Borc/alacak yonu uyumlu", "score": 15}
        )

    source_name = normalize_text(
        source.get("counterparty_name") or source.get("sender_name") or source.get("receiver_name")
    )
    target_name = normalize_text(
        target.get("real_counterparty_name")
        or target.get("account_name")
        or target.get("sender_name")
        or target.get("receiver_name")
    )
    if source_name and target_name:
        ratio = Decimal(str(round(SequenceMatcher(None, source_name, target_name).ratio(), 2)))
        if ratio >= Decimal("0.8"):
            score += Decimal("10")
            reasons.append(
                {"key": "counterparty_name", "label": "Karsi taraf adi benzer", "score": 10}
            )

    return min(score, Decimal("100")), reasons
