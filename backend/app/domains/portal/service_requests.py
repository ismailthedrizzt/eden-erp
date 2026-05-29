# ruff: noqa: E501,I001

from __future__ import annotations

from typing import Any

from fastapi import status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.domains.after_sales.service import ASSET_TABLE, RECORD_TABLE, REQUEST_TABLE, ensure_after_sales_tables, json_list_dumps
from app.domains.after_sales.service_requests import next_request_no
from app.domains.portal.access import (
    PortalAccessContext,
    allowed_asset_ids,
    allowed_service_request_ids,
    can_create_service_request,
    can_view_service_records,
    customer_scope_values,
    ensure_scope_allowed,
)
from app.domains.portal.products import load_scoped_asset
from app.domains.portal.schemas import PortalAttachmentRequest, PortalCommentRequest, PortalServiceRequestCreateRequest
from app.domains.portal.service import json_dumps, list_meta, public_request_payload, public_service_record_payload, record_portal_activity, row_to_dict


def _request_filters(ctx: PortalAccessContext, alias: str = "r") -> tuple[list[str], dict[str, Any]]:
    allowed = allowed_service_request_ids(ctx)
    customer_values = customer_scope_values(ctx)
    filters = [f"{alias}.tenant_id = :tenant_id", f"coalesce({alias}.is_deleted, false) = false"]
    params: dict[str, Any] = {"tenant_id": ctx.tenant_id}
    if allowed:
        filters.append(f"{alias}.id::text = any(:allowed_service_request_ids)")
        params["allowed_service_request_ids"] = allowed
    else:
        filters.append(f"({alias}.customer_account_id::text = any(:customer_values) or exists (select 1 from {ASSET_TABLE} a where a.tenant_id = {alias}.tenant_id and a.id = {alias}.installed_asset_id and (a.customer_account_id::text = any(:customer_values) or a.customer_company_id::text = any(:customer_values))))")
        params["customer_values"] = customer_values or ["__none__"]
    return filters, params


async def list_portal_service_requests(session: AsyncSession, ctx: PortalAccessContext, *, status_value: str | None = None, page: int = 1, page_size: int = 50) -> dict[str, Any]:
    await ensure_after_sales_tables(session, requests=True, assets=True)
    filters, params = _request_filters(ctx)
    params.update({"limit": page_size, "offset": (page - 1) * page_size})
    if status_value:
        filters.append("r.status = :status")
        params["status"] = status_value
    result = await session.execute(
        text(
            f"""
            select r.*, a.product_name as asset_product_name, a.serial_no as asset_serial_no, count(*) over() as total_count
            from {REQUEST_TABLE} r
            left join {ASSET_TABLE} a on a.tenant_id = r.tenant_id and a.id = r.installed_asset_id
            where {" and ".join(filters)}
            order by r.updated_at desc, r.id desc
            limit :limit offset :offset
            """
        ),
        params,
    )
    rows = [public_request_payload(row_to_dict(row)) for row in result.mappings()]
    total = int(rows[0].pop("total_count")) if rows else 0
    for row in rows[1:]:
        row.pop("total_count", None)
    return {"data": rows, "meta": list_meta(page, page_size, total)}


async def get_portal_service_request(session: AsyncSession, ctx: PortalAccessContext, request_id: str) -> dict[str, Any]:
    request_row = await load_scoped_request(session, ctx, request_id)
    records = await session.execute(
        text(
            f"""
            select service_no, service_type, service_date, status, result, work_performed, warranty_covered, service_report_file
            from {RECORD_TABLE}
            where tenant_id = :tenant_id and service_request_id = :request_id and coalesce(is_deleted, false) = false
            order by service_date desc, created_at desc
            """
        ),
        {"tenant_id": ctx.tenant_id, "request_id": request_id},
    )
    payload = public_request_payload(request_row)
    payload["service_records"] = [public_service_record_payload(row_to_dict(row)) for row in records.mappings()] if can_view_service_records(ctx) else []
    await record_portal_activity(session, ctx, action_type="portal_view_service_request", entity_type="service_request", entity_id=request_id)
    return payload


async def create_portal_service_request(session: AsyncSession, ctx: PortalAccessContext, request: PortalServiceRequestCreateRequest) -> dict[str, Any]:
    if not can_create_service_request(ctx):
        raise DomainError("Portal rolunuz servis talebi olusturmaya izin vermiyor.", "PORTAL_SERVICE_CREATE_DENIED", status.HTTP_403_FORBIDDEN)
    await ensure_after_sales_tables(session, requests=True, assets=True)
    asset = await load_scoped_asset(session, ctx, request.installed_asset_id) if request.installed_asset_id else {}
    stakeholder = ctx.stakeholder
    company_id = str(asset.get("owning_company_id") or stakeholder.get("company_id") or "")
    if not company_id:
        raise DomainError("Servis talebi icin sirket baglami bulunamadi.", "PORTAL_COMPANY_CONTEXT_MISSING", status.HTTP_409_CONFLICT)
    request_no = await next_request_no(session, ctx.tenant_id)
    document_files = request.attachments
    result = await session.execute(
        text(
            f"""
            insert into {REQUEST_TABLE} (
              tenant_id, company_id, customer_account_id, customer_name, installed_asset_id, product_id,
              request_no, request_type, priority, status, subject, description, requested_date,
              contact_person, contact_phone, contact_email, location, customer_availability,
              source, document_files, metadata_json, created_by, updated_by
            )
            values (
              :tenant_id, :company_id, :customer_account_id, :customer_name, :installed_asset_id, :product_id,
              :request_no, :request_type, :priority, 'new', :subject, :description, :requested_date,
              :contact_person, :contact_phone, :contact_email, :location, :customer_availability,
              'customer_portal', cast(:document_files as jsonb), cast(:metadata_json as jsonb), :portal_user_id, :portal_user_id
            )
            returning *
            """
        ),
        {
            "tenant_id": ctx.tenant_id,
            "company_id": company_id,
            "customer_account_id": ctx.customer_account_id,
            "customer_name": str(asset.get("customer_name") or stakeholder.get("display_name") or "Portal Musterisi"),
            "installed_asset_id": request.installed_asset_id,
            "product_id": asset.get("product_id"),
            "request_no": request_no,
            "request_type": request.request_type,
            "priority": request.priority,
            "subject": request.subject,
            "description": request.description,
            "requested_date": request.requested_date,
            "contact_person": request.contact_person,
            "contact_phone": request.contact_phone,
            "contact_email": request.contact_email,
            "location": asset.get("address"),
            "customer_availability": request.customer_availability,
            "document_files": json_list_dumps(document_files),
            "metadata_json": json_dumps({"source": "customer_portal", "portal_user_id": ctx.portal_user_id}),
            "portal_user_id": ctx.portal_user_id,
        },
    )
    created = public_request_payload(row_to_dict(result.mappings().one()))
    await record_portal_activity(session, ctx, action_type="portal_create_service_request", entity_type="service_request", entity_id=str(created["id"]))
    return created


async def append_portal_comment(session: AsyncSession, ctx: PortalAccessContext, request_id: str, request: PortalCommentRequest) -> dict[str, Any]:
    current = await load_scoped_request(session, ctx, request_id)
    comments = list((current.get("metadata_json") or {}).get("portal_comments") or [])
    comments.append({"portal_user_id": ctx.portal_user_id, "comment": request.comment, "attachments": request.attachments})
    metadata = {**(current.get("metadata_json") or {}), "portal_comments": comments}
    result = await session.execute(
        text(
            f"""
            update {REQUEST_TABLE}
            set metadata_json = cast(:metadata_json as jsonb),
                document_files = coalesce(document_files, '[]'::jsonb) || cast(:attachments as jsonb),
                updated_at = now(),
                version = version + 1
            where tenant_id = :tenant_id and id = :request_id
            returning *
            """
        ),
        {"tenant_id": ctx.tenant_id, "request_id": request_id, "metadata_json": json_dumps(metadata), "attachments": json_list_dumps(request.attachments)},
    )
    await record_portal_activity(session, ctx, action_type="portal_add_service_request_comment", entity_type="service_request", entity_id=request_id)
    return public_request_payload(row_to_dict(result.mappings().one()))


async def append_portal_attachments(session: AsyncSession, ctx: PortalAccessContext, request_id: str, request: PortalAttachmentRequest) -> dict[str, Any]:
    await load_scoped_request(session, ctx, request_id)
    result = await session.execute(
        text(
            f"""
            update {REQUEST_TABLE}
            set document_files = coalesce(document_files, '[]'::jsonb) || cast(:attachments as jsonb),
                updated_at = now(),
                version = version + 1
            where tenant_id = :tenant_id and id = :request_id
            returning *
            """
        ),
        {"tenant_id": ctx.tenant_id, "request_id": request_id, "attachments": json_list_dumps(request.attachments)},
    )
    await record_portal_activity(session, ctx, action_type="portal_upload_service_attachment", entity_type="service_request", entity_id=request_id)
    return public_request_payload(row_to_dict(result.mappings().one()))


async def load_scoped_request(session: AsyncSession, ctx: PortalAccessContext, request_id: str) -> dict[str, Any]:
    await ensure_after_sales_tables(session, requests=True, assets=True)
    filters, params = _request_filters(ctx)
    filters.append("r.id = :request_id")
    params["request_id"] = request_id
    result = await session.execute(text(f"select r.* from {REQUEST_TABLE} r where {' and '.join(filters)} limit 1"), params)
    row = row_to_dict(result.mappings().one_or_none())
    ensure_scope_allowed(bool(row), entity_type="service_request", entity_id=request_id)
    return row


async def list_portal_service_records(session: AsyncSession, ctx: PortalAccessContext, *, page: int = 1, page_size: int = 50) -> dict[str, Any]:
    ensure_scope_allowed(can_view_service_records(ctx), entity_type="service_record")
    await ensure_after_sales_tables(session, records=True, requests=True, assets=True)
    customer_values = customer_scope_values(ctx)
    filters = [
        "sr.tenant_id = :tenant_id",
        "coalesce(sr.is_deleted, false) = false",
        """(
                req.customer_account_id::text = any(:customer_values)
                or a.customer_account_id::text = any(:customer_values)
                or a.customer_company_id::text = any(:customer_values)
              )""",
    ]
    params: dict[str, Any] = {"tenant_id": ctx.tenant_id, "customer_values": customer_values or ["__none__"], "limit": page_size, "offset": (page - 1) * page_size}
    asset_ids = allowed_asset_ids(ctx)
    request_ids = allowed_service_request_ids(ctx)
    if asset_ids:
        filters.append("(sr.installed_asset_id::text = any(:allowed_asset_ids) or a.id::text = any(:allowed_asset_ids))")
        params["allowed_asset_ids"] = asset_ids
    if request_ids:
        filters.append("(sr.service_request_id::text = any(:allowed_service_request_ids) or req.id::text = any(:allowed_service_request_ids))")
        params["allowed_service_request_ids"] = request_ids
    result = await session.execute(
        text(
            f"""
            select sr.*, count(*) over() as total_count
            from {RECORD_TABLE} sr
            left join {REQUEST_TABLE} req on req.tenant_id = sr.tenant_id and req.id = sr.service_request_id
            left join {ASSET_TABLE} a on a.tenant_id = sr.tenant_id and a.id = sr.installed_asset_id
            where {" and ".join(filters)}
            order by sr.service_date desc, sr.created_at desc
            limit :limit offset :offset
            """
        ),
        params,
    )
    rows = [public_service_record_payload(row_to_dict(row)) for row in result.mappings()]
    total = int(rows[0].pop("total_count")) if rows else 0
    for row in rows[1:]:
        row.pop("total_count", None)
    return {"data": rows, "meta": list_meta(page, page_size, total)}


async def get_portal_service_record(session: AsyncSession, ctx: PortalAccessContext, service_id: str) -> dict[str, Any]:
    ensure_scope_allowed(can_view_service_records(ctx), entity_type="service_record", entity_id=service_id)
    customer_values = customer_scope_values(ctx)
    filters = [
        "sr.tenant_id = :tenant_id",
        "sr.id = :service_id",
        "coalesce(sr.is_deleted, false) = false",
        """(
                req.customer_account_id::text = any(:customer_values)
                or a.customer_account_id::text = any(:customer_values)
                or a.customer_company_id::text = any(:customer_values)
              )""",
    ]
    params: dict[str, Any] = {"tenant_id": ctx.tenant_id, "service_id": service_id, "customer_values": customer_values or ["__none__"]}
    asset_ids = allowed_asset_ids(ctx)
    request_ids = allowed_service_request_ids(ctx)
    if asset_ids:
        filters.append("(sr.installed_asset_id::text = any(:allowed_asset_ids) or a.id::text = any(:allowed_asset_ids))")
        params["allowed_asset_ids"] = asset_ids
    if request_ids:
        filters.append("(sr.service_request_id::text = any(:allowed_service_request_ids) or req.id::text = any(:allowed_service_request_ids))")
        params["allowed_service_request_ids"] = request_ids
    result = await session.execute(
        text(
            f"""
            select sr.*
            from {RECORD_TABLE} sr
            left join {REQUEST_TABLE} req on req.tenant_id = sr.tenant_id and req.id = sr.service_request_id
            left join {ASSET_TABLE} a on a.tenant_id = sr.tenant_id and a.id = sr.installed_asset_id
            where {" and ".join(filters)}
            limit 1
            """
        ),
        params,
    )
    row = row_to_dict(result.mappings().one_or_none())
    ensure_scope_allowed(bool(row), entity_type="service_record", entity_id=service_id)
    await record_portal_activity(session, ctx, action_type="portal_view_service_record", entity_type="service_record", entity_id=service_id)
    return public_service_record_payload(row)
