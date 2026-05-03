from psycopg import Connection
from psycopg.types.json import Jsonb

from app.schemas.auth import CurrentUser


class AuditService:
    def __init__(self, db: Connection, user: CurrentUser):
        self.db = db
        self.user = user

    def log(self, *, module_code: str, resource: str, record_id: str | None, action: str, before: dict | None, after: dict | None) -> None:
        self.db.execute(
            """
            insert into audit_logs (instance_id, user_id, module_code, resource, record_id, action, before_json, after_json)
            values (%s, %s, %s, %s, %s, %s, %s::jsonb, %s::jsonb)
            """,
            (self.user.instance_id, self.user.id, module_code, resource, record_id, action, Jsonb(before) if before is not None else None, Jsonb(after) if after is not None else None),
        )
