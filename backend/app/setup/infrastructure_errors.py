from __future__ import annotations

from app.core.errors import DomainError
from app.setup.schemas import ModuleReadinessResult

SETUP_REQUIRED_MESSAGE = "Bu modulun kurulumu tamamlanmamis."


def map_infrastructure_error(error: Exception, module_key: str) -> DomainError:
    return DomainError(
        message=SETUP_REQUIRED_MESSAGE,
        code="MODULE_SETUP_REQUIRED",
        status_code=409,
        details={
            "module_key": module_key,
            "developer_error": error.__class__.__name__,
        },
    )


def readiness_error(result: ModuleReadinessResult) -> DomainError:
    return DomainError(
        message=result.message,
        code="MODULE_SETUP_REQUIRED",
        status_code=409,
        details={
            "module_key": result.module_key,
            "missing_tables": result.missing_tables,
            "missing_views": result.missing_views,
            "missing_rpcs": result.missing_rpcs,
            "missing_dependencies": result.missing_dependencies,
        },
    )
