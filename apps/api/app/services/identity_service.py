from psycopg import Connection
from psycopg.types.json import Jsonb

from app.core.errors import conflict
from app.schemas.auth import CurrentUser
from app.schemas.identity import OrganizationCreate, OrganizationSearch, PersonCreate, PersonSearch
from app.services.audit_service import AuditService
from app.services.history_service import HistoryService


def _clean(value: str | None) -> str | None:
    if value is None:
        return None
    text = " ".join(value.strip().split())
    return text or None


class IdentityService:
    def __init__(self, db: Connection, user: CurrentUser):
        self.db = db
        self.user = user
        self.audit = AuditService(db, user)
        self.history = HistoryService(db, user)

    def _db_value(self, value):
        if isinstance(value, (dict, list)):
            return Jsonb(value)
        return value

    def search_person(self, payload: PersonSearch) -> list[dict]:
        full_name = _clean(payload.full_name or " ".join([item for item in [payload.first_name, payload.last_name] if item]))
        nationality = _clean(payload.nationality) or "TR"
        matches: list[dict] = []

        if payload.national_id:
            row = self.db.execute(
                """
                select * from persons
                where coalesce(is_deleted, false) = false
                  and lower(nationality) = lower(%s)
                  and national_id = %s
                limit 1
                """,
                (nationality, _clean(payload.national_id)),
            ).fetchone()
            if row:
                matches.append({"strength": "exact", "match_type": "national_id", "message": "Ayni uyruk ve kimlik numarasina sahip kisi bulundu.", "record": row})

        if payload.passport_no:
            row = self.db.execute(
                """
                select * from persons
                where coalesce(is_deleted, false) = false
                  and lower(nationality) = lower(%s)
                  and passport_no = %s
                limit 1
                """,
                (nationality, _clean(payload.passport_no)),
            ).fetchone()
            if row and all(str(item["record"]["id"]) != str(row["id"]) for item in matches):
                matches.append({"strength": "exact", "match_type": "passport_no", "message": "Ayni uyruk ve pasaport numarasina sahip kisi bulundu.", "record": row})

        if full_name and payload.birth_date:
            weak_rows = self.db.execute(
                """
                select * from persons
                where coalesce(is_deleted, false) = false
                  and lower(nationality) = lower(%s)
                  and lower(full_name) = lower(%s)
                  and birth_date = %s
                limit 5
                """,
                (nationality, full_name, payload.birth_date),
            ).fetchall()
            for row in weak_rows:
                if all(str(item["record"]["id"]) != str(row["id"]) for item in matches):
                    matches.append({"strength": "weak", "match_type": "weak_name_birth_nationality", "message": "Ad soyad, dogum tarihi ve uyruk benzerligi var; bu kesin eslesme degil.", "record": row})

        return matches

    def create_person(self, payload: PersonCreate) -> dict:
        exact_matches = [item for item in self.search_person(PersonSearch(**payload.model_dump())) if item["strength"] == "exact"]
        if exact_matches:
            raise conflict("Person already exists")

        data = payload.model_dump(mode="json")
        data["full_name"] = _clean(data.get("full_name")) or " ".join([item for item in [data.get("first_name"), data.get("last_name")] if item]).strip()
        columns = [*data.keys(), "created_by", "updated_by"]
        values = [*[self._db_value(value) for value in data.values()], self.user.id, self.user.id]
        row = self.db.execute(
            f"""
            insert into persons ({", ".join(columns)})
            values ({", ".join(["%s"] * len(values))})
            returning *
            """,
            values,
        ).fetchone()
        self.audit.log(module_code="companies", resource="identity", record_id=str(row["id"]), action="insert", before=None, after=row)
        return row

    def search_organization(self, payload: OrganizationSearch) -> list[dict]:
        country = _clean(payload.country) or "TR"
        legal_name = _clean(payload.legal_name)
        matches: list[dict] = []

        if payload.tax_number:
            row = self.db.execute(
                """
                select * from organizations
                where coalesce(is_deleted, false) = false
                  and lower(country) = lower(%s)
                  and tax_number = %s
                limit 1
                """,
                (country, _clean(payload.tax_number)),
            ).fetchone()
            if row:
                matches.append({"strength": "exact", "match_type": "tax_number", "message": "Ayni ulke ve vergi numarasina sahip kurum bulundu.", "record": row})

        if payload.registration_number and not payload.tax_number:
            row = self.db.execute(
                """
                select * from organizations
                where coalesce(is_deleted, false) = false
                  and lower(country) = lower(%s)
                  and registration_number = %s
                limit 1
                """,
                (country, _clean(payload.registration_number)),
            ).fetchone()
            if row:
                matches.append({"strength": "exact", "match_type": "registration_number", "message": "Ayni ulke ve sicil numarasina sahip kurum bulundu.", "record": row})

        if legal_name:
            weak_rows = self.db.execute(
                """
                select * from organizations
                where coalesce(is_deleted, false) = false
                  and lower(country) = lower(%s)
                  and lower(legal_name) = lower(%s)
                limit 5
                """,
                (country, legal_name),
            ).fetchall()
            for row in weak_rows:
                if all(str(item["record"]["id"]) != str(row["id"]) for item in matches):
                    matches.append({"strength": "weak", "match_type": "weak_name_country", "message": "Unvan ve ulke benzerligi var; bu kesin eslesme degil.", "record": row})

        return matches

    def create_organization(self, payload: OrganizationCreate) -> dict:
        exact_matches = [item for item in self.search_organization(OrganizationSearch(**payload.model_dump())) if item["strength"] == "exact"]
        if exact_matches:
            raise conflict("Organization already exists")

        data = payload.model_dump(mode="json")
        columns = [*data.keys(), "created_by", "updated_by"]
        values = [*[self._db_value(value) for value in data.values()], self.user.id, self.user.id]
        row = self.db.execute(
            f"""
            insert into organizations ({", ".join(columns)})
            values ({", ".join(["%s"] * len(values))})
            returning *
            """,
            values,
        ).fetchone()
        self.audit.log(module_code="companies", resource="identity", record_id=str(row["id"]), action="insert", before=None, after=row)
        return row
