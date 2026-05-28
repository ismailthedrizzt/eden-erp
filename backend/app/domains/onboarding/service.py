# ruff: noqa: E501

from __future__ import annotations

import json
from typing import Any
from uuid import uuid4

from fastapi import status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.core.security import RequestContext, has_permission
from app.core.serialization import row_to_dict
from app.domains.operations.service import table_exists
from app.setup.readiness_checker import check_tenant_readiness

from .schemas import (
    CompleteTourRequest,
    CompleteWorkspaceStepRequest,
    DismissHintRequest,
    UserOnboardingPatch,
    WorkspaceOnboardingPatch,
)

ONBOARDING_VERSION = "v1"
DEV_USER_ID = "00000000-0000-0000-0000-000000000001"
WORKSPACE_STEPS = [
    "welcome",
    "workspace_profile",
    "module_selection",
    "readiness_check",
    "first_company_draft",
    "first_company_opening",
    "guided_tour",
    "action_guide_intro",
    "action_center_intro",
    "finish",
]

DEFAULT_USER_STATE: dict[str, Any] = {
    "hasSeenGlobalTour": False,
    "hasSeenFirstRunWelcome": False,
    "completedTourSteps": [],
    "completedPageTours": [],
    "dismissedHints": [],
    "preferredHelpMode": "both",
    "actionGuideIntroSeen": False,
    "actionCenterIntroSeen": False,
    "lastOnboardingVersion": None,
    "helpLevel": "guided",
}

MODULE_PACKAGES: list[dict[str, Any]] = [
    {
        "key": "starter",
        "label": "Baslangic paketi",
        "modules": ["companies", "partners", "representatives", "branches", "documents", "notifications", "audit", "settings"],
        "description": "Ilk sirket, belge, bildirim, denetim ve kurulum ekranlari.",
    },
    {
        "key": "operations",
        "label": "Operasyon paketi",
        "modules": ["organization", "facilities", "project_management", "after_sales"],
        "description": "Teskilat, tesis, gorev ve satis sonrasi operasyonlari.",
    },
    {
        "key": "finance",
        "label": "Finans paketi",
        "modules": ["accounting", "reporting", "importExport"],
        "description": "Cari kart, cari hareket, raporlama ve veri aktarimi.",
    },
    {
        "key": "hr",
        "label": "IK paketi",
        "modules": ["hr"],
        "description": "Calisan kartlari ve istihdam lifecycle hazirligi.",
    },
]


def service_context(context: RequestContext, tenant_id: str) -> dict[str, Any]:
    return {
        "tenant_id": tenant_id,
        "user_id": context.user_id or DEV_USER_ID,
        "permissions": context.permissions,
    }


async def get_onboarding_overview(
    session: AsyncSession,
    context: dict[str, Any],
) -> dict[str, Any]:
    workspace_state = await get_workspace_state(session, context)
    user_state = await get_user_state(session, context)
    company_summary = await _company_summary(session, context["tenant_id"])
    readiness_summary = await _readiness_summary(session, context["tenant_id"])
    checklist = _build_checklist(workspace_state, user_state, company_summary, readiness_summary)
    next_action = next((item for item in checklist if item["status"] in {"current", "warning", "blocked"}), None)
    return {
        "workspace_state": workspace_state,
        "user_state": user_state,
        "recommended_steps": checklist,
        "readiness_summary": readiness_summary,
        "company_summary": company_summary,
        "module_packages": MODULE_PACKAGES,
        "next_action": next_action,
        "should_show_welcome": _should_show_welcome(workspace_state, user_state),
    }


async def get_workspace_state(session: AsyncSession, context: dict[str, Any]) -> dict[str, Any]:
    if not await table_exists(session, "public.workspace_onboarding_state"):
        return _default_workspace_state(context["tenant_id"])
    result = await session.execute(
        text(
            """
            select *
            from public.workspace_onboarding_state
            where tenant_id = :tenant_id and onboarding_version = :version
            limit 1
            """
        ),
        {"tenant_id": context["tenant_id"], "version": ONBOARDING_VERSION},
    )
    row = row_to_dict(result.mappings().first())
    if row:
        return _public_workspace_state(row)
    return await _insert_workspace_state(session, context)


async def patch_workspace_state(
    session: AsyncSession,
    context: dict[str, Any],
    patch: WorkspaceOnboardingPatch,
) -> dict[str, Any]:
    _require_workspace_manager(context)
    if not await table_exists(session, "public.workspace_onboarding_state"):
        raise DomainError("Onboarding altyapisi hazir degil.", "ONBOARDING_TABLE_MISSING", status.HTTP_503_SERVICE_UNAVAILABLE)
    current = await get_workspace_state(session, context)
    merged_profile = {**_as_dict(current.get("workspace_profile")), **(patch.workspace_profile or {})}
    updates = {
        "status": patch.status or current["status"],
        "current_step": patch.current_step or current["current_step"],
        "completed_steps": patch.completed_steps if patch.completed_steps is not None else current["completed_steps"],
        "dismissed_steps": patch.dismissed_steps if patch.dismissed_steps is not None else current["dismissed_steps"],
        "recommended_steps": patch.recommended_steps if patch.recommended_steps is not None else current["recommended_steps"],
        "workspace_profile": merged_profile,
        "selected_module_packages": patch.selected_module_packages if patch.selected_module_packages is not None else current["selected_module_packages"],
    }
    row = await _update_workspace_state(session, context, updates)
    return _public_workspace_state(row)


async def complete_workspace_step(
    session: AsyncSession,
    context: dict[str, Any],
    request: CompleteWorkspaceStepRequest,
) -> dict[str, Any]:
    _require_workspace_manager(context)
    if not await table_exists(session, "public.workspace_onboarding_state"):
        raise DomainError("Onboarding altyapisi hazir degil.", "ONBOARDING_TABLE_MISSING", status.HTTP_503_SERVICE_UNAVAILABLE)
    current = await get_workspace_state(session, context)
    completed_steps = _unique_list([*current.get("completed_steps", []), request.step_key])
    status_value = "completed" if request.step_key == "finish" else "in_progress"
    next_step = _next_step(completed_steps)
    row = await _update_workspace_state(
        session,
        context,
        {
            "status": status_value,
            "current_step": next_step,
            "completed_steps": completed_steps,
            "dismissed_steps": current.get("dismissed_steps", []),
            "recommended_steps": current.get("recommended_steps", []),
            "workspace_profile": current.get("workspace_profile", {}),
            "selected_module_packages": current.get("selected_module_packages", []),
        },
    )
    return _public_workspace_state(row)


async def skip_workspace_onboarding(session: AsyncSession, context: dict[str, Any]) -> dict[str, Any]:
    _require_workspace_manager(context)
    if not await table_exists(session, "public.workspace_onboarding_state"):
        raise DomainError("Onboarding altyapisi hazir degil.", "ONBOARDING_TABLE_MISSING", status.HTTP_503_SERVICE_UNAVAILABLE)
    current = await get_workspace_state(session, context)
    row = await _update_workspace_state(
        session,
        context,
        {
            "status": "skipped",
            "current_step": current.get("current_step") or "finish",
            "completed_steps": current.get("completed_steps", []),
            "dismissed_steps": _unique_list([*current.get("dismissed_steps", []), "workspace_onboarding"]),
            "recommended_steps": current.get("recommended_steps", []),
            "workspace_profile": current.get("workspace_profile", {}),
            "selected_module_packages": current.get("selected_module_packages", []),
            "skipped": True,
        },
    )
    return _public_workspace_state(row)


async def reset_workspace_onboarding(session: AsyncSession, context: dict[str, Any]) -> dict[str, Any]:
    _require_workspace_manager(context)
    if not await table_exists(session, "public.workspace_onboarding_state"):
        raise DomainError("Onboarding altyapisi hazir degil.", "ONBOARDING_TABLE_MISSING", status.HTTP_503_SERVICE_UNAVAILABLE)
    await session.execute(
        text(
            """
            delete from public.workspace_onboarding_state
            where tenant_id = :tenant_id and onboarding_version = :version
            """
        ),
        {"tenant_id": context["tenant_id"], "version": ONBOARDING_VERSION},
    )
    return await _insert_workspace_state(session, context)


async def get_user_state(session: AsyncSession, context: dict[str, Any]) -> dict[str, Any]:
    if not await table_exists(session, "public.user_workspace_state"):
        return dict(DEFAULT_USER_STATE)
    result = await session.execute(
        text(
            """
            select ui_preferences, intro_completed_at, intro_version
            from public.user_workspace_state
            where user_id = :user_id and workspace_id = :tenant_id
            limit 1
            """
        ),
        {"tenant_id": context["tenant_id"], "user_id": context.get("user_id") or DEV_USER_ID},
    )
    row = row_to_dict(result.mappings().first()) or {}
    preferences = {**DEFAULT_USER_STATE, **_as_dict(row.get("ui_preferences"))}
    if row.get("intro_completed_at"):
        preferences["hasSeenGlobalTour"] = True
    if row.get("intro_version") and not preferences.get("lastOnboardingVersion"):
        preferences["lastOnboardingVersion"] = row.get("intro_version")
    return _public_user_state(preferences)


async def patch_user_state(
    session: AsyncSession,
    context: dict[str, Any],
    patch: UserOnboardingPatch,
) -> dict[str, Any]:
    if not await table_exists(session, "public.user_workspace_state"):
        raise DomainError("Kullanici onboarding durumu hazir degil.", "USER_ONBOARDING_TABLE_MISSING", status.HTTP_503_SERVICE_UNAVAILABLE)
    payload = patch.model_dump(exclude_none=True)
    await _merge_user_preferences(session, context, payload)
    return await get_user_state(session, context)


async def complete_user_tour(
    session: AsyncSession,
    context: dict[str, Any],
    request: CompleteTourRequest,
) -> dict[str, Any]:
    current = await get_user_state(session, context)
    completed_page_tours = _unique_list([*current.get("completedPageTours", []), request.tour_key])
    patch = {
        "hasSeenGlobalTour": request.tour_key == "global" or current.get("hasSeenGlobalTour", False),
        "completedPageTours": completed_page_tours,
        "lastOnboardingVersion": request.version or ONBOARDING_VERSION,
    }
    await _merge_user_preferences(session, context, patch)
    return await get_user_state(session, context)


async def dismiss_user_hint(
    session: AsyncSession,
    context: dict[str, Any],
    request: DismissHintRequest,
) -> dict[str, Any]:
    current = await get_user_state(session, context)
    hint_key = request.hint_key.strip()
    patch: dict[str, Any] = {
        "dismissedHints": _unique_list([*current.get("dismissedHints", []), hint_key]),
    }
    if hint_key == "first-run-welcome":
        patch["hasSeenFirstRunWelcome"] = True
        patch["lastOnboardingVersion"] = ONBOARDING_VERSION
    await _merge_user_preferences(session, context, patch)
    return await get_user_state(session, context)


async def reset_user_help(session: AsyncSession, context: dict[str, Any]) -> dict[str, Any]:
    patch = {
        "hasSeenGlobalTour": False,
        "hasSeenFirstRunWelcome": False,
        "completedTourSteps": [],
        "completedPageTours": [],
        "dismissedHints": [],
        "actionGuideIntroSeen": False,
        "actionCenterIntroSeen": False,
        "lastOnboardingVersion": None,
        "helpLevel": "guided",
    }
    await _merge_user_preferences(session, context, patch)
    return await get_user_state(session, context)


async def _insert_workspace_state(session: AsyncSession, context: dict[str, Any]) -> dict[str, Any]:
    result = await session.execute(
        text(
            """
            insert into public.workspace_onboarding_state (
              id, tenant_id, onboarding_version, status, first_login_at, current_step,
              completed_steps, dismissed_steps, recommended_steps, workspace_profile,
              selected_module_packages
            )
            values (
              :id, :tenant_id, :version, 'not_started', now(), 'welcome',
              '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '{}'::jsonb, '["starter"]'::jsonb
            )
            on conflict (tenant_id, onboarding_version) do update
            set updated_at = now()
            returning *
            """
        ),
        {"id": str(uuid4()), "tenant_id": context["tenant_id"], "version": ONBOARDING_VERSION},
    )
    return _public_workspace_state(row_to_dict(result.mappings().one()) or {})


async def _update_workspace_state(
    session: AsyncSession,
    context: dict[str, Any],
    updates: dict[str, Any],
) -> dict[str, Any]:
    completed = updates.get("status") == "completed"
    skipped = bool(updates.get("skipped"))
    result = await session.execute(
        text(
            """
            update public.workspace_onboarding_state
            set status = :status,
                current_step = :current_step,
                completed_steps = cast(:completed_steps as jsonb),
                dismissed_steps = cast(:dismissed_steps as jsonb),
                recommended_steps = cast(:recommended_steps as jsonb),
                workspace_profile = cast(:workspace_profile as jsonb),
                selected_module_packages = cast(:selected_module_packages as jsonb),
                completed_at = case when :completed then coalesce(completed_at, now()) else completed_at end,
                skipped_at = case when :skipped then coalesce(skipped_at, now()) else skipped_at end,
                updated_at = now()
            where tenant_id = :tenant_id and onboarding_version = :version
            returning *
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "version": ONBOARDING_VERSION,
            "status": updates["status"],
            "current_step": updates["current_step"],
            "completed_steps": _json(updates["completed_steps"]),
            "dismissed_steps": _json(updates["dismissed_steps"]),
            "recommended_steps": _json(updates["recommended_steps"]),
            "workspace_profile": _json(updates["workspace_profile"]),
            "selected_module_packages": _json(updates["selected_module_packages"]),
            "completed": completed,
            "skipped": skipped,
        },
    )
    return row_to_dict(result.mappings().one()) or {}


async def _merge_user_preferences(
    session: AsyncSession,
    context: dict[str, Any],
    patch: dict[str, Any],
) -> None:
    user_id = context.get("user_id") or DEV_USER_ID
    await session.execute(
        text(
            """
            insert into public.user_workspace_state (
              user_id, workspace_id, first_login_at, last_login_at, login_count,
              intro_version, ui_preferences
            )
            values (
              :user_id, :tenant_id, now(), now(), 1, :version, cast(:patch as jsonb)
            )
            on conflict (user_id, workspace_id) do update
            set ui_preferences = coalesce(public.user_workspace_state.ui_preferences, '{}'::jsonb) || cast(:patch as jsonb),
                intro_version = coalesce(public.user_workspace_state.intro_version, :version),
                updated_at = now()
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "user_id": user_id,
            "version": ONBOARDING_VERSION,
            "patch": _json(patch),
        },
    )


async def _company_summary(session: AsyncSession, tenant_id: str) -> dict[str, int]:
    if not await table_exists(session, "public.companies"):
        return {"total": 0, "draft": 0, "active": 0}
    result = await session.execute(
        text(
            """
            select
              count(*) filter (where coalesce(is_deleted, false) = false) as total,
              count(*) filter (where coalesce(is_deleted, false) = false and coalesce(record_status, company_status, 'draft') = 'draft') as draft,
              count(*) filter (where coalesce(is_deleted, false) = false and coalesce(record_status, company_status, 'draft') = 'active') as active
            from public.companies
            where tenant_id = :tenant_id
            """
        ),
        {"tenant_id": tenant_id},
    )
    row = row_to_dict(result.mappings().one()) or {}
    return {key: int(row.get(key) or 0) for key in ["total", "draft", "active"]}


async def _readiness_summary(session: AsyncSession, tenant_id: str) -> dict[str, Any]:
    try:
        readiness = await check_tenant_readiness(session, tenant_id)
        return {
            "ready": readiness.ok,
            "status": readiness.status,
            "blocking_modules": readiness.blocking_modules,
            "warning_count": len(readiness.warnings),
            "modules": [
                {
                    "module_key": key,
                    "ready": result.ok,
                    "status": result.status,
                    "blocking_reasons": result.missing_tables + result.missing_views + result.missing_rpcs + result.missing_dependencies,
                    "warnings": result.warnings,
                    "setup_steps": result.setup_steps,
                }
                for key, result in readiness.modules.items()
            ],
        }
    except Exception:
        return {"ready": True, "status": "unknown", "blocking_modules": [], "warning_count": 0, "modules": []}


def _build_checklist(
    workspace_state: dict[str, Any],
    user_state: dict[str, Any],
    company_summary: dict[str, int],
    readiness_summary: dict[str, Any],
) -> list[dict[str, Any]]:
    completed_steps = set(_string_list(workspace_state.get("completed_steps")))
    total = company_summary.get("total", 0)
    active = company_summary.get("active", 0)
    draft = company_summary.get("draft", 0)
    readiness_ready = bool(readiness_summary.get("ready"))
    has_seen_tour = bool(user_state.get("hasSeenGlobalTour"))
    action_guide_seen = bool(user_state.get("actionGuideIntroSeen"))
    action_center_seen = bool(user_state.get("actionCenterIntroSeen"))

    items = [
        _item("welcome", "Calisma alani karsilandi", "Eden ERP taslak kayit ve resmi islem mantigini kisa bir girisle anlatir.", "completed" if user_state.get("hasSeenFirstRunWelcome") or "welcome" in completed_steps else "current", "Karsilamayi gor", "/app/onboarding"),
        _item("workspace_profile", "Calisma alani profilini tamamlayin", "Ad, sektor, dil, zaman dilimi ve baslangic paketleri onerileri daha isabetli hale getirir.", "completed" if "workspace_profile" in completed_steps else "pending", "Kurulum merkezine git", "/app/onboarding"),
        _item("module_selection", "Modul paketlerini kontrol edin", "Baslangic, operasyon, finans ve IK paketlerinden size uygun olanlari secin.", "completed" if "module_selection" in completed_steps else "pending", "Paketleri gor", "/app/onboarding"),
        _item("readiness_check", "Moduller kontrol edildi", "Kullanima hazir olmayan moduller sade kurulum nedenleriyle listelenir.", "completed" if readiness_ready else "warning", "Kurulum merkezine git", "/app/sistem/kurulum", None if readiness_ready else "Kurulum isteyen modul var."),
        _item("first_company_draft", "Ilk sirket taslagini olusturun", "Sirket karti once taslak olarak acilir. Resmi acilis ayri sihirbazla tamamlanir.", "completed" if total > 0 else "current", "Sirket Taslagi Olustur", "/app/sirket/companies?action=create"),
        _item("first_company_opening", "Sirket acilisini tamamlayin", "Taslak sirket aktif islem yapilabilir hale Sirket Acilisi sihirbaziyla gelir.", "completed" if active > 0 else ("current" if draft > 0 else "pending"), "Sirket Acilisi Sihirbazini Ac", "/app/sirket/companies?action=opening", None if draft > 0 or active > 0 else "Once sirket taslagi olusturun."),
        _item("guided_tour", "Genel sistem turunu tamamlayin", "Sol menu, + Ekle, resmi islem sihirbazlari, Action Guide ve Action Center kisaca tanitilir.", "completed" if has_seen_tour else "pending", "Sistemi tani", "/app?tour=1"),
        _item("action_guide_intro", "Action Guide'i deneyin", "Ne yapmak istediginizi yazdiginizda sistem dogru sayfa ve isleme yonlendirir.", "completed" if action_guide_seen else "pending", "Rehberi ac", "/app/onboarding"),
        _item("action_center_intro", "Action Center'i taniyin", "Gorev, onay ve kurulum eksikleri aksiyon merkezi uzerinden takip edilir.", "completed" if action_center_seen else "pending", "Is merkezini ac", "/app?open=action-center"),
        _item("finish", "Kurulumu tamamlayin", "Temel kurulum tamamlandiginda ekip ve modul adimlarina guvenle gecilir.", "completed" if workspace_state.get("status") == "completed" else ("current" if active > 0 and has_seen_tour else "pending"), "Tamamla", "/app/onboarding"),
    ]
    return items


def _item(
    key: str,
    title: str,
    description: str,
    item_status: str,
    action_label: str,
    target_page: str,
    disabled_reason: str | None = None,
) -> dict[str, Any]:
    return {
        "key": key,
        "title": title,
        "description": description,
        "status": item_status,
        "action_label": action_label,
        "target_page": target_page,
        "disabled_reason": disabled_reason,
    }


def _should_show_welcome(workspace_state: dict[str, Any], user_state: dict[str, Any]) -> bool:
    if workspace_state.get("status") in {"completed", "skipped"}:
        return False
    if user_state.get("hasSeenFirstRunWelcome"):
        return False
    if "first-run-welcome" in _string_list(user_state.get("dismissedHints")):
        return False
    return True


def _public_workspace_state(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row.get("id"),
        "tenant_id": row.get("tenant_id"),
        "onboarding_version": row.get("onboarding_version") or ONBOARDING_VERSION,
        "status": row.get("status") or "not_started",
        "first_login_at": row.get("first_login_at"),
        "completed_at": row.get("completed_at"),
        "skipped_at": row.get("skipped_at"),
        "current_step": row.get("current_step") or "welcome",
        "completed_steps": _string_list(row.get("completed_steps")),
        "dismissed_steps": _string_list(row.get("dismissed_steps")),
        "recommended_steps": _list_of_dicts(row.get("recommended_steps")),
        "workspace_profile": _as_dict(row.get("workspace_profile")),
        "selected_module_packages": _string_list(row.get("selected_module_packages")) or ["starter"],
        "created_at": row.get("created_at"),
        "updated_at": row.get("updated_at"),
    }


def _default_workspace_state(tenant_id: str) -> dict[str, Any]:
    return _public_workspace_state(
        {
            "id": None,
            "tenant_id": tenant_id,
            "onboarding_version": ONBOARDING_VERSION,
            "status": "not_started",
            "current_step": "welcome",
            "completed_steps": [],
            "dismissed_steps": [],
            "recommended_steps": [],
            "workspace_profile": {},
            "selected_module_packages": ["starter"],
        }
    )


def _public_user_state(preferences: dict[str, Any]) -> dict[str, Any]:
    merged = {**DEFAULT_USER_STATE, **preferences}
    return {
        "hasSeenGlobalTour": bool(merged.get("hasSeenGlobalTour")),
        "hasSeenFirstRunWelcome": bool(merged.get("hasSeenFirstRunWelcome")),
        "completedTourSteps": _string_list(merged.get("completedTourSteps")),
        "completedPageTours": _string_list(merged.get("completedPageTours")),
        "dismissedHints": _string_list(merged.get("dismissedHints")),
        "preferredHelpMode": merged.get("preferredHelpMode") if merged.get("preferredHelpMode") in {"tour", "guide", "both"} else "both",
        "actionGuideIntroSeen": bool(merged.get("actionGuideIntroSeen")),
        "actionCenterIntroSeen": bool(merged.get("actionCenterIntroSeen")),
        "lastOnboardingVersion": merged.get("lastOnboardingVersion"),
        "helpLevel": merged.get("helpLevel") if merged.get("helpLevel") in {"minimal", "guided", "detailed"} else "guided",
    }


def _require_workspace_manager(context: dict[str, Any]) -> None:
    permissions = set(context.get("permissions") or [])
    if permissions.intersection({"system.admin", "settings.edit", "settings.modulesManage", "settings.modules.manage", "onboarding.manage"}):
        return
    request_context = RequestContext(
        tenant_id=str(context.get("tenant_id")),
        user_id=str(context.get("user_id") or DEV_USER_ID),
        permissions=list(permissions),
    )
    if has_permission(request_context, "settings.edit") or has_permission(request_context, "settings.modulesManage"):
        return
    raise DomainError("Calisma alani kurulumunu yonetme yetkiniz bulunmuyor.", "ONBOARDING_MANAGE_DENIED", status.HTTP_403_FORBIDDEN)


def _next_step(completed_steps: list[str]) -> str:
    completed = set(completed_steps)
    return next((step for step in WORKSPACE_STEPS if step not in completed), "finish")


def _unique_list(values: list[Any]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        item = str(value).strip()
        if item and item not in seen:
            seen.add(item)
            result.append(item)
    return result


def _string_list(value: Any) -> list[str]:
    if isinstance(value, list):
        return _unique_list(value)
    return []


def _list_of_dicts(value: Any) -> list[dict[str, Any]]:
    if not isinstance(value, list):
        return []
    return [item for item in value if isinstance(item, dict)]


def _as_dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, default=str)
