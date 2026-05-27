from __future__ import annotations

from app.integrity.schemas import IntegrityCheckResult


def organization_unit_no_cycle_result(cycle_found: bool) -> IntegrityCheckResult:
    if cycle_found:
        message = "Organizasyon birimi tasimasi dongu olusturamaz."
        return IntegrityCheckResult(
            key="organization_unit_no_cycle",
            ok=False,
            severity="blocking",
            message=message,
            reasons=[message],
        )
    return IntegrityCheckResult(
        key="organization_unit_no_cycle",
        ok=True,
        message="Organizasyon hiyerarsisi dongu olusturmuyor.",
    )


def organization_active_dependents_result(count: int) -> IntegrityCheckResult:
    if count > 0:
        message = "Organizasyon birimine bagli aktif kayitlar etkilenebilir."
        return IntegrityCheckResult(
            key="organization_unit_active_dependents",
            ok=True,
            severity="warning",
            message=message,
            warnings=[message],
            metadata={"active_dependents": count},
        )
    return IntegrityCheckResult(
        key="organization_unit_active_dependents",
        ok=True,
        message="Aktif organizasyon bagimliligi yok.",
    )
