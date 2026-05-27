from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.exc import DBAPIError, ProgrammingError


@dataclass(slots=True)
class DomainError(Exception):
    message: str
    code: str
    status_code: int = status.HTTP_400_BAD_REQUEST
    details: dict[str, Any] | None = None

    def __str__(self) -> str:
        return self.message


def domain_error_to_http(error: DomainError) -> HTTPException:
    return HTTPException(
        status_code=error.status_code,
        detail={
            "error": error.message,
            "code": error.code,
            "details": error.details or {},
            "message": error.message,
        },
    )


def map_database_error(
    error: Exception, *, fallback_code: str, fallback_message: str
) -> DomainError:
    if isinstance(error, DomainError):
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
