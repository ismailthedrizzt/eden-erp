from datetime import datetime
from enum import StrEnum
from typing import Any

from pydantic import BaseModel


class ModuleStatus(StrEnum):
    ENABLED = "enabled"
    DISABLED = "disabled"
    READONLY = "readonly"
    BETA = "beta"


class InstanceModule(BaseModel):
    id: str
    instance_id: str
    module_code: str
    status: ModuleStatus
    enabled_at: datetime | None = None
    disabled_at: datetime | None = None
    settings_json: dict[str, Any] = {}
