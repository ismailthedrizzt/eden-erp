from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.exc import DBAPIError, ProgrammingError


@dataclass(slots=True)
class EdenError(Exception):
    message: str
    code: str
    status_code: int = status.HTTP_400_BAD_REQUEST
    details: dict[str, Any] | None = None
    severity: str = "error"
    user_safe: bool = True

    def __str__(self) -> str:
        return self.message


class DomainError(EdenError):
    pass


class ValidationError(EdenError):
    pass


class AuthError(EdenError):
    pass


class PermissionDeniedError(EdenError):
    pass


class ScopeDeniedError(EdenError):
    pass


class ModuleSetupRequiredError(EdenError):
    pass


class IntegrityBlockingError(EdenError):
    pass


class OperationFailedError(EdenError):
    pass


class ResourceNotFoundError(EdenError):
    pass


class VersionConflictError(EdenError):
    pass


class InfrastructureMissingError(EdenError):
    pass


class BackendDependencyError(EdenError):
    pass


def eden_error_response(
    error: EdenError,
    *,
    request_id: str | None = None,
    correlation_id: str | None = None,
) -> dict[str, Any]:
    return {
        "error": error.message,
        "code": error.code,
        "message": error.message,
        "details": error.details or {},
        "request_id": request_id,
        "correlation_id": correlation_id,
    }


def domain_error_to_http(error: EdenError) -> HTTPException:
    return HTTPException(
        status_code=error.status_code,
        detail=eden_error_response(error),
    )


def map_database_error(
    error: Exception, *, fallback_code: str, fallback_message: str
) -> EdenError:
    if isinstance(error, EdenError):
        return error

    details: dict[str, Any] = {}
    if isinstance(error, (ProgrammingError, DBAPIError)):
        details["database_error"] = error.__class__.__name__
        original = getattr(error, "orig", None)
        original_message = str(original or error)
        lowered = original_message.lower()
        if "does not exist" in lowered or "undefinedtable" in lowered:
            return DomainError(
                message="Bu işlem için gerekli modül kurulumu tamamlanmamış.",
                code="INFRASTRUCTURE_MISSING",
                status_code=status.HTTP_409_CONFLICT,
                details=details,
            )

    return DomainError(
        message=fallback_message,
        code=fallback_code,
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        details=details,
    )
