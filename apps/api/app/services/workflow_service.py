from enum import StrEnum


class WorkflowDecision(StrEnum):
    DIRECT = "direct"
    REQUEST = "request"


class WorkflowService:
    def update_decision(self, *, module_code: str, resource: str, action: str, payload: dict) -> WorkflowDecision:
        # Placeholder for workflow_definitions lookup. The service boundary is
        # intentional: module services call this before mutating records.
        return WorkflowDecision.DIRECT

    def request_update(self, *, module_code: str, resource: str, record_id: str, payload: dict) -> dict:
        raise NotImplementedError("Workflow request creation will be implemented in a later phase")

    def approve_update(self, *, request_id: str) -> dict:
        raise NotImplementedError("Workflow approval will be implemented in a later phase")

    def reject_update(self, *, request_id: str, reason: str | None = None) -> dict:
        raise NotImplementedError("Workflow rejection will be implemented in a later phase")
