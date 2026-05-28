from __future__ import annotations

from typing import Any

from app.core.security import RequestContext


def service_context(context: RequestContext, tenant_id: str) -> dict[str, Any]:
    return {
        "tenant_id": tenant_id,
        "user_id": context.user_id,
        "user_email": context.auth_claims.get("email"),
        "module_key": "notifications",
        "permissions": context.permissions,
        "company_scope_ids": context.company_scope_ids,
        "writable_company_scope_ids": context.writable_company_scope_ids,
        "branch_scope_ids": context.branch_scope_ids,
        "is_internal": context.is_internal,
    }
