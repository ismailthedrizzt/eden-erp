# ruff: noqa: E501

from __future__ import annotations

from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.serialization import row_to_dict, rows_to_dicts
from app.domains.data_quality.duplicate_detection import table_columns
from app.domains.data_quality.schemas import MergePreviewRequest, MergePreviewResponse
from app.domains.operations.service import table_exists

ENTITY_TABLES: dict[str, str] = {
    "master_person": "master_persons",
    "master_organization": "master_organizations",
    "stakeholder": "crm_stakeholders",
    "cari_account": "accounting_cari_accounts",
    "company": "companies",
    "partner": "company_partners",
    "representative": "company_representatives",
    "employee": "hr_employees",
    "installed_asset": "after_sales_installed_assets",
    "document": "documents",
    "product": "product_catalog",
}

MERGE_ALLOWED = {"master_person", "master_organization", "stakeholder", "document"}
MERGE_BLOCKED = {
    "company": "Resmi sirket kayitlari merge edilemez. Link correction veya resmi duzeltme islemi kullanilmalidir.",
    "partner": "Ortaklik haklari ve ownership transaction gecmisi olan kartlar otomatik merge edilemez.",
    "representative": "Temsil yetkisi transaction gecmisi olan kartlar otomatik merge edilemez.",
    "employee": "Aktif istihdam kayitlari merge edilemez; master link duzeltme veya HR cleanup operation gerekir.",
    "cari_transaction": "Onayli muhasebe transaction kayitlari merge edilemez.",
    "accounting_transaction": "Onayli muhasebe transaction kayitlari merge edilemez.",
    "ownership_transaction": "Tamamlanmis ortaklik transaction kayitlari merge edilemez.",
    "authority_transaction": "Temsil yetkisi transaction kayitlari merge edilemez.",
}

RELATION_PLANS: dict[str, tuple[tuple[str, str], ...]] = {
    "master_person": (
        ("crm_stakeholders", "master_entity_id"),
        ("hr_employees", "person_id"),
        ("company_partners", "master_entity_id"),
        ("company_representatives", "master_entity_id"),
        ("documents", "owner_entity_id"),
    ),
    "master_organization": (
        ("crm_stakeholders", "master_entity_id"),
        ("company_partners", "master_entity_id"),
        ("company_representatives", "master_entity_id"),
        ("accounting_cari_accounts", "linked_entity_id"),
        ("documents", "owner_entity_id"),
    ),
    "stakeholder": (
        ("accounting_cari_accounts", "linked_entity_id"),
        ("documents", "owner_entity_id"),
    ),
    "document": (
        ("document_relations", "document_id"),
    ),
}

SYSTEM_FIELDS = {
    "id",
    "tenant_id",
    "created_at",
    "updated_at",
    "created_by",
    "updated_by",
    "version",
    "is_deleted",
}


async def build_merge_preview(
    session: AsyncSession,
    tenant_id: str,
    request: MergePreviewRequest,
) -> MergePreviewResponse:
    entity_type = request.entity_type
    blocked_reason = MERGE_BLOCKED.get(entity_type)
    table_name = ENTITY_TABLES.get(entity_type)
    if not table_name:
        return _blocked_preview(request, f"{entity_type} icin merge adapter tanimli degil.")
    if request.target_entity_id in set(request.source_entity_ids):
        return _blocked_preview(request, "Target kayit source listesinde yer alamaz.")
    if not await table_exists(session, f"public.{table_name}"):
        return _blocked_preview(request, f"{entity_type} tablosu hazir degil.")
    rows = await _load_rows(session, tenant_id, table_name, [request.target_entity_id, *request.source_entity_ids])
    if len(rows) != len(set([request.target_entity_id, *request.source_entity_ids])):
        return _blocked_preview(request, "Merge edilecek kayitlarin tamami tenant scope icinde bulunamadi.")
    target = next((row for row in rows if str(row.get("id")) == request.target_entity_id), None)
    sources = [row for row in rows if str(row.get("id")) in set(request.source_entity_ids)]
    if not target or not sources:
        return _blocked_preview(request, "Target/source secimi gecersiz.")

    field_comparison = _field_comparison(target, sources)
    relation_impact = await _relation_impact(session, tenant_id, entity_type, request.source_entity_ids, request.target_entity_id)
    risks = _risks(entity_type, field_comparison, relation_impact, blocked_reason)
    merge_allowed = entity_type in MERGE_ALLOWED and blocked_reason is None
    return MergePreviewResponse(
        entity_type=entity_type,
        target_entity_id=request.target_entity_id,
        source_entity_ids=request.source_entity_ids,
        safe_to_merge=merge_allowed and not any(risk.startswith("BLOCKING:") for risk in risks),
        merge_allowed=merge_allowed,
        blocked_reason=blocked_reason,
        field_comparison=field_comparison,
        relation_impact=relation_impact,
        risks=risks,
        suggested_strategy={
            "survivorship": "target_wins_fill_empty",
            "field_strategy": request.field_strategy,
            "source_status": "merged_or_archived_when_supported",
            "relations": "controlled_reassign_for_known_safe_links",
        },
    )


async def apply_safe_merge(
    session: AsyncSession,
    tenant_id: str,
    request: MergePreviewRequest,
) -> dict[str, Any]:
    table_name = ENTITY_TABLES[request.entity_type]
    columns = await table_columns(session, table_name)
    relation_updates: list[dict[str, Any]] = []
    for table, column in RELATION_PLANS.get(request.entity_type, ()):
        if not await table_exists(session, f"public.{table}"):
            continue
        relation_columns = await table_columns(session, table)
        if column not in relation_columns or "tenant_id" not in relation_columns:
            continue
        if table in {"documents", "document_relations"} and column == "owner_entity_id":
            # Owner entity rows are not reassigned blindly; relation impact remains visible for manual document review.
            continue
        count = await _update_relation(session, tenant_id, table, column, request.source_entity_ids, request.target_entity_id)
        relation_updates.append({"relation_entity_type": table, "column": column, "action": "reassign", "count": count})

    source_updates = await _mark_sources_merged(session, tenant_id, table_name, columns, request.source_entity_ids, request.target_entity_id)
    return {
        "relation_updates": relation_updates,
        "source_updates": source_updates,
        "message": "Merge islemi kontrollu relation reassign ve source archive adimlariyla tamamlandi.",
    }


async def _load_rows(session: AsyncSession, tenant_id: str, table_name: str, ids: list[str]) -> list[dict[str, Any]]:
    id_params = {f"id_{index}": value for index, value in enumerate(set(ids))}
    id_clause = ", ".join(f":id_{index}" for index in range(len(id_params)))
    result = await session.execute(
        text(f"select * from public.{table_name} where tenant_id = :tenant_id and id::text in ({id_clause})"),
        {"tenant_id": tenant_id, **id_params},
    )
    return rows_to_dicts(result.mappings().all())


async def _relation_impact(
    session: AsyncSession,
    tenant_id: str,
    entity_type: str,
    source_ids: list[str],
    target_id: str,
) -> list[dict[str, Any]]:
    impact: list[dict[str, Any]] = []
    for table, column in RELATION_PLANS.get(entity_type, ()):
        if not await table_exists(session, f"public.{table}"):
            continue
        columns = await table_columns(session, table)
        if column not in columns or "tenant_id" not in columns:
            continue
        id_params = {f"id_{index}": value for index, value in enumerate(source_ids)}
        id_clause = ", ".join(f":id_{index}" for index in range(len(source_ids)))
        result = await session.execute(
            text(f"select count(*) as count from public.{table} where tenant_id = :tenant_id and {column}::text in ({id_clause})"),
            {"tenant_id": tenant_id, **id_params},
        )
        row = row_to_dict(result.mappings().one())
        count = int(row.get("count") or 0) if row else 0
        if count:
            impact.append(
                {
                    "relation_entity_type": table,
                    "relation_field": column,
                    "count": count,
                    "target_entity_id": target_id,
                    "action": "reassign" if table not in {"documents"} else "manual_review",
                    "status": "preview",
                    "notes": "Known safe relation alanlari target kayda tasinir; resmi transactionlar tasinmaz.",
                }
            )
    return impact


async def _update_relation(
    session: AsyncSession,
    tenant_id: str,
    table_name: str,
    column: str,
    source_ids: list[str],
    target_id: str,
) -> int:
    if not source_ids:
        return 0
    id_params = {f"id_{index}": value for index, value in enumerate(source_ids)}
    id_clause = ", ".join(f":id_{index}" for index in range(len(source_ids)))
    result = await session.execute(
        text(
            f"""
            update public.{table_name}
            set {column} = :target_id
            where tenant_id = :tenant_id
              and {column}::text in ({id_clause})
            """
        ),
        {"tenant_id": tenant_id, "target_id": target_id, **id_params},
    )
    return int(getattr(result, "rowcount", 0) or 0)


async def _mark_sources_merged(
    session: AsyncSession,
    tenant_id: str,
    table_name: str,
    columns: set[str],
    source_ids: list[str],
    target_id: str,
) -> dict[str, Any]:
    updates: list[str] = []
    params: dict[str, Any] = {"tenant_id": tenant_id, "target_id": target_id}
    if "record_status" in columns:
        updates.append("record_status = 'merged'")
    elif "status" in columns:
        updates.append("status = 'merged'")
    if "metadata_json" in columns:
        updates.append("metadata_json = coalesce(metadata_json, '{}'::jsonb) || jsonb_build_object('merged_into_id', :target_id)")
    if "updated_at" in columns:
        updates.append("updated_at = now()")
    if "version" in columns:
        updates.append("version = version + 1")
    if not updates:
        return {"updated": 0, "reason": "Source tablo merge status alanini desteklemiyor."}
    id_params = {f"id_{index}": value for index, value in enumerate(source_ids)}
    id_clause = ", ".join(f":id_{index}" for index in range(len(source_ids)))
    result = await session.execute(
        text(
            f"""
            update public.{table_name}
            set {", ".join(updates)}
            where tenant_id = :tenant_id
              and id::text in ({id_clause})
            """
        ),
        {**params, **id_params},
    )
    return {"updated": int(getattr(result, "rowcount", 0) or 0)}


def _field_comparison(target: dict[str, Any], sources: list[dict[str, Any]]) -> list[dict[str, Any]]:
    fields = sorted(set(target.keys()).union(*(set(source.keys()) for source in sources)) - SYSTEM_FIELDS)
    comparison: list[dict[str, Any]] = []
    for field in fields:
        target_value = target.get(field)
        source_values = [source.get(field) for source in sources if source.get(field) not in (None, "")]
        unique_source_values = _unique_values(source_values)
        has_conflict = bool(_present(target_value) and unique_source_values and str(target_value) not in {str(value) for value in unique_source_values})
        winning = target_value if _present(target_value) else (unique_source_values[0] if unique_source_values else None)
        comparison.append(
            {
                "field": field,
                "target_value": target_value,
                "source_values": unique_source_values,
                "winning_value": winning,
                "strategy": "target_wins" if _present(target_value) else "fill_from_source",
                "conflict": has_conflict,
            }
        )
    return comparison


def _risks(
    entity_type: str,
    field_comparison: list[dict[str, Any]],
    relation_impact: list[dict[str, Any]],
    blocked_reason: str | None,
) -> list[str]:
    risks: list[str] = []
    if blocked_reason:
        risks.append(f"BLOCKING: {blocked_reason}")
    conflicts = sum(1 for item in field_comparison if item.get("conflict"))
    if conflicts:
        risks.append(f"{conflicts} alanda cakismanin hedef deger lehine cozulecegi gorunuyor.")
    relation_count = sum(int(item.get("count") or 0) for item in relation_impact)
    if relation_count:
        risks.append(f"{relation_count} iliskili kayit etkilenecek.")
    if entity_type in {"stakeholder", "document"}:
        risks.append("Bu kayit turunde domain owner etkileri manuel inceleme gerektirebilir.")
    return risks


def _blocked_preview(request: MergePreviewRequest, reason: str) -> MergePreviewResponse:
    return MergePreviewResponse(
        entity_type=request.entity_type,
        target_entity_id=request.target_entity_id,
        source_entity_ids=request.source_entity_ids,
        safe_to_merge=False,
        merge_allowed=False,
        blocked_reason=reason,
        risks=[f"BLOCKING: {reason}"],
        suggested_strategy={"action": "link_correction_or_manual_cleanup"},
    )


def _present(value: Any) -> bool:
    return value is not None and (not isinstance(value, str) or bool(value.strip()))


def _unique_values(values: list[Any]) -> list[Any]:
    seen: set[str] = set()
    output: list[Any] = []
    for value in values:
        key = str(value)
        if key in seen:
            continue
        seen.add(key)
        output.append(value)
    return output
