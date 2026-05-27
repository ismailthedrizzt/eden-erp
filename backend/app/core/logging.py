from __future__ import annotations

import contextvars
import json
import logging
from datetime import UTC, datetime
from typing import Any

from app.core.config import Settings
from app.core.sanitization import sanitize_for_log

LOG_CONTEXT_KEYS = (
    "request_id",
    "correlation_id",
    "tenant_id",
    "user_id",
    "company_id",
    "branch_id",
    "operation_id",
    "process_instance_id",
    "task_id",
    "outbox_event_id",
    "endpoint",
    "method",
    "status_code",
    "duration_ms",
    "error_code",
    "exception_type",
    "module_key",
    "action_key",
)

_log_context: contextvars.ContextVar[dict[str, Any] | None] = contextvars.ContextVar(
    "eden_log_context",
    default=None,
)


class StructuredJsonFormatter(logging.Formatter):
    def __init__(self, *, service: str, environment: str) -> None:
        super().__init__()
        self.service = service
        self.environment = environment

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "timestamp": datetime.now(UTC).isoformat(),
            "level": record.levelname.lower(),
            "service": self.service,
            "environment": self.environment,
            "logger": record.name,
            "message": record.getMessage(),
        }
        payload.update({key: value for key, value in current_log_context().items() if value})
        extra = getattr(record, "eden_context", None)
        if isinstance(extra, dict):
            payload.update({key: value for key, value in sanitize_for_log(extra).items() if value})
        if record.exc_info:
            payload["exception_type"] = record.exc_info[0].__name__ if record.exc_info[0] else None
        return json.dumps(sanitize_for_log(payload), ensure_ascii=False, default=str)


class ReadableContextFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        context = current_log_context()
        request_id = context.get("request_id") or "-"
        correlation_id = context.get("correlation_id") or "-"
        message = super().format(record)
        return f"{message} request_id={request_id} correlation_id={correlation_id}"


def configure_logging(settings: Settings) -> None:
    root_logger = logging.getLogger()
    root_logger.handlers.clear()
    root_logger.setLevel(getattr(logging, settings.log_level.upper(), logging.INFO))

    handler = logging.StreamHandler()
    if settings.log_format.lower() == "json" or settings.is_production:
        handler.setFormatter(
            StructuredJsonFormatter(
                service=settings.service_name,
                environment=settings.app_env,
            )
        )
    else:
        handler.setFormatter(
            ReadableContextFormatter("%(asctime)s %(levelname)s [%(name)s] %(message)s")
        )
    root_logger.addHandler(handler)


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)


def current_log_context() -> dict[str, Any]:
    return dict(_log_context.get() or {})


def bind_log_context(**kwargs: Any) -> None:
    current = current_log_context()
    current.update({key: value for key, value in kwargs.items() if key in LOG_CONTEXT_KEYS})
    _log_context.set(current)


def clear_log_context() -> None:
    _log_context.set({})


def _log(level: int, message: str, **context: Any) -> None:
    logger = get_logger(str(context.pop("logger_name", "eden")))
    logger.log(level, message, extra={"eden_context": context})


def log_info(message: str, **context: Any) -> None:
    _log(logging.INFO, message, **context)


def log_warning(message: str, **context: Any) -> None:
    _log(logging.WARNING, message, **context)


def log_error(message: str, **context: Any) -> None:
    _log(logging.ERROR, message, **context)


def log_exception(message: str, **context: Any) -> None:
    logger = get_logger(str(context.pop("logger_name", "eden")))
    logger.exception(message, extra={"eden_context": context})
