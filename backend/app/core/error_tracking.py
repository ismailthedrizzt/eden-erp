from __future__ import annotations

from typing import Any

from app.core.config import Settings
from app.core.logging import log_error, log_warning
from app.core.sanitization import sanitize_for_log

_enabled = False
_dsn: str | None = None


def configure_error_tracking(settings: Settings) -> None:
    global _enabled, _dsn
    _dsn = settings.sentry_dsn
    _enabled = bool(settings.error_tracking_enabled and settings.sentry_dsn)
    if settings.error_tracking_enabled and not settings.sentry_dsn:
        log_warning(
            "Error tracking requested but SENTRY_DSN is not configured.",
            logger_name="eden.error_tracking",
        )


def capture_exception(error: Exception, context: dict[str, Any] | None = None) -> None:
    if not _enabled:
        return
    # Extension point for Sentry/OpenTelemetry. Kept no-op until dependency is added.
    log_error(
        "Error captured by tracking adapter.",
        logger_name="eden.error_tracking",
        exception_type=error.__class__.__name__,
        details=sanitize_for_log(context or {}),
    )


def capture_message(
    message: str,
    level: str = "info",
    context: dict[str, Any] | None = None,
) -> None:
    if not _enabled:
        return
    log_warning(
        message,
        logger_name="eden.error_tracking",
        level_name=level,
        details=sanitize_for_log(context or {}),
    )
