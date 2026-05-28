from app.domains.projects.schemas import ProjectCreateRequest, ProjectTaskCreateRequest
from app.domains.projects.tasks import ALLOWED_TRANSITIONS
from app.policies.permissions import permission_exists, resolve_permission_with_fallback
from app.setup.readiness_registry import get_readiness_definition


def test_project_create_defaults_are_product_mvp_values() -> None:
    request = ProjectCreateRequest(company_id="company-1", project_name="ERP Hardening")
    assert request.project_type == "internal"
    assert request.status == "active"
    assert request.priority == "medium"


def test_project_task_create_defaults_are_jira_like() -> None:
    request = ProjectTaskCreateRequest(company_id="company-1", title="Prepare customer notes")
    assert request.issue_type == "task"
    assert request.status == "todo"
    assert request.priority == "medium"


def test_project_task_transition_matrix_keeps_final_states_closed() -> None:
    assert "in_progress" in ALLOWED_TRANSITIONS["todo"]
    assert "blocked" in ALLOWED_TRANSITIONS["in_progress"]
    assert "todo" in ALLOWED_TRANSITIONS["blocked"]
    assert ALLOWED_TRANSITIONS["done"] == set()
    assert ALLOWED_TRANSITIONS["cancelled"] == set()


def test_project_permissions_are_registered_with_fallbacks() -> None:
    assert permission_exists("projects.view")
    assert permission_exists("tasks.transition")
    assert "tasks.edit" in resolve_permission_with_fallback("tasks.transition")
    assert "projects.view" in resolve_permission_with_fallback("tasks.view")


def test_project_readiness_contract_includes_project_task_tables() -> None:
    definition = get_readiness_definition("project_management")
    assert definition is not None
    assert "project_projects" in definition.required_tables
    assert "project_tasks" in definition.required_tables
    assert "project_task_comments" in definition.optional_tables
