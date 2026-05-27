from functools import lru_cache

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = Field(default="Eden ERP Backend", alias="APP_NAME")
    service_name: str = "eden-erp-backend"
    version: str = Field(default="0.1.0", alias="APP_VERSION")
    environment: str = Field(
        default="local", validation_alias=AliasChoices("APP_ENV", "ENVIRONMENT")
    )
    log_level: str = Field(default="INFO", validation_alias=AliasChoices("LOG_LEVEL"))

    database_url: str | None = Field(
        default=None,
        validation_alias=AliasChoices("DATABASE_URL", "SUPABASE_DB_URL"),
    )
    supabase_url: str | None = Field(default=None, alias="SUPABASE_URL")
    supabase_project_ref: str | None = Field(default=None, alias="SUPABASE_PROJECT_REF")
    supabase_service_role_key: str | None = Field(default=None, alias="SUPABASE_SERVICE_ROLE_KEY")
    supabase_jwt_secret: str | None = Field(default=None, alias="SUPABASE_JWT_SECRET")
    supabase_jwks_url: str | None = Field(default=None, alias="SUPABASE_JWKS_URL")
    cors_origins_raw: str = Field(
        default="http://localhost:3000",
        validation_alias=AliasChoices("CORS_ALLOWED_ORIGINS", "CORS_ORIGINS"),
    )
    internal_backend_token: str | None = Field(default=None, alias="INTERNAL_BACKEND_TOKEN")
    trusted_proxy_secret: str | None = Field(default=None, alias="TRUSTED_PROXY_SECRET")
    allow_trusted_proxy_headers: bool | None = Field(
        default=None,
        alias="ALLOW_TRUSTED_PROXY_HEADERS",
    )
    auth_required: bool | None = Field(default=None, alias="AUTH_REQUIRED")
    cron_secret: str | None = Field(default=None, alias="CRON_SECRET")
    outbox_batch_size: int = Field(default=25, alias="OUTBOX_BATCH_SIZE")
    outbox_max_runtime_ms: int = Field(default=25000, alias="OUTBOX_MAX_RUNTIME_MS")
    outbox_lock_ttl_seconds: int = Field(default=300, alias="OUTBOX_LOCK_TTL_SECONDS")
    outbox_max_retries: int = Field(default=5, alias="OUTBOX_MAX_RETRIES")
    outbox_poll_interval_seconds: float = Field(default=5.0, alias="OUTBOX_POLL_INTERVAL_SECONDS")
    worker_id: str = Field(default="eden-worker-local", alias="WORKER_ID")
    log_format: str = Field(default="json", alias="LOG_FORMAT")
    metrics_enabled: bool = Field(default=True, alias="METRICS_ENABLED")
    db_pool_size: int = Field(default=5, alias="DB_POOL_SIZE")
    db_max_overflow: int = Field(default=10, alias="DB_MAX_OVERFLOW")
    db_pool_timeout: float = Field(default=30.0, alias="DB_POOL_TIMEOUT")
    db_pool_recycle: int = Field(default=1800, alias="DB_POOL_RECYCLE")
    db_statement_timeout_ms: int | None = Field(default=None, alias="DB_STATEMENT_TIMEOUT_MS")
    db_slow_query_ms: int = Field(default=750, alias="DB_SLOW_QUERY_MS")
    use_supabase_pooler: bool = Field(default=False, alias="USE_SUPABASE_POOLER")
    api_slow_request_ms: int = Field(default=1000, alias="API_SLOW_REQUEST_MS")
    api_very_slow_request_ms: int = Field(default=3000, alias="API_VERY_SLOW_REQUEST_MS")
    expose_response_time_header: bool = Field(default=True, alias="EXPOSE_RESPONSE_TIME_HEADER")
    sentry_dsn: str | None = Field(default=None, alias="SENTRY_DSN")
    error_tracking_enabled: bool = Field(default=False, alias="ERROR_TRACKING_ENABLED")

    @property
    def cors_origins(self) -> list[str]:
        return [item.strip() for item in self.cors_origins_raw.split(",") if item.strip()]

    @property
    def app_env(self) -> str:
        return self.environment.lower()

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @property
    def is_development(self) -> bool:
        return self.app_env in {"local", "development", "dev", "test"}

    @property
    def effective_auth_required(self) -> bool:
        if self.auth_required is not None:
            return self.auth_required
        return self.is_production or self.app_env == "staging"

    @property
    def effective_allow_trusted_proxy_headers(self) -> bool:
        if self.allow_trusted_proxy_headers is not None:
            return self.allow_trusted_proxy_headers
        return self.is_development

    @property
    def effective_supabase_jwks_url(self) -> str | None:
        if self.supabase_jwks_url:
            return self.supabase_jwks_url
        if self.supabase_project_ref:
            return (
                f"https://{self.supabase_project_ref}.supabase.co/auth/v1/.well-known/jwks.json"
            )
        if self.supabase_url:
            return f"{self.supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"
        return None


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
