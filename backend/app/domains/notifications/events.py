# ruff: noqa: E501

from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.notifications.notifications import create_notification
from app.domains.notifications.schemas import NotificationCreateRequest

EVENT_MAPPING: dict[str, dict[str, Any]] = {
    "process.task_created": {
        "notification_type": "task_assigned",
        "title": "Yeni gorev atandi",
        "message": "Size yeni bir gorev atandi.",
        "module_key": "project_management",
        "priority": "normal",
        "severity": "info",
        "action_required": True,
        "action_label": "Goreve git",
        "target_page": "/app/gorev-ve-proje-yonetimi/gorevler",
        "user_field": "assignee_user_id",
    },
    "process.approval_requested": {
        "notification_type": "approval_requested",
        "title": "Onay bekleyen islem var",
        "message": "Onayiniz bekleyen bir islem bulunuyor.",
        "module_key": "process",
        "priority": "high",
        "severity": "warning",
        "action_required": True,
        "action_label": "Onaya git",
        "target_page": "/app?open=action-center",
        "user_field": "approver_id",
    },
    "operation.failed": {
        "notification_type": "operation_failed",
        "title": "Islem tamamlanamadi",
        "message": "Baslatilan islem tamamlanamadi.",
        "module_key": "operations",
        "priority": "high",
        "severity": "error",
        "action_required": True,
        "target_page": "/app?open=action-center",
        "user_field": "owner_user_id",
    },
    "document.expiring": {
        "notification_type": "document_expiring",
        "title": "Belgenin suresi yaklasiyor",
        "message": "Takip edilen belgenin suresi yaklasiyor.",
        "module_key": "documents",
        "priority": "high",
        "severity": "warning",
        "action_required": True,
        "target_page": "/app/belgeler",
        "user_field": "responsible_user_id",
    },
    "document.rejected": {
        "notification_type": "document_rejected",
        "title": "Belge reddedildi",
        "message": "Yuklenen belge reddedildi.",
        "module_key": "documents",
        "priority": "high",
        "severity": "warning",
        "action_required": True,
        "target_page": "/app/belgeler",
        "user_field": "uploaded_by",
    },
    "service_request.assigned": {
        "notification_type": "service_request_assigned",
        "title": "Yeni servis talebi atandi",
        "message": "Size yeni bir servis talebi atandi.",
        "module_key": "after_sales",
        "priority": "normal",
        "severity": "info",
        "action_required": True,
        "target_page": "/app/satis-sonrasi/servis-talepleri",
        "user_field": "assignee_user_id",
    },
    "import.completed": {
        "notification_type": "import_completed",
        "title": "Ice aktarma tamamlandi",
        "message": "Ice aktarma isi tamamlandi.",
        "module_key": "importExport",
        "priority": "normal",
        "severity": "success",
        "target_page": "/app/sistem/import",
        "user_field": "created_by",
    },
    "import.failed": {
        "notification_type": "import_failed",
        "title": "Ice aktarma tamamlanamadi",
        "message": "Ice aktarma isi hata ile sonuclandi.",
        "module_key": "importExport",
        "priority": "high",
        "severity": "error",
        "action_required": True,
        "target_page": "/app/sistem/import",
        "user_field": "created_by",
    },
    "export.ready": {
        "notification_type": "export_ready",
        "title": "Disa aktarma dosyaniz hazir",
        "message": "Disa aktarma dosyaniz indirilmeye hazir.",
        "module_key": "importExport",
        "priority": "normal",
        "severity": "success",
        "target_page": "/app/sistem/export",
        "user_field": "created_by",
    },
    "module.setup_required": {
        "notification_type": "module_setup_required",
        "title": "Modul kurulumu eksik",
        "message": "Bir modulun kurulumu tamamlanmamis.",
        "module_key": "settings",
        "priority": "high",
        "severity": "warning",
        "action_required": True,
        "target_page": "/app/sistem/kurulum",
        "user_field": "admin_user_id",
    },
    "security.permission_denied_repeated": {
        "notification_type": "security_warning",
        "title": "Yetkisiz islem denemeleri artti",
        "message": "Yetkisiz islem denemelerinde artis tespit edildi.",
        "module_key": "security",
        "priority": "urgent",
        "severity": "critical",
        "action_required": True,
        "target_page": "/app/sistem/yetkiler",
        "user_field": "admin_user_id",
    },
}


async def build_notification_from_event(
    session: AsyncSession,
    event: dict[str, Any],
) -> dict[str, Any]:
    payload = dict(event.get("payload_json") or event.get("payload") or {})
    mapping = EVENT_MAPPING.get(str(event.get("event_type") or ""))
    if not mapping:
        return {"status": "skipped", "reason": "unmapped_event"}
    user_ids = _target_users(mapping, payload, event)
    if not user_ids:
        return {"status": "skipped", "reason": "target_user_missing"}
    context = {
        "tenant_id": str(event.get("tenant_id")),
        "company_id": event.get("company_id") or payload.get("company_id"),
        "module_key": "notifications",
        "user_id": payload.get("actor_user_id") or payload.get("created_by"),
    }
    rows: list[dict[str, Any]] = []
    for user_id in user_ids:
        rows.append(
            await create_notification(
                session,
                context,
                NotificationCreateRequest(
                    user_id=user_id,
                    company_id=payload.get("company_id") or event.get("company_id"),
                    branch_id=payload.get("branch_id"),
                    module_key=str(mapping.get("module_key") or event.get("module_key") or "platform"),
                    notification_type=str(mapping["notification_type"]),
                    title=str(payload.get("title") or mapping["title"]),
                    message=str(payload.get("message") or mapping["message"]),
                    severity=mapping.get("severity", "info"),
                    priority=mapping.get("priority", "normal"),
                    action_required=bool(mapping.get("action_required", False)),
                    action_key=payload.get("action_key"),
                    action_label=mapping.get("action_label"),
                    target_page=payload.get("target_page") or mapping.get("target_page"),
                    related_entity_type=payload.get("related_entity_type") or event.get("aggregate_type"),
                    related_entity_id=payload.get("related_entity_id") or event.get("aggregate_id"),
                    related_record_label=payload.get("related_record_label") or payload.get("record_label"),
                    process_instance_id=payload.get("process_instance_id") or event.get("process_instance_id"),
                    task_id=payload.get("task_id"),
                    approval_id=payload.get("approval_id"),
                    operation_id=payload.get("operation_id") or event.get("operation_id"),
                    outbox_event_id=str(event.get("id")),
                    due_at=payload.get("due_at"),
                    expires_at=payload.get("expires_at"),
                    delivered_channels=list(payload.get("channels") or ["in_app"]),
                    metadata_json={"source_event_type": event.get("event_type")},
                ),
            )
        )
    return {"status": "created", "count": len(rows), "notification_ids": [row.get("id") for row in rows]}


def _target_users(mapping: dict[str, Any], payload: dict[str, Any], event: dict[str, Any]) -> list[str]:
    explicit = payload.get("target_user_ids") or payload.get("user_ids")
    if isinstance(explicit, list):
        return [str(item) for item in explicit if item]
    user_field = str(mapping.get("user_field") or "user_id")
    value = payload.get(user_field) or payload.get("user_id") or event.get("created_by")
    return [str(value)] if value else []
