from functools import lru_cache

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Eden ERP Backend"
    service_name: str = "eden-erp-backend"
    version: str = "0.1.0"
    environment: str = Field(default="local", validation_alias=AliasChoices("APP_ENV", "ENVIRONMENT"))
    log_level: str = Field(default="INFO", validation_alias=AliasChoices("LOG_LEVEL"))

    database_url: str | None = Field(
        default=None,
        validation_alias=AliasChoices("DATABASE_URL", "SUPABASE_DB_URL"),
    )
    supabase_url: str | None = Field(default=None, alias="SUPABASE_URL")
    supabase_service_role_key: str | None = Field(default=None, alias="SUPABASE_SERVICE_ROLE_KEY")
    supabase_jwt_secret: str | None = Field(default=None, alias="SUPABASE_JWT_SECRET")
    cors_origins_raw: str = Field(default="http://localhost:3000", alias="CORS_ORIGINS")

    @property
    def cors_origins(self) -> list[str]:
        return [item.strip() for item in self.cors_origins_raw.split(",") if item.strip()]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
