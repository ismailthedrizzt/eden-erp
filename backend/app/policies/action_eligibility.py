from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.features.registry import is_feature_enabled
from app.integrity.checker import run_integrity_for_operation
from app.policies.policy_engine import evaluate_policy
from app.policies.schemas import AccessContext, ActionEligibility, PolicyInput
from app.setup.readiness_checker import check_module_readiness

ACTION_DEFINITIONS: dict[str, dict[str, Any]] = {
    "company_opening": {
        "module_key": "companies",
        "required_permissions": ["companies.openingStart"],
        "readiness_modules": ["companies"],
        "target_page": "/app/sirket/companies",
        "wizard_key": "company_opening",
        "required_record_status": ["draft", "taslak"],
    },
    "company_liquidation": {
        "module_key": "companies",
        "required_permissions": ["companies.liquidationStart"],
        "readiness_modules": ["companies"],
        "target_page": "/app/sirket/companies",
        "wizard_key": "company_liquidation",
        "required_record_status": ["active", "aktif", "opened", "open"],
    },
    "company_deregistration": {
        "module_key": "companies",
        "required_permissions": ["companies.deregistrationStart"],
        "readiness_modules": ["companies"],
        "target_page": "/app/sirket/companies",
        "wizard_key": "company_deregistration",
    },
    "title_change": {
        "module_key": "companies",
        "required_permissions": ["companies.officialChangeStart"],
        "readiness_modules": ["companies"],
        "target_page": "/app/sirket/companies",
        "wizard_key": "title_change",
        "required_record_status": ["active", "aktif", "opened", "open"],
    },
    "address_change": {
        "module_key": "companies",
        "required_permissions": ["companies.officialChangeStart"],
        "readiness_modules": ["companies"],
        "target_page": "/app/sirket/companies",
        "wizard_key": "address_change",
        "required_record_status": ["active", "aktif", "opened", "open"],
    },
    "public_registration_update": {
        "module_key": "companies",
        "required_permissions": ["companies.officialChangeStart"],
        "readiness_modules": ["companies"],
        "target_page": "/app/sirket/companies",
        "wizard_key": "public_registration_update",
        "required_record_status": ["active", "aktif", "opened", "open"],
    },
    "nace_change": {
        "module_key": "companies",
        "required_permissions": ["companies.officialChangeStart"],
        "readiness_modules": ["companies"],
        "target_page": "/app/sirket/companies",
        "wizard_key": "nace_change",
        "required_record_status": ["active", "aktif", "opened", "open"],
    },
    "activity_subject_change": {
        "module_key": "companies",
        "required_permissions": ["companies.officialChangeStart"],
        "readiness_modules": ["companies"],
        "target_page": "/app/sirket/companies",
        "wizard_key": "activity_subject_change",
        "required_record_status": ["active", "aktif", "opened", "open"],
    },
    "capital_increase": {
        "module_key": "partners",
        "required_permissions": ["companies.capitalIncreaseStart"],
        "readiness_modules": ["companies", "partners"],
        "integrity_operation": "capital_increase",
        "target_page": "/app/sirket/companies",
        "wizard_key": "capital_increase",
        "required_record_status": ["active", "aktif", "opened", "open"],
        "dependency_reason": (
            "Sermaye Artirimi icin Ortaklarimiz modulu ve guncel ortaklik "
            "dagilimi gereklidir."
        ),
    },
    "capital_decrease": {
        "module_key": "partners",
        "required_permissions": ["companies.capitalDecreaseStart"],
        "readiness_modules": ["companies", "partners"],
        "integrity_operation": "capital_decrease",
        "target_page": "/app/sirket/companies",
        "wizard_key": "capital_decrease",
        "required_record_status": ["active", "aktif", "opened", "open"],
        "dependency_reason": (
            "Sermaye Azaltimi icin Ortaklarimiz modulu ve guncel ortaklik "
            "dagilimi gereklidir."
        ),
    },
    "branch_opening": {
        "module_key": "branches",
        "required_permissions": ["branches.openingStart"],
        "readiness_modules": ["companies", "branches"],
        "integrity_operation": "branch_opening",
        "target_page": "/app/sirket/companies/branches",
        "wizard_key": "branch_opening",
        "required_record_status": ["active", "aktif", "opened", "open"],
    },
    "branch_closing": {
        "module_key": "branches",
        "required_permissions": ["branches.closingStart"],
        "readiness_modules": ["companies", "branches"],
        "integrity_operation": "branch_closing",
        "target_page": "/app/sirket/companies/branches",
        "wizard_key": "branch_closing",
        "required_record_status": ["active", "aktif", "opened", "open"],
    },
    "branch_document_update": {
        "module_key": "branches",
        "required_permissions": ["branches.documentsUpdate"],
        "readiness_modules": ["branches"],
        "target_page": "/app/sirket/companies/branches",
        "wizard_key": "branch_document_update",
    },
    "representative_start": {
        "module_key": "representatives",
        "required_permissions": ["representatives.authorityStart"],
        "readiness_modules": ["companies", "representatives"],
        "integrity_operation": "representative_authority",
        "target_page": "/app/sirket/companies/representatives",
        "wizard_key": "representative_start",
    },
    "representative_authority_scope_change": {
        "module_key": "representatives",
        "required_permissions": ["representatives.authorityUpdate"],
        "readiness_modules": ["companies", "representatives"],
        "integrity_operation": "representative_authority",
        "target_page": "/app/sirket/companies/representatives",
        "wizard_key": "representative_authority_scope_change",
        "feature_flag": "representatives.scopeAuthority",
    },
    "representative_limit_change": {
        "module_key": "representatives",
        "required_permissions": ["representatives.authorityUpdate"],
        "readiness_modules": ["companies", "representatives"],
        "integrity_operation": "representative_authority",
        "target_page": "/app/sirket/companies/representatives",
        "wizard_key": "representative_limit_change",
    },
    "representative_suspend": {
        "module_key": "representatives",
        "required_permissions": ["representatives.authoritySuspend"],
        "readiness_modules": ["companies", "representatives"],
        "integrity_operation": "representative_authority",
        "target_page": "/app/sirket/companies/representatives",
        "wizard_key": "representative_suspend",
    },
    "representative_terminate": {
        "module_key": "representatives",
        "required_permissions": ["representatives.authorityTerminate"],
        "readiness_modules": ["companies", "representatives"],
        "integrity_operation": "representative_authority",
        "target_page": "/app/sirket/companies/representatives",
        "wizard_key": "representative_terminate",
    },
    "initial_partnership_entry": {
        "module_key": "partners",
        "required_permissions": ["partners.ownershipStart"],
        "readiness_modules": ["companies", "partners"],
        "integrity_operation": "ownership_transaction",
        "target_page": "/app/sirket/companies/partners",
        "wizard_key": "initial_partnership_entry",
    },
    "share_transfer": {
        "module_key": "partners",
        "required_permissions": ["partners.ownershipStart"],
        "readiness_modules": ["companies", "partners"],
        "integrity_operation": "ownership_transaction",
        "target_page": "/app/sirket/companies/partners",
        "wizard_key": "share_transfer",
    },
    "ownership_exit": {
        "module_key": "partners",
        "required_permissions": ["partners.ownershipStart"],
        "readiness_modules": ["companies", "partners"],
        "integrity_operation": "ownership_transaction",
        "target_page": "/app/sirket/companies/partners",
        "wizard_key": "ownership_exit",
    },
    "ownership_correction": {
        "module_key": "partners",
        "required_permissions": ["partners.ownershipStart"],
        "readiness_modules": ["companies", "partners"],
        "integrity_operation": "ownership_transaction",
        "target_page": "/app/sirket/companies/partners",
        "wizard_key": "ownership_correction",
    },
    "partner_rights_change": {
        "module_key": "partners",
        "required_permissions": ["partners.ownershipStart"],
        "readiness_modules": ["companies", "partners"],
        "integrity_operation": "ownership_transaction",
        "target_page": "/app/sirket/companies/partners",
        "wizard_key": "partner_rights_change",
    },
}


async def evaluate_action_eligibility(
    session: AsyncSession,
    context: AccessContext,
    action_key: str,
    resource: dict[str, Any] | None = None,
) -> ActionEligibility:
    definition = ACTION_DEFINITIONS.get(action_key)
    if not definition:
        return ActionEligibility(
            action_key=action_key,
            can_view=False,
            can_start=False,
            disabled=True,
            reason="Bu islem tanimli degil.",
            details={"code": "ACTION_NOT_FOUND"},
        )

    warnings: list[str] = []
    resource_data = resource or {}
    feature_key = definition.get("feature_flag")
    if feature_key and not is_feature_enabled(context.tenant_id, str(feature_key)):
        return ActionEligibility(
            action_key=action_key,
            can_view=True,
            can_start=False,
            disabled=True,
            reason="Bu ozellik calisma alaninizda su anda kapali.",
            target_page=definition.get("target_page"),
            wizard_key=definition.get("wizard_key"),
            required_record_status=list(definition.get("required_record_status", [])),
            details={"code": "FEATURE_DISABLED", "feature_key": feature_key},
        )

    for module_key in list(definition["readiness_modules"]):
        readiness = await check_module_readiness(session, context.tenant_id, module_key)
        if not readiness.ok:
            return ActionEligibility(
                action_key=action_key,
                can_view=True,
                can_start=False,
                disabled=True,
                reason=str(definition.get("dependency_reason") or readiness.message),
                warnings=readiness.warnings,
                target_page=definition.get("target_page"),
                wizard_key=definition.get("wizard_key"),
                required_record_status=list(definition.get("required_record_status", [])),
                details={
                    "code": "MODULE_SETUP_REQUIRED",
                    "readiness": readiness.model_dump(),
                },
            )
        warnings.extend(readiness.warnings)

    policy = evaluate_policy(
        PolicyInput(
            context=context,
            action_key=action_key,
            module_key=definition["module_key"],
            resource=resource_data,
            required_permissions=list(definition["required_permissions"]),
            required_record_status=list(definition.get("required_record_status", [])),
        )
    )
    if not policy.allowed:
        return ActionEligibility(
            action_key=action_key,
            can_view=True,
            can_start=False,
            disabled=True,
            reason=policy.message,
            warnings=warnings + policy.warnings,
            target_page=definition.get("target_page"),
            wizard_key=definition.get("wizard_key"),
            required_record_status=list(definition.get("required_record_status", [])),
            details={"code": policy.code, "policy": policy.model_dump()},
        )

    integrity_key = str(definition.get("integrity_operation") or "")
    if integrity_key:
        integrity = await run_integrity_for_operation(
            session,
            context,
            integrity_key,
            resource_data,
        )
        if not integrity.ok:
            return ActionEligibility(
                action_key=action_key,
                can_view=True,
                can_start=False,
                disabled=True,
                reason=integrity.blocking_reasons[0]
                if integrity.blocking_reasons
                else "Veri tutarliligi nedeniyle islem baslatilamaz.",
                warnings=warnings + integrity.warnings,
                target_page=definition.get("target_page"),
                wizard_key=definition.get("wizard_key"),
                required_record_status=list(definition.get("required_record_status", [])),
                details={
                    "code": "INTEGRITY_BLOCKING",
                    "integrity": integrity.model_dump(),
                },
            )
        warnings.extend(integrity.warnings)

    return ActionEligibility(
        action_key=action_key,
        can_view=True,
        can_start=True,
        disabled=False,
        reason=None,
        warnings=warnings,
        target_page=definition.get("target_page"),
        wizard_key=definition.get("wizard_key"),
        required_record_status=list(definition.get("required_record_status", [])),
    )
