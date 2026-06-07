from __future__ import annotations

# ruff: noqa: E501, I001

import json
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.operations.service import table_exists

LICENSING_TABLE = "public.tenant_licenses"
PRODUCT_TABLE = "public.licensed_products"
PLAN_TABLE = "public.product_license_plans"


async def licensing_tables_ready(session: AsyncSession) -> bool:
    return await table_exists(session, PRODUCT_TABLE) and await table_exists(session, PLAN_TABLE) and await table_exists(session, LICENSING_TABLE)


async def list_products(session: AsyncSession) -> list[dict[str, Any]]:
    if not await table_exists(session, PRODUCT_TABLE):
        return []
    result = await session.execute(
        text(
            """
            select *
            from public.licensed_products
            order by product_name asc
            """
        )
    )
    return [row_to_dict(row) for row in result.mappings()]


async def get_product(session: AsyncSession, product_ref: str) -> dict[str, Any] | None:
    if not await table_exists(session, PRODUCT_TABLE):
        return None
    result = await session.execute(
        text(
            """
            select *
            from public.licensed_products
            where id::text = :product_ref or product_key = :product_ref
            limit 1
            """
        ),
        {"product_ref": product_ref},
    )
    row = result.mappings().one_or_none()
    return row_to_dict(row) if row else None


async def create_product(session: AsyncSession, payload: dict[str, Any], user_id: str | None) -> dict[str, Any]:
    result = await session.execute(
        text(
            """
            insert into public.licensed_products (
              product_key, product_name, description, status, metadata_json, created_by
            )
            values (
              :product_key, :product_name, :description, :status, cast(:metadata_json as jsonb), :created_by
            )
            returning *
            """
        ),
        {**payload, "metadata_json": json_dumps(payload.get("metadata_json")), "created_by": user_id},
    )
    return row_to_dict(result.mappings().one())


async def update_product(session: AsyncSession, product_id: str, payload: dict[str, Any]) -> dict[str, Any] | None:
    if not payload:
        return await get_product(session, product_id)
    set_parts: list[str] = []
    params: dict[str, Any] = {"product_id": product_id}
    for key, value in payload.items():
        if key == "metadata_json":
            set_parts.append("metadata_json = cast(:metadata_json as jsonb)")
            params[key] = json_dumps(value)
        else:
            set_parts.append(f"{key} = :{key}")
            params[key] = value
    set_parts.append("updated_at = now()")
    result = await session.execute(
        text(
            f"""
            update public.licensed_products
            set {", ".join(set_parts)}
            where id::text = :product_id or product_key = :product_id
            returning *
            """
        ),
        params,
    )
    row = result.mappings().one_or_none()
    return row_to_dict(row) if row else None


async def list_plans(session: AsyncSession, product_ref: str | None = None) -> list[dict[str, Any]]:
    if not await table_exists(session, PLAN_TABLE):
        return []
    where = ""
    params: dict[str, Any] = {}
    if product_ref:
        where = "where lp.id::text = :product_ref or lp.product_key = :product_ref"
        params["product_ref"] = product_ref
    result = await session.execute(
        text(
            f"""
            select p.*, lp.product_key, lp.product_name
            from public.product_license_plans p
            join public.licensed_products lp on lp.id = p.product_id
            {where}
            order by p.sort_order asc, p.plan_name asc
            """
        ),
        params,
    )
    return [row_to_dict(row) for row in result.mappings()]


async def get_plan(session: AsyncSession, plan_ref: str) -> dict[str, Any] | None:
    if not await table_exists(session, PLAN_TABLE):
        return None
    result = await session.execute(
        text(
            """
            select p.*, lp.product_key, lp.product_name
            from public.product_license_plans p
            join public.licensed_products lp on lp.id = p.product_id
            where p.id::text = :plan_ref or p.plan_key = :plan_ref
            limit 1
            """
        ),
        {"plan_ref": plan_ref},
    )
    row = result.mappings().one_or_none()
    return row_to_dict(row) if row else None


async def create_plan(session: AsyncSession, product_ref: str, payload: dict[str, Any]) -> dict[str, Any]:
    result = await session.execute(
        text(
            """
            insert into public.product_license_plans (
              product_id, plan_key, plan_name, description, status, business_size_label,
              default_billing_period, base_price, currency, trial_days, support_level,
              visible_in_setup, is_development_plan, sort_order, metadata_json
            )
            select id, :plan_key, :plan_name, :description, :status, :business_size_label,
              :default_billing_period, :base_price, :currency, :trial_days, :support_level,
              :visible_in_setup, :is_development_plan, :sort_order, cast(:metadata_json as jsonb)
            from public.licensed_products
            where id::text = :product_ref or product_key = :product_ref
            returning *
            """
        ),
        {**payload, "product_ref": product_ref, "metadata_json": json_dumps(payload.get("metadata_json"))},
    )
    row = result.mappings().one_or_none()
    return row_to_dict(row) if row else {}


async def update_plan(session: AsyncSession, plan_ref: str, payload: dict[str, Any]) -> dict[str, Any] | None:
    if not payload:
        return await get_plan(session, plan_ref)
    set_parts: list[str] = []
    params: dict[str, Any] = {"plan_ref": plan_ref}
    for key, value in payload.items():
        if key == "metadata_json":
            set_parts.append("metadata_json = cast(:metadata_json as jsonb)")
            params[key] = json_dumps(value)
        else:
            set_parts.append(f"{key} = :{key}")
            params[key] = value
    set_parts.append("updated_at = now()")
    result = await session.execute(
        text(
            f"""
            update public.product_license_plans
            set {", ".join(set_parts)}
            where id::text = :plan_ref or plan_key = :plan_ref
            returning *
            """
        ),
        params,
    )
    row = result.mappings().one_or_none()
    return row_to_dict(row) if row else None


async def list_plan_modules(session: AsyncSession, plan_ref: str) -> list[dict[str, Any]]:
    if not await table_exists(session, "public.plan_modules"):
        return []
    result = await session.execute(
        text(
            """
            select pm.*
            from public.plan_modules pm
            join public.product_license_plans p on p.id = pm.product_plan_id
            where p.id::text = :plan_ref or p.plan_key = :plan_ref
            order by pm.module_key
            """
        ),
        {"plan_ref": plan_ref},
    )
    return [row_to_dict(row) for row in result.mappings()]


async def list_plan_features(session: AsyncSession, plan_ref: str) -> list[dict[str, Any]]:
    if not await table_exists(session, "public.plan_features"):
        return []
    result = await session.execute(
        text(
            """
            select pf.*
            from public.plan_features pf
            join public.product_license_plans p on p.id = pf.product_plan_id
            where p.id::text = :plan_ref or p.plan_key = :plan_ref
            order by pf.feature_key
            """
        ),
        {"plan_ref": plan_ref},
    )
    return [row_to_dict(row) for row in result.mappings()]


async def replace_plan_modules(session: AsyncSession, plan_ref: str, modules: list[dict[str, Any]]) -> list[dict[str, Any]]:
    plan = await get_plan(session, plan_ref)
    if not plan:
        return []
    await session.execute(text("delete from public.plan_modules where product_plan_id = :plan_id"), {"plan_id": plan["id"]})
    for module in modules:
        await session.execute(
            text(
                """
                insert into public.plan_modules (
                  product_plan_id, module_key, enabled, visibility, included_level, limits_json, metadata_json
                )
                values (
                  :plan_id, :module_key, :enabled, :visibility, :included_level,
                  cast(:limits_json as jsonb), cast(:metadata_json as jsonb)
                )
                """
            ),
            {
                "plan_id": plan["id"],
                "module_key": module.get("module_key"),
                "enabled": bool(module.get("enabled", True)),
                "visibility": module.get("visibility") or "visible",
                "included_level": module.get("included_level") or "included",
                "limits_json": json_dumps(module.get("limits_json")),
                "metadata_json": json_dumps(module.get("metadata_json")),
            },
        )
    return await list_plan_modules(session, plan_ref)


async def replace_plan_features(session: AsyncSession, plan_ref: str, features: list[dict[str, Any]]) -> list[dict[str, Any]]:
    plan = await get_plan(session, plan_ref)
    if not plan:
        return []
    await session.execute(text("delete from public.plan_features where product_plan_id = :plan_id"), {"plan_id": plan["id"]})
    for feature in features:
        await session.execute(
            text(
                """
                insert into public.plan_features (
                  product_plan_id, feature_key, enabled, limits_json, metadata_json
                )
                values (
                  :plan_id, :feature_key, :enabled, cast(:limits_json as jsonb), cast(:metadata_json as jsonb)
                )
                """
            ),
            {
                "plan_id": plan["id"],
                "feature_key": feature.get("feature_key"),
                "enabled": bool(feature.get("enabled", True)),
                "limits_json": json_dumps(feature.get("limits_json")),
                "metadata_json": json_dumps(feature.get("metadata_json")),
            },
        )
    return await list_plan_features(session, plan_ref)


async def get_active_tenant_license(session: AsyncSession, tenant_id: str) -> dict[str, Any] | None:
    if not await table_exists(session, LICENSING_TABLE):
        return None
    result = await session.execute(
        text(
            """
            select tl.*, p.plan_key, p.plan_name, lp.product_key, lp.product_name, p.is_development_plan
            from public.tenant_licenses tl
            join public.product_license_plans p on p.id = tl.product_plan_id
            join public.licensed_products lp on lp.id = tl.product_id
            where tl.tenant_id = :tenant_id
              and tl.status in ('trial','active','past_due','development','internal','suspended')
            order by
              case tl.status
                when 'development' then 0
                when 'internal' then 1
                when 'active' then 2
                when 'trial' then 3
                when 'past_due' then 4
                when 'suspended' then 5
                else 99
              end,
              tl.updated_at desc
            limit 1
            """
        ),
        {"tenant_id": tenant_id},
    )
    row = result.mappings().one_or_none()
    return row_to_dict(row) if row else None


async def list_tenant_licenses(session: AsyncSession, tenant_id: str | None = None) -> list[dict[str, Any]]:
    if not await table_exists(session, LICENSING_TABLE):
        return []
    where = "where tl.tenant_id = :tenant_id" if tenant_id else ""
    params = {"tenant_id": tenant_id} if tenant_id else {}
    result = await session.execute(
        text(
            f"""
            select tl.*, p.plan_key, p.plan_name, lp.product_key, lp.product_name
            from public.tenant_licenses tl
            join public.product_license_plans p on p.id = tl.product_plan_id
            join public.licensed_products lp on lp.id = tl.product_id
            {where}
            order by tl.updated_at desc
            limit 500
            """
        ),
        params,
    )
    return [row_to_dict(row) for row in result.mappings()]


async def get_tenant_license(session: AsyncSession, license_id: str) -> dict[str, Any] | None:
    if not await table_exists(session, LICENSING_TABLE):
        return None
    result = await session.execute(
        text(
            """
            select tl.*, p.plan_key, p.plan_name, lp.product_key, lp.product_name
            from public.tenant_licenses tl
            join public.product_license_plans p on p.id = tl.product_plan_id
            join public.licensed_products lp on lp.id = tl.product_id
            where tl.id::text = :license_id or tl.license_key = :license_id
            limit 1
            """
        ),
        {"license_id": license_id},
    )
    row = result.mappings().one_or_none()
    return row_to_dict(row) if row else None


async def create_tenant_license(session: AsyncSession, payload: dict[str, Any], user_id: str | None) -> dict[str, Any]:
    result = await session.execute(
        text(
            """
            with selected_product as (
              select id, product_key from public.licensed_products
              where id::text = coalesce(:product_id, '') or product_key = :product_key
              limit 1
            ),
            selected_plan as (
              select p.id, p.plan_key
              from public.product_license_plans p
              join selected_product sp on sp.id = p.product_id
              where p.id::text = coalesce(:product_plan_id, '') or p.plan_key = :plan_key
              limit 1
            )
            insert into public.tenant_licenses (
              tenant_id, product_id, product_plan_id, license_key, status, starts_at, ends_at,
              renews_at, billing_period, price, currency, payment_status, max_users, max_companies,
              max_branches, max_storage_mb, created_by, updated_by, metadata_json
            )
            select
              :tenant_id, sp.id, spl.id,
              coalesce(:license_key, concat(:tenant_id, ':', sp.product_key, ':', spl.plan_key)),
              :status, cast(:starts_at as timestamptz), cast(:ends_at as timestamptz),
              cast(:renews_at as timestamptz), :billing_period, :price, :currency, :payment_status,
              :max_users, :max_companies, :max_branches, :max_storage_mb, :user_id, :user_id,
              cast(:metadata_json as jsonb)
            from selected_product sp
            join selected_plan spl on true
            returning *
            """
        ),
        {
            **payload,
            "user_id": user_id,
            "metadata_json": json_dumps(payload.get("metadata_json")),
        },
    )
    row = result.mappings().one_or_none()
    return row_to_dict(row) if row else {}


async def update_tenant_license(session: AsyncSession, license_id: str, payload: dict[str, Any], user_id: str | None) -> dict[str, Any] | None:
    if not payload:
        return await get_tenant_license(session, license_id)
    set_parts: list[str] = []
    params: dict[str, Any] = {"license_id": license_id, "user_id": user_id}
    for key, value in payload.items():
        if key in {"starts_at", "ends_at", "renews_at"}:
            set_parts.append(f"{key} = cast(:{key} as timestamptz)")
            params[key] = value
        elif key == "metadata_json":
            set_parts.append("metadata_json = cast(:metadata_json as jsonb)")
            params[key] = json_dumps(value)
        else:
            set_parts.append(f"{key} = :{key}")
            params[key] = value
    set_parts.extend(["updated_by = :user_id", "updated_at = now()"])
    result = await session.execute(
        text(
            f"""
            update public.tenant_licenses
            set {", ".join(set_parts)}
            where id::text = :license_id or license_key = :license_id
            returning *
            """
        ),
        params,
    )
    row = result.mappings().one_or_none()
    return row_to_dict(row) if row else None


async def change_tenant_license_plan(session: AsyncSession, license_id: str, plan_ref: str, user_id: str | None) -> dict[str, Any] | None:
    result = await session.execute(
        text(
            """
            update public.tenant_licenses tl
            set product_plan_id = p.id,
                updated_by = :user_id,
                updated_at = now()
            from public.product_license_plans p
            where (tl.id::text = :license_id or tl.license_key = :license_id)
              and (p.id::text = :plan_ref or p.plan_key = :plan_ref)
              and p.product_id = tl.product_id
            returning tl.*
            """
        ),
        {"license_id": license_id, "plan_ref": plan_ref, "user_id": user_id},
    )
    row = result.mappings().one_or_none()
    return row_to_dict(row) if row else None


async def list_license_payments(session: AsyncSession, license_id: str) -> list[dict[str, Any]]:
    if not await table_exists(session, "public.tenant_license_payments"):
        return []
    result = await session.execute(
        text(
            """
            select p.*
            from public.tenant_license_payments p
            join public.tenant_licenses tl on tl.id = p.tenant_license_id
            where tl.id::text = :license_id or tl.license_key = :license_id
            order by p.created_at desc
            """
        ),
        {"license_id": license_id},
    )
    return [row_to_dict(row) for row in result.mappings()]


async def create_license_payment(session: AsyncSession, license_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    result = await session.execute(
        text(
            """
            insert into public.tenant_license_payments (
              tenant_license_id, tenant_id, period_start, period_end, amount, currency,
              payment_status, paid_at, payment_reference, notes, metadata_json
            )
            select
              tl.id, tl.tenant_id, cast(:period_start as timestamptz), cast(:period_end as timestamptz),
              :amount, :currency, :payment_status, cast(:paid_at as timestamptz),
              :payment_reference, :notes, cast(:metadata_json as jsonb)
            from public.tenant_licenses tl
            where tl.id::text = :license_id or tl.license_key = :license_id
            returning *
            """
        ),
        {**payload, "license_id": license_id, "metadata_json": json_dumps(payload.get("metadata_json"))},
    )
    row = result.mappings().one_or_none()
    return row_to_dict(row) if row else {}


async def list_usage_snapshots(session: AsyncSession, license_id: str) -> list[dict[str, Any]]:
    if not await table_exists(session, "public.tenant_usage_snapshots"):
        return []
    result = await session.execute(
        text(
            """
            select u.*
            from public.tenant_usage_snapshots u
            join public.tenant_licenses tl on tl.id = u.tenant_license_id
            where tl.id::text = :license_id or tl.license_key = :license_id
            order by u.snapshot_at desc
            limit 100
            """
        ),
        {"license_id": license_id},
    )
    return [row_to_dict(row) for row in result.mappings()]


async def create_usage_snapshot(session: AsyncSession, license_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    result = await session.execute(
        text(
            """
            insert into public.tenant_usage_snapshots (
              tenant_id, tenant_license_id, active_users, companies_count,
              branches_count, storage_used_mb, metadata_json
            )
            select
              tl.tenant_id, tl.id, :active_users, :companies_count,
              :branches_count, :storage_used_mb, cast(:metadata_json as jsonb)
            from public.tenant_licenses tl
            where tl.id::text = :license_id or tl.license_key = :license_id
            returning *
            """
        ),
        {**payload, "license_id": license_id, "metadata_json": json_dumps(payload.get("metadata_json"))},
    )
    row = result.mappings().one_or_none()
    return row_to_dict(row) if row else {}


def json_dumps(value: Any) -> str:
    return json.dumps(value or {}, ensure_ascii=False, default=str)


def row_to_dict(row: Any) -> dict[str, Any]:
    data = dict(row or {})
    return {key: normalize_value(value) for key, value in data.items()}


def normalize_value(value: Any) -> Any:
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if value is None or isinstance(value, (str, int, float, bool, list, dict)):
        return value
    return str(value)
