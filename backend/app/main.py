from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.database import DatabaseConfigurationError
from app.core.error_tracking import capture_exception, configure_error_tracking
from app.core.errors import EdenError, eden_error_response
from app.core.logging import configure_logging, current_log_context, log_exception
from app.core.middleware import RequestContextMiddleware, RequestLoggingMiddleware
from app.core.security import validate_security_configuration
from app.schemas.health import HealthResponse


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging(settings)
    configure_error_tracking(settings)
    validate_security_configuration()
    app = FastAPI(
        title=settings.app_name,
        version=settings.version,
        description="Eden ERP core backend API.",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_router, prefix="/api/v1")
    app.add_middleware(RequestLoggingMiddleware)
    app.add_middleware(RequestContextMiddleware)

    @app.exception_handler(DatabaseConfigurationError)
    async def database_configuration_error_handler(
        _request: Request,
        _error: DatabaseConfigurationError,
    ) -> JSONResponse:
        return JSONResponse(
            status_code=503,
            content={
                "error": "Backend veri baglantisi yapilandirilmamis.",
                "code": "BACKEND_DATABASE_NOT_CONFIGURED",
                "message": "Backend servisi veri baglantisi bekliyor.",
                "details": {},
            },
        )

    def observability_ids(request: Request) -> dict[str, str | None]:
        context = current_log_context()
        request_id = context.get("request_id") or request.headers.get("x-request-id")
        correlation_id = (
            context.get("correlation_id")
            or request.headers.get("x-correlation-id")
            or request_id
        )
        return {
            "request_id": request_id,
            "correlation_id": correlation_id,
        }

    @app.exception_handler(EdenError)
    async def eden_error_handler(request: Request, error: EdenError) -> JSONResponse:
        ids = observability_ids(request)
        return JSONResponse(
            status_code=error.status_code,
            content=eden_error_response(error, **ids),
        )

    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, error: HTTPException) -> JSONResponse:
        ids = observability_ids(request)
        if isinstance(error.detail, dict) and "code" in error.detail:
            content: dict[str, object] = {
                "error": error.detail.get("error") or error.detail.get("message"),
                "code": error.detail.get("code"),
                "message": error.detail.get("message") or error.detail.get("error"),
                "details": error.detail.get("details") or {},
                **ids,
            }
        else:
            content = {
                "error": "Istek islenemedi.",
                "code": "HTTP_ERROR",
                "message": "Istek islenemedi.",
                "details": {},
                **ids,
            }
        return JSONResponse(status_code=error.status_code, content=content)

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request,
        error: RequestValidationError,
    ) -> JSONResponse:
        ids = observability_ids(request)
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "error": "Gonderilen bilgiler kontrol edilmeli.",
                "code": "VALIDATION_ERROR",
                "message": "Gonderilen bilgiler kontrol edilmeli.",
                "details": {"fields": error.errors()},
                **ids,
            },
        )

    @app.exception_handler(SQLAlchemyError)
    async def sqlalchemy_exception_handler(
        request: Request,
        error: SQLAlchemyError,
    ) -> JSONResponse:
        ids = observability_ids(request)
        log_exception(
            "Database dependency failed.",
            logger_name="eden.error",
            exception_type=error.__class__.__name__,
            error_code="BACKEND_DEPENDENCY_ERROR",
        )
        capture_exception(error, ids)
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "error": "Backend veri servisi gecici olarak kullanilamiyor.",
                "code": "BACKEND_DEPENDENCY_ERROR",
                "message": "Backend veri servisi gecici olarak kullanilamiyor.",
                "details": {},
                **ids,
            },
        )

    @app.exception_handler(Exception)
    async def unexpected_exception_handler(request: Request, error: Exception) -> JSONResponse:
        ids = observability_ids(request)
        log_exception(
            "Unexpected request failure.",
            logger_name="eden.error",
            exception_type=error.__class__.__name__,
            error_code="INTERNAL_SERVER_ERROR",
        )
        capture_exception(error, ids)
        details = {"debug": str(error)} if settings.is_development else {}
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": "Islem tamamlanamadi. Lutfen tekrar deneyin.",
                "code": "INTERNAL_SERVER_ERROR",
                "message": "Islem tamamlanamadi. Lutfen tekrar deneyin.",
                "details": details,
                **ids,
            },
        )

    @app.get("/health", response_model=HealthResponse, tags=["health"])
    async def root_health() -> HealthResponse:
        return HealthResponse(status="ok", service=settings.service_name, version=settings.version)

    return app


app = create_app()
