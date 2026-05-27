from fastapi import APIRouter

from app.api.v1 import (
    action_center,
    approvals,
    audit,
    branches,
    companies,
    company_branches,
    health,
    ownership,
    partners,
    processes,
    representatives,
    system,
    tasks,
)

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(companies.router, prefix="/companies", tags=["companies"])
api_router.include_router(company_branches.router, tags=["company branch operations"])
api_router.include_router(branches.router, prefix="/branches", tags=["branches"])
api_router.include_router(partners.router, prefix="/partners", tags=["partners"])
api_router.include_router(ownership.router, prefix="/ownership", tags=["ownership"])
api_router.include_router(
    representatives.router, prefix="/representatives", tags=["representatives"]
)
api_router.include_router(processes.router, prefix="/processes", tags=["processes"])
api_router.include_router(tasks.router, prefix="/tasks", tags=["tasks"])
api_router.include_router(approvals.router, prefix="/approvals", tags=["approvals"])
api_router.include_router(audit.router, prefix="/audit", tags=["audit"])
api_router.include_router(action_center.router, prefix="/action-center", tags=["action center"])
api_router.include_router(system.router, prefix="/system", tags=["system"])
