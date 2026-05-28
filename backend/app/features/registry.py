# ruff: noqa: E501
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class FeatureFlagDefinition:
    key: str
    module_key: str
    label: str
    description: str
    default_enabled: bool = True
    dependencies: list[str] = field(default_factory=list)
    risk: str | None = None


FEATURE_FLAGS: list[FeatureFlagDefinition] = [
    FeatureFlagDefinition(
        key="actionGuide.enabled",
        module_key="settings",
        label="Islem Rehberi",
        description="Kullaniciyi dogru modul, kurulum veya resmi islem yoluna yonlendirir.",
    ),
    FeatureFlagDefinition(
        key="guidedTour.enabled",
        module_key="settings",
        label="Rehberli Tur",
        description="Urun ekranlarinda kisa tanitim turlari gosterir.",
    ),
    FeatureFlagDefinition(
        key="processEngine.enabled",
        module_key="process",
        label="Surec Motoru",
        description="Gorev, onay ve surec adimlarini etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="auditLog.enabled",
        module_key="audit",
        label="Denetim Izi",
        description="Kritik islemler icin audit kaydi olusturur ve gorunur kilar.",
    ),
    FeatureFlagDefinition(
        key="actionCenter.enabled",
        module_key="actionCenter",
        label="Is Merkezi",
        description="Gorev, onay, tamamlanamayan islem ve sistem uyarilarini tek yerde toplar.",
        dependencies=["process", "audit"],
    ),
    FeatureFlagDefinition(
        key="branches.facilityAutoCreate",
        module_key="branches",
        label="Sube acilisinda tesis/lokasyon olusturma",
        description="Sube Acilisi sirasinda tesis/lokasyon kaydinin otomatik olusmasini saglar.",
        dependencies=["facilities"],
    ),
    FeatureFlagDefinition(
        key="branches.organizationAutoCreate",
        module_key="branches",
        label="Sube acilisinda organizasyon birimi olusturma",
        description=(
            "Sube Acilisi sirasinda organizasyon birimi kaydinin otomatik "
            "olusmasini saglar."
        ),
        dependencies=["organization"],
    ),
    FeatureFlagDefinition(
        key="branches.documentUpdate",
        module_key="branches",
        label="Sube belge guncelleme",
        description="Sube belgeleri icin ayri belge guncelleme akisini etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="representatives.scopeAuthority",
        module_key="representatives",
        label="Kapsam bazli temsil yetkisi",
        description=(
            "Temsil yetkilerini sirket geneli, sube, organizasyon veya tesis "
            "kapsamina indirger."
        ),
        dependencies=["branches", "organization", "facilities"],
    ),
    FeatureFlagDefinition(
        key="facilities.freeCreate",
        module_key="facilities",
        label="Serbest tesis/lokasyon olusturma",
        description=(
            "Tesisler/Lokasyonlar sayfasindan subeden bagimsiz fiziksel "
            "lokasyon olusturulabilsin."
        ),
    ),
    FeatureFlagDefinition(
        key="organization.positionManagement",
        module_key="organization",
        label="Kadro/Pozisyon yonetimi",
        description="Organizasyon birimleri altinda kadro ve pozisyon yonetimini etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="audit.export",
        module_key="audit",
        label="Denetim raporu disa aktarimi",
        description="Denetim izi raporlarinin maskeli CSV/Excel ciktisini etkinlestirir.",
        risk="Disa aktarim yetkisi ve tarih araligi zorunlu olmalidir.",
    ),
    FeatureFlagDefinition(
        key="dataImport.enabled",
        module_key="importExport",
        label="Data import",
        description="Sablonlu dosya yukleme, mapping, validation ve onayli import akislarini etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="dataImport.csv",
        module_key="importExport",
        label="CSV import",
        description="CSV dosyalarindan import parse akislarini etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="dataImport.xlsx",
        module_key="importExport",
        label="XLSX import",
        description="XLSX dosyalarindan import parse akislarini etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="dataExport.enabled",
        module_key="importExport",
        label="Data export",
        description="Maskeli ve auditli CSV export job akislarini etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="bulkOperations.enabled",
        module_key="importExport",
        label="Bulk operations",
        description="Kontrollu bulk action dry-run ve confirm akislarini etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="bulkOperations.confirmationRequired",
        module_key="importExport",
        label="Bulk onay zorunlulugu",
        description="Bulk action icin dry-run sonrasi kullanici onayi gerektirir.",
    ),
    FeatureFlagDefinition(
        key="documents.enabled",
        module_key="documents",
        label="Belge yonetimi",
        description="Merkezi belge metadata, relation ve storage akislarini etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="documents.preview",
        module_key="documents",
        label="Belge onizleme",
        description="Belge onizleme icin kontrollu signed URL uretimini etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="documents.versioning",
        module_key="documents",
        label="Belge versiyonlama",
        description="Replace/new version akislarini etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="documents.verification",
        module_key="documents",
        label="Belge dogrulama",
        description="Belge verify/reject statulerini etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="documents.accessLogs",
        module_key="documents",
        label="Belge erisim loglari",
        description="Belge view/download/preview erisimlerini loglar.",
    ),
    FeatureFlagDefinition(
        key="documents.mobileCameraUpload",
        module_key="documents",
        label="Mobil kamera yukleme",
        description="Mobil cihazlarda fotograf cek/yukle inputunu etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="documents.requirements",
        module_key="documents",
        label="Belge gereksinimleri",
        description="Operation bazli required/optional belge slotlarini etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="documents.signedUrlDownload",
        module_key="documents",
        label="Signed URL ile indirme",
        description="Belge indirme/onizleme icin kisa omurlu signed URL uretir.",
    ),
    FeatureFlagDefinition(
        key="documents.expiryAlerts",
        module_key="documents",
        label="Belge sure uyarilari",
        description="Suresi dolan ve 30 gun icinde dolacak belgeleri Action Center'a tasir.",
    ),
    FeatureFlagDefinition(
        key="notifications.enabled",
        module_key="notifications",
        label="Bildirimler",
        description="Kullanici bildirimlerini etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="notifications.inApp",
        module_key="notifications",
        label="Uygulama ici bildirim",
        description="Header bildirim paneli ve okunmamis sayaci etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="notifications.email",
        module_key="notifications",
        label="E-posta bildirimi",
        description="Bildirimlerden e-posta kuyrugu olusturulmasini etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="notifications.reminders",
        module_key="notifications",
        label="Hatirlatmalar",
        description="Zamanlanmis reminder batch islerini etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="notifications.digest",
        module_key="notifications",
        label="Bildirim ozeti",
        description="Gunluk/haftalik digest tercihlerini etkinlestirir.",
        default_enabled=False,
    ),
    FeatureFlagDefinition(
        key="notifications.systemWarnings",
        module_key="notifications",
        label="Sistem uyarilari",
        description="Sistem ve guvenlik uyarilarini ilgili yetkililere iletir.",
    ),
    FeatureFlagDefinition(
        key="notifications.emailTemplates",
        module_key="notifications",
        label="E-posta sablonlari",
        description="Baslangic e-posta sablonlarini ve degisken render altyapisini etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="process.approvals",
        module_key="process",
        label="Surec onaylari",
        description="Surec icinde onay bekleyen adimlari etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="process.tasks",
        module_key="process",
        label="Surec gorevleri",
        description="Kullanicilara atanabilen surec gorevlerini etkinlestirir.",
    ),
]

_FEATURE_BY_KEY = {flag.key: flag for flag in FEATURE_FLAGS}
_TENANT_FEATURE_OVERRIDES: dict[str, dict[str, bool]] = {}


def list_feature_flags(module_key: str | None = None) -> list[FeatureFlagDefinition]:
    flags = FEATURE_FLAGS
    if module_key:
        flags = [flag for flag in flags if flag.module_key == module_key]
    return list(flags)


def get_feature_flag(key: str) -> FeatureFlagDefinition | None:
    return _FEATURE_BY_KEY.get(key)


def is_feature_enabled(tenant_id: str, key: str) -> bool:
    tenant_overrides = _TENANT_FEATURE_OVERRIDES.get(tenant_id, {})
    if key in tenant_overrides:
        return tenant_overrides[key]
    flag = get_feature_flag(key)
    return flag.default_enabled if flag else True


def set_feature_enabled(tenant_id: str, key: str, enabled: bool) -> bool:
    if key not in _FEATURE_BY_KEY:
        return False
    _TENANT_FEATURE_OVERRIDES.setdefault(tenant_id, {})[key] = enabled
    return True


def feature_flag_payload(
    flag: FeatureFlagDefinition,
    *,
    tenant_id: str,
) -> dict[str, object]:
    return {
        "key": flag.key,
        "module_key": flag.module_key,
        "label": flag.label,
        "description": flag.description,
        "default_enabled": flag.default_enabled,
        "enabled": is_feature_enabled(tenant_id, flag.key),
        "dependencies": flag.dependencies,
        "risk": flag.risk,
    }
