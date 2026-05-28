# ruff: noqa: E501
from __future__ import annotations

import csv
import io
from typing import Any

from app.domains.import_export.schemas import ColumnRule, ImportTemplate


def _rule(
    field: str,
    label: str,
    *,
    required: bool = False,
    data_type: str = "string",
    enum_values: list[str] | None = None,
    description: str | None = None,
    controlled: bool = False,
) -> ColumnRule:
    return ColumnRule(
        field=field,
        label=label,
        required=required,
        data_type=data_type,
        enum_values=enum_values or [],
        description=description,
        controlled=controlled,
    )


def _template(
    *,
    template_key: str,
    module_key: str,
    entity_type: str,
    label: str,
    description: str,
    rules: list[ColumnRule],
    sample_rows: list[dict[str, Any]],
    hints: dict[str, list[str]] | None = None,
    operation_controlled_fields: list[str] | None = None,
) -> ImportTemplate:
    required = [rule.field for rule in rules if rule.required]
    optional = [rule.field for rule in rules if not rule.required]
    mapping_hints = {rule.field: [rule.field, rule.label] for rule in rules}
    for field, values in (hints or {}).items():
        mapping_hints[field] = list(dict.fromkeys([field, *values, *mapping_hints.get(field, [])]))
    return ImportTemplate(
        template_key=template_key,
        module_key=module_key,
        entity_type=entity_type,
        label=label,
        description=description,
        required_columns=required,
        optional_columns=optional,
        sample_rows=sample_rows,
        validation_rules=rules,
        field_mapping_hints=mapping_hints,
        operation_controlled_fields=operation_controlled_fields or [
            rule.field for rule in rules if rule.controlled
        ],
    )


TEMPLATES: dict[str, ImportTemplate] = {
    "cari_accounts_template": _template(
        template_key="cari_accounts_template",
        module_key="accounting",
        entity_type="cari_account",
        label="Cari Kartlar",
        description="Musteri, tedarikci ve muhtelif cari kart taslak/aktif kart aktarimi.",
        rules=[
            _rule("company_id", "Sirket ID", required=True),
            _rule("account_name", "Cari adi", required=True),
            _rule("cari_role", "Cari rol", required=True, enum_values=["customer", "supplier", "both", "employee", "partner", "stakeholder", "public_institution", "bank", "miscellaneous", "related_company", "other"]),
            _rule("account_code", "Cari kodu"),
            _rule("account_type", "Hesap tipi"),
            _rule("linked_entity_type", "Bagli kayit tipi"),
            _rule("linked_entity_id", "Bagli kayit ID"),
            _rule("tax_number", "VKN"),
            _rule("identity_number", "TCKN"),
            _rule("tax_office", "Vergi dairesi"),
            _rule("country", "Ulke"),
            _rule("city", "Il"),
            _rule("district", "Ilce"),
            _rule("address", "Adres"),
            _rule("phone", "Telefon", data_type="phone"),
            _rule("email", "E-posta", data_type="email"),
            _rule("currency", "Para birimi", data_type="currency"),
            _rule("opening_balance", "Acilis bakiyesi", data_type="decimal"),
            _rule("risk_limit", "Risk limiti", data_type="decimal"),
            _rule("payment_terms", "Odeme kosullari"),
            _rule("record_status", "Kayit durumu", enum_values=["draft", "active", "passive"]),
            _rule("notes", "Notlar"),
        ],
        sample_rows=[
            {
                "company_id": "00000000-0000-0000-0000-000000000000",
                "account_name": "ABC Tedarik A.S.",
                "cari_role": "supplier",
                "tax_number": "1234567890",
                "city": "Istanbul",
                "currency": "TRY",
            }
        ],
        hints={"account_name": ["Cari Adi", "Unvan", "Ad Soyad"], "tax_number": ["VKN", "Vergi No"]},
    ),
    "stakeholders_template": _template(
        template_key="stakeholders_template",
        module_key="crm",
        entity_type="stakeholder",
        label="Paydaslar / Musteriler / Tedarikciler",
        description="CRM paydas rolleri, master kisi/kurum lookup ve opsiyonel cari kart akisi.",
        rules=[
            _rule("company_id", "Sirket ID", required=True),
            _rule("master_entity_type", "Master tipi", required=True, enum_values=["person", "organization"]),
            _rule("stakeholder_type", "Paydas tipi", required=True, enum_values=["customer", "supplier", "customer_supplier", "dealer", "distributor", "accounting_firm", "external_consultant", "public_institution", "logistics_partner", "service_partner", "investor", "lead", "other"]),
            _rule("display_name", "Gorunen ad"),
            _rule("first_name", "Ad"),
            _rule("last_name", "Soyad"),
            _rule("trade_name", "Ticari unvan"),
            _rule("tax_number", "VKN"),
            _rule("identity_number", "TCKN"),
            _rule("passport_no", "Pasaport no"),
            _rule("country", "Ulke"),
            _rule("city", "Il"),
            _rule("phone", "Telefon", data_type="phone"),
            _rule("email", "E-posta", data_type="email"),
            _rule("assigned_owner_user_id", "Sorumlu kullanici"),
            _rule("create_cari_account", "Cari kart da olussun", data_type="boolean"),
            _rule("notes", "Notlar"),
        ],
        sample_rows=[
            {
                "company_id": "00000000-0000-0000-0000-000000000000",
                "master_entity_type": "organization",
                "stakeholder_type": "customer",
                "trade_name": "Delta Musteri Ltd.",
                "tax_number": "9876543210",
                "create_cari_account": "false",
            }
        ],
    ),
    "product_catalog_template": _template(
        template_key="product_catalog_template",
        module_key="product_services",
        entity_type="product_catalog",
        label="Urun/Hizmet Katalogu",
        description="Urun, hizmet, abonelik ve servislenebilir katalog kartlari.",
        rules=[
            _rule("product_name", "Urun/Hizmet adi", required=True),
            _rule("product_type", "Tip", required=True, enum_values=["physical_product", "software", "service", "subscription", "bundle", "spare_part", "consumable"]),
            _rule("product_code", "Kod"),
            _rule("company_id", "Sirket ID"),
            _rule("category", "Kategori"),
            _rule("brand", "Marka"),
            _rule("model", "Model"),
            _rule("unit", "Birim"),
            _rule("serial_required", "Seri no gerekli", data_type="boolean"),
            _rule("warranty_months", "Garanti ayi", data_type="integer"),
            _rule("maintenance_required", "Bakim gerekli", data_type="boolean"),
            _rule("maintenance_period_days", "Bakim periyodu", data_type="integer"),
            _rule("serviceable", "Servislenebilir", data_type="boolean"),
            _rule("active", "Aktif", data_type="boolean"),
            _rule("sale_enabled", "Satis aktif", data_type="boolean"),
            _rule("after_sales_enabled", "Satis sonrasi aktif", data_type="boolean"),
            _rule("default_currency", "Para birimi", data_type="currency"),
            _rule("default_price", "Varsayilan fiyat", data_type="decimal"),
            _rule("notes", "Notlar"),
        ],
        sample_rows=[
            {
                "product_code": "PRD-1001",
                "product_name": "Bakim Paketi",
                "product_type": "service",
                "serial_required": "false",
                "warranty_months": "12",
            }
        ],
    ),
    "employee_drafts_template": _template(
        template_key="employee_drafts_template",
        module_key="hr",
        entity_type="employee_draft",
        label="Calisan Taslak Kartlari",
        description="Ise giris yapmadan calisan kart taslaklarini olusturur.",
        rules=[
            _rule("company_id", "Sirket ID", required=True),
            _rule("first_name", "Ad", required=True),
            _rule("last_name", "Soyad", required=True),
            _rule("employee_no", "Calisan no"),
            _rule("identity_number", "TCKN"),
            _rule("passport_no", "Pasaport no"),
            _rule("nationality", "Uyruk"),
            _rule("birth_date", "Dogum tarihi", data_type="date"),
            _rule("gender", "Cinsiyet", enum_values=["male", "female", "other", "unspecified"]),
            _rule("phone", "Telefon", data_type="phone"),
            _rule("email", "E-posta", data_type="email"),
            _rule("city", "Il"),
            _rule("notes", "Notlar"),
            _rule("employment_status", "Istihdam durumu", controlled=True),
            _rule("sgk_status", "SGK durumu", controlled=True),
        ],
        sample_rows=[
            {
                "company_id": "00000000-0000-0000-0000-000000000000",
                "first_name": "Ayse",
                "last_name": "Yilmaz",
                "identity_number": "12345678901",
            }
        ],
    ),
    "project_tasks_template": _template(
        template_key="project_tasks_template",
        module_key="project_management",
        entity_type="project_task",
        label="Proje Gorevleri",
        description="Gorev kartlarini kontrollu sekilde olusturur.",
        rules=[
            _rule("company_id", "Sirket ID", required=True),
            _rule("title", "Baslik", required=True),
            _rule("project_id", "Proje ID"),
            _rule("issue_key", "Gorev anahtari"),
            _rule("description", "Aciklama"),
            _rule("issue_type", "Tip", enum_values=["task", "bug", "improvement", "support", "incident", "research", "documentation", "checklist"]),
            _rule("status", "Durum", enum_values=["backlog", "todo", "in_progress", "blocked", "review"]),
            _rule("priority", "Oncelik", enum_values=["lowest", "low", "medium", "high", "highest", "urgent"]),
            _rule("assignee_user_id", "Atanan kullanici"),
            _rule("assignee_employee_id", "Atanan calisan"),
            _rule("due_date", "Son tarih", data_type="date"),
            _rule("labels", "Etiketler"),
        ],
        sample_rows=[{"company_id": "00000000-0000-0000-0000-000000000000", "title": "Veri kontrolu", "priority": "medium"}],
    ),
    "facilities_template": _template(
        template_key="facilities_template",
        module_key="facilities",
        entity_type="facility",
        label="Tesis/Lokasyonlar",
        description="Tesis ve lokasyon kartlari; lifecycle alanlari engellenir.",
        rules=[
            _rule("company_id", "Sirket ID", required=True),
            _rule("name", "Tesis adi", required=True),
            _rule("facility_type", "Tesis tipi"),
            _rule("related_branch_id", "Bagli sube ID"),
            _rule("country", "Ulke", controlled=True),
            _rule("city", "Il", controlled=True),
            _rule("district", "Ilce", controlled=True),
            _rule("address", "Adres", controlled=True),
            _rule("postal_code", "Posta kodu", controlled=True),
            _rule("phone", "Telefon", data_type="phone"),
            _rule("email", "E-posta", data_type="email"),
            _rule("status", "Durum", controlled=True),
            _rule("record_status", "Kayit durumu", controlled=True),
            _rule("notes", "Notlar"),
        ],
        sample_rows=[{"company_id": "00000000-0000-0000-0000-000000000000", "name": "Merkez Depo", "facility_type": "warehouse"}],
    ),
    "organization_units_template": _template(
        template_key="organization_units_template",
        module_key="organization",
        entity_type="organization_unit",
        label="Organizasyon Birimleri",
        description="Organizasyon birimi kartlari; lifecycle/status alanlari engellenir.",
        rules=[
            _rule("company_id", "Sirket ID", required=True),
            _rule("name", "Birim adi", required=True),
            _rule("short_name", "Kisa ad"),
            _rule("parent_unit_id", "Ust birim ID"),
            _rule("unit_type", "Birim tipi"),
            _rule("related_branch_id", "Bagli sube ID"),
            _rule("status", "Durum", controlled=True),
            _rule("active", "Aktif", data_type="boolean", controlled=True),
            _rule("start_date", "Baslangic tarihi", data_type="date", controlled=True),
            _rule("notes", "Notlar"),
        ],
        sample_rows=[{"company_id": "00000000-0000-0000-0000-000000000000", "name": "Operasyon", "unit_type": "department"}],
    ),
    "company_drafts_template": _template(
        template_key="company_drafts_template",
        module_key="companies",
        entity_type="company_draft",
        label="Sirket Taslak Kartlari",
        description="Aktif sirket acilisi yapmadan sirket taslak kartlarini olusturur.",
        rules=[
            _rule("trade_name", "Ticari unvan", required=True),
            _rule("short_name", "Kisa unvan"),
            _rule("tax_number", "VKN"),
            _rule("tax_office", "Vergi dairesi"),
            _rule("company_type", "Sirket tipi"),
            _rule("country", "Ulke"),
            _rule("city", "Il"),
            _rule("district", "Ilce"),
            _rule("address", "Adres"),
            _rule("postal_code", "Posta kodu"),
            _rule("phone", "Telefon", data_type="phone"),
            _rule("email", "E-posta", data_type="email"),
            _rule("committed_capital_amount", "Taahhut edilen sermaye", controlled=True),
            _rule("paid_capital_amount", "Odenmis sermaye", controlled=True),
            _rule("record_status", "Kayit durumu", controlled=True),
            _rule("company_status", "Sirket durumu", controlled=True),
            _rule("notes", "Notlar"),
        ],
        sample_rows=[{"trade_name": "Yeni Sirket Taslak A.S.", "tax_number": "1111111111", "city": "Ankara"}],
    ),
    "partner_drafts_template": _template(
        template_key="partner_drafts_template",
        module_key="partners",
        entity_type="partner_draft",
        label="Ortak Taslak Kartlari",
        description="Ortaklik haklari olusturmadan ortak kart taslaklarini aktarir.",
        rules=[
            _rule("company_id", "Sirket ID", required=True),
            _rule("partner_type", "Ortak tipi", required=True, enum_values=["person", "organization"]),
            _rule("first_name", "Ad"),
            _rule("last_name", "Soyad"),
            _rule("trade_name", "Ticari unvan"),
            _rule("identity_number", "TCKN"),
            _rule("passport_no", "Pasaport no"),
            _rule("tax_number", "VKN"),
            _rule("phone", "Telefon", data_type="phone"),
            _rule("email", "E-posta", data_type="email"),
            _rule("city", "Il"),
            _rule("share_ratio", "Pay orani", controlled=True),
            _rule("voting_ratio", "Oy orani", controlled=True),
            _rule("capital_amount", "Sermaye tutari", controlled=True),
            _rule("notes", "Notlar"),
        ],
        sample_rows=[{"company_id": "00000000-0000-0000-0000-000000000000", "partner_type": "person", "first_name": "Mehmet", "last_name": "Kara"}],
    ),
    "representative_drafts_template": _template(
        template_key="representative_drafts_template",
        module_key="representatives",
        entity_type="representative_draft",
        label="Temsilci Taslak Kartlari",
        description="Temsil yetkisi vermeden temsilci kart taslaklarini aktarir.",
        rules=[
            _rule("company_id", "Sirket ID", required=True),
            _rule("person_kind", "Temsilci tipi", required=True, enum_values=["person", "organization"]),
            _rule("first_name", "Ad"),
            _rule("last_name", "Soyad"),
            _rule("trade_name", "Ticari unvan"),
            _rule("display_name", "Gorunen ad"),
            _rule("identity_number", "TCKN"),
            _rule("passport_no", "Pasaport no"),
            _rule("tax_number", "VKN"),
            _rule("phone", "Telefon", data_type="phone"),
            _rule("email", "E-posta", data_type="email"),
            _rule("authority_types", "Yetki tipleri", controlled=True),
            _rule("authority_limit", "Yetki limiti", controlled=True),
            _rule("scope_type", "Yetki kapsami", controlled=True),
            _rule("notes", "Notlar"),
        ],
        sample_rows=[{"company_id": "00000000-0000-0000-0000-000000000000", "person_kind": "person", "first_name": "Elif", "last_name": "Demir"}],
    ),
}


ENTITY_TEMPLATE_KEYS: dict[str, str] = {
    template.entity_type: template_key for template_key, template in TEMPLATES.items()
}


def list_templates() -> list[ImportTemplate]:
    return list(TEMPLATES.values())


def get_template(template_key: str) -> ImportTemplate | None:
    return TEMPLATES.get(template_key)


def get_template_for_entity(entity_type: str) -> ImportTemplate | None:
    key = ENTITY_TEMPLATE_KEYS.get(entity_type)
    return TEMPLATES.get(key) if key else None


def template_csv(template: ImportTemplate) -> str:
    columns = template.required_columns + template.optional_columns
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=columns, extrasaction="ignore")
    writer.writeheader()
    for row in template.sample_rows:
        writer.writerow(row)
    return output.getvalue()
