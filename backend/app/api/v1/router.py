from fastapi import APIRouter

from app.api.v1 import branches, companies, company_branches, health, partners, representatives

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(companies.router, prefix="/companies", tags=["companies"])
api_router.include_router(company_branches.router, tags=["company branch operations"])
api_router.include_router(branches.router, prefix="/branches", tags=["branches"])
api_router.include_router(partners.router, prefix="/partners", tags=["partners"])
api_router.include_router(
    representatives.router, prefix="/representatives", tags=["representatives"]
)
