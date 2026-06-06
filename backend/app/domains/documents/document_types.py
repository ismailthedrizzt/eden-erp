# ruff: noqa: E501

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class DocumentTypeDefinition:
    key: str
    label_tr: str
    module_key: str
    category: str


DOCUMENT_TYPES: tuple[DocumentTypeDefinition, ...] = (
    DocumentTypeDefinition("company.trade_registry_gazette", "Ticaret Sicil Gazetesi", "companies", "company"),
    DocumentTypeDefinition("company.signature_circular", "Imza Sirkuleri", "companies", "company"),
    DocumentTypeDefinition("company.tax_certificate", "Vergi Levhasi", "companies", "company"),
    DocumentTypeDefinition("company.mersis_document", "MERSIS Belgesi", "companies", "company"),
    DocumentTypeDefinition("company.nace_activity_document", "Faaliyet/NACE Belgesi", "companies", "company"),
    DocumentTypeDefinition("employee.identity_document", "Kimlik Belgesi", "hr", "hr"),
    DocumentTypeDefinition("employee.residence_document", "Ikametgah Belgesi", "hr", "hr"),
    DocumentTypeDefinition("employee.diploma", "Diploma", "hr", "hr"),
    DocumentTypeDefinition("employee.health_report", "Saglik Raporu", "hr", "hr"),
    DocumentTypeDefinition("employee.criminal_record", "Adli Sicil Kaydi", "hr", "hr"),
    DocumentTypeDefinition("employee.sgk_entry", "SGK Giris Bildirgesi", "hr", "hr"),
    DocumentTypeDefinition("employee.sgk_exit", "SGK Cikis Bildirgesi", "hr", "hr"),
    DocumentTypeDefinition("ownership.share_transfer_agreement", "Pay Devir Sozlesmesi", "ownership", "ownership"),
    DocumentTypeDefinition("capital.capital_increase_resolution", "Sermaye Artirim Karari", "capital", "capital"),
    DocumentTypeDefinition("capital.capital_decrease_resolution", "Sermaye Azaltim Karari", "capital", "capital"),
    DocumentTypeDefinition("capital.registry_document", "Tescil Belgesi", "capital", "capital"),
    DocumentTypeDefinition("representative.power_of_attorney", "Vekaletname", "representatives", "representative"),
    DocumentTypeDefinition("representative.signature_authority", "Imza Yetki Belgesi", "representatives", "representative"),
    DocumentTypeDefinition("representative.bank_authority_document", "Banka Yetki Belgesi", "representatives", "representative"),
    DocumentTypeDefinition("branch.opening_resolution", "Sube Acilis Karari", "branches", "branch"),
    DocumentTypeDefinition("branch.registry_gazette", "Sube Ticaret Sicil Gazetesi", "branches", "branch"),
    DocumentTypeDefinition("branch.closing_document", "Sube Kapanis Belgesi", "branches", "branch"),
    DocumentTypeDefinition("accounting.invoice", "Fatura", "accounting", "accounting"),
    DocumentTypeDefinition("accounting.receipt", "Makbuz", "accounting", "accounting"),
    DocumentTypeDefinition("accounting.bank_slip", "Banka Dekontu", "accounting", "accounting"),
    DocumentTypeDefinition("service.service_photo", "Servis Fotografi", "after_sales", "after_sales"),
    DocumentTypeDefinition("service.service_report", "Servis Raporu", "after_sales", "after_sales"),
    DocumentTypeDefinition("contract.signed_contract", "Imzali Sozlesme", "contracts", "contract"),
    DocumentTypeDefinition("contract.amendment", "Ek Protokol", "contracts", "contract"),
    DocumentTypeDefinition("contract.termination_notice", "Fesih Bildirimi", "contracts", "contract"),
    DocumentTypeDefinition("contract.guarantee_letter", "Teminat Mektubu", "contracts", "contract"),
)


DOCUMENT_TYPE_MAP = {item.key: item for item in DOCUMENT_TYPES}


def document_type_label(document_type: str) -> str:
    return DOCUMENT_TYPE_MAP.get(document_type, DocumentTypeDefinition(document_type, document_type, "documents", "general")).label_tr
