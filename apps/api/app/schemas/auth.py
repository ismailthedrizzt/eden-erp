from pydantic import BaseModel


class CurrentUser(BaseModel):
    id: str
    email: str | None = None
    instance_id: str
    role_ids: list[str] = []
    permissions: set[str] = set()
