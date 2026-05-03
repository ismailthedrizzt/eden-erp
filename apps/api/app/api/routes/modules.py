from fastapi import APIRouter, Depends
from psycopg import Connection

from app.core.db import get_db
from app.schemas.auth import CurrentUser
from app.services.auth_service import get_current_user

router = APIRouter()


@router.get("")
def list_modules(user: CurrentUser = Depends(get_current_user), db: Connection = Depends(get_db)) -> dict:
    rows = db.execute(
        "select * from instance_modules where instance_id = %s order by module_code",
        (user.instance_id,),
    ).fetchall()
    return {"data": rows}
