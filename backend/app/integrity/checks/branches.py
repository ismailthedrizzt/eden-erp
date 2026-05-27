from __future__ import annotations

from typing import Any

from app.integrity.messages import BRANCH_ALREADY_CLOSED
from app.integrity.schemas import IntegrityCheckResult

ACTIVE_BRANCH_STATUSES = {"active", "aktif", "open", "opened"}
CLOSED_BRANCH_STATUSES = {"closed", "kapali", "passive", "pasif", "terminated"}


def branch_can_close_result(branch: dict[str, Any] | None) -> IntegrityCheckResult:
    status = str(
        (branch or {}).get("record_status") or (branch or {}).get("status") or ""
    ).lower()
    if status in CLOSED_BRANCH_STATUSES:
        return IntegrityCheckResult(
            key="branch_can_close",
            ok=False,
            severity="blocking",
            message=BRANCH_ALREADY_CLOSED,
            reasons=[BRANCH_ALREADY_CLOSED],
            metadata={"status": status},
        )
    return IntegrityCheckResult(
        key="branch_can_close",
        ok=True,
        message="Sube kapanis icin uygun.",
        metadata={"status": status},
    )


def duplicate_branch_name_result(duplicate_found: bool) -> IntegrityCheckResult:
    if duplicate_found:
        message = "Ayni isimde aktif sube bulundugu icin sube acilisi baslatilamaz."
        return IntegrityCheckResult(
            key="branch_duplicate_active_name",
            ok=False,
            severity="blocking",
            message=message,
            reasons=[message],
        )
    return IntegrityCheckResult(
        key="branch_duplicate_active_name",
        ok=True,
        message="Aktif sube adi cakismasi yok.",
    )


def branch_scope_impact_result(has_active_authorities: bool) -> IntegrityCheckResult:
    if has_active_authorities:
        message = "Subeye bagli aktif temsil yetkileri etkilenebilir."
        return IntegrityCheckResult(
            key="branch_representative_scope_impact",
            ok=True,
            severity="warning",
            message=message,
            warnings=[message],
        )
    return IntegrityCheckResult(
        key="branch_representative_scope_impact",
        ok=True,
        message="Sube temsil yetkisi etkisi bulunmadi.",
    )
