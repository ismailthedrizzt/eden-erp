# ruff: noqa: E501

from __future__ import annotations

import json
from collections.abc import Mapping
from datetime import date, datetime
from decimal import Decimal
from typing import Any, cast

from fastapi import status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.domains.operations.service import table_exists

CRM_MODULE_KEY = "crm"
MASTER_PERSON_TABLE = "public.master_persons"
MASTER_ORGANIZATION_TABLE = "public.master_organizations"
STAKEHOLDER_TABLE = "public.crm_stakeholders"
INTERACTION_TABLE = "public.crm_interactions"
LEAD_TABLE = "public.crm_leads"
OPPORTUNITY_TABLE = "public.crm_opportunities"
PIPELINE_TABLE = "public.crm_pipelines"
PIPELINE_STAGE_TABLE = "public.crm_pipeline_stages"
FOLLOWUP_EVENT_TABLE = "public.crm_followup_events"


def json_dumps(value: Any) -> str:
    return json.dumps(value if value is not None else {}, ensure_ascii=False, default=str)


def json_list_dumps(value: Any) -> str:
    return json.dumps(value if value is not None else [], ensure_ascii=False, default=str)


def row_to_dict(row: Any) -> dict[str, Any]:
    return {key: normalize_value(value) for key, value in dict(row).items()}


def normalize_value(value: Any) -> Any:
    if isinstance(value, Decimal):
        return value
    if isinstance(value, (date, datetime)):
        return value
    return value


def list_meta(page: int, page_size: int, total: int) -> dict[str, int]:
    return {
        "page": page,
        "pageSize": page_size,
        "total": total,
        "totalPages": max(1, (total + page_size - 1) // page_size),
    }


async def ensure_crm_tables(session: AsyncSession, *, master: bool = False, stakeholders: bool = False, interactions: bool = False) -> None:
    if master:
        if not await table_exists(session, MASTER_PERSON_TABLE) or not await table_exists(session, MASTER_ORGANIZATION_TABLE):
            raise DomainError(
                "CRM master data altyapisi hazir degil. Kurulum Merkezi'nden CRM/Paydaslar modulunu tamamlayin.",
                "CRM_MASTER_DATA_MISSING",
                status.HTTP_409_CONFLICT,
                {"module_key": CRM_MODULE_KEY},
            )
    if stakeholders and not await table_exists(session, STAKEHOLDER_TABLE):
        raise DomainError(
            "CRM paydas altyapisi hazir degil. Kurulum Merkezi'nden CRM/Paydaslar modulunu tamamlayin.",
            "CRM_STAKEHOLDERS_MISSING",
            status.HTTP_409_CONFLICT,
            {"module_key": CRM_MODULE_KEY},
        )
    if interactions and not await table_exists(session, INTERACTION_TABLE):
        raise DomainError(
            "CRM etkilesim altyapisi hazir degil. Kurulum Merkezi'nden CRM/Paydaslar modulunu tamamlayin.",
            "CRM_INTERACTIONS_MISSING",
            status.HTTP_409_CONFLICT,
            {"module_key": CRM_MODULE_KEY},
        )


async def ensure_crm_deepening_tables(
    session: AsyncSession,
    *,
    leads: bool = False,
    opportunities: bool = False,
    pipelines: bool = False,
    interactions: bool = False,
    followups: bool = False,
) -> None:
    if leads and not await table_exists(session, LEAD_TABLE):
        raise DomainError(
            "CRM lead altyapisi hazir degil. Kurulum Merkezi'nden CRM derinlestirme migrationlarini tamamlayin.",
            "CRM_LEADS_TABLE_MISSING",
            status.HTTP_409_CONFLICT,
            {"module_key": CRM_MODULE_KEY},
        )
    if opportunities and not await table_exists(session, OPPORTUNITY_TABLE):
        raise DomainError(
            "CRM firsat altyapisi hazir degil. Kurulum Merkezi'nden CRM derinlestirme migrationlarini tamamlayin.",
            "CRM_OPPORTUNITIES_TABLE_MISSING",
            status.HTTP_409_CONFLICT,
            {"module_key": CRM_MODULE_KEY},
        )
    if pipelines and not (
        await table_exists(session, PIPELINE_TABLE)
        and await table_exists(session, PIPELINE_STAGE_TABLE)
    ):
        raise DomainError(
            "CRM pipeline altyapisi hazir degil. Kurulum Merkezi'nden CRM derinlestirme migrationlarini tamamlayin.",
            "CRM_PIPELINE_TABLE_MISSING",
            status.HTTP_409_CONFLICT,
            {"module_key": CRM_MODULE_KEY},
        )
    if interactions:
        await ensure_crm_tables(session, interactions=True)
    if followups and not await table_exists(session, FOLLOWUP_EVENT_TABLE):
        raise DomainError(
            "CRM takip olay altyapisi hazir degil.",
            "CRM_FOLLOWUP_EVENTS_TABLE_MISSING",
            status.HTTP_409_CONFLICT,
            {"module_key": CRM_MODULE_KEY},
        )


def assert_company_scope(context: dict[str, Any], company_id: str, *, write: bool = False) -> None:
    scope_key = "writable_company_scope_ids" if write else "company_scope_ids"
    scope = context.get(scope_key) or context.get("company_scope_ids")
    if scope and str(company_id) not in {str(item) for item in scope}:
        raise DomainError(
            "Bu kayit erisim kapsaminiz disinda.",
            "COMPANY_SCOPE_DENIED",
            status.HTTP_403_FORBIDDEN,
            {"company_id": company_id},
        )


async def assert_company_exists(session: AsyncSession, context: dict[str, Any], company_id: str) -> None:
    if not await table_exists(session, "public.companies"):
        return
    result = await session.execute(
        text(
            """
            select id
            from public.companies
            where tenant_id = :tenant_id
              and id = :company_id
              and coalesce(is_deleted, false) = false
            limit 1
            """
        ),
        {"tenant_id": context["tenant_id"], "company_id": company_id},
    )
    if not result.mappings().one_or_none():
        raise DomainError("Bagli sirket kaydi bulunamadi.", "COMPANY_NOT_FOUND", status.HTTP_404_NOT_FOUND, {"company_id": company_id})


def assert_version(current: Mapping[str, Any], base_version: int | None) -> None:
    if base_version is None:
        return
    if int(current.get("version") or 0) != int(base_version):
        raise DomainError("Kayit baska bir islem tarafindan guncellendi. Lutfen kaydi yenileyin.", "VERSION_CONFLICT", status.HTTP_409_CONFLICT)


def mask_identity(value: str | None) -> str | None:
    if not value:
        return None
    text_value = str(value)
    if len(text_value) <= 4:
        return "*" * len(text_value)
    return f"{text_value[:2]}{'*' * max(2, len(text_value) - 4)}{text_value[-2:]}"


def stakeholder_cari_role(stakeholder_type: str) -> str:
    if stakeholder_type == "customer":
        return "customer"
    if stakeholder_type == "supplier":
        return "supplier"
    if stakeholder_type == "customer_supplier":
        return "both"
    if stakeholder_type == "public_institution":
        return "public_institution"
    return "stakeholder"


def stakeholder_account_type(stakeholder_type: str) -> str:
    if stakeholder_type == "customer_supplier":
        return "customer_supplier"
    role = stakeholder_cari_role(stakeholder_type)
    return role if role in {"customer", "supplier", "public_institution", "stakeholder"} else "other"


async def next_sequence_code(session: AsyncSession, table_name: str, tenant_id: str, prefix: str) -> str:
    result = await session.execute(
        text(f"select count(*) + 1 as next_no from public.{table_name} where tenant_id = :tenant_id"),
        {"tenant_id": tenant_id},
    )
    return f"{prefix}-{int(result.mappings().one()['next_no']):06d}"


async def record_crm_audit_best_effort(
    session: AsyncSession,
    context: dict[str, Any],
    *,
    action_type: str,
    entity_type: str,
    entity_id: str,
    company_id: str | None = None,
    summary: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> None:
    if not await table_exists(session, "public.audit_logs"):
        return
    try:
        await session.execute(
            text(
                """
                insert into public.audit_logs (
                  tenant_id, company_id, module_key, entity_type, entity_id,
                  action_type, action_key, user_id, summary, result_status,
                  severity, metadata_json
                )
                values (
                  :tenant_id, :company_id, 'crm', :entity_type, :entity_id,
                  :action_type, :action_type, :user_id, :summary, 'success',
                  'info', cast(:metadata_json as jsonb)
                )
                """
            ),
            {
                "tenant_id": context["tenant_id"],
                "company_id": company_id,
                "user_id": context.get("user_id"),
                "entity_type": entity_type,
                "entity_id": entity_id,
                "action_type": action_type,
                "summary": summary or action_type,
                "metadata_json": json_dumps(metadata or {}),
            },
        )
    except Exception:
        return


async def create_crm_notification_best_effort(
    session: AsyncSession,
    context: dict[str, Any],
    *,
    user_id: str | None,
    company_id: str | None,
    notification_type: str,
    title: str,
    message: str,
    target_page: str,
    related_entity_type: str,
    related_entity_id: str,
    related_record_label: str | None = None,
    due_at: date | datetime | None = None,
    priority: str = "normal",
    severity: str = "info",
) -> None:
    if not user_id or not await table_exists(session, "public.notifications"):
        return
    try:
        from app.domains.notifications.notifications import create_notification
        from app.domains.notifications.schemas import (
            NotificationCreateRequest,
            NotificationPriority,
            NotificationSeverity,
        )

        await create_notification(
            session,
            context,
            NotificationCreateRequest(
                user_id=user_id,
                company_id=company_id,
                module_key="crm",
                notification_type=notification_type,
                title=title,
                message=message,
                severity=cast(NotificationSeverity, severity),
                priority=cast(NotificationPriority, priority),
                action_required=True,
                action_key=f"crm.{notification_type}",
                action_label="Ac",
                target_page=target_page,
                related_entity_type=related_entity_type,
                related_entity_id=related_entity_id,
                related_record_label=related_record_label,
                due_at=due_at if isinstance(due_at, datetime) else None,
                metadata_json={"source": "crm"},
            ),
            queue_email=False,
        )
    except Exception:
        return


async def create_crm_project_task_best_effort(
    session: AsyncSession,
    context: dict[str, Any],
    *,
    company_id: str,
    title: str,
    description: str | None,
    priority: str = "medium",
    assignee_user_id: str | None = None,
    due_date: date | None = None,
    related_entity_type: str,
    related_entity_id: str,
) -> dict[str, Any] | None:
    if not await table_exists(session, "public.project_tasks"):
        return None
    result = await session.execute(
        text(
            """
            select count(*) + 1 as next_no
            from public.project_tasks
            where tenant_id = :tenant_id
            """
        ),
        {"tenant_id": context["tenant_id"]},
    )
    issue_key = f"CRM-{int(result.mappings().one()['next_no']):06d}"
    inserted = await session.execute(
        text(
            """
            insert into public.project_tasks (
              tenant_id, company_id, issue_key, title, description, issue_type,
              status, priority, assignee_user_id, reporter_user_id, due_date,
              related_module, related_entity_type, related_entity_id, labels,
              metadata_json, created_by, updated_by
            )
            values (
              :tenant_id, :company_id, :issue_key, :title, :description, 'task',
              'todo', :priority, :assignee_user_id, :reporter_user_id, :due_date,
              'crm', :related_entity_type, :related_entity_id, :labels,
              cast(:metadata_json as jsonb), :user_id, :user_id
            )
            returning *
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "company_id": company_id,
            "issue_key": issue_key,
            "title": title,
            "description": description,
            "priority": priority,
            "assignee_user_id": assignee_user_id,
            "reporter_user_id": context.get("user_id"),
            "due_date": due_date,
            "related_entity_type": related_entity_type,
            "related_entity_id": related_entity_id,
            "labels": ["crm", "follow-up"],
            "metadata_json": json_dumps({"source": "crm_followup"}),
            "user_id": context.get("user_id"),
        },
    )
    return row_to_dict(inserted.mappings().one())
