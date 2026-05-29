# ruff: noqa: E501

from __future__ import annotations

from typing import Any

DEFAULT_RULES: list[dict[str, Any]] = [
    {"rule_key": "missing_identity_identifier", "entity_type": "master_person", "label": "Kimlik/pasaport eksik", "severity": "warning", "description": "Gercek kisi master kaydinda TCKN veya pasaport bulunmali.", "active": True, "config_json": {}},
    {"rule_key": "duplicate_identity_number", "entity_type": "master_person", "label": "Tekrarlanan kimlik numarasi", "severity": "critical", "description": "Ayni nationality + identity_number icin duplicate riskini tespit eder.", "active": True, "config_json": {"fields": ["nationality", "identity_number"]}},
    {"rule_key": "duplicate_passport", "entity_type": "master_person", "label": "Tekrarlanan pasaport", "severity": "critical", "description": "Ayni nationality + passport_no icin duplicate riskini tespit eder.", "active": True, "config_json": {"fields": ["nationality", "passport_no"]}},
    {"rule_key": "missing_contact", "entity_type": "master_person", "label": "Iletisim eksik", "severity": "warning", "description": "Telefon veya e-posta olmadan kisi kalitesi duser.", "active": True, "config_json": {}},
    {"rule_key": "low_quality_name", "entity_type": "master_person", "label": "Ad soyad kalitesi dusuk", "severity": "warning", "description": "Ad soyad alani anlamsiz veya eksik gorunuyor.", "active": True, "config_json": {}},
    {"rule_key": "missing_tax_number", "entity_type": "master_organization", "label": "Vergi numarasi eksik", "severity": "warning", "description": "Tuzel kisi master kaydinda vergi numarasi beklenir.", "active": True, "config_json": {}},
    {"rule_key": "duplicate_tax_number", "entity_type": "master_organization", "label": "Tekrarlanan VKN", "severity": "critical", "description": "Ayni country + tax_number icin duplicate riskini tespit eder.", "active": True, "config_json": {"fields": ["country", "tax_number"]}},
    {"rule_key": "duplicate_trade_name", "entity_type": "master_organization", "label": "Benzer ticari unvan", "severity": "warning", "description": "Normalize ticari unvan duplicate riskini tespit eder.", "active": True, "config_json": {}},
    {"rule_key": "missing_address", "entity_type": "master_organization", "label": "Adres eksik", "severity": "warning", "description": "Adres/city eksikse master kurum kalitesi duser.", "active": True, "config_json": {}},
    {"rule_key": "missing_master_link", "entity_type": "stakeholder", "label": "Master baglantisi eksik", "severity": "critical", "description": "Paydas kaydi master kisi/kurum baglantisi olmadan kalmamali.", "active": True, "config_json": {}},
    {"rule_key": "duplicate_stakeholder_role", "entity_type": "stakeholder", "label": "Tekrarlanan paydas rolu", "severity": "critical", "description": "Ayni sirket + master + paydas tipi duplicate olamaz.", "active": True, "config_json": {}},
    {"rule_key": "customer_without_cari_account", "entity_type": "stakeholder", "label": "Musteri cari baglantisi yok", "severity": "warning", "description": "Aktif musteri/tedarikci paydas icin cari kart baglantisi onerilir.", "active": True, "config_json": {}},
    {"rule_key": "lead_without_followup", "entity_type": "stakeholder", "label": "Lead takip tarihi yok", "severity": "info", "description": "Lead kayitlarinda takip tarihi onerilir.", "active": True, "config_json": {}},
    {"rule_key": "duplicate_account_code", "entity_type": "cari_account", "label": "Tekrarlanan cari kod", "severity": "critical", "description": "Ayni sirket icinde cari kod tekil olmalidir.", "active": True, "config_json": {}},
    {"rule_key": "duplicate_tax_number", "entity_type": "cari_account", "label": "Cari VKN duplicate", "severity": "warning", "description": "Ayni VKN ile birden fazla cari kart olabilir; incelenmelidir.", "active": True, "config_json": {}},
    {"rule_key": "missing_linked_entity", "entity_type": "cari_account", "label": "Linked entity eksik", "severity": "warning", "description": "Cari kart mumkunse master/paydas kaydina baglanmalidir.", "active": True, "config_json": {}},
    {"rule_key": "supplier_without_tax_info", "entity_type": "cari_account", "label": "Tedarikci vergi bilgisi eksik", "severity": "warning", "description": "Tedarikci cari kartinda vergi bilgisi beklenir.", "active": True, "config_json": {}},
    {"rule_key": "partner_without_master_link", "entity_type": "partner", "label": "Ortak master baglantisi eksik", "severity": "critical", "description": "Ortak kartlari master kisi/kurum baglantisiyla yonetilmelidir.", "active": True, "config_json": {}},
    {"rule_key": "duplicate_partner_card", "entity_type": "partner", "label": "Tekrarlanan ortak karti", "severity": "warning", "description": "Ayni master icin birden fazla aktif ortak karti incelenmelidir.", "active": True, "config_json": {}},
    {"rule_key": "active_partner_without_current_ownership", "entity_type": "partner", "label": "Guncel ortaklik yok", "severity": "warning", "description": "Aktif ortak kartinin guncel pay dagiliminda karsiligi olmalidir.", "active": True, "config_json": {}},
    {"rule_key": "ownership_total_not_100", "entity_type": "partner", "label": "Ortaklik toplami %100 degil", "severity": "critical", "description": "Sirket guncel ortaklik dagilimi %100 kontrolunden gecmelidir.", "active": True, "config_json": {}},
    {"rule_key": "representative_without_master_link", "entity_type": "representative", "label": "Temsilci master baglantisi eksik", "severity": "critical", "description": "Temsilci kartlari master kisi/kurum baglantisiyla yonetilmelidir.", "active": True, "config_json": {}},
    {"rule_key": "duplicate_representative_card", "entity_type": "representative", "label": "Tekrarlanan temsilci karti", "severity": "warning", "description": "Ayni master icin birden fazla temsilci karti incelenmelidir.", "active": True, "config_json": {}},
    {"rule_key": "active_representative_without_current_authority", "entity_type": "representative", "label": "Guncel temsil yetkisi yok", "severity": "warning", "description": "Aktif temsilci kartinin current authority karsiligi olmalidir.", "active": True, "config_json": {}},
    {"rule_key": "authority_scope_closed", "entity_type": "representative", "label": "Kapali scope yetkisi", "severity": "warning", "description": "Kapali sube/tesis/organizasyon scope'una bagli yetkiler incelenmelidir.", "active": True, "config_json": {}},
    {"rule_key": "duplicate_employee_identity", "entity_type": "employee", "label": "Tekrarlanan calisan kimligi", "severity": "critical", "description": "Ayni kimlik/pasaport ile aktif calisan duplicate olmamalidir.", "active": True, "config_json": {}},
    {"rule_key": "active_employee_without_position", "entity_type": "employee", "label": "Aktif calisan pozisyonsuz", "severity": "warning", "description": "Aktif calisan icin organizasyon/pozisyon baglantisi beklenir.", "active": True, "config_json": {}},
    {"rule_key": "active_employee_without_sgk_status", "entity_type": "employee", "label": "SGK durumu eksik", "severity": "warning", "description": "Aktif calisanin SGK status bilgisi kontrol edilmelidir.", "active": True, "config_json": {}},
    {"rule_key": "missing_required_documents", "entity_type": "employee", "label": "Zorunlu belge eksik", "severity": "warning", "description": "Calisan icin zorunlu belgeler tamamlanmalidir.", "active": True, "config_json": {}},
    {"rule_key": "branch_missing_facility", "entity_type": "branch", "label": "Sube tesis baglantisi eksik", "severity": "warning", "description": "Aktif sube tesis/lokasyonla iliskilenmelidir.", "active": True, "config_json": {}},
    {"rule_key": "branch_missing_organization_unit", "entity_type": "branch", "label": "Sube organizasyon baglantisi eksik", "severity": "warning", "description": "Operasyonel subeler organizasyon birimine baglanabilir.", "active": True, "config_json": {}},
    {"rule_key": "active_branch_with_closed_facility", "entity_type": "branch", "label": "Kapali tesise bagli aktif sube", "severity": "critical", "description": "Aktif subenin kapali tesis baglantisi incelenmelidir.", "active": True, "config_json": {}},
    {"rule_key": "closed_branch_with_active_authority", "entity_type": "branch", "label": "Kapali subede aktif yetki", "severity": "critical", "description": "Kapali subeye bagli temsil yetkileri kapatilmalidir.", "active": True, "config_json": {}},
    {"rule_key": "duplicate_serial_no", "entity_type": "installed_asset", "label": "Tekrarlanan seri no", "severity": "critical", "description": "Seri numarali kurulu urun tekil olmalidir.", "active": True, "config_json": {}},
    {"rule_key": "asset_without_customer", "entity_type": "installed_asset", "label": "Musteri baglantisi eksik", "severity": "warning", "description": "Kurulu urun musteri/cari baglantisi olmadan kalmamali.", "active": True, "config_json": {}},
    {"rule_key": "asset_without_product", "entity_type": "installed_asset", "label": "Urun baglantisi eksik", "severity": "critical", "description": "Kurulu urun katalog urunune bagli olmalidir.", "active": True, "config_json": {}},
    {"rule_key": "warranty_date_missing", "entity_type": "installed_asset", "label": "Garanti tarihi eksik", "severity": "info", "description": "Garanti takibi icin baslangic/bitis tarihi onerilir.", "active": True, "config_json": {}},
    {"rule_key": "missing_required_document", "entity_type": "document", "label": "Zorunlu belge eksik", "severity": "warning", "description": "Belge gereksinimlerine gore eksik belgeler izlenir.", "active": True, "config_json": {}},
    {"rule_key": "expired_document", "entity_type": "document", "label": "Suresi dolan belge", "severity": "critical", "description": "Expiry date gecmis belgeler uyarilmalidir.", "active": True, "config_json": {}},
    {"rule_key": "duplicate_file_checksum", "entity_type": "document", "label": "Ayni dosya checksum", "severity": "warning", "description": "Ayni checksum ile tekrar yuklenmis belgeler incelenir.", "active": True, "config_json": {}},
]


def list_default_rules(entity_type: str | None = None) -> list[dict[str, Any]]:
    if entity_type:
        return [dict(rule) for rule in DEFAULT_RULES if rule["entity_type"] == entity_type]
    return [dict(rule) for rule in DEFAULT_RULES]


def get_default_rule(rule_key: str) -> dict[str, Any] | None:
    return next((dict(rule) for rule in DEFAULT_RULES if rule["rule_key"] == rule_key), None)
