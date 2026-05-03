from collections.abc import Callable

from fastapi import Depends
from psycopg import Connection

from app.core.db import get_db
from app.core.errors import forbidden
from app.schemas.auth import CurrentUser
from app.services.auth_service import get_current_user


class ModuleService:
    def __init__(self, db: Connection, user: CurrentUser):
        self.db = db
        self.user = user

    def get_status(self, module_code: str) -> str:
        row = self.db.execute(
            """
            select status
            from instance_modules
            where instance_id = %s and module_code = %s
            """,
            (self.user.instance_id, module_code),
        ).fetchone()
        return row["status"] if row else "enabled"

    def require_enabled(self, module_code: str, *, write: bool = False) -> None:
        status = self.get_status(module_code)
        if status == "disabled":
            raise forbidden(f"Module disabled: {module_code}")
        if write and status == "readonly":
            raise forbidden(f"Module readonly: {module_code}")


def get_module_service(
    db: Connection = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> ModuleService:
    return ModuleService(db, user)


def require_module_enabled(module_code: str, *, write: bool = False) -> Callable:
    def dependency(service: ModuleService = Depends(get_module_service)) -> None:
        service.require_enabled(module_code, write=write)

    return dependency
