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
