from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ProcessStepDefinition:
    key: str
    title: str
    requires_approval: bool = False
    auto_complete: bool = False


@dataclass(frozen=True)
class ProcessDefinition:
    key: str
    version: str
    module_key: str
    operation_key: str
    steps: tuple[ProcessStepDefinition, ...]


PROCESS_DEFINITIONS: dict[str, ProcessDefinition] = {
    "company_branch_opening_process": ProcessDefinition(
        key="company_branch_opening_process",
        version="1.0",
        module_key="branches",
        operation_key="branch_opening",
        steps=(
            ProcessStepDefinition("draft_request", "Talep taslagi"),
            ProcessStepDefinition("document_check", "Belge kontrolu"),
            ProcessStepDefinition("approval", "Onay", requires_approval=True),
            ProcessStepDefinition("execute_operation", "Operasyonu calistir"),
            ProcessStepDefinition("completed", "Tamamlandi", auto_complete=True),
        ),
    ),
    "company_branch_closing_process": ProcessDefinition(
        key="company_branch_closing_process",
        version="1.0",
        module_key="branches",
        operation_key="branch_closing",
        steps=(
            ProcessStepDefinition("draft_request", "Talep taslagi"),
            ProcessStepDefinition("impact_review", "Etki kontrolu"),
            ProcessStepDefinition("approval", "Onay", requires_approval=True),
            ProcessStepDefinition("execute_operation", "Operasyonu calistir"),
            ProcessStepDefinition("completed", "Tamamlandi", auto_complete=True),
        ),
    ),
    "capital_increase_process": ProcessDefinition(
        key="capital_increase_process",
        version="1.0",
        module_key="capital",
        operation_key="capital_increase",
        steps=(ProcessStepDefinition("draft_request", "Talep taslagi"),),
    ),
    "representative_authority_process": ProcessDefinition(
        key="representative_authority_process",
        version="1.0",
        module_key="representatives",
        operation_key="representative_authority_transaction",
        steps=(ProcessStepDefinition("draft_request", "Talep taslagi"),),
    ),
    "ownership_transaction_process": ProcessDefinition(
        key="ownership_transaction_process",
        version="1.0",
        module_key="ownership",
        operation_key="ownership_transaction",
        steps=(ProcessStepDefinition("draft_request", "Talep taslagi"),),
    ),
}
