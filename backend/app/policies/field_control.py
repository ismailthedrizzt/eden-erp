from __future__ import annotations

from typing import Any

from fastapi import status

from app.core.errors import DomainError

FIELD_CONTROL_REGISTRY: dict[str, dict[str, dict[str, str]]] = {
    "company": {
        "trade_name": {"label": "Ticari unvan", "operation": "Unvan Degisikligi"},
        "short_name": {"label": "Kisa unvan", "operation": "Unvan Degisikligi"},
        "tax_number": {"label": "Vergi kimlik numarasi", "operation": "Kurulus / Terkin"},
        "tax_office": {"label": "Vergi dairesi", "operation": "Kamu/Tescil Guncelleme"},
        "mersis_number": {"label": "MERSIS no", "operation": "Kamu/Tescil Guncelleme"},
        "trade_registry_number": {
            "label": "Ticaret sicil no",
            "operation": "Kamu/Tescil Guncelleme",
        },
        "trade_registry_office": {
            "label": "Ticaret sicil mudurlugu",
            "operation": "Kamu/Tescil Guncelleme",
        },
        "electronic_notification_address": {
            "label": "Elektronik tebligat adresi",
            "operation": "Kamu/Tescil Guncelleme",
        },
        "e_invoice_taxpayer": {
            "label": "E-Fatura mukellefiyeti",
            "operation": "Kamu/Tescil Guncelleme",
        },
        "e_archive_taxpayer": {
            "label": "E-Arsiv mukellefiyeti",
            "operation": "Kamu/Tescil Guncelleme",
        },
        "e_waybill_taxpayer": {
            "label": "E-Irsaliye mukellefiyeti",
            "operation": "Kamu/Tescil Guncelleme",
        },
        "sgk_workplace_registry_no": {
            "label": "SGK isyeri sicil no",
            "operation": "Kamu/Tescil Guncelleme",
        },
        "sgk_province": {"label": "SGK ili", "operation": "Kamu/Tescil Guncelleme"},
        "sgk_branch": {"label": "SGK subesi", "operation": "Kamu/Tescil Guncelleme"},
        "country": {"label": "Ulke", "operation": "Adres Degisikligi"},
        "city": {"label": "Il", "operation": "Adres Degisikligi"},
        "district": {"label": "Ilce", "operation": "Adres Degisikligi"},
        "address": {"label": "Adres", "operation": "Adres Degisikligi"},
        "postal_code": {"label": "Posta kodu", "operation": "Adres Degisikligi"},
        "committed_capital_amount": {
            "label": "Taahhut edilen sermaye",
            "operation": "Sermaye Islemi",
        },
        "paid_capital_amount": {
            "label": "Odenmis sermaye",
            "operation": "Sermaye/Odeme Mutabakati",
        },
        "nace_codes": {"label": "NACE kodlari", "operation": "NACE Guncelleme"},
        "risk_class": {"label": "Risk sinifi", "operation": "NACE Guncelleme"},
        "activity_subject": {
            "label": "Faaliyet konusu",
            "operation": "Faaliyet Konusu Degisikligi",
        },
        "foundation_date": {"label": "Kurulus tarihi", "operation": "Kurulus / Resmi Islem"},
        "company_type": {"label": "Sirket tipi", "operation": "Kurulus / Resmi Islem"},
        "record_status": {"label": "Kayit durumu", "operation": "Sirket Lifecycle Islemi"},
        "company_status": {"label": "Sirket durumu", "operation": "Sirket Lifecycle Islemi"},
    },
    "company_partner": {
        "share_ratio": {"label": "Pay orani", "operation": "Ortaklik Islemi"},
        "voting_ratio": {"label": "Oy hakki orani", "operation": "Ortaklik Islemi"},
        "profit_ratio": {"label": "Kar payi orani", "operation": "Ortaklik Islemi"},
        "share_units": {"label": "Pay adedi", "operation": "Ortaklik Islemi"},
        "nominal_value": {"label": "Nominal deger", "operation": "Ortaklik Islemi"},
        "capital_amount": {"label": "Sermaye tutari", "operation": "Ortaklik Islemi"},
        "committed_capital_amount": {
            "label": "Taahhut sermayesi",
            "operation": "Sermaye/Ortaklik Islemi",
        },
        "share_class": {"label": "Pay sinifi", "operation": "Ortaklik Islemi"},
        "has_privileged_share": {"label": "Imtiyazli pay", "operation": "Ortaklik Islemi"},
        "has_privilege": {"label": "Imtiyaz", "operation": "Ortaklik Islemi"},
        "has_control_right": {"label": "Kontrol hakki", "operation": "Ortaklik Islemi"},
        "control_type": {"label": "Kontrol tipi", "operation": "Ortaklik Islemi"},
        "has_board_nomination_right": {
            "label": "Yonetim aday gosterme hakki",
            "operation": "Ortaklik Islemi",
        },
        "has_veto_right": {"label": "Veto hakki", "operation": "Ortaklik Islemi"},
        "beneficial_owner": {"label": "Gercek faydalanici", "operation": "Ortaklik Islemi"},
        "is_beneficial_owner": {"label": "Gercek faydalanici", "operation": "Ortaklik Islemi"},
        "beneficial_ratio": {"label": "Faydalanma orani", "operation": "Ortaklik Islemi"},
        "is_ultimate_controller": {"label": "Nihai kontrol eden", "operation": "Ortaklik Islemi"},
        "start_date": {"label": "Baslangic tarihi", "operation": "Ortaklik Islemi"},
        "end_date": {"label": "Bitis tarihi", "operation": "Ortaklik Islemi"},
        "status": {"label": "Durum", "operation": "Ortaklik Islemi"},
        "record_status": {"label": "Kayit durumu", "operation": "Ortaklik Islemi"},
        "current_ownership": {"label": "Guncel ortaklik", "operation": "Ortaklik Islemi"},
        "ownership_transaction_history": {
            "label": "Ortaklik islem gecmisi",
            "operation": "Ortaklik Islemi",
        },
    },
    "company_representative": {
        "status": {"label": "Durum", "operation": "Temsil Yetkisi Islemi"},
        "record_status": {"label": "Kayit durumu", "operation": "Temsil Yetkisi Islemi"},
        "authority_status": {"label": "Yetki durumu", "operation": "Temsil Yetkisi Islemi"},
        "authority_record_status": {
            "label": "Yetki kayit durumu",
            "operation": "Temsil Yetkisi Islemi",
        },
        "authority_effect_status": {
            "label": "Yetki etki durumu",
            "operation": "Temsil Yetkisi Islemi",
        },
        "transaction_status": {"label": "Islem durumu", "operation": "Temsil Yetkisi Islemi"},
        "approval_status": {"label": "Onay durumu", "operation": "Temsil Yetkisi Islemi"},
        "workflow_status": {"label": "Akis durumu", "operation": "Temsil Yetkisi Islemi"},
        "start_date": {"label": "Baslangic tarihi", "operation": "Temsil Yetkisi Islemi"},
        "end_date": {"label": "Bitis tarihi", "operation": "Temsil Yetkisi Islemi"},
        "primary_authority_type": {
            "label": "Birincil yetki tipi",
            "operation": "Temsil Yetkisi Islemi",
        },
        "authority_type": {"label": "Yetki tipi", "operation": "Temsil Yetkisi Islemi"},
        "authority_types": {"label": "Yetki tipleri", "operation": "Temsil Yetkisi Islemi"},
        "job_title": {"label": "Temsil yetki rolu", "operation": "Temsil Yetkisi Islemi"},
        "signature_type": {"label": "Imza tipi", "operation": "Temsil Yetkisi Islemi"},
        "authority_limit": {"label": "Yetki limiti", "operation": "Limit Degisikligi"},
        "transaction_limit": {"label": "Islem limiti", "operation": "Limit Degisikligi"},
        "payment_approval_limit": {"label": "Odeme onay limiti", "operation": "Limit Degisikligi"},
        "purchase_approval_limit": {
            "label": "Satinalma onay limiti",
            "operation": "Limit Degisikligi",
        },
        "bank_transaction_limit": {"label": "Banka islem limiti", "operation": "Limit Degisikligi"},
        "contract_signature_limit": {
            "label": "Sozlesme imza limiti",
            "operation": "Limit Degisikligi",
        },
        "currency": {"label": "Para birimi", "operation": "Limit Degisikligi"},
        "requires_joint_signature": {
            "label": "Birlikte imza",
            "operation": "Temsil Yetkisi Islemi",
        },
        "can_approve_alone": {"label": "Tek basina onay", "operation": "Temsil Yetkisi Islemi"},
        "bank_authority_level": {
            "label": "Banka yetki seviyesi",
            "operation": "Temsil Yetkisi Islemi",
        },
        "department_scope": {"label": "Departman kapsami", "operation": "Temsil Yetkisi Islemi"},
        "gib_permissions": {"label": "GIB izinleri", "operation": "Temsil Yetkisi Islemi"},
        "sgk_permissions": {"label": "SGK izinleri", "operation": "Temsil Yetkisi Islemi"},
        "scope_type": {"label": "Yetki kapsami", "operation": "Yetki Kapsami Degisikligi"},
        "branch_id": {"label": "Sube kapsami", "operation": "Yetki Kapsami Degisikligi"},
        "organization_unit_id": {
            "label": "Organizasyon kapsami",
            "operation": "Yetki Kapsami Degisikligi",
        },
        "facility_id": {"label": "Tesis kapsami", "operation": "Yetki Kapsami Degisikligi"},
        "current_authority": {"label": "Guncel yetki", "operation": "Temsil Yetkisi Islemi"},
        "authority_transaction_history": {
            "label": "Yetki islem gecmisi",
            "operation": "Temsil Yetkisi Islemi",
        },
    },
    "company_branch": {
        "company_id": {"label": "Bagli sirket", "operation": "Sube Acilisi"},
        "branch_name": {"label": "Sube adi", "operation": "Sube Acilisi / Sube Bilgi Degisikligi"},
        "branch_type": {"label": "Sube tipi", "operation": "Sube Acilisi"},
        "is_official_branch": {"label": "Resmi sube", "operation": "Sube Acilisi"},
        "country": {"label": "Ulke", "operation": "Sube Adres Degisikligi"},
        "city": {"label": "Il", "operation": "Sube Adres Degisikligi"},
        "district": {"label": "Ilce", "operation": "Sube Adres Degisikligi"},
        "neighborhood": {"label": "Mahalle", "operation": "Sube Adres Degisikligi"},
        "address": {"label": "Adres", "operation": "Sube Adres Degisikligi"},
        "postal_code": {"label": "Posta kodu", "operation": "Sube Adres Degisikligi"},
        "trade_registry_number": {"label": "Sicil no", "operation": "Sube Resmi Degisikligi"},
        "trade_registry_office": {
            "label": "Sicil mudurlugu",
            "operation": "Sube Resmi Degisikligi",
        },
        "tax_office": {"label": "Vergi dairesi", "operation": "Sube Resmi Degisikligi"},
        "sgk_workplace_registry_no": {
            "label": "SGK isyeri sicil no",
            "operation": "Sube Resmi Degisikligi",
        },
        "opening_decision_date": {"label": "Acilis karar tarihi", "operation": "Sube Acilisi"},
        "opening_registration_date": {"label": "Acilis tescil tarihi", "operation": "Sube Acilisi"},
        "closing_decision_date": {"label": "Kapanis karar tarihi", "operation": "Sube Kapanisi"},
        "closing_registration_date": {
            "label": "Kapanis tescil tarihi",
            "operation": "Sube Kapanisi",
        },
        "trade_registry_gazette_date": {
            "label": "Gazete tarihi",
            "operation": "Sube Resmi Degisikligi",
        },
        "trade_registry_gazette_number": {
            "label": "Gazete sayisi",
            "operation": "Sube Resmi Degisikligi",
        },
        "status": {"label": "Durum", "operation": "Sube Kapanisi"},
        "record_status": {"label": "Kayit durumu", "operation": "Sube Kapanisi"},
        "start_date": {"label": "Baslangic tarihi", "operation": "Sube Acilisi"},
        "end_date": {"label": "Bitis tarihi", "operation": "Sube Kapanisi"},
        "document_files": {"label": "Resmi belgeler", "operation": "Sube Belge Guncelleme"},
    },
    "facility": {
        "company_id": {"label": "Bagli sirket", "operation": "Tesis/Lokasyon Islemi"},
        "branch_id": {"label": "Bagli sube", "operation": "Tesis-Sube Baglantisi"},
        "country": {"label": "Ulke", "operation": "Tesis/Lokasyon Adres Degisikligi"},
        "city": {"label": "Il", "operation": "Tesis/Lokasyon Adres Degisikligi"},
        "district": {"label": "Ilce", "operation": "Tesis/Lokasyon Adres Degisikligi"},
        "neighborhood": {"label": "Mahalle", "operation": "Tesis/Lokasyon Adres Degisikligi"},
        "address": {"label": "Adres", "operation": "Tesis/Lokasyon Adres Degisikligi"},
        "postal_code": {"label": "Posta kodu", "operation": "Tesis/Lokasyon Adres Degisikligi"},
        "status": {"label": "Durum", "operation": "Tesis/Lokasyon Lifecycle"},
        "record_status": {"label": "Kayit durumu", "operation": "Tesis/Lokasyon Lifecycle"},
        "start_date": {"label": "Baslangic tarihi", "operation": "Tesis/Lokasyon Lifecycle"},
        "end_date": {"label": "Bitis tarihi", "operation": "Tesis/Lokasyon Lifecycle"},
        "reusable": {"label": "Yeniden kullanilabilir", "operation": "Tesis/Lokasyon Lifecycle"},
    },
    "organization_unit": {
        "company_id": {"label": "Bagli sirket", "operation": "Organizasyon Yapisi"},
        "status": {"label": "Durum", "operation": "Organizasyon Lifecycle"},
        "active": {"label": "Aktiflik", "operation": "Organizasyon Lifecycle"},
        "start_date": {"label": "Baslangic tarihi", "operation": "Organizasyon Lifecycle"},
        "end_date": {"label": "Bitis tarihi", "operation": "Organizasyon Lifecycle"},
        "branch_id": {
            "label": "Sube baglantisi",
            "operation": "Sube Acilisi / Organizasyon Baglantisi",
        },
        "branch_name": {"label": "Sube adi", "operation": "Sube Acilisi"},
    },
}

COMPANY_DRAFT_CARD_FIELDS = {
    "trade_name",
    "short_name",
    "tax_number",
    "tax_office",
    "company_type",
    "country",
    "city",
    "district",
    "address",
    "postal_code",
    "foundation_date",
}
COMPANY_STRICT_CONTROLLED_FIELDS = {
    "committed_capital_amount",
    "paid_capital_amount",
    "record_status",
    "company_status",
}


def get_operation_controlled_fields(entity_type: str) -> dict[str, dict[str, str]]:
    return FIELD_CONTROL_REGISTRY.get(entity_type, {})


def strip_system_fields(payload: dict[str, Any]) -> dict[str, Any]:
    system_fields = {
        "id",
        "tenant_id",
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
        "version",
    }
    return {field: value for field, value in payload.items() if field not in system_fields}


def map_fields_to_operations(entity_type: str, fields: list[str]) -> list[dict[str, str]]:
    registry = get_operation_controlled_fields(entity_type)
    return [
        {
            "field": field,
            "label": registry.get(field, {}).get("label", field),
            "operation": registry.get(field, {}).get("operation", "Ilgili islem sihirbazi"),
        }
        for field in fields
    ]


def _is_draft_record(current_record: dict[str, Any] | None) -> bool:
    if not current_record:
        return False
    status_values = [
        str(value).strip().lower()
        for value in [
            current_record.get("record_status"),
            current_record.get("company_status"),
            current_record.get("status"),
        ]
        if str(value or "").strip()
    ]
    return any(value in {"draft", "taslak"} for value in status_values)


def reject_operation_controlled_patch(
    entity_type: str,
    payload: dict[str, Any],
    current_record: dict[str, Any] | None = None,
) -> None:
    blocked = sorted(set(payload).intersection(get_operation_controlled_fields(entity_type)))
    if entity_type == "company" and blocked and _is_draft_record(current_record):
        blocked = [
            field
            for field in blocked
            if field not in COMPANY_DRAFT_CARD_FIELDS or field in COMPANY_STRICT_CONTROLLED_FIELDS
        ]
    if not blocked:
        return

    messages = {
        "company": "Bu alanlar resmi islem kontrolludur. Ilgili sihirbazi kullanin.",
        "company_partner": (
            "Ortaklik haklari ortak karti guncellemesiyle degistirilemez. "
            "Ilgili ortaklik islemini kullanin."
        ),
        "company_representative": (
            "Temsil yetkisi alanlari kart guncellemesiyle degistirilemez. "
            "Ilgili temsil yetkisi islemini kullanin."
        ),
        "company_branch": (
            "Sube resmi alanlari kart guncellemesiyle degistirilemez. "
            "Ilgili sube islemini kullanin."
        ),
        "facility": "Tesis/lokasyon lifecycle alanlari kart guncellemesiyle degistirilemez.",
        "organization_unit": (
            "Organizasyon birimi lifecycle alanlari kart guncellemesiyle degistirilemez."
        ),
    }
    raise DomainError(
        messages.get(entity_type, "Bu alanlar ilgili islem sihirbazi ile degistirilebilir."),
        "OPERATION_CONTROLLED_FIELDS",
        status.HTTP_409_CONFLICT,
        {"fields": map_fields_to_operations(entity_type, blocked)},
    )
