from __future__ import annotations

# ruff: noqa: E501
from app.policies.schemas import PermissionCategory, PermissionContract


def _permission(
    key: str,
    label: str,
    module_key: str,
    domain: str,
    category: PermissionCategory,
    *,
    fallback: list[str] | None = None,
    deprecated: bool = False,
) -> PermissionContract:
    return PermissionContract(
        key=key,
        label=label,
        description=label,
        module_key=module_key,
        domain=domain,
        category=category,
        fallback=fallback or [],
        deprecated=deprecated,
    )


PERMISSIONS: dict[str, PermissionContract] = {
    "companies.view": _permission("companies.view", "Sirketleri goruntule", "companies", "company", "view"),
    "companies.edit": _permission("companies.edit", "Sirket karti duzenle", "companies", "company", "edit"),
    "companies.openingStart": _permission("companies.openingStart", "Sirket acilisi baslat", "companies", "company", "operation", fallback=["companies.edit"]),
    "companies.liquidationStart": _permission("companies.liquidationStart", "Tasfiye baslat", "companies", "company", "operation", fallback=["companies.edit"]),
    "companies.deregistrationStart": _permission("companies.deregistrationStart", "Terkin baslat", "companies", "company", "operation", fallback=["companies.edit"]),
    "companies.officialChangeStart": _permission("companies.officialChangeStart", "Resmi degisiklik baslat", "companies", "company", "operation", fallback=["companies.edit"]),
    "companies.capitalIncreaseStart": _permission("companies.capitalIncreaseStart", "Sermaye artirimi baslat", "companies", "company", "operation", fallback=["companies.edit"]),
    "companies.capitalDecreaseStart": _permission("companies.capitalDecreaseStart", "Sermaye azaltimi baslat", "companies", "company", "operation", fallback=["companies.edit"]),
    "branches.view": _permission("branches.view", "Subeleri goruntule", "branches", "branches", "view", fallback=["companies.view"]),
    "branches.edit": _permission("branches.edit", "Sube karti duzenle", "branches", "branches", "edit", fallback=["companies.edit"]),
    "branches.openingStart": _permission("branches.openingStart", "Sube acilisi baslat", "branches", "branches", "operation", fallback=["companies.edit"]),
    "branches.closingStart": _permission("branches.closingStart", "Sube kapanisi baslat", "branches", "branches", "operation", fallback=["companies.edit"]),
    "branches.documentsUpdate": _permission("branches.documentsUpdate", "Sube belgelerini guncelle", "branches", "branches", "edit", fallback=["branches.edit"]),
    "partners.view": _permission("partners.view", "Ortaklari goruntule", "partners", "ownership", "view", fallback=["companies.view"]),
    "partners.edit": _permission("partners.edit", "Ortak karti duzenle", "partners", "ownership", "edit", fallback=["companies.edit"]),
    "partners.ownershipStart": _permission("partners.ownershipStart", "Ortaklik islemi baslat", "partners", "ownership", "operation", fallback=["partners.edit"]),
    "partners.ownershipUpdate": _permission("partners.ownershipUpdate", "Ortaklik islemi guncelle", "partners", "ownership", "operation", fallback=["partners.edit"]),
    "partners.ownershipApprove": _permission("partners.ownershipApprove", "Ortaklik islemi onayla", "partners", "ownership", "approval", fallback=["partners.edit"]),
    "partners.ownershipReverse": _permission("partners.ownershipReverse", "Ortaklik ters kaydi", "partners", "ownership", "operation", fallback=["partners.edit"]),
    "representatives.view": _permission("representatives.view", "Temsilcileri goruntule", "representatives", "representatives", "view", fallback=["companies.view"]),
    "representatives.edit": _permission("representatives.edit", "Temsilci karti duzenle", "representatives", "representatives", "edit", fallback=["companies.edit"]),
    "representatives.authorityStart": _permission("representatives.authorityStart", "Temsilcilik baslat", "representatives", "representatives", "operation", fallback=["representatives.edit"]),
    "representatives.authorityUpdate": _permission("representatives.authorityUpdate", "Temsil yetkisi guncelle", "representatives", "representatives", "operation", fallback=["representatives.edit"]),
    "representatives.authoritySuspend": _permission("representatives.authoritySuspend", "Temsil yetkisini askiya al", "representatives", "representatives", "operation", fallback=["representatives.edit"]),
    "representatives.authorityTerminate": _permission("representatives.authorityTerminate", "Temsil yetkisini sonlandir", "representatives", "representatives", "operation", fallback=["representatives.edit"]),
    "representatives.authorityApprove": _permission("representatives.authorityApprove", "Temsil yetkisini onayla", "representatives", "representatives", "approval", fallback=["representatives.edit"]),
    "organization.view": _permission("organization.view", "Organizasyonu goruntule", "organization", "organization", "view", fallback=["companies.view"]),
    "organization.edit": _permission("organization.edit", "Organizasyonu duzenle", "organization", "organization", "edit", fallback=["companies.edit"]),
    "organization.structureManage": _permission("organization.structureManage", "Organizasyon yapisini yonet", "organization", "organization", "admin", fallback=["organization.edit"]),
    "organization.positionManage": _permission("organization.positionManage", "Kadro yonet", "organization", "organization", "admin", fallback=["organization.edit"]),
    "facilities.view": _permission("facilities.view", "Tesisleri goruntule", "facilities", "facilities", "view", fallback=["companies.view"]),
    "facilities.edit": _permission("facilities.edit", "Tesisleri duzenle", "facilities", "facilities", "edit", fallback=["companies.edit"]),
    "facilities.linkBranch": _permission("facilities.linkBranch", "Tesisi subeye bagla", "facilities", "facilities", "operation", fallback=["facilities.edit"]),
    "facilities.deactivate": _permission("facilities.deactivate", "Tesisi pasife al", "facilities", "facilities", "operation", fallback=["facilities.edit"]),
    "settings.view": _permission("settings.view", "Ayarlari goruntule", "settings", "setup", "view"),
    "settings.edit": _permission("settings.edit", "Ayarlari duzenle", "settings", "setup", "edit"),
    "settings.modulesManage": _permission("settings.modulesManage", "Modulleri yonet", "settings", "setup", "admin", fallback=["settings.edit"]),
    "settings.usersManage": _permission("settings.usersManage", "Kullanicilari yonet", "settings", "setup", "admin", fallback=["settings.edit"]),
    "audit.view": _permission("audit.view", "Denetim izini goruntule", "audit", "audit", "view", fallback=["settings.view"]),
    "process.view": _permission("process.view", "Surecleri goruntule", "process", "process", "view", fallback=["companies.view"]),
    "process.manage": _permission("process.manage", "Surecleri yonet", "process", "process", "admin", fallback=["settings.edit"]),
    "tasks.view": _permission("tasks.view", "Gorevleri goruntule", "process", "process", "view", fallback=["process.view"]),
    "approvals.decide": _permission("approvals.decide", "Onay karari ver", "process", "process", "approval", fallback=["process.manage"]),
    "actionCenter.view": _permission("actionCenter.view", "Bekleyen isleri goruntule", "action-center", "action-center", "view", fallback=["companies.view"]),
    "outbox.dispatch": _permission("outbox.dispatch", "Outbox dispatch calistir", "outbox", "outbox", "admin", fallback=["system.admin"]),
    "system.admin": _permission("system.admin", "Sistem yoneticisi", "system", "system", "admin", fallback=["settings.edit"]),
}


def get_permission_contract(key: str) -> PermissionContract | None:
    return PERMISSIONS.get(key)


def list_permissions() -> list[PermissionContract]:
    return list(PERMISSIONS.values())


def list_permissions_by_module(module_key: str) -> list[PermissionContract]:
    return [permission for permission in PERMISSIONS.values() if permission.module_key == module_key]


def get_permission_fallbacks(key: str) -> list[str]:
    contract = get_permission_contract(key)
    return contract.fallback if contract else []


def permission_exists(key: str) -> bool:
    return key in PERMISSIONS


def resolve_permission_with_fallback(key: str) -> list[str]:
    seen: set[str] = set()
    ordered: list[str] = []

    def visit(permission_key: str) -> None:
        if permission_key in seen:
            return
        seen.add(permission_key)
        ordered.append(permission_key)
        for fallback in get_permission_fallbacks(permission_key):
            visit(fallback)

    visit(key)
    return ordered
