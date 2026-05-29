from __future__ import annotations

from typing import Any
from uuid import UUID, uuid5

SEED_VERSION = "2026.05.step25"
DEMO_TENANT_ID = "25000000-0000-4000-8000-000000000001"
DEMO_NAMESPACE = UUID("25000000-0000-4000-8000-000000000025")

DEMO_MODULES = [
    "companies",
    "partners",
    "representatives",
    "branches",
    "organization",
    "facilities",
    "documents",
    "actionCenter",
    "audit",
    "setup",
    "accounting",
    "hr",
    "projects",
    "afterSales",
    "crm",
    "reporting",
    "notifications",
    "search",
    "dataQuality",
    "importExport",
    "adminConsole",
]


def demo_id(key: str) -> str:
    return str(uuid5(DEMO_NAMESPACE, key))


def demo_metadata(scenario_key: str, **extra: Any) -> dict[str, Any]:
    return {
        "demo_data": True,
        "scenario_key": scenario_key,
        "seed_version": SEED_VERSION,
        **extra,
    }


def key_map(prefix: str, keys: list[str]) -> dict[str, str]:
    return {key: demo_id(f"{prefix}:{key}") for key in keys}

