from fastapi import APIRouter, Depends
from psycopg import Connection

from app.core.db import get_db
from app.schemas.auth import CurrentUser
from app.schemas.identity import OrganizationCreate, OrganizationSearch, PersonCreate, PersonSearch
from app.services.auth_service import get_current_user
from app.services.identity_service import IdentityService
from app.services.module_service import require_module_enabled
from app.services.permission_service import require_permission

router = APIRouter()


def service(db: Connection = Depends(get_db), user: CurrentUser = Depends(get_current_user)) -> IdentityService:
    return IdentityService(db, user)


@router.post("/persons/search", dependencies=[Depends(require_module_enabled("companies")), Depends(require_permission("identity.view"))])
def search_person(payload: PersonSearch, identity_service: IdentityService = Depends(service)) -> dict:
    return {"data": identity_service.search_person(payload)}


@router.post("/persons", dependencies=[Depends(require_module_enabled("companies", write=True)), Depends(require_permission("identity.insert"))])
def create_person(payload: PersonCreate, identity_service: IdentityService = Depends(service)) -> dict:
    return {"data": identity_service.create_person(payload)}


@router.post("/organizations/search", dependencies=[Depends(require_module_enabled("companies")), Depends(require_permission("identity.view"))])
def search_organization(payload: OrganizationSearch, identity_service: IdentityService = Depends(service)) -> dict:
    return {"data": identity_service.search_organization(payload)}


@router.post("/organizations", dependencies=[Depends(require_module_enabled("companies", write=True)), Depends(require_permission("identity.insert"))])
def create_organization(payload: OrganizationCreate, identity_service: IdentityService = Depends(service)) -> dict:
    return {"data": identity_service.create_organization(payload)}
