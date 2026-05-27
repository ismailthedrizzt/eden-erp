from __future__ import annotations

from typing import Any

from app.integrity.messages import SCOPE_TARGET_CLOSED
from app.integrity.schemas import IntegrityCheckResult

CLOSED_SCOPE_STATUSES = {"closed", "kapali", "passive", "pasif", "terminated"}


def representative_scope_not_closed_result(
    scope_target: dict[str, Any] | None,
) -> IntegrityCheckResult:
    status = str(
        (scope_target or {}).get("record_status")
        or (scope_target or {}).get("status")
        or ""
    ).lower()
    if status in CLOSED_SCOPE_STATUSES:
        return IntegrityCheckResult(
            key="representative_scope_not_closed",
            ok=False,
            severity="blocking",
            message=SCOPE_TARGET_CLOSED,
            reasons=[SCOPE_TARGET_CLOSED],
            metadata={"status": status},
        )
    return IntegrityCheckResult(
        key="representative_scope_not_closed",
        ok=True,
        message="Temsil yetkisi kapsami aktif.",
    )


def representative_authority_no_conflict_result(conflict_found: bool) -> IntegrityCheckResult:
    if conflict_found:
        message = "Ayni temsilci, kapsam ve yetki turu icin aktif cakisma var."
        return IntegrityCheckResult(
            key="representative_authority_no_conflict",
            ok=False,
            severity="blocking",
            message=message,
            reasons=[message],
        )
    return IntegrityCheckResult(
        key="representative_authority_no_conflict",
        ok=True,
        message="Temsil yetkisi cakismasi yok.",
    )
