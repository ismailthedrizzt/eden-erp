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
    "accounting.view": _permission("accounting.view", "Muhasebeyi goruntule", "accounting", "finance", "view", fallback=["companies.view"]),
    "accounting.edit": _permission("accounting.edit", "Muhasebe kayitlarini duzenle", "accounting", "finance", "edit", fallback=["companies.edit"]),
    "accounting.transactionCreate": _permission("accounting.transactionCreate", "Cari hareket olustur", "accounting", "finance", "operation", fallback=["accounting.edit"]),
    "accounting.transactionApprove": _permission("accounting.transactionApprove", "Cari hareket onayla", "accounting", "finance", "approval", fallback=["accounting.edit"]),
    "accounting.reconcile": _permission("accounting.reconcile", "Muhasebe mutabakati yap", "accounting", "finance", "operation", fallback=["accounting.edit"]),
    "accounting.export": _permission("accounting.export", "Muhasebe kayitlarini disa aktar", "accounting", "finance", "view", fallback=["accounting.view"]),
    "hr.view": _permission("hr.view", "Calisanlari goruntule", "hr", "hr", "view", fallback=["companies.view"]),
    "hr.edit": _permission("hr.edit", "Calisan kartlarini duzenle", "hr", "hr", "edit", fallback=["companies.edit"]),
    "hr.employeeCreate": _permission("hr.employeeCreate", "Calisan karti taslagi olustur", "hr", "hr", "operation", fallback=["hr.edit"]),
    "hr.employmentStart": _permission("hr.employmentStart", "Ise giris baslat", "hr", "hr", "operation", fallback=["hr.edit"]),
    "hr.employmentTerminate": _permission("hr.employmentTerminate", "Isten cikis baslat", "hr", "hr", "operation", fallback=["hr.edit"]),
    "hr.assignmentChange": _permission("hr.assignmentChange", "Organizasyon ve pozisyon degisikligi yap", "hr", "hr", "operation", fallback=["hr.edit"]),
    "hr.documentsManage": _permission("hr.documentsManage", "Calisan ozluk belgelerini yonet", "hr", "hr", "edit", fallback=["hr.edit"]),
    "hr.sensitiveView": _permission("hr.sensitiveView", "Calisan hassas bilgilerini goruntule", "hr", "hr", "view", fallback=["hr.view"]),
    "projects.view": _permission("projects.view", "Projeleri goruntule", "project_management", "work", "view", fallback=["companies.view"]),
    "projects.edit": _permission("projects.edit", "Projeleri duzenle", "project_management", "work", "edit", fallback=["projects.view"]),
    "projects.create": _permission("projects.create", "Proje olustur", "project_management", "work", "operation", fallback=["projects.edit"]),
    "projects.delete": _permission("projects.delete", "Proje sil", "project_management", "work", "admin", fallback=["projects.edit"]),
    "tasks.create": _permission("tasks.create", "Proje gorevi olustur", "project_management", "work", "operation", fallback=["projects.view"]),
    "tasks.edit": _permission("tasks.edit", "Proje gorevlerini duzenle", "project_management", "work", "edit", fallback=["projects.edit"]),
    "tasks.assign": _permission("tasks.assign", "Proje gorevi ata", "project_management", "work", "operation", fallback=["tasks.edit"]),
    "tasks.transition": _permission("tasks.transition", "Proje gorevi durumunu degistir", "project_management", "work", "operation", fallback=["tasks.edit"]),
    "tasks.comment": _permission("tasks.comment", "Proje gorevine yorum ekle", "project_management", "work", "operation", fallback=["projects.view"]),
    "tasks.attachmentsManage": _permission("tasks.attachmentsManage", "Proje gorevi eklerini yonet", "project_management", "work", "edit", fallback=["tasks.edit"]),
    "tasks.delete": _permission("tasks.delete", "Proje gorevi sil", "project_management", "work", "admin", fallback=["tasks.edit"]),
    "projects.admin": _permission("projects.admin", "Proje ve gorev yonetimi yoneticisi", "project_management", "work", "admin", fallback=["projects.edit"]),
    "products.view": _permission("products.view", "Urun/Hizmet katalogunu goruntule", "product_services", "catalog", "view", fallback=["companies.view", "product_services.view"]),
    "products.create": _permission("products.create", "Urun/Hizmet katalog kaydi olustur", "product_services", "catalog", "operation", fallback=["products.edit", "product_services.create"]),
    "products.edit": _permission("products.edit", "Urun/Hizmet katalog kaydini duzenle", "product_services", "catalog", "edit", fallback=["products.view", "product_services.edit"]),
    "products.delete": _permission("products.delete", "Urun/Hizmet katalog kaydini sil", "product_services", "catalog", "admin", fallback=["products.edit", "product_services.delete"]),
    "afterSales.view": _permission("afterSales.view", "Satis sonrasi kayitlari goruntule", "after_sales", "service", "view", fallback=["companies.view", "after_sales.view"]),
    "afterSales.edit": _permission("afterSales.edit", "Satis sonrasi kayitlari duzenle", "after_sales", "service", "edit", fallback=["afterSales.view", "after_sales.edit"]),
    "afterSales.assetCreate": _permission("afterSales.assetCreate", "Kurulu urun kaydi olustur", "after_sales", "service", "operation", fallback=["afterSales.edit", "after_sales.create"]),
    "afterSales.requestCreate": _permission("afterSales.requestCreate", "Servis talebi olustur", "after_sales", "service", "operation", fallback=["afterSales.edit", "after_sales.create"]),
    "afterSales.requestAssign": _permission("afterSales.requestAssign", "Servis talebi ata", "after_sales", "service", "operation", fallback=["afterSales.edit", "after_sales.edit"]),
    "afterSales.serviceRecordCreate": _permission("afterSales.serviceRecordCreate", "Servis kaydi olustur", "after_sales", "service", "operation", fallback=["afterSales.edit", "after_sales.create"]),
    "afterSales.serviceComplete": _permission("afterSales.serviceComplete", "Servis kaydini tamamla", "after_sales", "service", "operation", fallback=["afterSales.edit", "after_sales.edit"]),
    "afterSales.admin": _permission("afterSales.admin", "Satis sonrasi yoneticisi", "after_sales", "service", "admin", fallback=["afterSales.edit", "after_sales.manage"]),
    "product_services.view": _permission("product_services.view", "Eski urun/hizmet goruntuleme izni", "product_services", "catalog", "view", fallback=["products.view"], deprecated=True),
    "product_services.create": _permission("product_services.create", "Eski urun/hizmet olusturma izni", "product_services", "catalog", "operation", fallback=["products.create"], deprecated=True),
    "product_services.edit": _permission("product_services.edit", "Eski urun/hizmet duzenleme izni", "product_services", "catalog", "edit", fallback=["products.edit"], deprecated=True),
    "product_services.delete": _permission("product_services.delete", "Eski urun/hizmet silme izni", "product_services", "catalog", "admin", fallback=["products.delete"], deprecated=True),
    "product_services.manage": _permission("product_services.manage", "Eski urun/hizmet yonetim izni", "product_services", "catalog", "admin", fallback=["products.edit"], deprecated=True),
    "after_sales.view": _permission("after_sales.view", "Eski satis sonrasi goruntuleme izni", "after_sales", "service", "view", fallback=["afterSales.view"], deprecated=True),
    "after_sales.create": _permission("after_sales.create", "Eski satis sonrasi olusturma izni", "after_sales", "service", "operation", fallback=["afterSales.requestCreate"], deprecated=True),
    "after_sales.edit": _permission("after_sales.edit", "Eski satis sonrasi duzenleme izni", "after_sales", "service", "edit", fallback=["afterSales.edit"], deprecated=True),
    "after_sales.delete": _permission("after_sales.delete", "Eski satis sonrasi silme izni", "after_sales", "service", "admin", fallback=["afterSales.admin"], deprecated=True),
    "after_sales.manage": _permission("after_sales.manage", "Eski satis sonrasi yonetim izni", "after_sales", "service", "admin", fallback=["afterSales.admin"], deprecated=True),
    "crm.view": _permission("crm.view", "CRM/Paydas kayitlarini goruntule", "crm", "stakeholder", "view", fallback=["stakeholders.view", "companies.view"]),
    "crm.create": _permission("crm.create", "CRM/Paydas kaydi olustur", "crm", "stakeholder", "operation", fallback=["stakeholders.insert", "crm.edit"]),
    "crm.edit": _permission("crm.edit", "CRM/Paydas kaydi duzenle", "crm", "stakeholder", "edit", fallback=["stakeholders.edit", "crm.view"]),
    "crm.delete": _permission("crm.delete", "CRM/Paydas kaydi arsivle", "crm", "stakeholder", "admin", fallback=["stakeholders.delete", "crm.edit"]),
    "crm.interactionsManage": _permission("crm.interactionsManage", "CRM etkilesimlerini yonet", "crm", "interaction", "operation", fallback=["crm.edit"]),
    "crm.leadsManage": _permission("crm.leadsManage", "Lead kayitlarini yonet", "crm", "lead", "operation", fallback=["crm.edit"]),
    "crm.createCariAccount": _permission("crm.createCariAccount", "Paydastan cari kart olustur", "crm", "accounting", "operation", fallback=["crm.edit", "accounting.edit"]),
    "crm.createTask": _permission("crm.createTask", "Paydas takip gorevi olustur", "crm", "task", "operation", fallback=["crm.edit", "tasks.create"]),
    "reporting.view": _permission("reporting.view", "Raporlari goruntule", "reporting", "reporting", "view", fallback=["companies.view"]),
    "reporting.dashboardView": _permission("reporting.dashboardView", "Yonetim dashboard goruntule", "reporting", "dashboard", "view", fallback=["reporting.view"]),
    "reporting.export": _permission("reporting.export", "Rapor export al", "reporting", "reporting", "operation", fallback=["reporting.view"]),
    "reporting.admin": _permission("reporting.admin", "Raporlama yoneticisi", "reporting", "reporting", "admin", fallback=["reporting.view"]),
    "reporting.viewFinancial": _permission("reporting.viewFinancial", "Finansal KPI goruntule", "reporting", "finance", "view", fallback=["accounting.view"]),
    "reporting.viewAuditSummary": _permission("reporting.viewAuditSummary", "Audit ozet KPI goruntule", "reporting", "audit", "view", fallback=["audit.view"]),
    "reporting.viewHR": _permission("reporting.viewHR", "IK KPI goruntule", "reporting", "hr", "view", fallback=["hr.view"]),
    "reporting.viewSystem": _permission("reporting.viewSystem", "Sistem KPI goruntule", "reporting", "system", "view", fallback=["settings.view"]),
    "import.view": _permission("import.view", "Import sablon ve joblarini goruntule", "importExport", "data", "view", fallback=["settings.view"]),
    "import.create": _permission("import.create", "Toplu import job olustur ve dogrula", "importExport", "data", "operation", fallback=["import.view"]),
    "import.confirm": _permission("import.confirm", "Toplu import onayla", "importExport", "data", "approval", fallback=["import.create"]),
    "import.cancel": _permission("import.cancel", "Toplu import iptal et", "importExport", "data", "operation", fallback=["import.create"]),
    "export.create": _permission("export.create", "Veri export job olustur", "importExport", "data", "operation", fallback=["reporting.export", "import.view"]),
    "export.download": _permission("export.download", "Export dosyasi indir", "importExport", "data", "view", fallback=["export.create"]),
    "bulk.create": _permission("bulk.create", "Bulk action dry-run olustur", "importExport", "data", "operation", fallback=["import.view"]),
    "bulk.confirm": _permission("bulk.confirm", "Bulk action onayla", "importExport", "data", "approval", fallback=["bulk.create"]),
    "bulk.admin": _permission("bulk.admin", "Bulk operation yonetimi", "importExport", "data", "admin", fallback=["bulk.confirm"]),
    "documents.view": _permission("documents.view", "Belgeleri goruntule", "documents", "document", "view", fallback=["companies.view"]),
    "documents.upload": _permission("documents.upload", "Belge yukle ve metadata guncelle", "documents", "document", "operation", fallback=["documents.view"]),
    "documents.download": _permission("documents.download", "Belge indir", "documents", "document", "view", fallback=["documents.view"]),
    "documents.verify": _permission("documents.verify", "Belge dogrula", "documents", "document", "approval", fallback=["documents.upload"]),
    "documents.reject": _permission("documents.reject", "Belge reddet", "documents", "document", "approval", fallback=["documents.verify"]),
    "documents.delete": _permission("documents.delete", "Belge sil/arsivle", "documents", "document", "admin", fallback=["documents.upload"]),
    "documents.admin": _permission("documents.admin", "Belge yonetimi admin", "documents", "document", "admin", fallback=["documents.delete", "documents.verify"]),
    "documents.accessLogsView": _permission("documents.accessLogsView", "Belge erisim loglarini goruntule", "documents", "document", "admin", fallback=["documents.admin", "audit.view"]),
    "notifications.view": _permission("notifications.view", "Kendi bildirimlerini goruntule", "notifications", "notification", "view"),
    "notifications.manage": _permission("notifications.manage", "Bildirim tercihlerini ve hatirlatmalarini yonet", "notifications", "notification", "edit", fallback=["notifications.view"]),
    "notifications.admin": _permission("notifications.admin", "Sistem bildirimlerini yonet", "notifications", "notification", "admin", fallback=["settings.view"]),
    "email.admin": _permission("email.admin", "Sistem e-posta kuyrugunu yonet", "notifications", "email", "admin", fallback=["notifications.admin", "system.admin"]),
    "reminders.manage": _permission("reminders.manage", "Hatirlatmalari yonet", "notifications", "reminder", "edit", fallback=["notifications.manage"]),
    "dataQuality.view": _permission("dataQuality.view", "Veri kalitesi dashboardunu goruntule", "dataQuality", "governance", "view", fallback=["settings.view"]),
    "dataQuality.runChecks": _permission("dataQuality.runChecks", "Veri kalite kontrollerini calistir", "dataQuality", "governance", "operation", fallback=["dataQuality.view"]),
    "dataQuality.reviewDuplicates": _permission("dataQuality.reviewDuplicates", "Duplicate adaylarini incele", "dataQuality", "governance", "operation", fallback=["dataQuality.view"]),
    "dataQuality.merge": _permission("dataQuality.merge", "Guvenli master data merge onayla", "dataQuality", "governance", "approval", fallback=["dataQuality.reviewDuplicates", "crm.edit"]),
    "dataQuality.dismissFinding": _permission("dataQuality.dismissFinding", "Veri kalite bulgusunu kapat veya false positive isaretle", "dataQuality", "governance", "edit", fallback=["dataQuality.reviewDuplicates"]),
    "dataQuality.admin": _permission("dataQuality.admin", "Veri kalitesi kurallarini yonet", "dataQuality", "governance", "admin", fallback=["dataQuality.merge", "settings.view"]),
    "adminConsole.view": _permission("adminConsole.view", "Admin Console goruntule", "adminConsole", "settings", "view", fallback=["settings.view"]),
    "adminConsole.manage": _permission("adminConsole.manage", "Admin Console ayarlarini yonet", "adminConsole", "settings", "admin", fallback=["settings.edit"]),
    "adminConsole.technical": _permission("adminConsole.technical", "Teknik admin bilgilerini goruntule", "adminConsole", "settings", "admin", fallback=["system.admin"]),
    "adminConsole.outboxAdmin": _permission("adminConsole.outboxAdmin", "Outbox admin islemlerini yonet", "adminConsole", "outbox", "admin", fallback=["outbox.dispatch", "system.admin"]),
    "security.view": _permission("security.view", "Kullanici, rol ve yetki yonetimini goruntule", "security", "security", "view", fallback=["settings.view"]),
    "security.usersManage": _permission("security.usersManage", "Kullanicilari yonet", "security", "security", "admin", fallback=["security.view", "settings.usersManage"]),
    "security.rolesManage": _permission("security.rolesManage", "Rolleri ve yetki matrisini yonet", "security", "security", "admin", fallback=["security.view", "roles.manage"]),
    "security.scopesManage": _permission("security.scopesManage", "Sirket/sube erisim kapsamini yonet", "security", "security", "admin", fallback=["security.usersManage"]),
    "security.policyTest": _permission("security.policyTest", "Policy test aracini calistir", "security", "security", "admin", fallback=["security.view"]),
    "users.manage": _permission("users.manage", "Eski kullanici yonetim yetkisi", "security", "security", "admin", fallback=["security.usersManage"], deprecated=True),
    "roles.manage": _permission("roles.manage", "Eski rol yonetim yetkisi", "security", "security", "admin", fallback=["security.rolesManage"], deprecated=True),
    "settings.view": _permission("settings.view", "Ayarlari goruntule", "settings", "setup", "view"),
    "settings.edit": _permission("settings.edit", "Ayarlari duzenle", "settings", "setup", "edit"),
    "settings.modulesManage": _permission("settings.modulesManage", "Modulleri yonet", "settings", "setup", "admin", fallback=["settings.edit"]),
    "settings.usersManage": _permission("settings.usersManage", "Kullanicilari yonet", "settings", "setup", "admin", fallback=["settings.edit"]),
    "audit.view": _permission("audit.view", "Denetim izini goruntule", "audit", "audit", "view", fallback=["settings.view"]),
    "process.view": _permission("process.view", "Surecleri goruntule", "process", "process", "view", fallback=["companies.view"]),
    "process.manage": _permission("process.manage", "Surecleri yonet", "process", "process", "admin", fallback=["settings.edit"]),
    "tasks.view": _permission("tasks.view", "Proje ve surec gorevlerini goruntule", "project_management", "work", "view", fallback=["projects.view", "process.view"]),
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
