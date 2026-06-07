from __future__ import annotations

# ruff: noqa: I001


ACTIVE_LICENSE_STATUSES = {"trial", "active", "past_due", "development", "internal"}
BLOCKED_LICENSE_STATUSES = {"suspended", "cancelled", "expired", "archived"}


def can_activate_license(status: str, *, has_critical_validation_issue: bool = False) -> bool:
    if has_critical_validation_issue:
        return False
    return status not in BLOCKED_LICENSE_STATUSES


def hard_delete_allowed_for_plan(plan_key: str, tenant_type: str | None = None) -> bool:
    return plan_key == "development" or tenant_type in {"development", "demo"}
