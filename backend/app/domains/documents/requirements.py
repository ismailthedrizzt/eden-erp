# ruff: noqa: E501

from __future__ import annotations

from app.domains.documents.schemas import DocumentRequirement

DEFAULT_ACCEPTED = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]
DEFAULT_MAX_SIZE = 20 * 1024 * 1024


DEFAULT_REQUIREMENTS: list[DocumentRequirement] = [
    DocumentRequirement(requirement_key="company_opening_trade_registry", module_key="companies", operation_key="opening", entity_type="company", document_type="trade_registry_gazette", required=True, description="Sirket acilisi icin ticaret sicil gazetesi.", accepted_file_types=DEFAULT_ACCEPTED, max_file_size=DEFAULT_MAX_SIZE, verification_required=True),
    DocumentRequirement(requirement_key="company_opening_signature_circular", module_key="companies", operation_key="opening", entity_type="company", document_type="signature_circular", required=False, description="Sirket acilisinda imza sirkuleri.", accepted_file_types=DEFAULT_ACCEPTED, max_file_size=DEFAULT_MAX_SIZE, verification_required=True),
    DocumentRequirement(requirement_key="company_opening_tax_plate", module_key="companies", operation_key="opening", entity_type="company", document_type="tax_plate", required=False, description="Sirket vergi levhasi.", accepted_file_types=DEFAULT_ACCEPTED, max_file_size=DEFAULT_MAX_SIZE),
    DocumentRequirement(requirement_key="branch_opening_decision", module_key="branches", operation_key="branch_opening", entity_type="branch", document_type="branch_opening_decision", required=True, condition={"official_branch": True}, description="Resmi sube acilisi icin sube acilis karari.", accepted_file_types=DEFAULT_ACCEPTED, max_file_size=DEFAULT_MAX_SIZE, verification_required=True),
    DocumentRequirement(requirement_key="branch_opening_registry", module_key="branches", operation_key="branch_opening", entity_type="branch", document_type="branch_trade_registry_gazette", required=True, condition={"official_branch": True}, description="Resmi sube ticaret sicil gazetesi.", accepted_file_types=DEFAULT_ACCEPTED, max_file_size=DEFAULT_MAX_SIZE, verification_required=True),
    DocumentRequirement(requirement_key="representative_signature_authority", module_key="representatives", operation_key="authority_start", entity_type="representative", document_type="signature_authority_document", required=True, condition={"authority_type": "signature"}, description="Imza yetkisi icin yetki belgesi.", accepted_file_types=DEFAULT_ACCEPTED, max_file_size=DEFAULT_MAX_SIZE, verification_required=True),
    DocumentRequirement(requirement_key="representative_bank_authority", module_key="representatives", operation_key="authority_start", entity_type="representative", document_type="bank_authority_document", required=True, condition={"authority_type": "bank"}, description="Banka yetkisi icin banka yetki belgesi.", accepted_file_types=DEFAULT_ACCEPTED, max_file_size=DEFAULT_MAX_SIZE, verification_required=True),
    DocumentRequirement(requirement_key="employee_identity", module_key="hr", operation_key="employment_start", entity_type="employee", document_type="identity_document", required=True, description="Ise giris icin kimlik belgesi.", accepted_file_types=DEFAULT_ACCEPTED, max_file_size=DEFAULT_MAX_SIZE),
    DocumentRequirement(requirement_key="employee_sgk_entry", module_key="hr", operation_key="employment_start", entity_type="employee", document_type="sgk_entry_declaration", required=True, description="SGK giris bildirgesi.", accepted_file_types=DEFAULT_ACCEPTED, max_file_size=DEFAULT_MAX_SIZE, verification_required=True),
    DocumentRequirement(requirement_key="service_photo", module_key="after_sales", operation_key="service_record", entity_type="service_record", document_type="service_photo", required=False, description="Servis kaydi fotografi.", accepted_file_types=["image/jpeg", "image/png", "image/webp"], max_file_size=12 * 1024 * 1024),
    DocumentRequirement(requirement_key="import_source_file", module_key="importExport", operation_key="import_job", entity_type="data_import_job", document_type="import_source_file", required=False, description="Import kaynak dosyasi.", accepted_file_types=["text/csv", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"], max_file_size=20 * 1024 * 1024),
    DocumentRequirement(requirement_key="import_error_report", module_key="importExport", operation_key="import_job", entity_type="data_import_job", document_type="import_error_report", required=False, description="Import hata raporu.", accepted_file_types=["text/csv", "application/pdf"], max_file_size=20 * 1024 * 1024),
]


def list_default_requirements(
    *,
    module_key: str | None = None,
    operation_key: str | None = None,
    entity_type: str | None = None,
) -> list[DocumentRequirement]:
    return [
        item
        for item in DEFAULT_REQUIREMENTS
        if (not module_key or item.module_key == module_key)
        and (not operation_key or item.operation_key == operation_key)
        and (not entity_type or item.entity_type == entity_type)
    ]
