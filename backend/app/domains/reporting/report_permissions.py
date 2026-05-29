# ruff: noqa: E501

from __future__ import annotations

from typing import Any

from fastapi import status

from app.core.errors import DomainError
from app.domains.reporting.reports import REPORT_DEFINITIONS
from app.domains.reporting.service import ReportingQueryContext, can

SENSITIVE_REPORT_PERMISSIONS = {
    "accounting": "reporting.viewFinancial",
    "hr": "reporting.viewHR",
    "audit": "reporting.viewAuditSummary",
    "system": "reporting.viewSystem",
}


def assert_report_view_allowed(ctx: ReportingQueryContext, report_key: str, *, required_permissions: list[str] | None = None) -> None:
    if can(ctx.request_context, "reporting.admin"):
        return
    item = REPORT_DEFINITIONS.get(report_key)
    permissions = list(required_permissions or [])
    if item:
        permissions.append(str(item["permission"]))
        special_permission = SENSITIVE_REPORT_PERMISSIONS.get(str(item["module_key"]))
        if special_permission:
            permissions.append(special_permission)
    if not permissions:
        permissions.append("reporting.view")
    missing = [permission for permission in permissions if not can(ctx.request_context, permission)]
    if missing:
        raise DomainError("Bu rapor icin yetkiniz bulunmuyor.", "REPORT_PERMISSION_DENIED", status.HTTP_403_FORBIDDEN, {"missing_permissions": missing})


def assert_report_export_allowed(ctx: ReportingQueryContext, report_key: str, *, required_permissions: list[str] | None = None) -> None:
    if not can(ctx.request_context, "reporting.export") and not can(ctx.request_context, "reporting.admin"):
        raise DomainError("Rapor export icin yetkiniz bulunmuyor.", "REPORT_EXPORT_PERMISSION_DENIED", status.HTTP_403_FORBIDDEN)
    assert_report_view_allowed(ctx, report_key, required_permissions=required_permissions)


def can_access_saved_view(ctx: ReportingQueryContext, row: dict[str, Any]) -> bool:
    if can(ctx.request_context, "reporting.admin"):
        return True
    user_id = str(ctx.request_context.user_id or "")
    if str(row.get("owner_user_id") or "") == user_id:
        return True
    visibility = row.get("visibility")
    if visibility == "tenant_shared" and can(ctx.request_context, "reporting.savedViewsManage"):
        return True
    if visibility == "shared_with_users" and user_id in {str(item) for item in row.get("shared_user_ids") or []}:
        return True
    if visibility == "shared_with_role":
        claim_roles = ctx.request_context.auth_claims.get("role_ids") or ctx.request_context.auth_claims.get("roles") or []
        return bool({str(item) for item in claim_roles} & {str(item) for item in row.get("shared_role_ids") or []})
    return False


def assert_saved_view_access(ctx: ReportingQueryContext, row: dict[str, Any], *, write: bool = False) -> None:
    if write and not (can(ctx.request_context, "reporting.admin") or str(row.get("owner_user_id") or "") == str(ctx.request_context.user_id or "")):
        raise DomainError("Bu gorunumu guncelleme yetkiniz bulunmuyor.", "SAVED_VIEW_WRITE_DENIED", status.HTTP_403_FORBIDDEN)
    if not can_access_saved_view(ctx, row):
        raise DomainError("Kayitli gorunum erisim kapsaminiz disinda.", "SAVED_VIEW_ACCESS_DENIED", status.HTTP_403_FORBIDDEN)
