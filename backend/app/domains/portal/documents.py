# ruff: noqa: E501,I001

from __future__ import annotations

from uuid import uuid4

from fastapi import status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.domains.operations.service import table_exists
from app.domains.portal.access import PortalAccessContext, can_download_documents, can_upload_documents, ensure_scope_allowed
from app.domains.portal.schemas import PortalDocumentUploadRequest
from app.domains.portal.service import PORTAL_SHARED_DOCUMENTS_TABLE, json_dumps, list_meta, record_portal_activity, row_to_dict


async def list_portal_documents(session: AsyncSession, ctx: PortalAccessContext, *, page: int = 1, page_size: int = 50) -> dict[str, object]:
    if not await table_exists(session, "public.documents") or not await table_exists(session, PORTAL_SHARED_DOCUMENTS_TABLE):
        return {"data": [], "meta": list_meta(page, page_size, 0)}
    result = await session.execute(
        text(
            """
            select d.id, d.title, d.document_type, d.document_category, d.file_name, d.mime_type,
                   d.file_size, d.status, d.issue_date, d.expiry_date, d.created_at,
                   count(*) over() as total_count
            from public.portal_shared_documents psd
            join public.documents d on d.tenant_id = psd.tenant_id and d.id = psd.document_id
            where psd.tenant_id = :tenant_id
              and psd.stakeholder_id = :stakeholder_id
              and psd.shared_with_portal = true
              and (psd.expires_at is null or psd.expires_at > now())
              and coalesce(d.is_deleted, false) = false
            order by d.created_at desc
            limit :limit offset :offset
            """
        ),
        {"tenant_id": ctx.tenant_id, "stakeholder_id": ctx.stakeholder_id, "limit": page_size, "offset": (page - 1) * page_size},
    )
    rows = [row_to_dict(row) for row in result.mappings()]
    total = int(rows[0].pop("total_count")) if rows else 0
    for row in rows[1:]:
        row.pop("total_count", None)
    return {"data": rows, "meta": list_meta(page, page_size, total)}


async def portal_document_download_url(session: AsyncSession, ctx: PortalAccessContext, document_id: str) -> dict[str, object]:
    ensure_scope_allowed(can_download_documents(ctx), entity_type="document", entity_id=document_id)
    row = await load_shared_document(session, ctx, document_id)
    await record_portal_activity(session, ctx, action_type="portal_download_document", entity_type="document", entity_id=document_id)
    return {
        "document_id": document_id,
        "file_name": row.get("file_name"),
        "download_url": None,
        "message": "Signed URL belge servisi tarafinda scope kontrolu ile uretilecektir.",
        "storage_bucket": row.get("storage_bucket"),
    }


async def upload_portal_document(session: AsyncSession, ctx: PortalAccessContext, request: PortalDocumentUploadRequest) -> dict[str, object]:
    ensure_scope_allowed(can_upload_documents(ctx), entity_type="document")
    if not await table_exists(session, "public.documents"):
        raise DomainError("Document altyapisi hazir degil.", "DOCUMENT_TABLES_MISSING", status.HTTP_409_CONFLICT)
    document_id = str(uuid4())
    owner_entity_id = request.owner_entity_id or ctx.stakeholder_id
    storage_path = request.storage_path or f"portal/{ctx.tenant_id}/{ctx.stakeholder_id}/{document_id}/{request.file_name}"
    result = await session.execute(
        text(
            """
            insert into public.documents (
              id, tenant_id, company_id, owner_entity_type, owner_entity_id, document_type,
              document_category, title, file_name, mime_type, file_size, storage_bucket,
              storage_path, storage_provider, uploaded_by, metadata_json
            )
            values (
              :id, :tenant_id, :company_id, :owner_entity_type, :owner_entity_id, :document_type,
              'portal_upload', :title, :file_name, :mime_type, :file_size, :storage_bucket,
              :storage_path, 'supabase', :uploaded_by, cast(:metadata_json as jsonb)
            )
            returning id, title, document_type, file_name, mime_type, file_size, status, created_at
            """
        ),
        {
            "id": document_id,
            "tenant_id": ctx.tenant_id,
            "company_id": ctx.stakeholder.get("company_id"),
            "owner_entity_type": request.owner_entity_type,
            "owner_entity_id": owner_entity_id,
            "document_type": request.document_type,
            "title": request.title,
            "file_name": request.file_name,
            "mime_type": request.mime_type,
            "file_size": request.file_size,
            "storage_bucket": request.storage_bucket,
            "storage_path": storage_path,
            "uploaded_by": ctx.portal_user_id,
            "metadata_json": json_dumps({**request.metadata_json, "source": "customer_portal"}),
        },
    )
    doc = row_to_dict(result.mappings().one())
    if await table_exists(session, PORTAL_SHARED_DOCUMENTS_TABLE):
        await session.execute(
            text(
                """
                insert into public.portal_shared_documents (
                  tenant_id, document_id, stakeholder_id, shared_with_portal, shared_by, shared_at
                )
                values (:tenant_id, :document_id, :stakeholder_id, true, :portal_user_id, now())
                """
            ),
            {"tenant_id": ctx.tenant_id, "document_id": document_id, "stakeholder_id": ctx.stakeholder_id, "portal_user_id": ctx.portal_user_id},
        )
    await record_portal_activity(session, ctx, action_type="portal_upload_document", entity_type="document", entity_id=document_id)
    return doc


async def load_shared_document(session: AsyncSession, ctx: PortalAccessContext, document_id: str) -> dict[str, object]:
    if not await table_exists(session, "public.documents") or not await table_exists(session, PORTAL_SHARED_DOCUMENTS_TABLE):
        raise DomainError("Belge paylasim altyapisi hazir degil.", "PORTAL_DOCUMENTS_MISSING", status.HTTP_409_CONFLICT)
    result = await session.execute(
        text(
            """
            select d.*
            from public.portal_shared_documents psd
            join public.documents d on d.tenant_id = psd.tenant_id and d.id = psd.document_id
            where psd.tenant_id = :tenant_id
              and psd.document_id = :document_id
              and psd.stakeholder_id = :stakeholder_id
              and psd.shared_with_portal = true
              and (psd.expires_at is null or psd.expires_at > now())
              and coalesce(d.is_deleted, false) = false
            limit 1
            """
        ),
        {"tenant_id": ctx.tenant_id, "document_id": document_id, "stakeholder_id": ctx.stakeholder_id},
    )
    row = row_to_dict(result.mappings().one_or_none())
    ensure_scope_allowed(bool(row), entity_type="document", entity_id=document_id)
    return row
