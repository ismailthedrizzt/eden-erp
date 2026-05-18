from pydantic import BaseModel


class CurrentUser(BaseModel):
    id: str
    email: str | None = None
    instance_id: str
    tenant_id: str
    workspace_id: str | None = None
    role_ids: list[str] = []
    permissions: set[str] = set()
