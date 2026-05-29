from __future__ import annotations

from typing import Any

NOTIFICATIONS: list[dict[str, Any]] = [
    {
        "key": "task_assigned",
        "user_key": "operations",
        "company_key": "eden_tech",
        "module_key": "projects",
        "notification_type": "task_assigned",
        "title": "Yeni gorev atandi",
        "message": "PlaneGuard sahada servis kontrolu size atandi.",
        "severity": "info",
        "priority": "normal",
        "target_page": "/app/gorev-ve-proje-yonetimi/gorevler",
        "scenario_key": "task_assigned_notification",
    },
    {
        "key": "approval_requested",
        "user_key": "company_manager",
        "company_key": "eden_tech",
        "module_key": "partners",
        "notification_type": "approval_requested",
        "title": "Onay bekleyen islem var",
        "message": "Sermaye artirimi icin onay bekleniyor.",
        "severity": "warning",
        "priority": "high",
        "target_page": "/app?action-center=1",
        "scenario_key": "approval_requested_notification",
    },
    {
        "key": "document_expiring",
        "user_key": "hr",
        "company_key": "eden_tech",
        "module_key": "documents",
        "notification_type": "document_expiring",
        "title": "Belgenin suresi yaklasiyor",
        "message": "Saha teknisyeni sertifikasi 30 gun icinde yenilenmeli.",
        "severity": "warning",
        "priority": "normal",
        "target_page": "/app/belgeler",
        "scenario_key": "document_expiry_notification",
    },
    {
        "key": "import_completed",
        "user_key": "admin",
        "company_key": "eden_tech",
        "module_key": "importExport",
        "notification_type": "import_completed",
        "title": "Ice aktarma tamamlandi",
        "message": "Cari kart demo import islemi tamamlandi.",
        "severity": "success",
        "priority": "low",
        "target_page": "/app/sistem/import",
        "scenario_key": "import_completed_notification",
    },
]

EMAIL_MESSAGES: list[dict[str, Any]] = [
    {
        "key": "failed_email",
        "user_key": "company_manager",
        "to_email": "manager@demo.eden.local",
        "to_name": "Company Manager",
        "subject": "Demo onay bildirimi",
        "body_text": "Sermaye artirimi onayi bekliyor.",
        "template_key": "approval_requested",
        "status": "failed",
        "last_error": "SMTP sandbox disabled for demo.",
        "scenario_key": "email_failure_admin_warning",
    },
]

