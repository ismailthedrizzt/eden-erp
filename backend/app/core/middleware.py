from __future__ import annotations

import time
from collections.abc import Awaitable, Callable
from uuid import uuid4

from starlette.datastructures import MutableHeaders
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.core.config import get_settings
from app.core.logging import bind_log_context, clear_log_context, log_error, log_info, log_warning
from app.core.metrics import record_request


class RequestContextMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        headers = MutableHeaders(scope=scope)
        request_id = headers.get("x-request-id") or str(uuid4())
        correlation_id = headers.get("x-correlation-id") or request_id
        bind_log_context(
            request_id=request_id,
            correlation_id=correlation_id,
            tenant_id=headers.get("x-tenant-id"),
            user_id=headers.get("x-user-id"),
            company_id=headers.get("x-company-id"),
            branch_id=headers.get("x-branch-id"),
            operation_id=headers.get("x-operation-id"),
            process_instance_id=headers.get("x-process-instance-id"),
            method=scope.get("method"),
            endpoint=scope.get("path"),
        )

        async def send_with_ids(message: Message) -> None:
            if message["type"] == "http.response.start":
                response_headers = MutableHeaders(scope=message)
                response_headers["x-request-id"] = request_id
                response_headers["x-correlation-id"] = correlation_id
            await send(message)

        try:
            await self.app(scope, receive, send_with_ids)
        finally:
            clear_log_context()


class RequestLoggingMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        started = time.perf_counter()
        status_code = 500
        settings = get_settings()

        async def send_with_status(message: Message) -> None:
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = int(message["status"])
                if settings.expose_response_time_header:
                    response_headers = MutableHeaders(scope=message)
                    elapsed_ms = round((time.perf_counter() - started) * 1000, 2)
                    response_headers["x-response-time-ms"] = str(elapsed_ms)
            await send(message)

        try:
            await self.app(scope, receive, send_with_status)
        finally:
            duration_ms = round((time.perf_counter() - started) * 1000, 2)
            record_request(status_code, duration_ms)
            if duration_ms >= settings.api_very_slow_request_ms:
                log = log_error
                error_code: str | None = "API_VERY_SLOW_REQUEST"
            elif duration_ms >= settings.api_slow_request_ms:
                log = log_warning
                error_code = "API_SLOW_REQUEST"
            else:
                log = log_warning if status_code >= 500 else log_info
                error_code = "HTTP_REQUEST_FAILED" if status_code >= 500 else None
            path = str(scope.get("path") or "")
            if path.endswith("/health"):
                log = log_info
                error_code = None
            log(
                "HTTP request completed.",
                logger_name="eden.request",
                method=scope.get("method"),
                endpoint=path,
                status_code=status_code,
                duration_ms=duration_ms,
                error_code=error_code,
            )


MiddlewareFactory = Callable[[ASGIApp], Awaitable[ASGIApp]]
