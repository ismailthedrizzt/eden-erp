from app.core.errors import DomainError
from app.domains.process.registry import get_process_definition
from app.domains.process.state_machine import (
    assert_process_can_transition,
    next_step_key,
    status_after_step_completion,
)


def test_branch_opening_process_moves_to_document_check() -> None:
    definition = get_process_definition("company_branch_opening_process", "1.0")
    assert definition is not None
    assert next_step_key(definition, "draft_request") == "document_check"


def test_completed_process_cannot_transition() -> None:
    try:
        assert_process_can_transition("completed")
    except DomainError as error:
        assert error.code == "PROCESS_CLOSED"
    else:  # pragma: no cover
        raise AssertionError("completed process should not transition")


def test_approval_step_sets_waiting_status() -> None:
    assert status_after_step_completion("approval") == "waiting_approval"
