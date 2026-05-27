from __future__ import annotations

from fastapi import HTTPException, status

from app.core.config import get_settings
from app.policies.permissions import resolve_permission_with_fallback
from app.policies.schemas import AccessContext, PolicyDecision, PolicyInput


def allow_decision(
    *,
    required_permissions: list[str] | None = None,
    checked_permissions: list[str] | None = None,
    warnings: list[str] | None = None,
    scope: dict[str, object] | None = None,
) -> PolicyDecision:
    return PolicyDecision(
        allowed=True,
        code="ALLOWED",
        message="Islem baslatilabilir.",
        warnings=warnings or [],
        required_permissions=required_permissions or [],
        checked_permissions=checked_permissions or [],
        scope=scope or {},
    )


def deny_decision(
    code: str,
    message: str,
    reasons: list[str] | None = None,
    *,
    required_permissions: list[str] | None = None,
    checked_permissions: list[str] | None = None,
    warnings: list[str] | None = None,
    scope: dict[str, object] | None = None,
) -> PolicyDecision:
    return PolicyDecision(
        allowed=False,
        code=code,
        message=message,
        reasons=reasons or [message],
        warnings=warnings or [],
        required_permissions=required_permissions or [],
        checked_permissions=checked_permissions or [],
        scope=scope or {},
    )


def _has_permission(context: AccessContext, required_permission: str) -> tuple[bool, list[str]]:
    accepted = resolve_permission_with_fallback(required_permission)
    permissions = set(context.permissions)
    if "*" in permissions or "system.admin" in permissions:
        return True, accepted
    return bool(permissions.intersection(accepted)), accepted


def _scope_denied(context: AccessContext, resource: dict[str, object] | None) -> str | None:
    if not resource:
        return None
    company_id = resource.get("company_id")
    if company_id and not context.company_scope:
        settings = get_settings()
        if settings.effective_auth_required or not settings.is_development:
            return "Bu kayit erisim kapsaminiz disinda."
    if context.company_scope and company_id and str(company_id) not in context.company_scope:
        return "Bu kayit erisim kapsaminiz disinda."
    branch_id = resource.get("branch_id")
    if context.branch_scope and branch_id and str(branch_id) not in context.branch_scope:
        return "Bu kayit erisim kapsaminiz disinda."
    return None


def evaluate_policy(input_data: PolicyInput) -> PolicyDecision:
    context = input_data.context
    if not context.tenant_id:
        return deny_decision(
            "WORKSPACE_CONTEXT_REQUIRED",
            "Calisma alani bilgisi alinamadi.",
        )
    checked_permissions: list[str] = []
    for required in input_data.required_permissions:
        allowed, checked = _has_permission(context, required)
        checked_permissions.extend(checked)
        if not allowed:
            return deny_decision(
                "PERMISSION_DENIED",
                "Bu islemi yapmak icin gerekli yetkiniz bulunmuyor.",
                required_permissions=input_data.required_permissions,
                checked_permissions=checked_permissions,
            )

    scope_reason = _scope_denied(context, input_data.resource)
    if scope_reason:
        return deny_decision(
            "SCOPE_DENIED",
            scope_reason,
            scope={
                "company_scope": context.company_scope or [],
                "branch_scope": context.branch_scope or [],
            },
        )

    record_status = (
        input_data.resource or {}
    ).get("record_status") or context.record_status
    if record_status and input_data.required_record_status:
        if str(record_status) not in input_data.required_record_status:
            return deny_decision(
                "POLICY_DENIED",
                "Bu islem mevcut kayit durumu nedeniyle baslatilamaz.",
                [f"Beklenen kayit durumu: {', '.join(input_data.required_record_status)}"],
            )
    if record_status and str(record_status) in input_data.blocked_record_status:
        return deny_decision(
            "POLICY_DENIED",
            "Bu islem mevcut kayit durumu veya yetkileriniz nedeniyle baslatilamaz.",
        )

    if input_data.resource and bool(input_data.resource.get("is_deleted")):
        return deny_decision("POLICY_DENIED", "Silinmis kayit uzerinde islem yapilamaz.")

    return allow_decision(
        required_permissions=input_data.required_permissions,
        checked_permissions=checked_permissions,
        scope={
            "tenant_id": context.tenant_id,
            "company_id": context.company_id,
            "branch_id": context.branch_id,
        },
    )


def policy_to_http_exception(decision: PolicyDecision) -> HTTPException:
    status_code = status.HTTP_403_FORBIDDEN
    if decision.code == "WORKSPACE_CONTEXT_REQUIRED":
        status_code = status.HTTP_401_UNAUTHORIZED
    if decision.code == "POLICY_DENIED":
        status_code = status.HTTP_409_CONFLICT
    return HTTPException(
        status_code=status_code,
        detail={
            "error": decision.message,
            "code": decision.code,
            "details": decision.model_dump(mode="json"),
            "message": decision.message,
        },
    )


def assert_policy(input_data: PolicyInput) -> PolicyDecision:
    decision = evaluate_policy(input_data)
    if not decision.allowed:
        raise policy_to_http_exception(decision)
    return decision
