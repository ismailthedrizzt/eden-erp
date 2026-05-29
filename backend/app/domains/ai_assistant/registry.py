# ruff: noqa: E501

from __future__ import annotations

from app.domains.ai_assistant.action_resolver import AI_ACTION_REGISTRY

AI_MODES = [
    {"key": "explain", "label": "Explain Mode", "description": "Sayfa, alan ve islem nedenlerini aciklar."},
    {"key": "record_summary", "label": "Record Summary", "description": "Secili kaydi ve pending uyarilari ozetler."},
    {"key": "action_guidance", "label": "Action Guidance", "description": "Registry kontrollu guvenli aksiyon onerir."},
    {"key": "form_assist", "label": "Form Assist", "description": "Form taslagi onerir; mutation yapmaz."},
    {"key": "document_intelligence", "label": "Document Intelligence", "description": "Belge ozeti ve alan cikarim onerisi uretir."},
    {"key": "insight", "label": "Insight", "description": "KPI ve rapor bulgularini yorumlar."},
    {"key": "admin_assist", "label": "Admin Assist", "description": "Kurulum, readiness ve sistem eksiklerini aciklar."},
]


def list_ai_templates() -> list[dict[str, object]]:
    return [
        {
            "template_key": "company_record_summary",
            "label": "Sirket kayit ozeti",
            "mode": "record_summary",
            "module_key": "companies",
        },
        {
            "template_key": "safe_action_guidance",
            "label": "Guvenli islem onerisi",
            "mode": "action_guidance",
            "module_key": "settings",
        },
        {
            "template_key": "document_extract_review",
            "label": "Belge alan cikarimi",
            "mode": "document_intelligence",
            "module_key": "documents",
        },
        {
            "template_key": "admin_readiness_assist",
            "label": "Admin kurulum yardimi",
            "mode": "admin_assist",
            "module_key": "settings",
        },
    ]


def list_ai_action_registry() -> list[dict[str, object]]:
    return [
        {
            "action_key": action.action_key,
            "label": action.label,
            "target_page": action.target_page,
            "wizard_key": action.wizard_key,
            "module_key": action.module_key,
            "permission": action.permission,
            "safety_level": action.safety_level,
            "critical": action.critical,
        }
        for action in AI_ACTION_REGISTRY
    ]
