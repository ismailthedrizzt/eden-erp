from __future__ import annotations

from typing import Any

from app.integrity.messages import COMPANY_NOT_ACTIVE
from app.integrity.schemas import IntegrityCheckResult

ACTIVE_STATUSES = {"active", "aktif", "opened", "open"}


def company_active_result(company: dict[str, Any] | None) -> IntegrityCheckResult:
    status = str(
        (company or {}).get("record_status")
        or (company or {}).get("company_status")
        or ""
    ).lower()
    if status and status not in ACTIVE_STATUSES:
        return IntegrityCheckResult(
            key="company_active_for_official_operation",
            ok=False,
            severity="blocking",
            message=COMPANY_NOT_ACTIVE,
            reasons=[COMPANY_NOT_ACTIVE],
            metadata={"status": status},
        )
    return IntegrityCheckResult(
        key="company_active_for_official_operation",
        ok=True,
        message="Sirket resmi operasyon icin uygun.",
    )


def no_open_company_blockers_result() -> IntegrityCheckResult:
    return IntegrityCheckResult(
        key="company_deregistration_blockers",
        ok=True,
        message="Terkin icin Python integrity detay kontrolu hazir.",
    )
