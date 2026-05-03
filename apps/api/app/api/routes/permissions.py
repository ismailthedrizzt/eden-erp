from fastapi import APIRouter, Depends

from app.schemas.auth import CurrentUser
from app.services.auth_service import get_current_user

router = APIRouter()


@router.get("/me")
def my_permissions(user: CurrentUser = Depends(get_current_user)) -> dict:
    return {
        "user": {"id": user.id, "email": user.email, "instance_id": user.instance_id},
        "permissions": sorted(user.permissions),
    }
