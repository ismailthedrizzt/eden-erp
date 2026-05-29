# ruff: noqa: E501

from __future__ import annotations

from dataclasses import dataclass
from hashlib import sha1

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.serialization import rows_to_dicts
from app.domains.data_quality.schemas import (
    DuplicateCandidateGroupDraft,
    DuplicateCandidateItemDraft,
)
from app.domains.operations.service import table_exists


@dataclass(frozen=True)
class DuplicatePlan:
    entity_type: str
    table_name: str
    key: str
    fields: tuple[str, ...]
    severity: str
    score: float
    reason: str
    display_fields: tuple[str, ...]


DETECTION_PLANS: tuple[DuplicatePlan, ...] = (
    DuplicatePlan("master_person", "master_persons", "identity", ("nationality", "identity_number"), "exact", 0.99, "Ayni nationality + identity_number.", ("full_name", "email", "phone")),
    DuplicatePlan("master_person", "master_persons", "passport", ("nationality", "passport_no"), "exact", 0.98, "Ayni nationality + passport_no.", ("full_name", "email", "phone")),
    DuplicatePlan("master_person", "master_persons", "name_birth", ("full_name", "birth_date"), "strong", 0.86, "Ayni ad soyad + dogum tarihi.", ("full_name", "email", "phone")),
    DuplicatePlan("master_person", "master_persons", "name_email", ("full_name", "email"), "strong", 0.84, "Ayni ad soyad + e-posta.", ("full_name", "email", "phone")),
    DuplicatePlan("master_person", "master_persons", "name_phone", ("full_name", "phone"), "strong", 0.82, "Ayni ad soyad + telefon.", ("full_name", "email", "phone")),
    DuplicatePlan("master_organization", "master_organizations", "tax", ("country", "tax_number"), "exact", 0.99, "Ayni country + tax_number.", ("trade_name", "short_name", "email", "phone")),
    DuplicatePlan("master_organization", "master_organizations", "mersis", ("mersis_number",), "exact", 0.98, "Ayni MERSIS numarasi.", ("trade_name", "short_name", "email", "phone")),
    DuplicatePlan("master_organization", "master_organizations", "registry", ("country", "registry_number"), "exact", 0.94, "Ayni ulke + sicil numarasi.", ("trade_name", "short_name", "email", "phone")),
    DuplicatePlan("master_organization", "master_organizations", "trade_name", ("trade_name",), "strong", 0.82, "Ayni normalize ticari unvan.", ("trade_name", "short_name", "city")),
    DuplicatePlan("master_organization", "master_organizations", "short_city", ("short_name", "city"), "weak", 0.68, "Ayni kisa unvan + sehir.", ("trade_name", "short_name", "city")),
    DuplicatePlan("stakeholder", "crm_stakeholders", "role", ("company_id", "master_entity_type", "master_entity_id", "stakeholder_type"), "exact", 0.96, "Ayni sirket + master + paydas rolu.", ("display_name", "stakeholder_type", "relationship_status")),
    DuplicatePlan("stakeholder", "crm_stakeholders", "display_type", ("company_id", "display_name", "stakeholder_type"), "strong", 0.78, "Ayni sirket + gorunen ad + paydas tipi.", ("display_name", "stakeholder_type", "relationship_status")),
    DuplicatePlan("cari_account", "accounting_cari_accounts", "account_code", ("company_id", "account_code"), "exact", 0.99, "Ayni sirket icinde cari kod.", ("account_name", "account_code", "tax_number")),
    DuplicatePlan("cari_account", "accounting_cari_accounts", "linked_entity", ("linked_entity_type", "linked_entity_id"), "exact", 0.95, "Ayni linked entity icin cari kart.", ("account_name", "account_code", "tax_number")),
    DuplicatePlan("cari_account", "accounting_cari_accounts", "tax_number", ("company_id", "tax_number"), "strong", 0.82, "Ayni sirket + VKN/TCKN.", ("account_name", "account_code", "tax_number")),
    DuplicatePlan("employee", "hr_employees", "identity", ("company_id", "nationality", "identity_number"), "exact", 0.97, "Ayni sirket + nationality + identity_number.", ("full_name", "employee_no", "email")),
    DuplicatePlan("employee", "hr_employees", "employee_no", ("company_id", "employee_no"), "exact", 0.96, "Ayni sirket + employee_no.", ("full_name", "employee_no", "email")),
    DuplicatePlan("installed_asset", "after_sales_installed_assets", "serial", ("serial_no",), "exact", 0.97, "Ayni seri numarasi.", ("product_name", "customer_name", "serial_no")),
    DuplicatePlan("installed_asset", "after_sales_installed_assets", "product_serial", ("product_id", "serial_no"), "exact", 0.99, "Ayni urun + seri numarasi.", ("product_name", "customer_name", "serial_no")),
    DuplicatePlan("installed_asset", "after_sales_installed_assets", "product_asset_tag", ("product_id", "asset_tag"), "strong", 0.78, "Ayni urun + asset tag.", ("product_name", "customer_name", "asset_tag")),
    DuplicatePlan("document", "documents", "checksum", ("checksum",), "strong", 0.9, "Ayni dosya checksum.", ("title", "file_name", "document_type")),
    DuplicatePlan("document", "documents", "owner_file", ("owner_entity_type", "owner_entity_id", "document_type", "file_name"), "strong", 0.76, "Ayni kayit + belge tipi + dosya adi.", ("title", "file_name", "document_type")),
    DuplicatePlan("document", "documents", "file_size", ("file_name", "file_size"), "weak", 0.62, "Ayni dosya adi + boyut.", ("title", "file_name", "document_type")),
    DuplicatePlan("product", "product_catalog", "product_code", ("product_code",), "exact", 0.98, "Ayni urun kodu.", ("product_name", "product_code", "brand")),
    DuplicatePlan("product", "product_catalog", "brand_model", ("brand", "model"), "weak", 0.64, "Ayni marka + model.", ("product_name", "product_code", "brand")),
)


async def detect_duplicate_candidates(
    session: AsyncSession,
    tenant_id: str,
    *,
    entity_types: list[str] | None = None,
    limit_per_rule: int = 25,
) -> list[DuplicateCandidateGroupDraft]:
    requested = set(entity_types or [])
    groups: list[DuplicateCandidateGroupDraft] = []
    for plan in DETECTION_PLANS:
        if requested and plan.entity_type not in requested:
            continue
        detected = await _detect_for_plan(session, tenant_id, plan, limit_per_rule=limit_per_rule)
        groups.extend(detected)
    return groups


async def table_columns(session: AsyncSession, table_name: str) -> set[str]:
    result = await session.execute(
        text(
            """
            select column_name
            from information_schema.columns
            where table_schema = 'public' and table_name = :table_name
            """
        ),
        {"table_name": table_name},
    )
    return {str(row["column_name"]) for row in result.mappings().all()}


async def _detect_for_plan(
    session: AsyncSession,
    tenant_id: str,
    plan: DuplicatePlan,
    *,
    limit_per_rule: int,
) -> list[DuplicateCandidateGroupDraft]:
    if not await table_exists(session, f"public.{plan.table_name}"):
        return []
    columns = await table_columns(session, plan.table_name)
    if "tenant_id" not in columns or "id" not in columns:
        return []
    if any(field not in columns for field in plan.fields):
        return []
    active_clause = "and coalesce(is_deleted, false) = false" if "is_deleted" in columns else ""
    field_exprs = [f"{field}::text" for field in plan.fields]
    not_empty = " and ".join([f"nullif(trim({field}::text), '') is not null" for field in plan.fields])
    key_expr = " || '|' || ".join([f"coalesce({expr}, '')" for expr in field_exprs])
    group_by = ", ".join(plan.fields)
    sql = f"""
        select {key_expr} as group_value,
               array_agg(id::text order by id::text) as candidate_ids,
               count(*) as candidate_count
        from public.{plan.table_name}
        where tenant_id = :tenant_id
          {active_clause}
          and {not_empty}
        group by {group_by}
        having count(*) > 1
        order by count(*) desc
        limit :limit
    """
    result = await session.execute(text(sql), {"tenant_id": tenant_id, "limit": limit_per_rule})
    rows = rows_to_dicts(result.mappings().all())
    drafts: list[DuplicateCandidateGroupDraft] = []
    for row in rows:
        ids = [str(value) for value in row.get("candidate_ids") or []]
        if len(ids) < 2:
            continue
        items = await _load_items(session, tenant_id, plan, columns, ids)
        if len(items) < 2:
            continue
        group_value = str(row.get("group_value") or "|".join(ids))
        group_key = f"{plan.entity_type}:{plan.key}:{sha1(group_value.encode('utf-8')).hexdigest()[:16]}"
        suggested_master_id = items[0].entity_id
        drafts.append(
            DuplicateCandidateGroupDraft(
                duplicate_group_key=group_key,
                entity_type=plan.entity_type,
                match_score=plan.score,
                match_reason=plan.reason,
                severity=plan.severity,  # type: ignore[arg-type]
                suggested_master_id=suggested_master_id,
                items=[
                    item.model_copy(update={"is_suggested_master": item.entity_id == suggested_master_id})
                    for item in items
                ],
            )
        )
    return drafts


async def _load_items(
    session: AsyncSession,
    tenant_id: str,
    plan: DuplicatePlan,
    columns: set[str],
    ids: list[str],
) -> list[DuplicateCandidateItemDraft]:
    id_params = {f"id_{index}": value for index, value in enumerate(ids)}
    id_clause = ", ".join(f":id_{index}" for index in range(len(ids)))
    display_expr = _display_expression(plan, columns)
    match_json = _json_build_object(plan.fields, columns)
    result = await session.execute(
        text(
            f"""
            select id::text as entity_id,
                   {display_expr} as display_name,
                   {match_json} as match_fields
            from public.{plan.table_name}
            where tenant_id = :tenant_id
              and id::text in ({id_clause})
            order by {_order_expression(columns)}
            """
        ),
        {"tenant_id": tenant_id, **id_params},
    )
    rows = rows_to_dicts(result.mappings().all())
    return [
        DuplicateCandidateItemDraft(
            entity_type=plan.entity_type,
            entity_id=str(row.get("entity_id")),
            display_name=str(row.get("display_name") or row.get("entity_id")),
            match_fields=dict(row.get("match_fields") or {}),
        )
        for row in rows
    ]


def _display_expression(plan: DuplicatePlan, columns: set[str]) -> str:
    candidates = [field for field in plan.display_fields if field in columns]
    if not candidates:
        return "id::text"
    return "coalesce(" + ", ".join([f"nullif({field}::text, '')" for field in candidates]) + ", id::text)"


def _json_build_object(fields: tuple[str, ...], columns: set[str]) -> str:
    parts: list[str] = []
    for field in fields:
        if field in columns:
            parts.append(f"'{field}'")
            parts.append(f"{field}::text")
    if not parts:
        return "'{}'::jsonb"
    return "jsonb_build_object(" + ", ".join(parts) + ")"


def _order_expression(columns: set[str]) -> str:
    parts: list[str] = []
    if "updated_at" in columns:
        parts.append("updated_at desc nulls last")
    if "created_at" in columns:
        parts.append("created_at asc nulls last")
    parts.append("id::text asc")
    return ", ".join(parts)
