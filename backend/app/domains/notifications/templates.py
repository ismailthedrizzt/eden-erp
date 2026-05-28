# ruff: noqa: E501

from __future__ import annotations

import html
from string import Template
from typing import Any

from app.domains.notifications.schemas import NotificationTemplate

TEMPLATES: dict[str, NotificationTemplate] = {
    "task_assigned": NotificationTemplate(
        template_key="task_assigned",
        subject_template="Yeni gorev atandi: $title",
        body_text_template="$user_name, size yeni bir gorev atandi: $record_label. $target_url",
        body_html_template="<p>$user_name, size yeni bir gorev atandi: <strong>$record_label</strong>.</p><p><a href=\"$target_url\">Goreve git</a></p>",
        variables=["user_name", "title", "record_label", "target_url"],
    ),
    "approval_requested": NotificationTemplate(
        template_key="approval_requested",
        subject_template="Onay bekleyen islem var",
        body_text_template="$record_label icin onayiniz bekleniyor. $target_url",
        body_html_template="<p><strong>$record_label</strong> icin onayiniz bekleniyor.</p><p><a href=\"$target_url\">Onaya git</a></p>",
        variables=["record_label", "target_url"],
    ),
    "document_expiring": NotificationTemplate(
        template_key="document_expiring",
        subject_template="Belge suresi yaklasiyor: $record_label",
        body_text_template="$record_label belgesinin son gecerlilik tarihi yaklasiyor. $due_date",
        variables=["record_label", "due_date"],
    ),
    "service_request_assigned": NotificationTemplate(
        template_key="service_request_assigned",
        subject_template="Yeni servis talebi atandi",
        body_text_template="$record_label servis talebi size atandi. $target_url",
        variables=["record_label", "target_url"],
    ),
    "import_completed": NotificationTemplate(
        template_key="import_completed",
        subject_template="Ice aktarma tamamlandi",
        body_text_template="$record_label ice aktarma isi tamamlandi. $target_url",
        variables=["record_label", "target_url"],
    ),
    "export_ready": NotificationTemplate(
        template_key="export_ready",
        subject_template="Disa aktarma dosyaniz hazir",
        body_text_template="$record_label disa aktarma dosyaniz hazir. $target_url",
        variables=["record_label", "target_url"],
    ),
    "daily_digest": NotificationTemplate(
        template_key="daily_digest",
        subject_template="Eden ERP gunluk bildirim ozeti",
        body_text_template="Bugunku bildirim ozetiniz: $summary",
        variables=["summary"],
    ),
}


def get_template(template_key: str) -> NotificationTemplate | None:
    return TEMPLATES.get(template_key)


def render_template(template_key: str, variables: dict[str, Any]) -> dict[str, str]:
    template = get_template(template_key)
    if not template:
        return {
            "subject": str(variables.get("title") or "Eden ERP bildirimi"),
            "body_text": str(variables.get("message") or ""),
            "body_html": "",
        }
    safe_variables = {
        key: html.escape(str(value)) if value is not None else ""
        for key, value in variables.items()
    }
    subject = Template(template.subject_template).safe_substitute(safe_variables)
    body_text = Template(template.body_text_template).safe_substitute(safe_variables)
    body_html = (
        Template(template.body_html_template).safe_substitute(safe_variables)
        if template.body_html_template
        else ""
    )
    return {"subject": subject, "body_text": body_text, "body_html": body_html}
