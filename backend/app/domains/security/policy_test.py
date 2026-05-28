# ruff: noqa: E501

from __future__ import annotations

import json

from app.core.errors import DomainError
from app.policies.access_context import (
    load_branch_scope,
    load_company_scope,
    load_effective_permissions,
)
from app.policies.permissions import get_permission_contract, resolve_permission_with_fallback

from .events import POLICY_TEST_RUN
from .schemas import PolicyTestRequest, PolicyTestResult
from .service import SecurityServiceContext, execute

ACTION_PERMISSION_MAP = {
    "company_opening": "companies.openingStart",
    "capital_increase": "companies.capitalIncreaseStart",
    "capital_decrease": "companies.capitalDecreaseStart",
    "branch_opening": "branches.openingStart",
    "branch_closing": "branches.closingStart",
    "initial_partnership_entry": "partners.ownershipStart",
    "share_transfer": "partners.ownershipStart",
    "ownership_reverse": "partners.ownershipReverse",
    "start_representation": "representatives.authorityStart",
    "terminate_representation": "representatives.authorityTerminate",
    "create_cari_transaction": "accounting.transactionCreate",
    "start_employment": "hr.employmentStart",
    "terminate_employment": "hr.employmentTerminate",
    "create_project_task": "tasks.create",
    "transition_project_task": "tasks.transition",
    "complete_service_record": "afterSales.serviceComplete",
    "create_stakeholder": "crm.create",
    "query_report": "reporting.view",
    "manage_users": "security.usersManage",
    "manage_roles": "security.rolesManage",
}


async def run_policy_test(ctx: SecurityServiceContext, request: PolicyTestRequest) -> PolicyTestResult:
    required_permission = request.permission_key or infer_permission_key(request.action_key)
    permissions = await _load_permissions(ctx, request.tested_user_id)
    company_scope, writable_company_scope = await _load_company_scope(ctx, request.tested_user_id)
    branch_scope = await _load_branch_scope(ctx, request.tested_user_id)

    reasons: list[str] = []
    warnings: list[str] = []
    permission_allowed = True
    checked_permissions: list[str] = []

    if required_permission:
        checked_permissions = resolve_permission_with_fallback(required_permission)
        permission_allowed = "*" in permissions or "system.admin" in permissions or bool(set(permissions).intersection(checked_permissions))
        if not permission_allowed:
            reasons.append("Bu kullanici bu islem icin gerekli yetkiye sahip degil.")
    else:
        warnings.append("Islem icin dogrudan permission eslestirmesi bulunamadi; sadece scope ve modul sinyalleri kontrol edildi.")

    scope_allowed = True
    needs_write_scope = _needs_write_scope(required_permission)
    if request.company_id and "system.admin" not in permissions:
        if not company_scope:
            scope_allowed = False
            reasons.append("Bu kullanici icin sirket erisim kapsami tanimli degil.")
        elif request.company_id not in company_scope:
            scope_allowed = False
            reasons.append("Kayit kullanicinin sirket erisim kapsami disinda.")
        elif needs_write_scope and request.company_id not in writable_company_scope:
            scope_allowed = False
            reasons.append("Bu kullanici sirketi gorebilir ancak bu islem icin yazma/operasyon kapsami yok.")

    if request.branch_id and branch_scope and request.branch_id not in branch_scope and "system.admin" not in permissions:
        scope_allowed = False
        reasons.append("Kayit kullanicinin sube erisim kapsami disinda.")

    module_allowed = True
    if request.module_key and required_permission:
        contract = get_permission_contract(required_permission)
        if contract and contract.module_key != request.module_key:
            module_allowed = False
            reasons.append("Secilen modul ile gerekli yetki eslesmiyor.")

    record_allowed = True
    if request.record_status in {"deleted", "archived"} and needs_write_scope:
        record_allowed = False
        reasons.append("Arsivlenmis veya silinmis kayit uzerinde bu islem baslatilamaz.")

    allowed = permission_allowed and scope_allowed and module_allowed and record_allowed
    if allowed:
        reasons.append("Bu kullanici bu islemi belirtilen kapsamda yapabilir.")

    await _log_policy_test(ctx, request, allowed, reasons)

    return PolicyTestResult(
        allowed=allowed,
        decision="allowed" if allowed else "denied",
        reasons=reasons,
        warnings=warnings,
        permission_result={
            "required_permission": required_permission,
            "checked_permissions": checked_permissions,
            "has_permission": permission_allowed,
        },
        scope_result={
            "company_scope": company_scope,
            "writable_company_scope": writable_company_scope,
            "branch_scope": branch_scope,
            "scope_allowed": scope_allowed,
        },
        module_result={
            "module_key": request.module_key,
            "module_allowed": module_allowed,
        },
        policy_result={
            "record_status": request.record_status,
            "record_allowed": record_allowed,
        },
    )


def infer_permission_key(action_key: str | None) -> str | None:
    if not action_key:
        return None
    if get_permission_contract(action_key):
        return action_key
    return ACTION_PERMISSION_MAP.get(action_key)


async def _load_permissions(ctx: SecurityServiceContext, user_id: str) -> list[str]:
    if ctx.request_context.user_id == user_id:
        return ctx.request_context.permissions
    try:
        return await load_effective_permissions(ctx.session, ctx.tenant_id, user_id)
    except DomainError:
        return []


async def _load_company_scope(ctx: SecurityServiceContext, user_id: str) -> tuple[list[str], list[str]]:
    try:
        return await load_company_scope(ctx.session, ctx.tenant_id, user_id)
    except DomainError:
        return [], []


async def _load_branch_scope(ctx: SecurityServiceContext, user_id: str) -> list[str]:
    try:
        return await load_branch_scope(ctx.session, ctx.tenant_id, user_id)
    except DomainError:
        return []


def _needs_write_scope(permission_key: str | None) -> bool:
    if not permission_key:
        return False
    contract = get_permission_contract(permission_key)
    if not contract:
        return any(token in permission_key for token in ("edit", "Start", "Manage", "create", "delete"))
    return contract.category in {"edit", "operation", "approval", "admin"}


async def _log_policy_test(ctx: SecurityServiceContext, request: PolicyTestRequest, allowed: bool, reasons: list[str]) -> None:
    try:
        await execute(
            ctx,
            """
            insert into security_policy_test_logs
              (tenant_id, tested_user_id, action_key, resource_type, resource_id, result, reasons, tested_by)
            values
              (:tenant_id, :tested_user_id, :action_key, :resource_type, :resource_id, :result, cast(:reasons as jsonb), :tested_by)
            returning id
            """,
            {
                "tenant_id": ctx.tenant_id,
                "tested_user_id": request.tested_user_id,
                "action_key": request.action_key or request.permission_key,
                "resource_type": request.record_type,
                "resource_id": request.record_id,
                "result": "allowed" if allowed else "denied",
                "reasons": json.dumps(reasons),
                "tested_by": ctx.request_context.user_id,
            },
        )
    except DomainError:
        ctx.warnings.append(f"{POLICY_TEST_RUN} loglanamadi.")
