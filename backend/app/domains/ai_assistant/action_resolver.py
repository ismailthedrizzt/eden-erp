# ruff: noqa: E501

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.core.security import RequestContext, has_permission
from app.domains.ai_assistant.schemas import SuggestedAction


@dataclass(frozen=True)
class AiActionDefinition:
    action_key: str
    label: str
    target_page: str
    module_key: str
    permission: str
    safety_level: int
    keywords: tuple[str, ...]
    wizard_key: str | None = None
    critical: bool = False


AI_ACTION_REGISTRY: tuple[AiActionDefinition, ...] = (
    AiActionDefinition("create_company_draft", "Sirket taslagi hazirla", "/app/sirket/companies?action=create", "companies", "companies.edit", 2, ("sirket", "taslak", "kur", "firma")),
    AiActionDefinition("company_opening", "Sirket Acilisi sihirbazina git", "/app/sirket/companies?action=opening", "companies", "companies.openingStart", 4, ("sirket acilis", "kurulus", "tescil"), "company_opening", True),
    AiActionDefinition("explain_capital_increase_setup", "Sermaye islemi kosullarini acikla", "/app/sirket/companies", "companies", "companies.capitalIncreaseStart", 0, ("sermaye", "capital", "artirim", "azaltim"), "capital_increase", True),
    AiActionDefinition("branch_opening", "Sube Acilisi sihirbazina git", "/app/sirket/companies?action=branch_opening", "branches", "branches.openingStart", 4, ("sube ac", "sube acilis", "lokasyon ac"), "branch_opening", True),
    AiActionDefinition("branch_closing", "Sube Kapanisi sihirbazina git", "/app/sirket/companies?action=branch_closing", "branches", "branches.closingStart", 4, ("sube kapat", "sube kapanis"), "branch_closing", True),
    AiActionDefinition("upload_document", "Belge yukleme ekranina git", "/app/belgeler", "documents", "documents.upload", 1, ("belge", "dokuman", "evrak", "upload", "yukle")),
    AiActionDefinition("document_summary", "Belgeyi AI ile ozetle", "/app/belgeler", "aiCopilot", "aiCopilot.documentIntelligence", 0, ("belge ozet", "evrak ozet", "alan cikar", "document")),
    AiActionDefinition("audit_show_record_history", "Denetim izini ac", "/app/sistem/audit", "audit", "audit.view", 1, ("kim degistirdi", "audit", "gecmis", "denetim")),
    AiActionDefinition("open_setup_center", "Kurulum merkezini ac", "/app/sistem/kurulum", "settings", "settings.view", 1, ("kurulum", "hazir degil", "setup", "eksik")),
    AiActionDefinition("view_pending_work", "Is Merkezi bekleyenleri ac", "/app/is-merkezi", "actionCenter", "actionCenter.view", 1, ("bekleyen", "onay", "gorev", "is merkezi")),
    AiActionDefinition("create_project_task", "Gorev taslagi hazirla", "/app/gorev-ve-proje-yonetimi/gorevler", "project_management", "tasks.create", 2, ("gorev", "task", "ata", "takip")),
    AiActionDefinition("open_hr_leave_requests", "Izin taleplerini ac", "/app/ik/izinler", "hr", "hr.leaveView", 1, ("izin", "yillik izin", "hastalik")),
    AiActionDefinition("open_timesheets", "Puantaj ekranini ac", "/app/ik/puantaj", "hr", "hr.timesheetView", 1, ("puantaj", "bordro", "attendance", "devam")),
    AiActionDefinition("open_field_service", "Saha servis gorevlerini ac", "/app/satis-sonrasi/saha-gorevleri", "after_sales", "afterSales.fieldServiceView", 1, ("saha servis", "teknisyen", "servis gorev")),
    AiActionDefinition("create_service_request", "Servis talebi taslagi hazirla", "/app/satis-sonrasi/servis-destek-kayitlari", "after_sales", "afterSales.requestCreate", 2, ("servis talebi", "ariza", "bakim", "planeguard")),
    AiActionDefinition("open_crm_leads", "Lead listesini ac", "/app/crm/leadler", "crm", "crm.leadsView", 1, ("lead", "musteri adayi", "fuar")),
    AiActionDefinition("open_crm_opportunities", "Firsat pipeline ac", "/app/crm/firsatlar", "crm", "crm.opportunitiesView", 1, ("firsat", "opportunity", "pipeline", "teklif")),
    AiActionDefinition("create_crm_followup", "CRM takip gorevi hazirla", "/app/crm/takipler", "crm", "crm.followupManage", 2, ("follow", "takip", "hatirlat", "gorusme")),
    AiActionDefinition("open_reporting", "Raporlama katalogunu ac", "/app/raporlama", "reporting", "reporting.view", 1, ("rapor", "kpi", "dashboard")),
    AiActionDefinition("create_saved_view", "Kayitli gorunum hazirla", "/app/raporlama/ozel-raporlar", "reporting", "reporting.savedViewsManage", 2, ("saved view", "gorunum", "filtre kaydet")),
    AiActionDefinition("open_automation_rules", "Otomasyonlari ac", "/app/sistem/otomasyonlar", "automation", "automation.view", 1, ("otomasyon", "workflow", "kural", "rule")),
)


def allowed_action_keys() -> set[str]:
    return {action.action_key for action in AI_ACTION_REGISTRY}


def list_ai_actions(context: RequestContext, *, module_key: str | None = None) -> list[SuggestedAction]:
    actions = []
    for definition in AI_ACTION_REGISTRY:
        if module_key and definition.module_key not in {module_key, "aiCopilot", "settings", "actionCenter"}:
            continue
        actions.append(to_suggested_action(definition, context))
    return actions


def resolve_actions_for_query(query: str, context: RequestContext, *, module_key: str | None = None, limit: int = 4) -> list[SuggestedAction]:
    normalized = query.lower()
    scored: list[tuple[int, AiActionDefinition]] = []
    for definition in AI_ACTION_REGISTRY:
        if module_key and definition.module_key not in {module_key, "aiCopilot", "settings", "actionCenter"}:
            continue
        score = sum(1 for keyword in definition.keywords if keyword in normalized)
        if definition.action_key.replace("_", " ") in normalized:
            score += 2
        if module_key and definition.module_key == module_key:
            score += 1
        if score:
            scored.append((score, definition))
    if not scored:
        scored = [(1, action) for action in AI_ACTION_REGISTRY if not module_key or action.module_key in {module_key, "settings", "actionCenter"}][:limit]
    scored.sort(key=lambda item: item[0], reverse=True)
    return [to_suggested_action(definition, context) for _, definition in scored[:limit]]


def get_ai_action(action_key: str) -> AiActionDefinition | None:
    return next((action for action in AI_ACTION_REGISTRY if action.action_key == action_key), None)


def to_suggested_action(definition: AiActionDefinition, context: RequestContext) -> SuggestedAction:
    permitted = has_permission(context, definition.permission)
    disabled_reason = None
    if not permitted:
        disabled_reason = f"{definition.permission} yetkisi gerekli."
    if definition.safety_level >= 3:
        disabled_reason = "Kritik islemler AI tarafindan dogrudan calistirilmaz; yalnizca sihirbaza yonlendirilir."
    return SuggestedAction(
        label=definition.label,
        action_key=definition.action_key,
        target_page=definition.target_page,
        wizard_key=definition.wizard_key,
        enabled=permitted and definition.safety_level <= 2,
        disabled_reason=disabled_reason,
        requires_confirmation=definition.safety_level >= 2,
        preview_endpoint=f"/api/ai/copilot/action-preview?action_key={definition.action_key}",
        safety_level=definition.safety_level,
    )


def action_preview_payload(action_key: str, context: RequestContext, form_payload: dict[str, Any]) -> dict[str, Any]:
    definition = get_ai_action(action_key)
    if not definition:
        return {
            "allowed": False,
            "action_key": action_key,
            "blocking_reasons": ["Registry disi action reddedildi."],
            "preview": {},
        }
    suggested = to_suggested_action(definition, context)
    return {
        "allowed": suggested.enabled,
        "action_key": definition.action_key,
        "label": definition.label,
        "target_page": definition.target_page,
        "wizard_key": definition.wizard_key,
        "safety_level": definition.safety_level,
        "requires_user_confirmation": definition.safety_level >= 2,
        "mutates_data": False,
        "blocking_reasons": [suggested.disabled_reason] if suggested.disabled_reason else [],
        "form_payload_preview": form_payload,
        "next_steps": [
            "Kullanici form taslagini inceler.",
            "Backend precheck ve validation gecmeden resmi veri degismez.",
        ],
    }
