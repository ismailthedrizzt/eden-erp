from functools import lru_cache
from pathlib import Path
from typing import Any

from pydantic import AnyHttpUrl, Field, model_validator
from dotenv import dotenv_values
from pydantic_settings import BaseSettings, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parents[4]
ROOT_ENV = dotenv_values(REPO_ROOT / ".env.local", encoding="utf-8-sig")


def env_value(data: dict[str, Any], *keys: str) -> Any:
    for key in keys:
        value = data.get(key) or ROOT_ENV.get(key)
        if value:
            return value
    return None


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", ".env.local", str(REPO_ROOT / ".env.local")),
        env_file_encoding="utf-8-sig",
        extra="ignore",
    )

    supabase_url: AnyHttpUrl | None = None
    supabase_anon_key: str | None = None
    supabase_jwt_secret: str | None = None
    database_url: str
    cors_origins_raw: str = "http://localhost:3000"
    default_instance_id: str = "00000000-0000-0000-0000-000000000000"
    default_tenant_id: str = "00000000-0000-0000-0000-000000000000"
    tenancy_isolation_mode: str = "shared_schema"

    @model_validator(mode="before")
    @classmethod
    def normalize_env_keys(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data

        return {
            **data,
            "supabase_url": env_value(data, "supabase_url", "SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"),
            "supabase_anon_key": env_value(data, "supabase_anon_key", "SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY"),
            "supabase_jwt_secret": env_value(data, "supabase_jwt_secret", "SUPABASE_JWT_SECRET"),
            "database_url": env_value(data, "database_url", "DATABASE_URL"),
            "cors_origins_raw": env_value(data, "cors_origins_raw", "CORS_ORIGINS", "NEXT_PUBLIC_APP_URL") or "http://localhost:3000",
            "default_instance_id": env_value(data, "default_instance_id", "DEFAULT_INSTANCE_ID", "EDEN_DEFAULT_TENANT_ID", "DEFAULT_TENANT_ID") or "00000000-0000-0000-0000-000000000000",
            "default_tenant_id": env_value(data, "default_tenant_id", "EDEN_DEFAULT_TENANT_ID", "DEFAULT_TENANT_ID", "DEFAULT_INSTANCE_ID") or "00000000-0000-0000-0000-000000000000",
            "tenancy_isolation_mode": env_value(data, "tenancy_isolation_mode", "EDEN_TENANCY_ISOLATION_MODE") or "shared_schema",
        }

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins_raw.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
