from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

NotificationSeverity = Literal["info", "success", "warning", "error", "critical"]
NotificationPriority = Literal["low", "normal", "high", "urgent"]
NotificationStatus = Literal["unread", "read", "dismissed", "archived"]
DeliveryStatus = Literal["pending", "delivered", "queued", "failed", "skipped"]
ReminderStatus = Literal["scheduled", "sent", "dismissed", "cancelled", "failed"]
EmailStatus = Literal["queued", "sending", "sent", "failed", "skipped"]
DigestFrequency = Literal["never", "daily", "weekly"]
ReminderChannel = Literal["in_app", "email"]


def default_reminder_channels() -> list[ReminderChannel]:
    return ["in_app"]


class NotificationListQuery(BaseModel):
    status: NotificationStatus | None = None
    notification_type: str | None = None
    module_key: str | None = None
    severity: NotificationSeverity | None = None
    priority: NotificationPriority | None = None
    action_required: bool | None = None
    related_entity_type: str | None = None
    related_entity_id: str | None = None
    search: str | None = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=50, ge=1, le=200)


class NotificationCreateRequest(BaseModel):
    user_id: str
    company_id: str | None = None
    branch_id: str | None = None
    module_key: str = "platform"
    notification_type: str
    title: str
    message: str
    severity: NotificationSeverity = "info"
    priority: NotificationPriority = "normal"
    action_required: bool = False
    action_key: str | None = None
    action_label: str | None = None
    target_page: str | None = None
    related_entity_type: str | None = None
    related_entity_id: str | None = None
    related_record_label: str | None = None
    process_instance_id: str | None = None
    task_id: str | None = None
    approval_id: str | None = None
    operation_id: str | None = None
    outbox_event_id: str | None = None
    due_at: datetime | None = None
    expires_at: datetime | None = None
    delivered_channels: list[str] = Field(default_factory=lambda: ["in_app"])
    delivery_status: DeliveryStatus | None = "delivered"
    metadata_json: dict[str, Any] = Field(default_factory=dict)


class NotificationPreferencePatch(BaseModel):
    in_app_enabled: bool | None = None
    email_enabled: bool | None = None
    task_notifications: bool | None = None
    approval_notifications: bool | None = None
    system_warnings: bool | None = None
    document_expiry: bool | None = None
    service_reminders: bool | None = None
    hr_reminders: bool | None = None
    security_notifications: bool | None = None
    quiet_hours: dict[str, Any] | None = None
    digest_frequency: DigestFrequency | None = None
    language: str | None = None
    timezone: str | None = None


class ReminderCreateRequest(BaseModel):
    user_id: str | None = None
    target_user_id: str | None = None
    company_id: str | None = None
    module_key: str = "platform"
    reminder_type: str
    title: str
    message: str
    related_entity_type: str | None = None
    related_entity_id: str | None = None
    due_at: datetime | None = None
    remind_at: datetime
    recurrence_rule: str | None = None
    channels: list[ReminderChannel] = Field(default_factory=default_reminder_channels)
    metadata_json: dict[str, Any] = Field(default_factory=dict)


class ReminderListQuery(BaseModel):
    status: ReminderStatus | None = None
    module_key: str | None = None
    reminder_type: str | None = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=50, ge=1, le=200)


class EmailMessageCreate(BaseModel):
    user_id: str | None = None
    to_email: str
    to_name: str | None = None
    subject: str
    body_text: str
    body_html: str | None = None
    template_key: str | None = None
    related_notification_id: str | None = None
    related_entity_type: str | None = None
    related_entity_id: str | None = None
    metadata_json: dict[str, Any] = Field(default_factory=dict)


class EmailListQuery(BaseModel):
    status: EmailStatus | None = None
    template_key: str | None = None
    related_entity_type: str | None = None
    related_entity_id: str | None = None
    search: str | None = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=50, ge=1, le=200)


class EmailTestRequest(BaseModel):
    to_email: str
    to_name: str | None = None
    subject: str = "Eden ERP test e-postasi"
    message: str = "Eden ERP e-posta altyapisi test mesaji."


class NotificationTemplate(BaseModel):
    model_config = ConfigDict(frozen=True)

    template_key: str
    subject_template: str
    body_text_template: str
    body_html_template: str | None = None
    variables: list[str] = Field(default_factory=list)
    language: str = "tr"
