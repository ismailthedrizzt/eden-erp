from __future__ import annotations

from decimal import Decimal
from typing import Any

from app.integrity.messages import (
    CURRENT_OWNERSHIP_REQUIRED,
    LAST_OWNER_EXIT_BLOCKED,
    OWNERSHIP_DISTRIBUTION_INVALID,
)
from app.integrity.schemas import IntegrityCheckResult


def current_ownership_available_result(rows: list[dict[str, Any]]) -> IntegrityCheckResult:
    if not rows:
        return IntegrityCheckResult(
            key="current_ownership_available",
            ok=False,
            severity="blocking",
            message=CURRENT_OWNERSHIP_REQUIRED,
            reasons=[CURRENT_OWNERSHIP_REQUIRED],
        )
    return IntegrityCheckResult(
        key="current_ownership_available",
        ok=True,
        message="Guncel ortaklik dagilimi okunabiliyor.",
    )


def ownership_distribution_result(rows: list[dict[str, Any]]) -> IntegrityCheckResult:
    if not rows:
        return current_ownership_available_result(rows)

    total = sum(
        Decimal(str(row.get("current_share_ratio") or row.get("share_ratio") or 0))
        for row in rows
    )
    if abs(total - Decimal("100")) > Decimal("0.01"):
        return IntegrityCheckResult(
            key="ownership_distribution_valid",
            ok=False,
            severity="blocking",
            message=OWNERSHIP_DISTRIBUTION_INVALID,
            reasons=[OWNERSHIP_DISTRIBUTION_INVALID],
            metadata={"total_share_ratio": str(total)},
        )
    return IntegrityCheckResult(
        key="ownership_distribution_valid",
        ok=True,
        message="Ortaklik dagilimi tutarli.",
        metadata={"total_share_ratio": str(total)},
    )


def ownership_exit_not_last_result(active_owner_count: int) -> IntegrityCheckResult:
    if active_owner_count <= 1:
        return IntegrityCheckResult(
            key="ownership_exit_not_last_without_resolution",
            ok=False,
            severity="blocking",
            message=LAST_OWNER_EXIT_BLOCKED,
            reasons=[LAST_OWNER_EXIT_BLOCKED],
            metadata={"active_owner_count": active_owner_count},
        )
    return IntegrityCheckResult(
        key="ownership_exit_not_last_without_resolution",
        ok=True,
        message="Ortakliktan cikis sirketi sahipsiz birakmiyor.",
    )
