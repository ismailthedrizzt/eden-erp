from __future__ import annotations

from typing import Any

MASTER_ORGANIZATIONS: list[dict[str, Any]] = [
    {
        "key": "master_glasstech",
        "country": "TR",
        "tax_number": "9990002002",
        "trade_name": "GlassTech Uretim A.S.",
        "short_name": "GlassTech",
        "city": "Ankara",
        "email": "info@glasstech.example.com",
        "scenario_key": "master_customer",
    },
    {
        "key": "master_supplier_misc",
        "country": "TR",
        "tax_number": None,
        "trade_name": "Muhtelif Tedarikciler",
        "short_name": "Muhtelif",
        "city": "Ankara",
        "email": "supplier@example.com",
        "scenario_key": "supplier_without_tax_info",
    },
    {
        "key": "master_glass_duplicate",
        "country": "TR",
        "tax_number": None,
        "trade_name": "GlassTech Uretim A.S.",
        "short_name": "Glass Tech",
        "city": "Ankara",
        "email": "duplicate@glasstech.example.com",
        "scenario_key": "duplicate_organization_candidate",
    },
]

STAKEHOLDERS: list[dict[str, Any]] = [
    {
        "key": "stakeholder_glass_customer",
        "company_key": "eden_tech",
        "master_key": "master_glasstech",
        "display_name": "GlassTech Uretim A.S.",
        "stakeholder_type": "customer",
        "relationship_status": "active",
        "related_cari_account_key": "cari_glass_customer",
        "tags": ["musteri", "planeguard"],
        "scenario_key": "customer_with_cari",
    },
    {
        "key": "stakeholder_misc_supplier",
        "company_key": "eden_tech",
        "master_key": "master_supplier_misc",
        "display_name": "Muhtelif Tedarikciler",
        "stakeholder_type": "supplier",
        "relationship_status": "active",
        "related_cari_account_key": "cari_supplier_misc",
        "tags": ["tedarikci"],
        "scenario_key": "supplier_stakeholder",
    },
    {
        "key": "lead_quattro",
        "company_key": "eden_tech",
        "master_key": "master_glass_duplicate",
        "display_name": "GlassTech Uretim A.S. - Lead",
        "stakeholder_type": "lead",
        "relationship_status": "active",
        "related_cari_account_key": None,
        "tags": ["lead", "followup"],
        "lead_status": "follow_up",
        "scenario_key": "lead_followup",
    },
]

