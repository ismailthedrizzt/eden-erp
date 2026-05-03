from psycopg import Connection
from psycopg.types.json import Jsonb

from app.core.errors import conflict
from app.schemas.auth import CurrentUser
from app.schemas.companies import CompanyCreate, CompanyUpdate
from app.services.audit_service import AuditService
from app.services.history_service import HistoryService
from app.services.workflow_service import WorkflowDecision, WorkflowService


class CompanyService:
    table_name = "sirketler"

    def __init__(self, db: Connection, user: CurrentUser):
        self.db = db
        self.user = user
        self.audit = AuditService(db, user)
        self.history = HistoryService(db, user)
        self.workflow = WorkflowService()

    def _db_value(self, value):
        if isinstance(value, (dict, list)):
            return Jsonb(value)
        return value

    def list(self) -> list[dict]:
        return self.db.execute(
            "select * from sirketler where coalesce(is_deleted, false) = false order by kisa_unvan"
        ).fetchall()

    def create(self, payload: CompanyCreate) -> dict:
        data = payload.model_dump(mode="json")
        columns = [*data.keys(), "created_by", "updated_by", "version", "workflow_status"]
        values = [*[self._db_value(value) for value in data.values()], self.user.id, self.user.id, 1, "none"]
        placeholders = ", ".join(["%s"] * len(values))
        row = self.db.execute(
            f"""
            insert into sirketler ({", ".join(columns)})
            values ({placeholders})
            returning *
            """,
            values,
        ).fetchone()
        self.audit.log(module_code="companies", resource="companies", record_id=str(row["id"]), action="insert", before=None, after=row)
        return row

    def direct_update(self, company_id: str, payload: CompanyUpdate) -> dict:
        current = self.db.execute("select * from sirketler where id = %s and coalesce(is_deleted, false) = false", (company_id,)).fetchone()
        if not current:
            return {}
        if int(current.get("version") or 0) != payload.version:
            raise conflict("Company was modified by another user")

        update_data = payload.model_dump(exclude_unset=True, exclude={"version"}, mode="json")
        next_version = payload.version + 1
        assignments = [f"{key} = %s" for key in update_data.keys()]
        assignments.extend(["updated_by = %s", "updated_at = now()", "version = %s"])
        values = [*[self._db_value(value) for value in update_data.values()], self.user.id, next_version, company_id]
        row = self.db.execute(
            f"update sirketler set {', '.join(assignments)} where id = %s returning *",
            values,
        ).fetchone()
        self.history.snapshot(table_name=self.table_name, record_id=company_id, version=payload.version, data=current)
        self.audit.log(module_code="companies", resource="companies", record_id=company_id, action="edit", before=current, after=row)
        return row

    def update(self, company_id: str, payload: CompanyUpdate) -> dict:
        decision = self.workflow.update_decision(module_code="companies", resource="companies", action="edit", payload=payload.model_dump())
        if decision == WorkflowDecision.REQUEST:
            return self.workflow.request_update(module_code="companies", resource="companies", record_id=company_id, payload=payload.model_dump())
        return self.direct_update(company_id, payload)

    def passivate(self, company_id: str, version: int) -> dict:
        current = self.db.execute("select * from sirketler where id = %s and coalesce(is_deleted, false) = false", (company_id,)).fetchone()
        if int(current.get("version") or 0) != version:
            raise conflict("Company was modified by another user")
        row = self.db.execute(
            """
            update sirketler
            set is_deleted = true, deleted_at = now(), deleted_by = %s, updated_at = now(), updated_by = %s, version = version + 1
            where id = %s
            returning *
            """,
            (self.user.id, self.user.id, company_id),
        ).fetchone()
        self.history.snapshot(table_name=self.table_name, record_id=company_id, version=version, data=current)
        self.audit.log(module_code="companies", resource="companies", record_id=company_id, action="passivate", before=current, after=row)
        return row
