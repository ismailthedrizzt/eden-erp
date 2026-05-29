from __future__ import annotations

from typing import Any

from app.seeds.demo_data.common import demo_id, demo_metadata

DEMO_ROLES: list[dict[str, Any]] = [
    {
        "key": "system_admin",
        "role_key": "system_admin",
        "role_name": "Sistem Yoneticisi",
        "risk_level": "critical",
        "permissions": ["__eden_demo_allow_all__", "admin", "settings.edit", "audit.view"],
    },
    {
        "key": "company_manager",
        "role_key": "company_manager",
        "role_name": "Sirket Yoneticisi",
        "risk_level": "high",
        "permissions": ["companies.manage", "partners.manage", "representatives.manage"],
    },
    {
        "key": "accountant",
        "role_key": "accountant",
        "role_name": "Muhasebe Kullanicisi",
        "risk_level": "medium",
        "permissions": ["accounting.view", "accounting.edit", "reporting.export"],
    },
    {
        "key": "hr_user",
        "role_key": "hr_user",
        "role_name": "IK Kullanicisi",
        "risk_level": "medium",
        "permissions": ["hr.view", "hr.edit", "documents.upload"],
    },
    {
        "key": "operations_user",
        "role_key": "operations_user",
        "role_name": "Operasyon Kullanicisi",
        "risk_level": "medium",
        "permissions": ["projects.edit", "afterSales.edit", "actionCenter.view"],
    },
    {
        "key": "auditor",
        "role_key": "auditor",
        "role_name": "Denetci",
        "risk_level": "high",
        "permissions": ["audit.view", "reporting.view", "documents.view"],
    },
    {
        "key": "standard_user",
        "role_key": "standard_user",
        "role_name": "Standart Kullanici",
        "risk_level": "low",
        "permissions": ["tasks.view", "notifications.view"],
    },
]

DEMO_USERS: list[dict[str, Any]] = [
    {
        "key": "admin",
        "display_name": "Admin User",
        "email": "admin@demo.eden.local",
        "role_key": "system_admin",
    },
    {
        "key": "company_manager",
        "display_name": "Company Manager",
        "email": "manager@demo.eden.local",
        "role_key": "company_manager",
    },
    {
        "key": "accountant",
        "display_name": "Accountant",
        "email": "accounting@demo.eden.local",
        "role_key": "accountant",
    },
    {
        "key": "hr",
        "display_name": "HR User",
        "email": "hr@demo.eden.local",
        "role_key": "hr_user",
    },
    {
        "key": "operations",
        "display_name": "Operations User",
        "email": "ops@demo.eden.local",
        "role_key": "operations_user",
    },
    {
        "key": "auditor",
        "display_name": "Auditor",
        "email": "audit@demo.eden.local",
        "role_key": "auditor",
    },
    {
        "key": "standard",
        "display_name": "Standard User",
        "email": "user@demo.eden.local",
        "role_key": "standard_user",
    },
]


def user_id(user_key: str) -> str:
    return demo_id(f"user:{user_key}")


def role_id(role_key: str) -> str:
    return demo_id(f"role:{role_key}")


def user_metadata(user_key: str) -> dict[str, Any]:
    return demo_metadata("demo_user_roles", demo_user_key=user_key)

