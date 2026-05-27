from __future__ import annotations

from app.domains.process.definitions import PROCESS_DEFINITIONS, ProcessDefinition


def get_process_definition(
    process_key: str,
    version: str | None = None,
) -> ProcessDefinition | None:
    definition = PROCESS_DEFINITIONS.get(process_key)
    if not definition:
        return None
    if version and definition.version != version:
        return None
    return definition


def list_process_definitions() -> list[ProcessDefinition]:
    return list(PROCESS_DEFINITIONS.values())
