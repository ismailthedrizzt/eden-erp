from __future__ import annotations

# ruff: noqa: E501
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

IntegrationAppType = Literal["webhook", "api_client", "partner_system", "accounting_provider", "bank_provider", "ecommerce", "customer_portal", "internal", "other"]
IntegrationAppStatus = Literal["draft", "active", "suspended", "revoked"]
CredentialType = Literal["api_key", "webhook_secret", "bearer_token", "basic_auth", "oauth_client"]
CredentialStatus = Literal["active", "expired", "revoked"]
WebhookSubscriptionStatus = Literal["active", "paused", "failed", "disabled"]
WebhookDeliveryStatus = Literal["pending", "delivering", "delivered", "failed", "skipped", "dead_letter"]
InboundEventStatus = Literal["received", "validated", "rejected", "processing", "processed", "failed"]


class ListResult(BaseModel):
    items: list[dict[str, Any]]
    meta: dict[str, int]


class IntegrationAppListQuery(BaseModel):
    app_type: str | None = None
    status: str | None = None
    search: str | None = None
    page: int = 1
    page_size: int = 50


class IntegrationAppCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    app_key: str | None = Field(default=None, max_length=120)
    app_name: str = Field(min_length=1, max_length=240)
    description: str | None = None
    app_type: IntegrationAppType = "webhook"
    status: IntegrationAppStatus = "draft"
    owner_user_id: str | None = None
    allowed_scopes: dict[str, Any] = Field(default_factory=dict)
    allowed_event_types: list[str] = Field(default_factory=list)
    allowed_inbound_events: list[str] = Field(default_factory=list)
    rate_limit_per_minute: int | None = Field(default=None, ge=1)
    ip_allowlist: list[str] = Field(default_factory=list)
    metadata_json: dict[str, Any] = Field(default_factory=dict)


class IntegrationAppUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    app_name: str | None = Field(default=None, min_length=1, max_length=240)
    description: str | None = None
    app_type: IntegrationAppType | None = None
    status: IntegrationAppStatus | None = None
    owner_user_id: str | None = None
    allowed_scopes: dict[str, Any] | None = None
    allowed_event_types: list[str] | None = None
    allowed_inbound_events: list[str] | None = None
    rate_limit_per_minute: int | None = Field(default=None, ge=1)
    ip_allowlist: list[str] | None = None
    metadata_json: dict[str, Any] | None = None
    base_version: int | None = None


class CredentialCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    credential_type: CredentialType = "webhook_secret"
    name: str = Field(min_length=1, max_length=180)
    secret: str | None = Field(default=None, min_length=16, max_length=512)
    expires_at: datetime | None = None


class WebhookSubscriptionListQuery(BaseModel):
    integration_app_id: str | None = None
    status: str | None = None
    event_type: str | None = None
    search: str | None = None
    page: int = 1
    page_size: int = 50


class WebhookSubscriptionCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    integration_app_id: str
    subscription_name: str = Field(min_length=1, max_length=240)
    target_url: str = Field(min_length=8, max_length=2048)
    event_types: list[str] = Field(default_factory=list)
    signing_secret_id: str | None = None
    headers_json: dict[str, str] = Field(default_factory=dict)
    retry_policy_json: dict[str, Any] = Field(default_factory=dict)
    filter_config_json: dict[str, Any] = Field(default_factory=dict)

    @field_validator("event_types")
    @classmethod
    def event_types_required(cls, value: list[str]) -> list[str]:
        if not value:
            raise ValueError("At least one event type is required.")
        return value


class WebhookSubscriptionUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    subscription_name: str | None = Field(default=None, min_length=1, max_length=240)
    target_url: str | None = Field(default=None, min_length=8, max_length=2048)
    event_types: list[str] | None = None
    status: WebhookSubscriptionStatus | None = None
    signing_secret_id: str | None = None
    headers_json: dict[str, str] | None = None
    retry_policy_json: dict[str, Any] | None = None
    filter_config_json: dict[str, Any] | None = None
    base_version: int | None = None


class WebhookDeliveryListQuery(BaseModel):
    subscription_id: str | None = None
    integration_app_id: str | None = None
    status: str | None = None
    event_type: str | None = None
    page: int = 1
    page_size: int = 50


class InboundEventListQuery(BaseModel):
    integration_app_id: str | None = None
    status: str | None = None
    inbound_event_type: str | None = None
    page: int = 1
    page_size: int = 50

