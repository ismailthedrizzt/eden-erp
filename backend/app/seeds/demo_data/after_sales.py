from __future__ import annotations

from typing import Any

PRODUCTS: list[dict[str, Any]] = [
    {
        "key": "planeguard",
        "company_key": "eden_tech",
        "product_code": "PG-EDGE-100",
        "product_name": "PlaneGuard Edge Gateway",
        "product_type": "device",
        "category": "IoT",
        "brand": "Eden",
        "model": "PG-100",
        "serial_required": True,
        "warranty_months": 24,
        "maintenance_required": True,
        "maintenance_period_days": 180,
        "after_sales_enabled": True,
        "scenario_key": "planeguard_product",
    },
]

INSTALLED_ASSETS: list[dict[str, Any]] = [
    {
        "key": "planeguard_asset_001",
        "company_key": "eden_tech",
        "product_key": "planeguard",
        "customer_account_key": "cari_glass_customer",
        "customer_name": "GlassTech Uretim A.S.",
        "serial_no": "PG-2026-0001",
        "asset_tag": "GT-PG-001",
        "city": "Ankara",
        "status": "active",
        "warranty_status": "active",
        "maintenance_required": True,
        "scenario_key": "installed_asset_serviceable",
    },
]

SERVICE_REQUESTS: list[dict[str, Any]] = [
    {
        "key": "service_request_open",
        "company_key": "eden_tech",
        "asset_key": "planeguard_asset_001",
        "product_key": "planeguard",
        "customer_account_key": "cari_glass_customer",
        "request_no": "SR-2026-001",
        "request_type": "maintenance",
        "priority": "high",
        "status": "assigned",
        "subject": "PlaneGuard periyodik bakim",
        "customer_name": "GlassTech Uretim A.S.",
        "assigned_user_key": "operations",
        "scenario_key": "service_request_assigned",
    },
]

SERVICE_RECORDS: list[dict[str, Any]] = [
    {
        "key": "service_record_completed",
        "company_key": "eden_tech",
        "request_key": "service_request_open",
        "asset_key": "planeguard_asset_001",
        "product_key": "planeguard",
        "service_no": "SV-2026-001",
        "service_type": "maintenance",
        "status": "completed",
        "result": "Bakim tamamlandi",
        "scenario_key": "completed_service_record",
    },
]

MAINTENANCE_PLANS: list[dict[str, Any]] = [
    {
        "key": "planeguard_90_day_plan",
        "company_key": "eden_tech",
        "product_key": "planeguard",
        "plan_name": "PlaneGuard 90 gunluk bakim",
        "maintenance_type": "periodic",
        "interval_type": "days",
        "interval_value": 90,
        "default_priority": "high",
        "scenario_key": "maintenance_plan_periodic",
    },
]

MAINTENANCE_DUE_ITEMS: list[dict[str, Any]] = [
    {
        "key": "planeguard_due_001",
        "company_key": "eden_tech",
        "plan_key": "planeguard_90_day_plan",
        "asset_key": "planeguard_asset_001",
        "status": "due_soon",
        "scenario_key": "maintenance_due_soon",
    },
]

FIELD_ASSIGNMENTS: list[dict[str, Any]] = [
    {
        "key": "planeguard_assignment_001",
        "company_key": "eden_tech",
        "request_key": "service_request_open",
        "record_key": "service_record_completed",
        "asset_key": "planeguard_asset_001",
        "technician_user_key": "operations",
        "status": "assigned",
        "scenario_key": "field_assignment_assigned",
    },
]

CHECKLIST_TEMPLATES: list[dict[str, Any]] = [
    {
        "key": "planeguard_maintenance_checklist",
        "company_key": "eden_tech",
        "product_key": "planeguard",
        "service_type": "maintenance",
        "checklist_name": "PlaneGuard bakim checklist",
        "items": [
            {
                "key": "visual_check",
                "label": "Gorsel kontrol",
                "type": "checkbox",
                "required": True,
            },
            {
                "key": "calibration_note",
                "label": "Kalibrasyon notu",
                "type": "text",
                "required": False,
            },
        ],
        "scenario_key": "service_checklist_template",
    },
]

SERVICE_CHECKLIST_RESULTS: list[dict[str, Any]] = [
    {
        "key": "planeguard_completed_checklist",
        "record_key": "service_record_completed",
        "template_key": "planeguard_maintenance_checklist",
        "results": {
            "visual_check": True,
            "calibration_note": "Gateway kontrol edildi, firmware ve baglanti saglikli.",
        },
        "completed": True,
        "missing_required_items": [],
        "scenario_key": "service_checklist_completed",
    },
]

