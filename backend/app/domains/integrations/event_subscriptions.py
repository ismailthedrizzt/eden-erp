from __future__ import annotations

# ruff: noqa: E501
from typing import Any

from fastapi import status

from app.core.errors import DomainError

EVENT_DEFINITIONS: dict[str, dict[str, Any]] = {
    "company.created_draft": {"module_key": "companies", "aggregate_type": "company", "description": "Sirket taslagi olustu.", "sensitive": False, "required_permission": "companies.view"},
    "company.opened": {"module_key": "companies", "aggregate_type": "company", "description": "Sirket acilisi tamamlandi.", "sensitive": False, "required_permission": "companies.view"},
    "company.updated_card": {"module_key": "companies", "aggregate_type": "company", "description": "Sirket karti guncellendi.", "sensitive": False, "required_permission": "companies.view"},
    "company.official_change_completed": {"module_key": "companies", "aggregate_type": "company", "description": "Resmi degisiklik tamamlandi.", "sensitive": True, "required_permission": "companies.edit"},
    "company.capital_increased": {"module_key": "companies", "aggregate_type": "company", "description": "Sermaye artirimi tamamlandi.", "sensitive": True, "required_permission": "companies.capitalIncreaseStart"},
    "ownership.transaction_completed": {"module_key": "partners", "aggregate_type": "ownership_transaction", "description": "Ortaklik islemi tamamlandi.", "sensitive": True, "required_permission": "partners.view"},
    "ownership.current_changed": {"module_key": "partners", "aggregate_type": "current_ownership", "description": "Guncel ortaklik degisti.", "sensitive": True, "required_permission": "partners.view"},
    "representative.created_draft": {"module_key": "representatives", "aggregate_type": "representative", "description": "Temsilci taslagi olustu.", "sensitive": False, "required_permission": "representatives.view"},
    "representative.authority_started": {"module_key": "representatives", "aggregate_type": "representative_authority", "description": "Temsil yetkisi basladi.", "sensitive": True, "required_permission": "representatives.view"},
    "representative.authority_updated": {"module_key": "representatives", "aggregate_type": "representative_authority", "description": "Temsil yetkisi guncellendi.", "sensitive": True, "required_permission": "representatives.view"},
    "representative.authority_suspended": {"module_key": "representatives", "aggregate_type": "representative_authority", "description": "Temsil yetkisi askida.", "sensitive": True, "required_permission": "representatives.view"},
    "representative.authority_terminated": {"module_key": "representatives", "aggregate_type": "representative_authority", "description": "Temsil yetkisi sonlandi.", "sensitive": True, "required_permission": "representatives.view"},
    "branch.opened": {"module_key": "branches", "aggregate_type": "branch", "description": "Sube acildi.", "sensitive": False, "required_permission": "branches.view"},
    "branch.updated_card": {"module_key": "branches", "aggregate_type": "branch", "description": "Sube karti guncellendi.", "sensitive": False, "required_permission": "branches.view"},
    "branch.closed": {"module_key": "branches", "aggregate_type": "branch", "description": "Sube kapandi.", "sensitive": False, "required_permission": "branches.view"},
    "accounting.cari_account_created": {"module_key": "accounting", "aggregate_type": "cari_account", "description": "Cari kart olustu.", "sensitive": True, "required_permission": "accounting.view"},
    "accounting.cari_transaction_created": {"module_key": "accounting", "aggregate_type": "cari_transaction", "description": "Cari hareket olustu.", "sensitive": True, "required_permission": "accounting.view"},
    "accounting.bank_transaction_imported": {"module_key": "accounting", "aggregate_type": "bank_transaction", "description": "Banka hareketi import edildi.", "sensitive": True, "required_permission": "accounting.bankTransactionsView"},
    "accounting.reconciliation_matched": {"module_key": "accounting", "aggregate_type": "reconciliation", "description": "Mutabakat eslesti.", "sensitive": True, "required_permission": "accounting.reconciliationView"},
    "hr.employee_created": {"module_key": "hr", "aggregate_type": "employee", "description": "Calisan olustu.", "sensitive": True, "required_permission": "hr.view"},
    "hr.employment_started": {"module_key": "hr", "aggregate_type": "employment", "description": "Ise giris basladi.", "sensitive": True, "required_permission": "hr.view"},
    "hr.employment_terminated": {"module_key": "hr", "aggregate_type": "employment", "description": "Isten cikis tamamlandi.", "sensitive": True, "required_permission": "hr.view"},
    "hr.leave_approved": {"module_key": "hr", "aggregate_type": "leave_request", "description": "Izin onaylandi.", "sensitive": True, "required_permission": "hr.leaveView"},
    "project.created": {"module_key": "project_management", "aggregate_type": "project", "description": "Proje olustu.", "sensitive": False, "required_permission": "projects.view"},
    "project_task.created": {"module_key": "project_management", "aggregate_type": "project_task", "description": "Gorev olustu.", "sensitive": False, "required_permission": "tasks.view"},
    "project_task.completed": {"module_key": "project_management", "aggregate_type": "project_task", "description": "Gorev tamamlandi.", "sensitive": False, "required_permission": "tasks.view"},
    "after_sales.asset_created": {"module_key": "after_sales", "aggregate_type": "installed_asset", "description": "Kurulu urun olustu.", "sensitive": False, "required_permission": "afterSales.view"},
    "after_sales.service_request_created": {"module_key": "after_sales", "aggregate_type": "service_request", "description": "Servis talebi olustu.", "sensitive": False, "required_permission": "afterSales.view"},
    "after_sales.service_request_assigned": {"module_key": "after_sales", "aggregate_type": "service_request", "description": "Servis talebi atandi.", "sensitive": False, "required_permission": "afterSales.view"},
    "after_sales.service_record_completed": {"module_key": "after_sales", "aggregate_type": "service_record", "description": "Servis kaydi tamamlandi.", "sensitive": False, "required_permission": "afterSales.view"},
    "crm.lead_created": {"module_key": "crm", "aggregate_type": "lead", "description": "Lead olustu.", "sensitive": False, "required_permission": "crm.leadsView"},
    "crm.opportunity_stage_changed": {"module_key": "crm", "aggregate_type": "opportunity", "description": "Firsat asamasi degisti.", "sensitive": False, "required_permission": "crm.opportunitiesView"},
    "crm.opportunity_won": {"module_key": "crm", "aggregate_type": "opportunity", "description": "Firsat kazanildi.", "sensitive": False, "required_permission": "crm.opportunitiesView"},
    "crm.opportunity_lost": {"module_key": "crm", "aggregate_type": "opportunity", "description": "Firsat kaybedildi.", "sensitive": False, "required_permission": "crm.opportunitiesView"},
    "document.uploaded": {"module_key": "documents", "aggregate_type": "document", "description": "Belge yuklendi.", "sensitive": True, "required_permission": "documents.view"},
    "document.verified": {"module_key": "documents", "aggregate_type": "document", "description": "Belge dogrulandi.", "sensitive": True, "required_permission": "documents.view"},
    "document.rejected": {"module_key": "documents", "aggregate_type": "document", "description": "Belge reddedildi.", "sensitive": True, "required_permission": "documents.view"},
    "document.expiring": {"module_key": "documents", "aggregate_type": "document", "description": "Belge suresi yaklasiyor.", "sensitive": True, "required_permission": "documents.view"},
    "import.completed": {"module_key": "importExport", "aggregate_type": "import_job", "description": "Import tamamlandi.", "sensitive": False, "required_permission": "import.view"},
    "export.completed": {"module_key": "importExport", "aggregate_type": "export_job", "description": "Export tamamlandi.", "sensitive": True, "required_permission": "export.download"},
    "data_quality.finding_created": {"module_key": "dataQuality", "aggregate_type": "data_quality_finding", "description": "Veri kalite bulgusu olustu.", "sensitive": False, "required_permission": "dataQuality.view"},
    "integration.test": {"module_key": "integrations", "aggregate_type": "webhook_test", "description": "Webhook test olayi.", "sensitive": False, "required_permission": "integrations.manageWebhooks"},
}

INBOUND_EVENT_TYPES = {
    "service_request_created_from_external": {"module_key": "after_sales", "description": "Dis sistemden servis talebi olusturma.", "required_permission": "afterSales.requestCreate"},
    "document_uploaded_from_external": {"module_key": "documents", "description": "Dis sistemden belge yukleme bildirimi.", "required_permission": "documents.upload"},
    "crm_lead_created_from_external": {"module_key": "crm", "description": "Dis sistemden lead olusturma.", "required_permission": "crm.leadsEdit"},
    "accounting_bank_transaction_imported_from_external": {"module_key": "accounting", "description": "Dis sistemden banka hareketi import bildirimi.", "required_permission": "accounting.bankTransactionsImport", "future": True},
    "product_asset_update_from_external": {"module_key": "after_sales", "description": "Dis sistemden kurulu urun guncelleme bildirimi.", "required_permission": "afterSales.assetCreate", "future": True},
}


def list_event_types() -> list[dict[str, Any]]:
    return [{"event_type": key, **value} for key, value in sorted(EVENT_DEFINITIONS.items())]


def get_event_type(event_type: str) -> dict[str, Any]:
    definition = EVENT_DEFINITIONS.get(event_type)
    if not definition:
        raise DomainError("Event tipi Integration Hub registry disinda.", "INTEGRATION_EVENT_TYPE_UNKNOWN", status.HTTP_404_NOT_FOUND, {"event_type": event_type})
    return {"event_type": event_type, **definition}


def validate_event_types(event_types: list[str]) -> None:
    missing = [event_type for event_type in event_types if event_type not in EVENT_DEFINITIONS]
    if missing:
        raise DomainError("Webhook aboneligi registry disi event tipi iceriyor.", "INTEGRATION_EVENT_TYPE_INVALID", status.HTTP_422_UNPROCESSABLE_ENTITY, {"event_types": missing})


def validate_inbound_event_type(event_type: str) -> None:
    if event_type not in INBOUND_EVENT_TYPES:
        raise DomainError("Inbound event tipi registry disinda.", "INTEGRATION_INBOUND_EVENT_TYPE_INVALID", status.HTTP_422_UNPROCESSABLE_ENTITY, {"event_type": event_type})

