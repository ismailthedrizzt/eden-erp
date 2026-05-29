from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field, field_validator


class WorkspaceSettingsUpdate(BaseModel):
    workspace_name: str | None = Field(default=None, min_length=2, max_length=120)
    country: str | None = Field(default=None, min_length=2, max_length=2)
    default_language: str | None = Field(default=None, min_length=2, max_length=8)
    default_currency: str | None = Field(default=None, min_length=3, max_length=3)
    timezone: str | None = Field(default=None, min_length=3, max_length=80)
    date_format: str | None = Field(default=None, max_length=32)
    number_format: str | None = Field(default=None, max_length=32)
    logo_document_id: str | None = None
    onboarding_version: str | None = Field(default=None, max_length=32)
    metadata_json: dict[str, Any] | None = None

    @field_validator("country", "default_currency")
    @classmethod
    def uppercase_code(cls, value: str | None) -> str | None:
        return value.upper() if value else value


class ModuleActivationAdminRequest(BaseModel):
    enabled: bool
    reason: str | None = Field(default=None, max_length=500)


class FeatureFlagAdminUpdateRequest(BaseModel):
    enabled: bool
    reason: str | None = Field(default=None, max_length=500)


class AdminSettingsUpdate(BaseModel):
    settings_json: dict[str, Any] = Field(default_factory=dict)
    reason: str | None = Field(default=None, max_length=500)


class IntegrationTestRequest(BaseModel):
    force: bool = False

