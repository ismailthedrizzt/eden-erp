# ruff: noqa: E501

from __future__ import annotations

import json
from typing import Any

from fastapi import status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.errors import DomainError
from app.core.serialization import row_to_dict, rows_to_dicts
from app.domains.admin.events import (
    ADMIN_FEATURE_FLAG_UPDATED,
    ADMIN_INTEGRATION_TESTED,
    ADMIN_MODULE_ACTIVATION_UPDATED,
    ADMIN_OUTBOX_DISPATCHED,
    ADMIN_OUTBOX_RETRIED,
    ADMIN_SETTINGS_UPDATED,
)
from app.domains.admin.feature_flags import list_admin_features, update_admin_feature
from app.domains.admin.integrations import integration_statuses, test_integration
from app.domains.admin.module_admin import set_module_activation
from app.domains.admin.schemas import (
    AdminSettingsUpdate,
    FeatureFlagAdminUpdateRequest,
    IntegrationTestRequest,
    ModuleActivationAdminRequest,
    WorkspaceSettingsUpdate,
)
from app.domains.admin.settings import get_workspace_settings, upsert_workspace_settings
from app.domains.admin.system_health import admin_health, deep_admin_health, outbox_summary
from app.domains.audit.service import record_audit_required
from app.domains.operations.service import table_exists
from app.domains.outbox.service import dispatch_pending_events
from app.features.registry import list_feature_flags
from app.setup.readiness_checker import check_module_readiness, check_tenant_readiness
from app.setup.readiness_registry import list_readiness_definitions


def admin_context(context: dict[str, Any], tenant_id: str) -> dict[str, Any]:
    return {
        "tenant_id": tenant_id,
        "user_id": context.get("user_id"),
        "module_key": "adminConsole",
        "request_id": context.get("request_id"),
    }


async def admin_dashboard(session: AsyncSession, context: dict[str, Any]) -> dict[str, Any]:
    tenant_id = str(context["tenant_id"])
    workspace = await get_workspace_settings(session, tenant_id)
    readiness = await check_tenant_readiness(session, tenant_id)
    outbox = await outbox_summary(session, tenant_id)
    features = list_feature_flags()
    return {
        "workspace": workspace,
        "summary": {
            "modules_total": len(readiness.modules),
            "modules_ready": sum(1 for module in readiness.modules.values() if module.ok),
            "modules_setup_required": sum(1 for module in readiness.modules.values() if not module.ok),
            "feature_flags_total": len(features),
            "outbox_failed": (
                int(outbox.get("counts", {}).get("failed", 0))
                + int(outbox.get("counts", {}).get("dead_letter", 0))
            )
            if outbox.get("available")
            else 0,
            "outbox_pending": int(outbox.get("counts", {}).get("pending", 0)) if outbox.get("available") else 0,
            "critical_warnings": len(readiness.warnings),
        },
        "warnings": readiness.warnings[:8],
        "quick_links": _quick_links(),
        "safety": {
            "secrets_visible": False,
            "technical_details_admin_only": True,
            "risky_changes_audited": True,
        },
    }


async def update_workspace(
    session: AsyncSession,
    context: dict[str, Any],
    payload: WorkspaceSettingsUpdate,
) -> dict[str, Any]:
    row = await upsert_workspace_settings(
        session,
        str(context["tenant_id"]),
        context.get("user_id"),
        payload,
    )
    await _audit(session, context, "workspace_settings_updated", row)
    return row


async def list_admin_modules(session: AsyncSession, context: dict[str, Any]) -> dict[str, Any]:
    tenant_id = str(context["tenant_id"])
    readiness = await check_tenant_readiness(session, tenant_id)
    modules = [
        await module_payload(session, context, key)
        for key in readiness.modules
    ]
    return {
        "modules": modules,
        "summary": {
            "total": len(modules),
            "enabled": sum(1 for module in modules if module.get("enabled")),
            "setup_required": sum(1 for module in modules if module.get("readiness_status") != "ready"),
            "available": sum(1 for module in modules if module.get("status") == "available"),
        },
    }


async def module_payload(
    session: AsyncSession,
    context: dict[str, Any],
    module_key: str,
) -> dict[str, Any]:
    tenant_id = str(context["tenant_id"])
    valid_keys = {definition.module_key for definition in list_readiness_definitions()}
    if module_key not in valid_keys:
        raise DomainError("Modul bulunamadi.", "MODULE_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    readiness = await check_module_readiness(session, tenant_id, module_key)
    activation = await _module_activation_from_settings(session, tenant_id, module_key)
    enabled = True if activation is None else activation
    license_status = "included"
    return {
        "module_key": module_key,
        "name": _module_label(module_key),
        "category": _module_category(module_key),
        "enabled": enabled,
        "license_status": license_status,
        "readiness_status": readiness.status,
        "status": _module_status(enabled, license_status, readiness.ok, readiness.missing_dependencies),
        "dependencies": readiness.missing_dependencies,
        "warnings": readiness.warnings,
        "blocking_reasons": [] if readiness.ok else [readiness.message],
        "setup_steps": readiness.setup_steps,
        "feature_count": len(list_feature_flags(module_key)),
        "feature_flags": await list_admin_features(session, tenant_id, module_key),
    }


async def update_module_activation(
    session: AsyncSession,
    context: dict[str, Any],
    module_key: str,
    payload: ModuleActivationAdminRequest,
) -> dict[str, Any]:
    tenant_id = str(context["tenant_id"])
    if module_key not in {definition.module_key for definition in list_readiness_definitions()}:
        raise DomainError("Modul bulunamadi.", "MODULE_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    await upsert_admin_setting(
        session,
        context,
        f"module_activation:{module_key}",
        {"enabled": payload.enabled, "reason": payload.reason},
    )
    set_module_activation(tenant_id, module_key, payload.enabled)
    data = await module_payload(session, context, module_key)
    await _audit(session, context, "module_activation_updated", data)
    await _outbox(session, context, ADMIN_MODULE_ACTIVATION_UPDATED, data)
    return data


async def list_features(session: AsyncSession, context: dict[str, Any]) -> dict[str, Any]:
    tenant_id = str(context["tenant_id"])
    features = await list_admin_features(session, tenant_id)
    return {
        "features": features,
        "summary": {
            "total": len(features),
            "enabled": sum(1 for item in features if item.get("enabled")),
            "disabled": sum(1 for item in features if not item.get("enabled")),
            "risky": sum(1 for item in features if item.get("risk") in {"high", "critical"}),
        },
    }


async def update_feature(
    session: AsyncSession,
    context: dict[str, Any],
    feature_key: str,
    payload: FeatureFlagAdminUpdateRequest,
) -> dict[str, Any]:
    row = await update_admin_feature(
        session,
        str(context["tenant_id"]),
        context.get("user_id"),
        feature_key,
        payload.enabled,
        payload.reason,
    )
    if row is None:
        raise DomainError("Ozellik bulunamadi.", "FEATURE_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    await _audit(session, context, "feature_flag_updated", row)
    await _outbox(session, context, ADMIN_FEATURE_FLAG_UPDATED, row)
    return row


async def list_integrations(session: AsyncSession, context: dict[str, Any]) -> dict[str, Any]:
    integrations = await integration_statuses(session, str(context["tenant_id"]))
    return {
        "integrations": integrations,
        "summary": {
            "configured": sum(1 for item in integrations if item["status"] == "configured"),
            "missing": sum(1 for item in integrations if item["status"] == "missing"),
            "disabled": sum(1 for item in integrations if item["status"] == "disabled"),
        },
    }


async def run_integration_test(
    session: AsyncSession,
    context: dict[str, Any],
    integration_key: str,
    payload: IntegrationTestRequest,
) -> dict[str, Any]:
    _ = payload
    result = await test_integration(session, str(context["tenant_id"]), integration_key)
    await _audit(session, context, "integration_tested", result)
    await _outbox(session, context, ADMIN_INTEGRATION_TESTED, result)
    return result


async def get_health(session: AsyncSession, context: dict[str, Any]) -> dict[str, Any]:
    return await admin_health(session, str(context["tenant_id"]))


async def get_deep_health(session: AsyncSession, context: dict[str, Any]) -> dict[str, Any]:
    return await deep_admin_health(session, str(context["tenant_id"]))


async def get_outbox(session: AsyncSession, context: dict[str, Any]) -> dict[str, Any]:
    return await outbox_summary(session, str(context["tenant_id"]))


async def retry_outbox_event(
    session: AsyncSession,
    context: dict[str, Any],
    event_id: str,
) -> dict[str, Any]:
    if not await table_exists(session, "public.outbox_events"):
        raise DomainError("Outbox altyapisi hazir degil.", "OUTBOX_NOT_READY", status.HTTP_409_CONFLICT)
    result = await session.execute(
        text(
            """
            update public.outbox_events
            set status = 'pending',
                locked_at = null,
                locked_by = null,
                error_json = null,
                updated_at = now()
            where tenant_id = :tenant_id
              and id::text = :event_id
            returning id, event_type, aggregate_type, aggregate_id, status
            """
        ),
        {"tenant_id": context["tenant_id"], "event_id": event_id},
    )
    row = row_to_dict(result.mappings().one_or_none())
    if not row:
        raise DomainError("Outbox olayi bulunamadi.", "OUTBOX_EVENT_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    await _audit(session, context, "outbox_retry", row)
    await _outbox(session, context, ADMIN_OUTBOX_RETRIED, row)
    return row


async def dispatch_outbox_once(session: AsyncSession, context: dict[str, Any]) -> dict[str, Any]:
    result = await dispatch_pending_events(session, batch_size=10, locked_by="admin-console")
    await _audit(session, context, "outbox_dispatch_once", result)
    await _outbox(session, context, ADMIN_OUTBOX_DISPATCHED, result)
    return result


async def get_admin_settings(session: AsyncSession, context: dict[str, Any]) -> dict[str, Any]:
    tenant_id = str(context["tenant_id"])
    if not await table_exists(session, "public.admin_settings"):
        return {"settings": {}, "technical": _technical_info()}
    result = await session.execute(
        text(
            """
            select settings_key, settings_json, updated_at
            from public.admin_settings
            where tenant_id = :tenant_id
            order by settings_key
            """
        ),
        {"tenant_id": tenant_id},
    )
    return {
        "settings": {
            row["settings_key"]: row["settings_json"]
            for row in rows_to_dicts(result.mappings().all())
        },
        "technical": _technical_info(),
    }


async def update_admin_settings(
    session: AsyncSession,
    context: dict[str, Any],
    settings_key: str,
    payload: AdminSettingsUpdate,
) -> dict[str, Any]:
    return await upsert_admin_setting(session, context, settings_key, payload.settings_json)


async def upsert_admin_setting(
    session: AsyncSession,
    context: dict[str, Any],
    settings_key: str,
    settings_json: dict[str, Any],
) -> dict[str, Any]:
    result = await session.execute(
        text(
            """
            insert into public.admin_settings (
              tenant_id, settings_key, settings_json, updated_by, updated_at
            )
            values (
              :tenant_id, :settings_key, cast(:settings_json as jsonb), :updated_by, now()
            )
            on conflict (tenant_id, settings_key) do update set
              settings_json = excluded.settings_json,
              updated_by = excluded.updated_by,
              updated_at = now()
            returning *
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "settings_key": settings_key,
            "settings_json": json.dumps(settings_json, ensure_ascii=False, default=str),
            "updated_by": context.get("user_id"),
        },
    )
    row = row_to_dict(result.mappings().one()) or {}
    await _audit(session, context, "admin_settings_updated", row)
    await _outbox(session, context, ADMIN_SETTINGS_UPDATED, row)
    return row


async def _module_activation_from_settings(
    session: AsyncSession,
    tenant_id: str,
    module_key: str,
) -> bool | None:
    if not await table_exists(session, "public.admin_settings"):
        return None
    result = await session.execute(
        text(
            """
            select settings_json
            from public.admin_settings
            where tenant_id = :tenant_id
              and settings_key = :settings_key
            limit 1
            """
        ),
        {"tenant_id": tenant_id, "settings_key": f"module_activation:{module_key}"},
    )
    row = row_to_dict(result.mappings().one_or_none())
    if not row:
        return None
    return bool((row.get("settings_json") or {}).get("enabled", True))


def _module_status(
    enabled: bool,
    license_status: str,
    ready: bool,
    missing_dependencies: list[str],
) -> str:
    if not enabled:
        return "disabled"
    if license_status not in {"included", "trial"}:
        return "unlicensed"
    if missing_dependencies:
        return "dependency_missing"
    if not ready:
        return "setup_required"
    return "available"


def _module_label(module_key: str) -> str:
    labels = {
        "companies": "Sirketlerimiz",
        "partners": "Ortaklarimiz",
        "representatives": "Temsilcilerimiz",
        "branches": "Subelerimiz",
        "documents": "Belgeler",
        "notifications": "Bildirimler",
        "importExport": "Import / Export",
        "dataQuality": "Veri Kalitesi",
        "search": "Global Arama",
    }
    return labels.get(module_key, module_key)


def _module_category(module_key: str) -> str:
    return "Core ERP" if module_key in {"companies", "partners", "representatives", "branches"} else "Platform"


def _technical_info() -> dict[str, Any]:
    settings = get_settings()
    return {
        "app_version": settings.version,
        "backend_service": settings.service_name,
        "environment": settings.app_env,
        "fastapi_configured": True,
        "database_configured": bool(settings.database_url),
        "smtp_configured": bool(settings.smtp_host),
        "secrets_visible": False,
    }


def _quick_links() -> list[dict[str, str]]:
    return [
        {"label": "Genel Ayarlar", "href": "/app/sistem/genel"},
        {"label": "Moduller", "href": "/app/sistem/moduller"},
        {"label": "Ozellikler", "href": "/app/sistem/ozellikler"},
        {"label": "Kullanicilar", "href": "/app/sistem/kullanicilar"},
        {"label": "Roller", "href": "/app/sistem/roller"},
        {"label": "Saglik", "href": "/app/sistem/saglik"},
        {"label": "Outbox", "href": "/app/sistem/outbox"},
        {"label": "Teknik", "href": "/app/sistem/teknik"},
    ]


async def _audit(
    session: AsyncSession,
    context: dict[str, Any],
    action: str,
    payload: dict[str, Any],
) -> None:
    await record_audit_required(
        session,
        context,
        action_type="admin",
        action_key=action,
        summary=f"Admin Console action: {action}",
        entity_type="admin_console",
        entity_id=str(payload.get("id") or payload.get("settings_key") or payload.get("module_key") or action),
        new_values=payload,
    )


async def _outbox(
    session: AsyncSession,
    context: dict[str, Any],
    event_type: str,
    payload: dict[str, Any],
) -> None:
    from app.domains.outbox.service import enqueue_outbox_event_required

    await enqueue_outbox_event_required(
        session,
        context,
        event_type=event_type,
        aggregate_type="admin_console",
        aggregate_id=str(payload.get("id") or payload.get("settings_key") or event_type),
        payload=payload,
    )
