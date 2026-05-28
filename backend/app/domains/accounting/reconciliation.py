from __future__ import annotations

from decimal import Decimal
from typing import Any


def derive_debit_credit(row: dict[str, Any]) -> dict[str, Any]:
    amount = Decimal(str(row.get("amount") or "0"))
    direction = row.get("direction")
    row["debit"] = amount if direction == "debit" else Decimal("0")
    row["credit"] = amount if direction == "credit" else Decimal("0")
    return row


def calculate_balance(
    opening_balance: Decimal,
    total_debit: Decimal,
    total_credit: Decimal,
) -> Decimal:
    return opening_balance + total_debit - total_credit
