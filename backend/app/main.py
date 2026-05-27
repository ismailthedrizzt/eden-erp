from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.database import DatabaseConfigurationError
from app.core.errors import DomainError
from app.schemas.health import HealthResponse


def create_app() -> FastAPI:
    settings = get_settings()
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

    @app.exception_handler(DatabaseConfigurationError)
    async def database_configuration_error_handler(
        _request: Request,
        _error: DatabaseConfigurationError,
    ) -> JSONResponse:
        return JSONResponse(
            status_code=503,
            content={
                "error": "Backend veri bağlantısı yapılandırılmamış.",
                "code": "BACKEND_DATABASE_NOT_CONFIGURED",
                "message": "Backend servisi veri bağlantısı bekliyor.",
                "details": {},
            },
        )

    @app.exception_handler(DomainError)
    async def domain_error_handler(_request: Request, error: DomainError) -> JSONResponse:
        return JSONResponse(
            status_code=error.status_code,
            content={
                "error": error.message,
                "code": error.code,
                "message": error.message,
                "details": error.details or {},
            },
        )

    @app.get("/health", response_model=HealthResponse, tags=["health"])
    async def root_health() -> HealthResponse:
        return HealthResponse(status="ok", service=settings.service_name, version=settings.version)

    return app


app = create_app()
