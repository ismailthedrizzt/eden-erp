# ruff: noqa: E501

from __future__ import annotations

import json
from typing import Any
from uuid import uuid4

from fastapi import status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.core.serialization import row_to_dict, rows_to_dicts
from app.domains.audit.service import record_audit_required
from app.domains.data_quality.duplicate_detection import detect_duplicate_candidates, table_columns
from app.domains.data_quality.events import (
    DATA_QUALITY_CHECK_COMPLETED,
    DUPLICATE_GROUP_DETECTED,
    DUPLICATE_GROUP_DISMISSED,
    DUPLICATE_GROUP_FALSE_POSITIVE,
    MERGE_BLOCKED,
    MERGE_COMPLETED,
    MERGE_PREVIEW_CREATED,
)
from app.domains.data_quality.merge import ENTITY_TABLES, apply_safe_merge, build_merge_preview
from app.domains.data_quality.quality_score import calculate_quality_score
from app.domains.data_quality.review_queue import (
    get_group,
    list_groups,
    persist_duplicate_group,
    update_group_status,
)
from app.domains.data_quality.rules import get_default_rule, list_default_rules
from app.domains.data_quality.schemas import (
    DuplicateDetectRequest,
    DuplicateGroupActionRequest,
    MergeConfirmRequest,
    MergePreviewRequest,
    QualityCheckRequest,
    RuleUpdateRequest,
)
from app.domains.operations.service import table_exists
from app.domains.outbox.service import enqueue_outbox_event_required

DATA_QUALITY_TABLES = [
    "public.data_quality_rules",
    "public.data_quality_scores",
    "public.duplicate_candidate_groups",
    "public.duplicate_candidate_items",
    "public.merge_operations",
    "public.merge_operation_relations",
    "public.data_quality_findings",
]


def service_context(context: Any, tenant_id: str) -> dict[str, Any]:
    return {
        "tenant_id": tenant_id,
        "user_id": getattr(context, "user_id", None),
        "permissions": getattr(context, "permissions", []),
        "company_scope_ids": getattr(context, "company_scope_ids", None),
        "writable_company_scope_ids": getattr(context, "writable_company_scope_ids", None),
        "branch_scope_ids": getattr(context, "branch_scope_ids", None),
        "is_internal": getattr(context, "is_internal", False),
        "module_key": "dataQuality",
    }


async def ensure_data_quality_tables(session: AsyncSession) -> None:
    missing = [table for table in DATA_QUALITY_TABLES if not await table_exists(session, table)]
    if missing:
        raise DomainError(
            "Veri kalitesi altyapisi hazir degil. Migration uygulanmalidir.",
            "DATA_QUALITY_TABLES_MISSING",
            status.HTTP_409_CONFLICT,
            {"missing": missing},
        )


async def data_quality_summary(session: AsyncSession, context: dict[str, Any]) -> dict[str, Any]:
    await ensure_data_quality_tables(session)
    tenant_id = str(context["tenant_id"])
    counts_result = await session.execute(
        text(
            """
            select
              (select count(*) from public.data_quality_findings where tenant_id = :tenant_id and status = 'open')::int as open_findings,
              (select count(*) from public.data_quality_findings where tenant_id = :tenant_id and status = 'resolved')::int as resolved_findings,
              (select count(*) from public.duplicate_candidate_groups where tenant_id = :tenant_id and status = 'open')::int as duplicate_candidates,
              (select count(*) from public.data_quality_findings where tenant_id = :tenant_id and status = 'open' and severity = 'critical')::int as critical_findings,
              (select count(*) from public.data_quality_scores where tenant_id = :tenant_id and status in ('poor','critical'))::int as low_quality_records,
              (select max(last_checked_at) from public.data_quality_scores where tenant_id = :tenant_id) as last_scan_at
            """
        ),
        {"tenant_id": tenant_id},
    )
    counts = row_to_dict(counts_result.mappings().one()) or {}
    findings = await session.execute(
        text(
            """
            select *
            from public.data_quality_findings
            where tenant_id = :tenant_id and status = 'open'
            order by case severity when 'critical' then 1 when 'warning' then 2 else 3 end, created_at desc
            limit 20
            """
        ),
        {"tenant_id": tenant_id},
    )
    scores = await session.execute(
        text(
            """
            select *
            from public.data_quality_scores
            where tenant_id = :tenant_id
            order by score asc, updated_at desc
            limit 20
            """
        ),
        {"tenant_id": tenant_id},
    )
    merges = await session.execute(
        text(
            """
            select *
            from public.merge_operations
            where tenant_id = :tenant_id
            order by created_at desc
            limit 10
            """
        ),
        {"tenant_id": tenant_id},
    )
    duplicate_groups = await list_groups(session, tenant_id, status="open", limit=20)
    return {
        "counts": counts,
        "duplicate_groups": duplicate_groups,
        "open_findings": rows_to_dicts(findings.mappings().all()),
        "quality_scores": rows_to_dicts(scores.mappings().all()),
        "merge_operations": rows_to_dicts(merges.mappings().all()),
    }


async def run_quality_check(session: AsyncSession, context: dict[str, Any], request: QualityCheckRequest) -> dict[str, Any]:
    await ensure_data_quality_tables(session)
    tenant_id = str(context["tenant_id"])
    detected_count = 0
    checked_scores = 0
    warnings: list[str] = []

    if request.include_duplicates:
        detected = await detect_duplicate_candidates(
            session,
            tenant_id,
            entity_types=request.entity_types or None,
            limit_per_rule=25,
        )
        for group in detected:
            persisted = await persist_duplicate_group(session, tenant_id, group)
            detected_count += 1
            await _outbox(session, context, DUPLICATE_GROUP_DETECTED, persisted)

    if request.include_scores:
        for entity_type in request.entity_types or list(ENTITY_TABLES.keys()):
            try:
                checked_scores += await _score_entity_sample(session, context, entity_type, limit=request.limit_per_entity)
            except Exception:
                warnings.append(f"{entity_type}.quality_score_unavailable")

    await _audit(session, context, "data_quality_check", "dataQuality.check", "Veri kalitesi kontrolu calistirildi.", {"detected_groups": detected_count, "checked_scores": checked_scores})
    await _outbox(session, context, DATA_QUALITY_CHECK_COMPLETED, {"detected_groups": detected_count, "checked_scores": checked_scores})
    summary = await data_quality_summary(session, context)
    return {"detected_duplicate_groups": detected_count, "checked_scores": checked_scores, "summary": summary, "warnings": warnings}


async def check_entity_quality(session: AsyncSession, context: dict[str, Any], entity_type: str, entity_id: str) -> dict[str, Any]:
    await ensure_data_quality_tables(session)
    table_name = ENTITY_TABLES.get(entity_type)
    if not table_name or not await table_exists(session, f"public.{table_name}"):
        raise DomainError("Bu entity tipi icin data quality adapter hazir degil.", "DATA_QUALITY_ENTITY_UNSUPPORTED", status.HTTP_404_NOT_FOUND)
    row = await _load_entity_row(session, str(context["tenant_id"]), table_name, entity_id)
    if not row:
        raise DomainError("Kayit bulunamadi veya scope disinda.", "DATA_QUALITY_ENTITY_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    duplicate_risk = await _entity_duplicate_risk(session, str(context["tenant_id"]), entity_type, entity_id)
    score = calculate_quality_score(entity_type, row, duplicate_risk=duplicate_risk)
    await _upsert_quality_score(session, context, score)
    findings = await _upsert_missing_field_findings(session, context, score)
    groups = await _duplicate_groups_for_entity(session, str(context["tenant_id"]), entity_type, entity_id)
    return {"entity": row, "quality_score": score.model_dump(mode="json"), "findings": findings, "duplicate_groups": groups}


async def list_duplicate_groups(
    session: AsyncSession,
    context: dict[str, Any],
    *,
    entity_type: str | None = None,
    status_value: str | None = "open",
    severity: str | None = None,
    limit: int = 100,
) -> list[dict[str, Any]]:
    await ensure_data_quality_tables(session)
    return await list_groups(session, str(context["tenant_id"]), entity_type=entity_type, status=status_value, severity=severity, limit=limit)


async def get_duplicate_group(session: AsyncSession, context: dict[str, Any], group_id: str) -> dict[str, Any]:
    await ensure_data_quality_tables(session)
    group = await get_group(session, str(context["tenant_id"]), group_id)
    if not group:
        raise DomainError("Duplicate grup bulunamadi.", "DUPLICATE_GROUP_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    return group


async def detect_duplicates(session: AsyncSession, context: dict[str, Any], request: DuplicateDetectRequest) -> dict[str, Any]:
    await ensure_data_quality_tables(session)
    tenant_id = str(context["tenant_id"])
    groups = await detect_duplicate_candidates(session, tenant_id, entity_types=request.entity_types or None, limit_per_rule=request.limit_per_rule)
    persisted: list[dict[str, Any]] = []
    for group in groups:
        row = await persist_duplicate_group(session, tenant_id, group)
        persisted.append(row)
        await _outbox(session, context, DUPLICATE_GROUP_DETECTED, row)
    await _audit(session, context, "data_quality_duplicates_detect", "dataQuality.duplicates.detect", "Duplicate detection calistirildi.", {"count": len(persisted)})
    return {"detected_count": len(persisted), "groups": persisted}


async def dismiss_duplicate_group(session: AsyncSession, context: dict[str, Any], group_id: str, request: DuplicateGroupActionRequest) -> dict[str, Any]:
    await ensure_data_quality_tables(session)
    group = await update_group_status(session, str(context["tenant_id"]), group_id, status_value="dismissed", user_id=context.get("user_id"), notes=request.resolution_notes)
    if not group:
        raise DomainError("Duplicate grup bulunamadi.", "DUPLICATE_GROUP_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    await _audit(session, context, "data_quality_duplicate_dismiss", "dataQuality.duplicates.dismiss", "Duplicate aday grubu yok sayildi.", group)
    await _outbox(session, context, DUPLICATE_GROUP_DISMISSED, group)
    return group


async def mark_duplicate_false_positive(session: AsyncSession, context: dict[str, Any], group_id: str, request: DuplicateGroupActionRequest) -> dict[str, Any]:
    await ensure_data_quality_tables(session)
    group = await update_group_status(session, str(context["tenant_id"]), group_id, status_value="false_positive", user_id=context.get("user_id"), notes=request.resolution_notes)
    if not group:
        raise DomainError("Duplicate grup bulunamadi.", "DUPLICATE_GROUP_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    await _audit(session, context, "data_quality_duplicate_false_positive", "dataQuality.duplicates.false_positive", "Duplicate aday grubu false positive isaretlendi.", group)
    await _outbox(session, context, DUPLICATE_GROUP_FALSE_POSITIVE, group)
    return group


async def merge_preview(session: AsyncSession, context: dict[str, Any], request: MergePreviewRequest) -> dict[str, Any]:
    await ensure_data_quality_tables(session)
    preview = await build_merge_preview(session, str(context["tenant_id"]), request)
    await _audit(session, context, "data_quality_merge_preview", "dataQuality.merge.preview", "Merge preview olusturuldu.", preview.model_dump(mode="json"))
    await _outbox(session, context, MERGE_PREVIEW_CREATED, preview.model_dump(mode="json"))
    return preview.model_dump(mode="json")


async def merge_confirm(session: AsyncSession, context: dict[str, Any], request: MergeConfirmRequest) -> dict[str, Any]:
    await ensure_data_quality_tables(session)
    if not request.confirmed_impact_ack:
        raise DomainError("Merge etkisi onay kutusu isaretlenmeden islem yapilamaz.", "MERGE_IMPACT_ACK_REQUIRED", status.HTTP_409_CONFLICT)
    preview = await build_merge_preview(session, str(context["tenant_id"]), request)
    operation_id = str(uuid4())
    if not preview.safe_to_merge:
        row = await _insert_merge_operation(session, context, operation_id, request, "failed", preview.model_dump(mode="json"), {"blocked_reason": preview.blocked_reason})
        await _audit(session, context, "data_quality_merge_blocked", "dataQuality.merge.confirm", "Merge islemi guvenlik nedeniyle engellendi.", row)
        await _outbox(session, context, MERGE_BLOCKED, row)
        raise DomainError(preview.blocked_reason or "Bu merge islemi guvenli degil.", "MERGE_BLOCKED", status.HTTP_409_CONFLICT, {"preview": preview.model_dump(mode="json"), "merge_operation_id": operation_id})

    result = await apply_safe_merge(session, str(context["tenant_id"]), request)
    row = await _insert_merge_operation(session, context, operation_id, request, "completed", preview.model_dump(mode="json"), result)
    await _insert_merge_relations(session, context, operation_id, preview.relation_impact)
    if request.duplicate_group_id:
        await update_group_status(session, str(context["tenant_id"]), request.duplicate_group_id, status_value="merged", user_id=context.get("user_id"), notes=request.reason)
    await _audit(session, context, "data_quality_merge_completed", "dataQuality.merge.confirm", "Merge islemi tamamlandi.", row)
    await _outbox(session, context, MERGE_COMPLETED, row)
    return {"merge_operation": row, "preview": preview.model_dump(mode="json"), "result": result}


async def get_merge_operation(session: AsyncSession, context: dict[str, Any], merge_id: str) -> dict[str, Any]:
    await ensure_data_quality_tables(session)
    result = await session.execute(
        text("select * from public.merge_operations where tenant_id = :tenant_id and id = :merge_id limit 1"),
        {"tenant_id": context["tenant_id"], "merge_id": merge_id},
    )
    row = row_to_dict(result.mappings().one_or_none())
    if not row:
        raise DomainError("Merge islemi bulunamadi.", "MERGE_OPERATION_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    relations = await session.execute(
        text("select * from public.merge_operation_relations where tenant_id = :tenant_id and merge_operation_id = :merge_id order by created_at asc"),
        {"tenant_id": context["tenant_id"], "merge_id": merge_id},
    )
    row["relations"] = rows_to_dicts(relations.mappings().all())
    return row


async def list_rules(session: AsyncSession, context: dict[str, Any], *, entity_type: str | None = None) -> list[dict[str, Any]]:
    defaults = {rule["rule_key"]: rule for rule in list_default_rules(entity_type)}
    if not await table_exists(session, "public.data_quality_rules"):
        return list(defaults.values())
    result = await session.execute(
        text(
            """
            select *
            from public.data_quality_rules
            where (tenant_id is null or tenant_id = :tenant_id)
              and (:entity_type is null or entity_type = :entity_type)
            order by tenant_id nulls first, entity_type, rule_key
            """
        ),
        {"tenant_id": context["tenant_id"], "entity_type": entity_type},
    )
    for row in rows_to_dicts(result.mappings().all()):
        defaults[str(row["rule_key"])] = {**defaults.get(str(row["rule_key"]), {}), **row}
    return sorted(defaults.values(), key=lambda item: (str(item.get("entity_type")), str(item.get("rule_key"))))


async def update_rule(session: AsyncSession, context: dict[str, Any], rule_key: str, request: RuleUpdateRequest) -> dict[str, Any]:
    await ensure_data_quality_tables(session)
    default = get_default_rule(rule_key)
    if not default:
        raise DomainError("Data quality rule bulunamadi.", "DATA_QUALITY_RULE_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    payload = {
        "id": str(uuid4()),
        "tenant_id": context["tenant_id"],
        "rule_key": rule_key,
        "entity_type": default["entity_type"],
        "label": default["label"],
        "description": request.description if request.description is not None else default.get("description"),
        "severity": request.severity if request.severity is not None else default.get("severity", "warning"),
        "active": request.active if request.active is not None else default.get("active", True),
        "config_json": request.config_json if request.config_json is not None else default.get("config_json", {}),
    }
    result = await session.execute(
        text(
            """
            insert into public.data_quality_rules (
              id, tenant_id, rule_key, entity_type, label, description, severity,
              active, config_json, created_at, updated_at
            )
            values (
              :id, :tenant_id, :rule_key, :entity_type, :label, :description,
              :severity, :active, cast(:config_json as jsonb), now(), now()
            )
            on conflict (tenant_id, rule_key)
            do update set
              description = excluded.description,
              severity = excluded.severity,
              active = excluded.active,
              config_json = excluded.config_json,
              updated_at = now()
            returning *
            """
        ),
        {**payload, "config_json": _json(payload["config_json"])},
    )
    row = row_to_dict(result.mappings().one()) or {}
    await _audit(session, context, "data_quality_rule_update", "dataQuality.rules.update", "Data quality rule guncellendi.", row)
    return row


async def _score_entity_sample(session: AsyncSession, context: dict[str, Any], entity_type: str, *, limit: int) -> int:
    table_name = ENTITY_TABLES.get(entity_type)
    if not table_name or not await table_exists(session, f"public.{table_name}"):
        return 0
    columns = await table_columns(session, table_name)
    if "tenant_id" not in columns:
        return 0
    active_clause = "and coalesce(is_deleted, false) = false" if "is_deleted" in columns else ""
    order_clause = _entity_order_clause(columns)
    result = await session.execute(
        text(
            f"""
            select *
            from public.{table_name}
            where tenant_id = :tenant_id
              {active_clause}
            order by {order_clause}
            limit :limit
            """
        ),
        {"tenant_id": context["tenant_id"], "limit": limit},
    )
    count = 0
    for row in rows_to_dicts(result.mappings().all()):
        duplicate_risk = await _entity_duplicate_risk(session, str(context["tenant_id"]), entity_type, str(row.get("id")))
        score = calculate_quality_score(entity_type, row, duplicate_risk=duplicate_risk)
        await _upsert_quality_score(session, context, score)
        await _upsert_missing_field_findings(session, context, score)
        count += 1
    return count


async def _load_entity_row(session: AsyncSession, tenant_id: str, table_name: str, entity_id: str) -> dict[str, Any] | None:
    result = await session.execute(
        text(f"select * from public.{table_name} where tenant_id = :tenant_id and id::text = :entity_id limit 1"),
        {"tenant_id": tenant_id, "entity_id": entity_id},
    )
    return row_to_dict(result.mappings().one_or_none())


async def _upsert_quality_score(session: AsyncSession, context: dict[str, Any], score: Any) -> None:
    await session.execute(
        text(
            """
            insert into public.data_quality_scores (
              id, tenant_id, entity_type, entity_id, score, status, missing_fields,
              duplicate_risk, relation_warnings, last_checked_at, created_at, updated_at
            )
            values (
              :id, :tenant_id, :entity_type, :entity_id, :score, :status,
              cast(:missing_fields as jsonb), cast(:duplicate_risk as jsonb),
              cast(:relation_warnings as jsonb), now(), now(), now()
            )
            on conflict (tenant_id, entity_type, entity_id)
            do update set
              score = excluded.score,
              status = excluded.status,
              missing_fields = excluded.missing_fields,
              duplicate_risk = excluded.duplicate_risk,
              relation_warnings = excluded.relation_warnings,
              last_checked_at = now(),
              updated_at = now()
            """
        ),
        {
            "id": str(uuid4()),
            "tenant_id": context["tenant_id"],
            "entity_type": score.entity_type,
            "entity_id": score.entity_id,
            "score": score.score,
            "status": score.status,
            "missing_fields": _json(score.missing_fields),
            "duplicate_risk": _json(score.duplicate_risk),
            "relation_warnings": _json(score.relation_warnings),
        },
    )


async def _upsert_missing_field_findings(session: AsyncSession, context: dict[str, Any], score: Any) -> list[dict[str, Any]]:
    findings: list[dict[str, Any]] = []
    for field in score.missing_fields:
        rule_key = f"{score.entity_type}.missing.{field}"
        message = f"{score.entity_type} kaydinda {field} eksik veya kalite dusuruyor."
        finding = await _upsert_finding(
            session,
            context,
            entity_type=score.entity_type,
            entity_id=score.entity_id,
            rule_key=rule_key,
            severity="critical" if score.status == "critical" else "warning",
            message=message,
            suggested_action={"type": "open_record", "entity_type": score.entity_type, "entity_id": score.entity_id},
        )
        findings.append(finding)
    return findings


async def _upsert_finding(
    session: AsyncSession,
    context: dict[str, Any],
    *,
    entity_type: str,
    entity_id: str,
    rule_key: str,
    severity: str,
    message: str,
    suggested_action: dict[str, Any],
) -> dict[str, Any]:
    result = await session.execute(
        text(
            """
            insert into public.data_quality_findings (
              id, tenant_id, entity_type, entity_id, rule_key, severity, message,
              status, suggested_action, created_at
            )
            values (
              :id, :tenant_id, :entity_type, :entity_id, :rule_key, :severity,
              :message, 'open', cast(:suggested_action as jsonb), now()
            )
            on conflict (tenant_id, entity_type, entity_id, rule_key)
            do update set
              severity = excluded.severity,
              message = excluded.message,
              status = case when public.data_quality_findings.status = 'resolved' then 'open' else public.data_quality_findings.status end,
              suggested_action = excluded.suggested_action
            returning *
            """
        ),
        {
            "id": str(uuid4()),
            "tenant_id": context["tenant_id"],
            "entity_type": entity_type,
            "entity_id": entity_id,
            "rule_key": rule_key,
            "severity": severity,
            "message": message,
            "suggested_action": _json(suggested_action),
        },
    )
    return row_to_dict(result.mappings().one()) or {}


async def _entity_duplicate_risk(session: AsyncSession, tenant_id: str, entity_type: str, entity_id: str) -> dict[str, Any]:
    result = await session.execute(
        text(
            """
            select g.id::text, g.severity, g.match_score, g.match_reason
            from public.duplicate_candidate_groups g
            join public.duplicate_candidate_items i
              on i.tenant_id = g.tenant_id and i.group_id = g.id
            where g.tenant_id = :tenant_id
              and g.entity_type = :entity_type
              and g.status = 'open'
              and i.entity_id = :entity_id
            order by g.match_score desc
            limit 1
            """
        ),
        {"tenant_id": tenant_id, "entity_type": entity_type, "entity_id": entity_id},
    )
    row = row_to_dict(result.mappings().one_or_none())
    return row or {}


async def _duplicate_groups_for_entity(session: AsyncSession, tenant_id: str, entity_type: str, entity_id: str) -> list[dict[str, Any]]:
    result = await session.execute(
        text(
            """
            select g.*
            from public.duplicate_candidate_groups g
            join public.duplicate_candidate_items i
              on i.tenant_id = g.tenant_id and i.group_id = g.id
            where g.tenant_id = :tenant_id
              and g.entity_type = :entity_type
              and i.entity_id = :entity_id
            order by g.created_at desc
            """
        ),
        {"tenant_id": tenant_id, "entity_type": entity_type, "entity_id": entity_id},
    )
    return rows_to_dicts(result.mappings().all())


async def _insert_merge_operation(
    session: AsyncSession,
    context: dict[str, Any],
    operation_id: str,
    request: MergePreviewRequest,
    status_value: str,
    impact_summary: dict[str, Any],
    result_json: dict[str, Any],
) -> dict[str, Any]:
    result = await session.execute(
        text(
            """
            insert into public.merge_operations (
              id, tenant_id, entity_type, source_entity_ids, target_entity_id,
              merge_strategy, status, impact_summary, result_json, created_by,
              confirmed_by, created_at, confirmed_at, completed_at
            )
            values (
              :id, :tenant_id, :entity_type, cast(:source_entity_ids as jsonb),
              :target_entity_id, cast(:merge_strategy as jsonb), :status,
              cast(:impact_summary as jsonb), cast(:result_json as jsonb),
              :created_by, :confirmed_by, now(), now(), now()
            )
            returning *
            """
        ),
        {
            "id": operation_id,
            "tenant_id": context["tenant_id"],
            "entity_type": request.entity_type,
            "source_entity_ids": _json(request.source_entity_ids),
            "target_entity_id": request.target_entity_id,
            "merge_strategy": _json({"field_strategy": request.field_strategy, "reason": request.reason}),
            "status": status_value,
            "impact_summary": _json(impact_summary),
            "result_json": _json(result_json),
            "created_by": context.get("user_id"),
            "confirmed_by": context.get("user_id"),
        },
    )
    return row_to_dict(result.mappings().one()) or {}


async def _insert_merge_relations(session: AsyncSession, context: dict[str, Any], operation_id: str, relation_impact: list[dict[str, Any]]) -> None:
    for item in relation_impact:
        await session.execute(
            text(
                """
                insert into public.merge_operation_relations (
                  id, tenant_id, merge_operation_id, relation_entity_type,
                  relation_entity_id, action, status, notes
                )
                values (
                  :id, :tenant_id, :merge_operation_id, :relation_entity_type,
                  :relation_entity_id, :action, :status, :notes
                )
                """
            ),
            {
                "id": str(uuid4()),
                "tenant_id": context["tenant_id"],
                "merge_operation_id": operation_id,
                "relation_entity_type": item.get("relation_entity_type"),
                "relation_entity_id": item.get("relation_field"),
                "action": item.get("action") or "reassign",
                "status": "completed",
                "notes": item.get("notes"),
            },
        )


async def _audit(session: AsyncSession, context: dict[str, Any], action_type: str, action_key: str, summary: str, payload: dict[str, Any]) -> None:
    await record_audit_required(
        session,
        context,
        action_type=action_type,
        action_key=action_key,
        summary=summary,
        entity_type="data_quality",
        entity_id=str(payload.get("id") or payload.get("merge_operation_id") or payload.get("duplicate_group_key") or ""),
        new_values=payload,
        metadata={"signed_url": None},
    )


async def _outbox(session: AsyncSession, context: dict[str, Any], event_type: str, payload: dict[str, Any]) -> None:
    await enqueue_outbox_event_required(
        session,
        context,
        event_type=event_type,
        aggregate_type="data_quality",
        aggregate_id=str(payload.get("id") or payload.get("duplicate_group_key") or "data_quality"),
        payload=payload,
    )


def _json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=True, default=str)


def _entity_order_clause(columns: set[str]) -> str:
    parts: list[str] = []
    if "updated_at" in columns:
        parts.append("updated_at desc nulls last")
    if "created_at" in columns:
        parts.append("created_at desc nulls last")
    parts.append("id::text desc")
    return ", ".join(parts)
