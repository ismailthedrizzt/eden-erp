from enum import StrEnum


class PermissionAction(StrEnum):
    VIEW = "view"
    INSERT = "insert"
    EDIT = "edit"
    APPROVE = "approve"
    PASSIVATE = "passivate"
    EXPORT = "export"


class ModuleCode(StrEnum):
    COMPANIES = "companies"
    EMPLOYEES = "employees"
    ORGANIZATION = "organization"
    VEHICLES = "vehicles"
    ACCOUNTING = "accounting"
    CRM = "crm"
    WORKFLOW = "workflow"
    INVENTORY = "inventory"
    DOCUMENTS = "documents"


def permission_key(module: ModuleCode | str, action: PermissionAction | str, resource: str | None = None) -> str:
    left = resource or str(module)
    return f"{left}.{str(action)}"
