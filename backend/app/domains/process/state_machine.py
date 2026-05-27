from __future__ import annotations

from app.core.errors import DomainError
from app.domains.process.definitions import ProcessDefinition

TERMINAL_PROCESS_STATUSES = {"completed", "cancelled", "failed"}


def first_step_key(definition: ProcessDefinition) -> str | None:
    return definition.steps[0].key if definition.steps else None


def next_step_key(definition: ProcessDefinition, current_step_key: str | None) -> str | None:
    if not current_step_key:
        return first_step_key(definition)
    keys = [step.key for step in definition.steps]
    if current_step_key not in keys:
        raise DomainError("Surec adimi tanimli degil.", "PROCESS_STEP_NOT_FOUND", 404)
    index = keys.index(current_step_key)
    if index + 1 >= len(keys):
        return None
    return keys[index + 1]


def assert_process_can_transition(status: str) -> None:
    if status in TERMINAL_PROCESS_STATUSES:
        raise DomainError("Tamamlanmis surec uzerinde bu islem yapilamaz.", "PROCESS_CLOSED", 409)


def status_after_step_completion(next_step: str | None) -> str:
    if next_step is None or next_step == "completed":
        return "completed"
    if next_step == "approval":
        return "waiting_approval"
    return "active"
