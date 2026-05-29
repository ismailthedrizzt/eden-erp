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

