from psycopg import Connection
from psycopg.types.json import Jsonb

from app.schemas.auth import CurrentUser


class HistoryService:
    def __init__(self, db: Connection, user: CurrentUser):
        self.db = db
        self.user = user

    def snapshot(self, *, table_name: str, record_id: str, version: int, data: dict) -> None:
        self.db.execute(
            """
            insert into record_history (instance_id, table_name, record_id, version, data_json, changed_by)
            values (%s, %s, %s, %s, %s::jsonb, %s)
            """,
            (self.user.instance_id, table_name, record_id, version, Jsonb(data), self.user.id),
        )
