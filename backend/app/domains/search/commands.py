# ruff: noqa: E501
from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.search.ranking import calculate_confidence, normalize
from app.domains.search.schemas import SearchRequest, SearchResult
from app.policies.action_eligibility import ACTION_DEFINITIONS, evaluate_action_eligibility
from app.policies.schemas import AccessContext

ACTION_LABELS: dict[str, tuple[str, str, str]] = {
    "company_opening": ("Sirket Acilisi", "Taslak sirketi aktif hale getiren resmi acilis sihirbazi.", "Building2"),
    "title_change": ("Unvan Degisikligi", "Aktif sirket icin resmi unvan degisikligi islemi.", "FilePenLine"),
    "address_change": ("Adres Degisikligi", "Aktif sirket icin resmi adres degisikligi islemi.", "MapPin"),
    "capital_increase": ("Sermaye Artirimi", "Aktif sirket ve guncel ortaklik dagilimi gerekir.", "TrendingUp"),
    "capital_decrease": ("Sermaye Azaltimi", "Aktif sirket ve ortaklik kontrolu gerekir.", "TrendingDown"),
    "branch_opening": ("Sube Ac", "Aktif sirket icin sube acilisi sihirbazi.", "GitBranch"),
    "branch_closing": ("Sube Kapat", "Aktif sube icin resmi kapanis islemi.", "GitBranch"),
    "representative_start": ("Temsilciye Yetki Ver", "Temsilci karti ve yetki kapsami ile baslatilir.", "BadgeCheck"),
    "initial_partnership_entry": ("Ortak Ekle", "Ilk ortaklik girisi veya ortak karti hazirligi.", "Users"),
    "share_transfer": ("Pay Devri", "Ortaklik pay devri icin kontrollu islem.", "ArrowRightLeft"),
    "ownership_correction": ("Ortaklik Duzeltme", "Ortaklik dagilimi icin duzeltme islemi.", "RefreshCw"),
}

STATIC_COMMANDS: list[dict[str, Any]] = [
    {"key": "create_company", "label": "Sirket olustur", "module_key": "companies", "target_page": "/app/sirket/companies?action=create", "description": "Yeni sirket kartini taslak olarak olustur.", "icon": "Building2"},
    {"key": "create_cari_account", "label": "Cari kart olustur", "module_key": "accounting", "target_page": "/app/muhasebe/cari-kartlar?action=create", "description": "Yeni cari kart olusturma ekranina git.", "icon": "WalletCards"},
    {"key": "create_task", "label": "Gorev olustur", "module_key": "project_management", "target_page": "/app/gorev-ve-proje-yonetimi/gorevler?action=create", "description": "Yeni gorev kaydi olustur.", "icon": "ListChecks"},
    {"key": "create_service_request", "label": "Servis talebi olustur", "module_key": "after_sales", "target_page": "/app/satis-sonrasi/servis-talepleri?action=create", "description": "Yeni servis talebi ac.", "icon": "Wrench"},
    {"key": "upload_document", "label": "Belge yukle", "module_key": "documents", "target_page": "/app/belgeler?action=upload", "description": "Merkezi belge yukleme ekranina git.", "icon": "FileUp"},
    {"key": "open_setup", "label": "Kurulum merkezine git", "module_key": "settings", "target_page": "/app/sistem/kurulum", "description": "Modul hazirligi ve kurulum adimlarini ac.", "icon": "Settings"},
    {"key": "open_audit", "label": "Audit raporu ac", "module_key": "audit", "target_page": "/app/sistem/audit", "description": "Denetim izi kayitlarini incele.", "icon": "ShieldCheck"},
]


async def search_action_commands(
    session: AsyncSession,
    context: dict[str, Any],
    request: SearchRequest,
) -> list[SearchResult]:
    query = request.query.strip()
    results: list[SearchResult] = []

    for action_key, definition in ACTION_DEFINITIONS.items():
        label, description, icon = ACTION_LABELS.get(
            action_key,
            (action_key.replace("_", " ").title(), "Kontrollu islem sihirbazi.", "PlayCircle"),
        )
        if not _matches_command(query, action_key, label, description):
            continue
        eligibility = await evaluate_action_eligibility(
            session,
            _access_context(context, str(definition.get("module_key") or "settings")),
            action_key,
            _selected_resource(request),
        )
        confidence, fields = calculate_confidence(
            query,
            title=label,
            fields={"action_key": action_key, "title": label, "description": description},
            current_page=request.current_page,
            target_page=eligibility.target_page,
        )
        results.append(
            SearchResult(
                id=f"action:{action_key}",
                result_type="action",
                module_key=str(definition.get("module_key") or "settings"),
                title=label,
                subtitle=description,
                description=eligibility.reason or description,
                badge="Islem",
                icon=icon,
                target_page=eligibility.target_page or str(definition.get("target_page") or "/app"),
                action_key=action_key,
                confidence=confidence,
                matched_fields=fields,
                disabled=eligibility.disabled,
                disabled_reason=eligibility.reason,
                metadata={
                    "wizard_key": eligibility.wizard_key,
                    "can_start": eligibility.can_start,
                    "required_record_status": eligibility.required_record_status,
                },
            )
        )

    for command in STATIC_COMMANDS:
        if not _matches_command(query, str(command["key"]), str(command["label"]), str(command["description"])):
            continue
        confidence, fields = calculate_confidence(
            query,
            title=str(command["label"]),
            fields={"command_key": command["key"], "title": command["label"], "description": command["description"]},
            current_page=request.current_page,
            target_page=str(command["target_page"]),
        )
        results.append(
            SearchResult(
                id=f"command:{command['key']}",
                result_type="action",
                module_key=str(command["module_key"]),
                title=str(command["label"]),
                subtitle=str(command["description"]),
                badge="Hizli islem",
                icon=str(command["icon"]),
                target_page=str(command["target_page"]),
                action_key=str(command["key"]),
                confidence=confidence,
                matched_fields=fields,
            )
        )

    return results


def list_default_quick_actions() -> list[SearchResult]:
    return [
        SearchResult(
            id=f"command:{command['key']}",
            result_type="action",
            module_key=str(command["module_key"]),
            title=str(command["label"]),
            subtitle=str(command["description"]),
            badge="Hizli islem",
            icon=str(command["icon"]),
            target_page=str(command["target_page"]),
            action_key=str(command["key"]),
            confidence=0.5,
        )
        for command in STATIC_COMMANDS[:6]
    ]


def _matches_command(query: str, key: str, label: str, description: str) -> bool:
    q = normalize(query)
    if not q:
        return True
    haystack = " ".join([key.replace("_", " "), label, description]).casefold()
    return q in haystack or any(part and part in haystack for part in q.split())


def _access_context(context: dict[str, Any], module_key: str) -> AccessContext:
    return AccessContext(
        tenant_id=str(context["tenant_id"]),
        user_id=str(context.get("user_id")) if context.get("user_id") else None,
        permissions=[str(item) for item in context.get("permissions") or []],
        company_scope=[str(item) for item in context.get("company_scope_ids") or []]
        if context.get("company_scope_ids") is not None
        else None,
        branch_scope=[str(item) for item in context.get("branch_scope_ids") or []]
        if context.get("branch_scope_ids") is not None
        else None,
        module_key=module_key,
    )


def _selected_resource(request: SearchRequest) -> dict[str, Any] | None:
    if not request.selected_record_type and not request.selected_record_id:
        return None
    return {
        "entity_type": request.selected_record_type,
        "id": request.selected_record_id,
    }
