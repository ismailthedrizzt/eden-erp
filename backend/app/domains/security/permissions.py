# ruff: noqa: E501

from __future__ import annotations

from collections import defaultdict
from typing import Any

from app.policies.permissions import list_permissions as list_registry_permissions
from app.policies.schemas import PermissionContract

from .schemas import (
    PermissionGroup,
    PermissionMatrixCell,
    PermissionMatrixResponse,
    PermissionRecord,
    RiskLevel,
)

MODULE_LABELS: dict[str, str] = {
    "companies": "Sirketlerimiz",
    "partners": "Ortaklarimiz",
    "representatives": "Temsilcilerimiz",
    "branches": "Subelerimiz",
    "organization": "Teskilat/Kadro",
    "facilities": "Tesisler/Lokasyonlar",
    "accounting": "Muhasebe",
    "hr": "IK",
    "project_management": "Proje/Gorev",
    "after_sales": "Satis Sonrasi",
    "product_services": "Urun/Hizmet",
    "crm": "CRM/Paydaslar",
    "reporting": "Raporlama",
    "audit": "Audit",
    "importExport": "Data Import / Export",
    "documents": "Belgeler",
    "notifications": "Bildirimler",
    "settings": "Kurulum/Ayarlar",
    "security": "Kullanicilar/Roller/Yetkiler",
    "system": "Sistem",
    "outbox": "Sistem Olaylari",
    "process": "Surecler",
    "action-center": "Action Center",
}

RISKY_PERMISSION_KEYS = {
    "users.manage",
    "roles.manage",
    "security.usersManage",
    "security.rolesManage",
    "security.scopesManage",
    "security.policyTest",
    "settings.modulesManage",
    "settings.modules.manage",
    "audit.export",
    "outbox.dispatch",
    "companies.deregistrationStart",
    "partners.ownershipReverse",
    "representatives.authorityTerminate",
    "accounting.export",
    "import.confirm",
    "export.download",
    "bulk.confirm",
    "bulk.admin",
    "documents.download",
    "documents.verify",
    "documents.reject",
    "documents.delete",
    "documents.admin",
    "documents.accessLogsView",
    "notifications.admin",
    "email.admin",
    "system.admin",
}

CRITICAL_PERMISSION_KEYS = {
    "system.admin",
    "users.manage",
    "roles.manage",
    "security.usersManage",
    "security.rolesManage",
    "settings.modulesManage",
    "settings.modules.manage",
    "outbox.dispatch",
    "email.admin",
}


def permission_risk(permission_key: str) -> RiskLevel:
    if permission_key in CRITICAL_PERMISSION_KEYS:
        return "critical"
    if permission_key in RISKY_PERMISSION_KEYS:
        return "high"
    if permission_key.endswith(".delete") or permission_key.endswith(".export") or permission_key.endswith("Terminate"):
        return "high"
    if ".edit" in permission_key or "Start" in permission_key or "Manage" in permission_key:
        return "medium"
    return "low"


def permission_to_record(permission: PermissionContract) -> PermissionRecord:
    key = str(permission.key)
    module_key = str(permission.module_key)
    risk = permission_risk(key)
    return PermissionRecord(
        key=key,
        label=str(permission.label),
        description=str(permission.description),
        module_key=module_key,
        module_label=MODULE_LABELS.get(module_key, module_key),
        domain=str(permission.domain),
        category=permission.category,
        risk_level=risk,
        fallback=list(getattr(permission, "fallback", []) or []),
        deprecated=bool(getattr(permission, "deprecated", False)),
        critical_warning="Bu yetki kritik sistem islemlerine erisim saglar." if risk in {"high", "critical"} else None,
    )


def list_permission_records(*, include_deprecated: bool = False) -> list[PermissionRecord]:
    records = [permission_to_record(permission) for permission in list_registry_permissions()]
    if not include_deprecated:
        records = [record for record in records if not record.deprecated]
    return sorted(records, key=lambda item: (item.module_label, item.key))


def list_permission_groups(*, include_deprecated: bool = False) -> list[PermissionGroup]:
    grouped: dict[str, list[PermissionRecord]] = defaultdict(list)
    for permission in list_permission_records(include_deprecated=include_deprecated):
        grouped[permission.module_key].append(permission)
    return [
        PermissionGroup(
            module_key=module_key,
            module_label=MODULE_LABELS.get(module_key, module_key),
            permissions=permissions,
        )
        for module_key, permissions in sorted(grouped.items(), key=lambda item: MODULE_LABELS.get(item[0], item[0]))
    ]


def permission_key_exists(permission_key: str) -> bool:
    return any(record.key == permission_key for record in list_permission_records(include_deprecated=True))


async def get_permission_matrix(ctx: Any) -> PermissionMatrixResponse:
    from .roles import list_roles

    roles = await list_roles(ctx)
    groups = list_permission_groups()
    permission_records = [permission for group in groups for permission in group.permissions]
    cells = [
        PermissionMatrixCell(
            role_id=role.id,
            role_key=role.role_key,
            permission_key=permission.key,
            granted="system.admin" in role.permissions or permission.key in role.permissions,
            risk_level=permission.risk_level,
            warning=permission.critical_warning,
        )
        for role in roles
        for permission in permission_records
    ]
    warnings: list[str] = []
    for role in roles:
        unknown = [permission for permission in role.permissions if not permission_key_exists(permission)]
        if unknown:
            warnings.append(f"{role.role_name} rolunde registry disi yetki var: {', '.join(unknown)}")
    return PermissionMatrixResponse(roles=roles, groups=groups, cells=cells, warnings=warnings)
