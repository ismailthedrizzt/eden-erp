from functools import lru_cache

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", ".env.local", "../.env", "../.env.local"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = Field(default="Eden ERP Backend", alias="APP_NAME")
    service_name: str = "eden-erp-backend"
    version: str = Field(default="0.1.0", alias="APP_VERSION")
    environment: str = Field(
        default="local", validation_alias=AliasChoices("APP_ENV", "ENVIRONMENT")
    )
    log_level: str = Field(default="INFO", validation_alias=AliasChoices("LOG_LEVEL"))

    database_url: str | None = Field(default=None, alias="DATABASE_URL")
    # Legacy compatibility only. Canonical auth/storage for remote server deployments
    # is app-session/trusted proxy plus local document storage.
    supabase_url: str | None = Field(
        default=None,
        validation_alias=AliasChoices("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"),
    )
    supabase_project_ref: str | None = Field(default=None, alias="SUPABASE_PROJECT_REF")
    supabase_service_role_key: str | None = Field(default=None, alias="SUPABASE_SERVICE_ROLE_KEY")
    supabase_jwt_secret: str | None = Field(default=None, alias="SUPABASE_JWT_SECRET")
    supabase_jwks_url: str | None = Field(default=None, alias="SUPABASE_JWKS_URL")
    legacy_supabase_jwt_enabled: bool = Field(
        default=False,
        validation_alias=AliasChoices(
            "LEGACY_SUPABASE_JWT_ENABLED",
            "EDEN_ENABLE_LEGACY_SUPABASE_AUTH",
        ),
    )
    document_storage_root: str = Field(default="var/document-storage", alias="DOCUMENT_STORAGE_ROOT")
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
    reminder_batch_size: int = Field(default=100, alias="REMINDER_BATCH_SIZE")
    reminder_poll_interval_seconds: float = Field(
        default=60.0,
        alias="REMINDER_POLL_INTERVAL_SECONDS",
    )
    reminder_lookahead_minutes: int = Field(default=30, alias="REMINDER_LOOKAHEAD_MINUTES")
    email_enabled: bool = Field(default=False, alias="EMAIL_ENABLED")
    email_batch_size: int = Field(default=50, alias="EMAIL_BATCH_SIZE")
    email_max_retries: int = Field(default=3, alias="EMAIL_MAX_RETRIES")
    email_poll_interval_seconds: float = Field(default=15.0, alias="EMAIL_POLL_INTERVAL_SECONDS")
    ai_provider: str = Field(default="local_rule", alias="AI_PROVIDER")
    ai_enabled: bool = Field(default=True, alias="AI_ENABLED")
    ai_model: str | None = Field(default=None, alias="AI_MODEL")
    ai_api_key: str | None = Field(default=None, alias="AI_API_KEY")
    ai_timeout_seconds: float = Field(default=12.0, alias="AI_TIMEOUT_SECONDS")
    ai_max_context_chars: int = Field(default=12000, alias="AI_MAX_CONTEXT_CHARS")
    ai_log_prompts: bool = Field(default=False, alias="AI_LOG_PROMPTS")
    ai_store_history: bool = Field(default=True, alias="AI_STORE_HISTORY")
    webhook_worker_batch_size: int = Field(default=20, alias="WEBHOOK_WORKER_BATCH_SIZE")
    webhook_timeout_seconds: int = Field(default=10, alias="WEBHOOK_TIMEOUT_SECONDS")
    webhook_max_retries: int = Field(default=5, alias="WEBHOOK_MAX_RETRIES")
    webhook_allowed_private_ips_dev_only: bool = Field(
        default=True,
        alias="WEBHOOK_ALLOWED_PRIVATE_IPS_DEV_ONLY",
    )
    webhook_delivery_concurrency: int = Field(default=5, alias="WEBHOOK_DELIVERY_CONCURRENCY")
    webhook_user_agent: str = Field(default="EdenERP-Webhooks/1.0", alias="WEBHOOK_USER_AGENT")
    smtp_host: str | None = Field(default=None, alias="SMTP_HOST")
    smtp_port: int = Field(default=587, alias="SMTP_PORT")
    smtp_user: str | None = Field(default=None, alias="SMTP_USER")
    smtp_password: str | None = Field(default=None, alias="SMTP_PASSWORD")
    smtp_from_email: str | None = Field(default=None, alias="SMTP_FROM_EMAIL")
    smtp_from_name: str = Field(default="Eden ERP", alias="SMTP_FROM_NAME")
    smtp_tls: bool = Field(default=True, alias="SMTP_TLS")
    worker_id: str = Field(default="eden-worker-local", alias="WORKER_ID")
    log_format: str = Field(default="json", alias="LOG_FORMAT")
    metrics_enabled: bool = Field(default=True, alias="METRICS_ENABLED")
    db_pool_size: int = Field(default=5, alias="DB_POOL_SIZE")
    db_max_overflow: int = Field(default=10, alias="DB_MAX_OVERFLOW")
    db_pool_timeout: float = Field(default=30.0, alias="DB_POOL_TIMEOUT")
    db_pool_recycle: int = Field(default=1800, alias="DB_POOL_RECYCLE")
    db_statement_timeout_ms: int | None = Field(default=None, alias="DB_STATEMENT_TIMEOUT_MS")
    db_slow_query_ms: int = Field(default=750, alias="DB_SLOW_QUERY_MS")
    worker_db_pool_size: int | None = Field(default=None, alias="WORKER_DB_POOL_SIZE")
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
        return self.app_env in {"production", "prod", "release"}

    @property
    def is_development(self) -> bool:
        return self.app_env in {"local", "development", "dev", "test", "preview"}

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
        # Legacy external JWT verifier source. Do not require this for the
        # canonical Next app-session + trusted proxy deployment model.
        if self.supabase_jwks_url:
            return self.supabase_jwks_url
        if self.supabase_project_ref:
            return (
                f"https://{self.supabase_project_ref}.supabase.co/auth/v1/.well-known/jwks.json"
            )
        if self.supabase_url:
            return f"{self.supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"
        return None

    @property
    def effective_db_pool_size(self) -> int:
        return self.worker_db_pool_size or self.db_pool_size

    @property
    def async_database_url(self) -> str | None:
        if not self.database_url:
            return None
        if self.database_url.startswith("postgresql://"):
            return self.database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return self.database_url


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
