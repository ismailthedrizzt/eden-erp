# ruff: noqa: E501

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

TRIGGER_TYPES = {"event", "schedule", "condition", "manual"}
RULE_STATUSES = {"draft", "active", "paused", "disabled", "failed"}
RUN_MODES = {"sync_safe", "async_worker"}
CONDITION_OPERATORS = {
    "field_equals",
    "field_not_equals",
    "field_in",
    "field_not_in",
    "field_is_empty",
    "field_is_not_empty",
    "date_before",
    "date_after",
    "date_within_days",
    "number_greater_than",
    "number_less_than",
    "count_greater_than",
    "status_is",
    "module_ready",
    "permission_available",
    "record_scope_valid",
}


@dataclass(frozen=True)
class ConditionEntity:
    key: str
    label: str
    table: str
    fields: set[str]
    module_key: str
    required_permission: str
    company_scoped: bool = True
    default_target_page: str = "/app"
    open_statuses: set[str] = field(default_factory=set)


CONDITION_ENTITIES: dict[str, ConditionEntity] = {
    "document": ConditionEntity(
        key="document",
        label="Belge",
        table="public.documents",
        fields={"id", "company_id", "expiry_date", "document_status", "status", "document_type", "created_at", "updated_at"},
        module_key="documents",
        required_permission="documents.view",
        default_target_page="/app/belgeler",
    ),
    "project_task": ConditionEntity(
        key="project_task",
        label="Proje Gorevi",
        table="public.project_tasks",
        fields={"id", "company_id", "due_date", "status", "priority", "assignee_user_id", "created_at", "updated_at"},
        module_key="project_management",
        required_permission="tasks.view",
        default_target_page="/app/gorev-ve-proje-yonetimi",
        open_statuses={"backlog", "todo", "in_progress", "blocked", "review"},
    ),
    "crm_opportunity": ConditionEntity(
        key="crm_opportunity",
        label="CRM Firsat",
        table="public.crm_opportunities",
        fields={"id", "company_id", "status", "stage_id", "next_followup_date", "expected_close_date", "assigned_owner_user_id", "proposal_valid_until", "created_at", "updated_at"},
        module_key="crm",
        required_permission="crm.opportunitiesView",
        default_target_page="/app/crm/firsatlar",
    ),
    "bank_transaction": ConditionEntity(
        key="bank_transaction",
        label="Banka Hareketi",
        table="public.accounting_bank_transactions",
        fields={"id", "company_id", "reconciliation_status", "transaction_date", "created_at", "updated_at"},
        module_key="accounting",
        required_permission="accounting.bankTransactionsView",
        default_target_page="/app/muhasebe",
    ),
    "maintenance_due": ConditionEntity(
        key="maintenance_due",
        label="Bakimi Gelen Servis",
        table="public.after_sales_maintenance_due_items",
        fields={"id", "company_id", "due_date", "status", "assigned_user_id", "created_at", "updated_at"},
        module_key="after_sales",
        required_permission="afterSales.maintenanceView",
        default_target_page="/app/satis-sonrasi/bakimi-gelenler",
    ),
    "representative_authority": ConditionEntity(
        key="representative_authority",
        label="Temsil Yetkisi",
        table="public.company_representative_authority_transactions",
        fields={"id", "company_id", "effective_date", "end_date", "status", "created_at", "updated_at"},
        module_key="representatives",
        required_permission="representatives.view",
        default_target_page="/app/sirket/companies/representatives",
    ),
    "hr_employee": ConditionEntity(
        key="hr_employee",
        label="Calisan",
        table="public.hr_employees",
        fields={"id", "company_id", "employee_status", "sgk_status", "created_at", "updated_at"},
        module_key="hr",
        required_permission="hr.view",
        default_target_page="/app/ik",
    ),
    "data_quality_finding": ConditionEntity(
        key="data_quality_finding",
        label="Veri Kalitesi Bulgusu",
        table="public.data_quality_findings",
        fields={"id", "company_id", "finding_type", "severity", "status", "created_at", "updated_at"},
        module_key="dataQuality",
        required_permission="dataQuality.view",
        default_target_page="/app/sistem/veri-kalitesi",
    ),
}

ACTION_TEMPLATES: dict[str, dict[str, Any]] = {
    "create_notification": {"label": "Bildirim olustur", "module_key": "notifications", "permission": "notifications.manage", "side_effect": "notification"},
    "send_email_notification": {"label": "E-posta bildirimi kuyruga al", "module_key": "notifications", "permission": "notifications.admin", "side_effect": "email"},
    "create_digest_item": {"label": "Digest oge olustur", "module_key": "notifications", "permission": "notifications.manage", "side_effect": "notification"},
    "create_action_center_warning": {"label": "Is Merkezi uyarisi olustur", "module_key": "actionCenter", "permission": "actionCenter.view", "side_effect": "notification"},
    "create_project_task": {"label": "Proje gorevi olustur", "module_key": "project_management", "permission": "tasks.create", "side_effect": "task"},
    "assign_project_task": {"label": "Proje gorevi ata", "module_key": "project_management", "permission": "tasks.assign", "side_effect": "task"},
    "create_process_task": {"label": "Surec gorevi olustur", "module_key": "process", "permission": "process.manage", "side_effect": "process"},
    "create_reminder": {"label": "Hatirlatma olustur", "module_key": "notifications", "permission": "reminders.manage", "side_effect": "reminder"},
    "create_followup_task": {"label": "Takip gorevi olustur", "module_key": "crm", "permission": "crm.followupManage", "side_effect": "task"},
    "mark_followup_overdue": {"label": "Takibi gecikti olarak uyar", "module_key": "crm", "permission": "crm.followupManage", "side_effect": "warning"},
    "create_document_expiry_warning": {"label": "Belge suresi uyarisi", "module_key": "documents", "permission": "documents.view", "side_effect": "notification"},
    "create_missing_document_warning": {"label": "Eksik belge uyarisi", "module_key": "documents", "permission": "documents.view", "side_effect": "notification"},
    "create_service_request_from_maintenance_due": {"label": "Bakimdan servis talebi oner", "module_key": "after_sales", "permission": "afterSales.maintenanceManage", "side_effect": "suggestion"},
    "create_followup_task_after_service": {"label": "Servis sonrasi takip gorevi", "module_key": "after_sales", "permission": "afterSales.fieldServiceAssign", "side_effect": "task"},
    "run_scheduled_report": {"label": "Zamanlanmis raporu calistir", "module_key": "reporting", "permission": "reporting.scheduledReportsManage", "side_effect": "report"},
    "queue_report_export": {"label": "Rapor export kuyruga al", "module_key": "reporting", "permission": "reporting.export", "side_effect": "report"},
    "create_data_quality_finding": {"label": "Veri kalite bulgusu olustur", "module_key": "dataQuality", "permission": "dataQuality.runChecks", "side_effect": "finding"},
    "notify_duplicate_candidate": {"label": "Duplicate adayi bildir", "module_key": "dataQuality", "permission": "dataQuality.reviewDuplicates", "side_effect": "notification"},
    "notify_admin_system_warning": {"label": "Admin sistem uyarisi", "module_key": "adminConsole", "permission": "adminConsole.view", "side_effect": "notification"},
}

RULE_TEMPLATES: list[dict[str, Any]] = [
    {
        "template_key": "document_expiry_30_days",
        "template_name": "Suresi yaklasan belge uyarisi",
        "description": "30 gun icinde suresi dolacak belgeler icin bildirim ve Is Merkezi uyarisi uretir.",
        "module_key": "documents",
        "trigger_config": {"frequency": "daily", "time": "09:00", "timezone": "Europe/Istanbul"},
        "condition_config": {"entity": "document", "field": "expiry_date", "operator": "date_within_days", "value": 30},
        "action_config": {"actions": [{"action_type": "create_document_expiry_warning"}, {"action_type": "create_action_center_warning"}]},
    },
    {
        "template_key": "overdue_task_warning",
        "template_name": "Geciken gorev uyarisi",
        "description": "Gecmis due_date ve acik status tasiyan proje gorevlerini bildirir.",
        "module_key": "project_management",
        "trigger_config": {"frequency": "daily", "time": "08:30", "timezone": "Europe/Istanbul"},
        "condition_config": {"entity": "project_task", "field": "due_date", "operator": "date_before", "value": "today", "filters": {"status": ["backlog", "todo", "in_progress", "blocked", "review"]}},
        "action_config": {"actions": [{"action_type": "create_action_center_warning"}, {"action_type": "create_notification"}]},
    },
    {
        "template_key": "crm_followup_overdue",
        "template_name": "CRM follow-up gecikti",
        "description": "Acik firsatlarda gecmis takip tarihleri icin owner'a takip gorevi onerir.",
        "module_key": "crm",
        "trigger_config": {"frequency": "daily", "time": "09:30", "timezone": "Europe/Istanbul"},
        "condition_config": {"entity": "crm_opportunity", "field": "next_followup_date", "operator": "date_before", "value": "today", "filters": {"status": "open"}},
        "action_config": {"actions": [{"action_type": "create_followup_task"}, {"action_type": "mark_followup_overdue"}]},
    },
    {
        "template_key": "maintenance_due_7_days",
        "template_name": "Servis bakimi geldi",
        "description": "7 gun icinde bakimi gelen kayitlari servis ekibine tasir.",
        "module_key": "after_sales",
        "trigger_config": {"frequency": "daily", "time": "08:00", "timezone": "Europe/Istanbul"},
        "condition_config": {"entity": "maintenance_due", "field": "due_date", "operator": "date_within_days", "value": 7, "filters": {"status": ["scheduled", "due_soon", "overdue"]}},
        "action_config": {"actions": [{"action_type": "create_service_request_from_maintenance_due"}, {"action_type": "create_action_center_warning"}]},
    },
    {
        "template_key": "unmatched_bank_transaction",
        "template_name": "Unmatched banka hareketi",
        "description": "3 gunden eski eslesmemis banka hareketleri icin muhasebe uyarisi uretir.",
        "module_key": "accounting",
        "trigger_config": {"frequency": "daily", "time": "10:00", "timezone": "Europe/Istanbul"},
        "condition_config": {"entity": "bank_transaction", "field": "created_at", "operator": "date_before", "value": "today-3", "filters": {"reconciliation_status": "unmatched"}},
        "action_config": {"actions": [{"action_type": "create_action_center_warning"}]},
    },
    {
        "template_key": "hr_sgk_pending",
        "template_name": "SGK pending uyarisi",
        "description": "SGK durumu pending kalan calisanlar icin HR uyarisi uretir.",
        "module_key": "hr",
        "trigger_config": {"frequency": "daily", "time": "09:00", "timezone": "Europe/Istanbul"},
        "condition_config": {"entity": "hr_employee", "field": "sgk_status", "operator": "field_equals", "value": "pending"},
        "action_config": {"actions": [{"action_type": "create_notification"}, {"action_type": "create_action_center_warning"}]},
    },
    {
        "template_key": "representative_authority_expiring",
        "template_name": "Temsil yetkisi suresi yaklasiyor",
        "description": "30 gun icinde bitecek temsil yetkileri icin uyarir.",
        "module_key": "representatives",
        "trigger_config": {"frequency": "daily", "time": "09:15", "timezone": "Europe/Istanbul"},
        "condition_config": {"entity": "representative_authority", "field": "end_date", "operator": "date_within_days", "value": 30},
        "action_config": {"actions": [{"action_type": "create_notification"}, {"action_type": "create_action_center_warning"}]},
    },
    {
        "template_key": "data_quality_duplicate_warning",
        "template_name": "Data quality duplicate uyarisi",
        "description": "Duplicate bulgu olayi geldiginde veri kalite yoneticisini bilgilendirir.",
        "module_key": "dataQuality",
        "trigger_config": {"event_type": "data_quality.finding_created", "module_key": "dataQuality"},
        "condition_config": {"entity": "data_quality_finding", "field": "finding_type", "operator": "field_equals", "value": "duplicate_candidate"},
        "action_config": {"actions": [{"action_type": "notify_duplicate_candidate"}]},
    },
]


def list_trigger_registry() -> list[dict[str, Any]]:
    return [
        {"trigger_type": "event", "label": "Event", "description": "Outbox veya domain olayi ile tetiklenir."},
        {"trigger_type": "schedule", "label": "Zaman", "description": "Saatlik/gunluk/haftalik/aylik calisir."},
        {"trigger_type": "condition", "label": "Kosul", "description": "Whitelist veri kaynaklarinda kosul arar."},
        {"trigger_type": "manual", "label": "Manuel", "description": "Yetkili kullanici tarafindan calistirilir."},
    ]


def list_condition_registry() -> dict[str, Any]:
    return {
        "operators": sorted(CONDITION_OPERATORS),
        "entities": [
            {
                "key": item.key,
                "label": item.label,
                "module_key": item.module_key,
                "fields": sorted(item.fields),
                "required_permission": item.required_permission,
            }
            for item in CONDITION_ENTITIES.values()
        ],
    }


def list_action_registry() -> list[dict[str, Any]]:
    return [{"action_type": key, **value} for key, value in sorted(ACTION_TEMPLATES.items())]


def list_rule_templates() -> list[dict[str, Any]]:
    return [dict(item) for item in RULE_TEMPLATES]


def normalize_actions(action_config: dict[str, Any]) -> list[dict[str, Any]]:
    raw = action_config.get("actions", action_config)
    if isinstance(raw, list):
        actions = raw
    elif isinstance(raw, dict):
        actions = [raw]
    else:
        actions = []
    normalized: list[dict[str, Any]] = []
    for action in actions:
        if isinstance(action, dict):
            action_type = str(action.get("action_type") or action.get("type") or "")
            normalized.append({**action, "action_type": action_type})
    return normalized


def validate_registry_payload(trigger_type: str, condition_config: dict[str, Any], action_config: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    if trigger_type not in TRIGGER_TYPES:
        errors.append("trigger_type registry disinda.")
    entity = condition_config.get("entity")
    operator = condition_config.get("operator")
    field_name = condition_config.get("field")
    if entity and str(entity) not in CONDITION_ENTITIES:
        errors.append("condition entity registry disinda.")
    if operator and str(operator) not in CONDITION_OPERATORS:
        errors.append("condition operator registry disinda.")
    if entity and field_name:
        definition = CONDITION_ENTITIES.get(str(entity))
        if definition and str(field_name) not in definition.fields:
            errors.append("condition field registry disinda.")
    for action in normalize_actions(action_config):
        if action["action_type"] not in ACTION_TEMPLATES:
            errors.append(f"action template registry disinda: {action['action_type']}")
    return errors
