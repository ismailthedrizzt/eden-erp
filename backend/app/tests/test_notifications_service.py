from app.domains.notifications.notifications import (
    _process_approval_notification_payload,
    _process_task_notification_payload,
)


def test_process_task_notification_payload_uses_form_card_metadata() -> None:
    payload = _process_task_notification_payload(
        {
            "id": "task-1",
            "company_id": "company-1",
            "module_key": "hr",
            "entity_type": "hr_employee",
            "entity_id": "employee-1",
            "process_instance_id": "process-1",
            "title": "İşe Giriş bekliyor",
            "payload_json": {
                "record_label": "İsmail ILGAR",
                "record_status": "draft",
                "pending_action_label": "İşe Giriş bekliyor",
            },
        }
    )

    assert payload["notification_type"] == "process_task_created"
    assert payload["related_record_label"] == "İsmail ILGAR"
    assert payload["target_page"] == "/app/ik/personel?id=employee-1&action=notification"
    assert payload["metadata_json"]["card_type"] == "Taslak Çalışan"
    assert payload["metadata_json"]["pending_action_label"] == "İşe Giriş bekliyor"
    assert payload["message"] == "Taslak Çalışan, İşe Giriş bekliyor"


def test_process_approval_notification_payload_marks_approval_work() -> None:
    payload = _process_approval_notification_payload(
        {
            "id": "approval-1",
            "task_id": "task-1",
            "company_id": "company-1",
            "module_key": "partners",
            "process_instance_id": "process-1",
            "payload_json": {
                "entity_type": "company_partner",
                "entity_id": "partner-1",
                "record_label": "Ortak Kaydı",
                "record_status": "pending_approval",
            },
        }
    )

    assert payload["notification_type"] == "approval_requested"
    assert payload["priority"] == "high"
    assert payload["approval_id"] == "approval-1"
    assert payload["task_id"] == "task-1"
    assert payload["metadata_json"]["card_type"] == "Onayda Ortak"
    assert payload["metadata_json"]["pending_action_label"] == "Onay bekliyor"
