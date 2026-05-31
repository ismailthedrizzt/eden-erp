from fastapi import APIRouter

from app.api.v1 import (
    accounting,
    action_center,
    action_eligibility,
    admin,
    after_sales,
    ai_assistant,
    approvals,
    audit,
    automation,
    branches,
    companies,
    company_branches,
    crm,
    data_quality,
    documents,
    facilities,
    features,
    health,
    hr,
    import_export,
    integrations,
    integrity,
    modules,
    notifications,
    onboarding,
    organization,
    ownership,
    partners,
    policy,
    portal,
    processes,
    products,
    project_tasks,
    projections,
    projects,
    reporting,
    representatives,
    search,
    security,
    setup,
    system,
    tasks,
)

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(ai_assistant.router, prefix="/ai", tags=["ai assistant"])
api_router.include_router(automation.router, prefix="/automation", tags=["automation"])
api_router.include_router(companies.router, prefix="/companies", tags=["companies"])
api_router.include_router(company_branches.router, tags=["company branch operations"])
api_router.include_router(branches.router, prefix="/branches", tags=["branches"])
api_router.include_router(facilities.router, prefix="/facilities", tags=["facilities"])
api_router.include_router(accounting.router, prefix="/accounting", tags=["accounting"])
api_router.include_router(hr.router, prefix="/hr", tags=["hr"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
api_router.include_router(products.router, prefix="/products", tags=["products"])
api_router.include_router(after_sales.router, prefix="/after-sales", tags=["after sales"])
api_router.include_router(portal.router, prefix="/portal", tags=["customer portal"])
api_router.include_router(
    portal.admin_router, prefix="/admin/portal", tags=["customer portal admin"]
)
api_router.include_router(crm.router, prefix="/crm", tags=["crm"])
api_router.include_router(reporting.router, prefix="/reporting", tags=["reporting"])
api_router.include_router(integrations.router, prefix="/integrations", tags=["integrations"])
api_router.include_router(import_export.router, tags=["import export"])
api_router.include_router(documents.router, tags=["documents"])
api_router.include_router(notifications.router, tags=["notifications"])
api_router.include_router(onboarding.router, tags=["onboarding"])
api_router.include_router(search.router, tags=["search"])
api_router.include_router(data_quality.router, tags=["data quality"])
api_router.include_router(security.router, prefix="/security", tags=["security"])
api_router.include_router(organization.router, prefix="/organization", tags=["organization"])
api_router.include_router(partners.router, prefix="/partners", tags=["partners"])
api_router.include_router(ownership.router, prefix="/ownership", tags=["ownership"])
api_router.include_router(projections.router, prefix="/projections", tags=["projections"])
api_router.include_router(
    representatives.router, prefix="/representatives", tags=["representatives"]
)
api_router.include_router(processes.router, prefix="/processes", tags=["processes"])
api_router.include_router(project_tasks.router, prefix="/tasks", tags=["project tasks"])
api_router.include_router(tasks.router, prefix="/tasks", tags=["tasks"])
api_router.include_router(approvals.router, prefix="/approvals", tags=["approvals"])
api_router.include_router(audit.router, prefix="/audit", tags=["audit"])
api_router.include_router(action_center.router, prefix="/action-center", tags=["action center"])
api_router.include_router(setup.router, prefix="/setup", tags=["setup"])
api_router.include_router(modules.router, prefix="/modules", tags=["modules"])
api_router.include_router(features.router, prefix="/features", tags=["features"])
api_router.include_router(policy.router, prefix="/policy", tags=["policy"])
api_router.include_router(integrity.router, prefix="/integrity", tags=["integrity"])
api_router.include_router(
    action_eligibility.router,
    prefix="/action-eligibility",
    tags=["action eligibility"],
)
api_router.include_router(system.router, prefix="/system", tags=["system"])
