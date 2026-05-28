# ruff: noqa: I001
from __future__ import annotations

from app.domains.search.providers import (
    AccountingSearchProvider,
    AuditSearchProvider,
    BaseSearchProvider,
    BranchSearchProvider,
    CRMSearchProvider,
    CompanySearchProvider,
    DocumentSearchProvider,
    HRSearchProvider,
    ModuleSettingsSearchProvider,
    PartnerSearchProvider,
    ProductAfterSalesSearchProvider,
    ProjectTaskSearchProvider,
    ReportSearchProvider,
    RepresentativeSearchProvider,
)


def list_search_providers() -> list[BaseSearchProvider]:
    return [
        CompanySearchProvider(),
        BranchSearchProvider(),
        PartnerSearchProvider(),
        RepresentativeSearchProvider(),
        AccountingSearchProvider(),
        HRSearchProvider(),
        ProjectTaskSearchProvider(),
        ProductAfterSalesSearchProvider(),
        CRMSearchProvider(),
        DocumentSearchProvider(),
        AuditSearchProvider(),
        ReportSearchProvider(),
        ModuleSettingsSearchProvider(),
    ]
