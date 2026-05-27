from __future__ import annotations

from app.integrity.schemas import IntegrityCheckResult


def facility_active_dependents_result(count: int) -> IntegrityCheckResult:
    if count > 0:
        message = "Tesise bagli aktif kayitlar etkilenebilir."
        return IntegrityCheckResult(
            key="facility_active_dependents",
            ok=True,
            severity="warning",
            message=message,
            warnings=[message],
            metadata={"active_dependents": count},
        )
    return IntegrityCheckResult(
        key="facility_active_dependents",
        ok=True,
        message="Aktif tesis bagimliligi yok.",
    )


def branch_facility_address_warning_result(address_matches: bool) -> IntegrityCheckResult:
    if not address_matches:
        message = "Sube adresi ile tesis adresi farkli olabilir."
        return IntegrityCheckResult(
            key="branch_facility_address_warning",
            ok=True,
            severity="warning",
            message=message,
            warnings=[message],
        )
    return IntegrityCheckResult(
        key="branch_facility_address_warning",
        ok=True,
        message="Sube ve tesis adres bilgileri uyumlu.",
    )
