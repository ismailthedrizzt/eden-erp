from collections.abc import Callable

from fastapi import Depends

from app.core.errors import forbidden
from app.schemas.auth import CurrentUser
from app.services.auth_service import get_current_user


class PermissionService:
    def __init__(self, user: CurrentUser):
        self.user = user

    def require(self, permission: str) -> None:
        if permission not in self.user.permissions:
            raise forbidden(f"Missing permission: {permission}")

    def can(self, permission: str) -> bool:
        return permission in self.user.permissions


def get_permission_service(user: CurrentUser = Depends(get_current_user)) -> PermissionService:
    return PermissionService(user)


def require_permission(permission: str) -> Callable:
    def dependency(service: PermissionService = Depends(get_permission_service)) -> None:
        service.require(permission)

    return dependency
