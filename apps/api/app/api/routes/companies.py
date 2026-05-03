from fastapi import APIRouter, Depends
from psycopg import Connection

from app.core.db import get_db
from app.schemas.auth import CurrentUser
from app.schemas.companies import CompanyCreate, CompanyUpdate
from app.services.auth_service import get_current_user
from app.services.company_service import CompanyService
from app.services.module_service import require_module_enabled
from app.services.permission_service import require_permission

router = APIRouter()


def service(db: Connection = Depends(get_db), user: CurrentUser = Depends(get_current_user)) -> CompanyService:
    return CompanyService(db, user)


@router.get("", dependencies=[Depends(require_module_enabled("companies")), Depends(require_permission("companies.view"))])
def list_companies(company_service: CompanyService = Depends(service)) -> dict:
    return {"data": company_service.list()}


@router.post("", dependencies=[Depends(require_module_enabled("companies", write=True)), Depends(require_permission("companies.insert"))])
def create_company(payload: CompanyCreate, company_service: CompanyService = Depends(service)) -> dict:
    return {"data": company_service.create(payload)}


@router.patch("/{company_id}", dependencies=[Depends(require_module_enabled("companies", write=True)), Depends(require_permission("companies.edit"))])
def update_company(company_id: str, payload: CompanyUpdate, company_service: CompanyService = Depends(service)) -> dict:
    return {"data": company_service.update(company_id, payload)}
