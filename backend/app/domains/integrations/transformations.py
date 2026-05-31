from __future__ import annotations

from typing import Any


def normalize_external_service_request(payload: dict[str, Any]) -> dict[str, Any]:
    contact_raw = payload.get("contact")
    contact: dict[str, Any] = contact_raw if isinstance(contact_raw, dict) else {}
    return {
        "customer_ref": (
            payload.get("customer_ref")
            or payload.get("customer_id")
            or payload.get("customer_account_id")
        ),
        "product_serial": payload.get("product_serial") or payload.get("serial_no"),
        "subject": payload.get("subject") or payload.get("title") or "Dis sistem servis talebi",
        "description": payload.get("description") or payload.get("body"),
        "priority": _safe_priority(str(payload.get("priority") or "medium")),
        "contact_person": contact.get("name") or payload.get("contact_person"),
        "contact_phone": contact.get("phone") or payload.get("contact_phone"),
        "contact_email": contact.get("email") or payload.get("contact_email"),
        "attachments": (
            payload.get("attachments")
            if isinstance(payload.get("attachments"), list)
            else []
        ),
    }


def normalize_external_lead(payload: dict[str, Any]) -> dict[str, Any]:
    return {
        "lead_name": (
            payload.get("lead_name")
            or payload.get("name")
            or payload.get("company_name")
            or "External lead"
        ),
        "contact_name": payload.get("contact_name") or payload.get("name"),
        "phone": payload.get("phone"),
        "email": payload.get("email"),
        "company_name": payload.get("company_name"),
        "source": "import",
        "lead_status": "new",
        "interest_area": payload.get("interest_area"),
        "product_interest": payload.get("product_interest"),
        "estimated_value": payload.get("estimated_value"),
        "currency": payload.get("currency"),
        "notes": payload.get("notes"),
        "metadata_json": {"source": "integration_hub", "raw_source": payload.get("source")},
    }


def _safe_priority(value: str) -> str:
    return value if value in {"low", "medium", "high", "urgent"} else "medium"
