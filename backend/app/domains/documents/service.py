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
from app.domains.audit.service import record_audit_best_effort
from app.domains.documents.access import assert_company_scope, assert_document_access
from app.domains.documents.events import (
    DOCUMENT_DELETED,
    DOCUMENT_DOWNLOADED,
    DOCUMENT_NEW_VERSION,
    DOCUMENT_PREVIEWED,
    DOCUMENT_REJECTED,
    DOCUMENT_UPLOADED,
    DOCUMENT_VERIFIED,
)
from app.domains.documents.preview import preview_kind
from app.domains.documents.requirements import list_default_requirements
from app.domains.documents.schemas import (
    DocumentCreateRequest,
    DocumentListQuery,
    DocumentRejectRequest,
    DocumentUpdateRequest,
    DocumentUploadRequest,
)
from app.domains.documents.storage import (
    SIGNED_URL_EXPIRES_IN,
    create_signed_url,
    mask_storage_path,
    prepare_storage_file,
    sanitize_file_name,
)
from app.domains.documents.versions import next_version_no
from app.domains.operations.service import table_exists
from app.domains.outbox.service import enqueue_outbox_event_best_effort


def service_context(context: Any, tenant_id: str) -> dict[str, Any]:
    return {
        "tenant_id": tenant_id,
        "user_id": getattr(context, "user_id", None),
        "permissions": getattr(context, "permissions", []),
        "company_scope_ids": getattr(context, "company_scope_ids", None),
        "writable_company_scope_ids": getattr(context, "writable_company_scope_ids", None),
        "branch_scope_ids": getattr(context, "branch_scope_ids", None),
        "is_internal": getattr(context, "is_internal", False),
        "module_key": "documents",
    }


async def ensure_document_tables(session: AsyncSession, *, requirements: bool = False, access_logs: bool = False) -> None:
    required = ["public.documents", "public.document_relations"]
    if requirements:
        required.append("public.document_requirements")
    if access_logs:
        required.append("public.document_access_logs")
    missing = [table for table in required if not await table_exists(session, table)]
    if missing:
        raise DomainError("Document altyapisi hazir degil. Migration uygulanmalidir.", "DOCUMENT_TABLES_MISSING", status.HTTP_409_CONFLICT, {"missing": missing})


async def list_documents(session: AsyncSession, context: dict[str, Any], query: DocumentListQuery) -> dict[str, Any]:
    await ensure_document_tables(session)
    where = ["d.tenant_id = :tenant_id", "coalesce(d.is_deleted, false) = false"]
    params: dict[str, Any] = {"tenant_id": context["tenant_id"], "limit": query.page_size, "offset": (query.page - 1) * query.page_size}
    if query.document_type:
        where.append("d.document_type = :document_type")
        params["document_type"] = query.document_type
    if query.document_category:
        where.append("d.document_category = :document_category")
        params["document_category"] = query.document_category
    if query.status:
        where.append("d.status = :status")
        params["status"] = query.status
    if query.verification_status:
        where.append("d.verification_status = :verification_status")
        params["verification_status"] = query.verification_status
    if query.required is not None:
        where.append("d.required = :required")
        params["required"] = query.required
    if query.company_id:
        assert_company_scope(context, query.company_id)
        where.append("d.company_id = :company_id")
        params["company_id"] = query.company_id
    elif context.get("company_scope_ids") is not None:
        scope = [str(item) for item in context.get("company_scope_ids") or []]
        where.append("(d.company_id is null or d.company_id::text = any(:company_scope))")
        params["company_scope"] = scope
    if query.owner_entity_type:
        where.append("d.owner_entity_type = :owner_entity_type")
        params["owner_entity_type"] = query.owner_entity_type
    if query.owner_entity_id:
        where.append("d.owner_entity_id = :owner_entity_id")
        params["owner_entity_id"] = query.owner_entity_id
    if query.uploaded_by:
        where.append("d.uploaded_by = :uploaded_by")
        params["uploaded_by"] = query.uploaded_by
    if query.search:
        where.append("(d.title ilike :search or d.file_name ilike :search or d.document_type ilike :search)")
        params["search"] = f"%{query.search}%"
    order_column = {
        "created_at": "d.created_at",
        "updated_at": "d.updated_at",
        "title": "d.title",
        "document_type": "d.document_type",
        "status": "d.status",
        "expiry_date": "d.expiry_date",
        "file_size": "d.file_size",
    }.get(query.sort, "d.created_at")
    direction = "asc" if query.direction == "asc" else "desc"
    where_clause = " and ".join(where)
    count_result = await session.execute(text(f"select count(*) from public.documents d where {where_clause}"), params)
    row_result = await session.execute(
        text(
            f"""
            select d.*, count(r.id) as relation_count
            from public.documents d
            left join public.document_relations r on r.tenant_id = d.tenant_id and r.document_id = d.id
            where {where_clause}
            group by d.id
            order by {order_column} {direction}
            limit :limit offset :offset
            """
        ),
        params,
    )
    return {"data": [_document_payload(row) for row in rows_to_dicts(list(row_result.mappings().all()))], "meta": {"page": query.page, "pageSize": query.page_size, "total": int(count_result.scalar_one() or 0)}}


async def create_document(session: AsyncSession, context: dict[str, Any], request: DocumentCreateRequest) -> dict[str, Any]:
    await ensure_document_tables(session)
    assert_company_scope(context, request.company_id, writable=True)
    document_id = str(uuid4())
    file_name = sanitize_file_name(request.file_name)
    extension = file_name.rsplit(".", 1)[1].lower() if "." in file_name else None
    payload = request.model_dump(mode="json")
    payload.update({"id": document_id, "file_name": file_name, "file_extension": extension, "uploaded_by": context.get("user_id"), "storage_path": request.storage_path or "", "storage_bucket": request.storage_bucket or "eden-documents"})
    row = await _insert_document(session, context, payload)
    await _insert_relation(session, context, document_id, request.owner_entity_type, request.owner_entity_id, request.relation_type)
    await _log_access(session, context, document_id, "upload")
    await _audit(session, context, "document_upload", "document.upload", "Belge metadata olusturuldu.", row)
    await _outbox(session, context, DOCUMENT_UPLOADED, row)
    return row


async def upload_document(session: AsyncSession, context: dict[str, Any], request: DocumentUploadRequest) -> dict[str, Any]:
    await ensure_document_tables(session)
    assert_company_scope(context, request.company_id, writable=True)
    document_id = str(uuid4())
    prepared = await prepare_storage_file(
        context,
        document_id=document_id,
        owner_entity_type=request.owner_entity_type,
        owner_entity_id=request.owner_entity_id,
        company_id=request.company_id,
        file_name=request.file_name,
        mime_type=request.mime_type,
        file_size=request.file_size,
        content_base64=request.content_base64,
        storage_bucket=request.storage_bucket,
        storage_path=request.storage_path,
        storage_provider=request.storage_provider,
    )
    payload = request.model_dump(mode="json", exclude={"content_base64"})
    payload.update(
        {
            "id": document_id,
            "title": request.title or prepared.file_name,
            "file_name": prepared.file_name,
            "file_extension": prepared.file_extension,
            "mime_type": prepared.mime_type,
            "file_size": prepared.file_size,
            "storage_bucket": prepared.storage_bucket,
            "storage_path": prepared.storage_path,
            "storage_provider": prepared.storage_provider,
            "checksum": prepared.checksum,
            "verification_status": "pending" if request.verification_required else "not_required",
            "uploaded_by": context.get("user_id"),
            "metadata_json": {**request.metadata_json, **prepared.metadata, "preview_kind": preview_kind(prepared.mime_type, prepared.file_name)},
        }
    )
    row = await _insert_document(session, context, payload)
    await _insert_relation(session, context, document_id, request.owner_entity_type, request.owner_entity_id, request.relation_type)
    await _log_access(session, context, document_id, "upload")
    await _audit(session, context, "document_upload", "document.upload", "Belge yuklendi.", row)
    await _outbox(session, context, DOCUMENT_UPLOADED, row)
    return row


async def upload_document_for_entity(session: AsyncSession, context: dict[str, Any], entity_type: str, entity_id: str, request: DocumentUploadRequest) -> dict[str, Any]:
    data = request.model_copy(update={"owner_entity_type": entity_type, "owner_entity_id": entity_id})
    return await upload_document(session, context, data)


async def get_document(session: AsyncSession, context: dict[str, Any], document_id: str) -> dict[str, Any]:
    await ensure_document_tables(session)
    row = await _load_document(session, context, document_id)
    assert_document_access(context, row)
    return _document_payload(row)


async def update_document(session: AsyncSession, context: dict[str, Any], document_id: str, request: DocumentUpdateRequest) -> dict[str, Any]:
    await ensure_document_tables(session)
    current = await _load_document(session, context, document_id)
    assert_document_access(context, current, writable=True)
    patch = {key: value for key, value in request.model_dump(mode="json", exclude_unset=True).items() if value is not None}
    if not patch:
        return _document_payload(current)
    assignments = [f"{key} = :{key}" if key != "metadata_json" else "metadata_json = coalesce(metadata_json, '{}'::jsonb) || cast(:metadata_json as jsonb)" for key in patch]
    if "tags" in patch:
        assignments[assignments.index("tags = :tags")] = "tags = :tags"
    params = {"tenant_id": context["tenant_id"], "document_id": document_id, **patch}
    if "metadata_json" in params:
        params["metadata_json"] = _json(params["metadata_json"])
    result = await session.execute(
        text(
            f"""
            update public.documents
            set {", ".join(assignments)}, updated_at = now(), version = version + 1
            where tenant_id = :tenant_id and id = :document_id
            returning *
            """
        ),
        params,
    )
    row = row_to_dict(result.mappings().one()) or {}
    await _audit(session, context, "document_update", "document.update", "Belge metadata guncellendi.", row)
    return _document_payload(row)


async def delete_document(session: AsyncSession, context: dict[str, Any], document_id: str) -> dict[str, Any]:
    await ensure_document_tables(session)
    current = await _load_document(session, context, document_id)
    assert_document_access(context, current, writable=True)
    result = await session.execute(
        text(
            """
            update public.documents
            set status = 'deleted', is_deleted = true, updated_at = now(), version = version + 1
            where tenant_id = :tenant_id and id = :document_id
            returning *
            """
        ),
        {"tenant_id": context["tenant_id"], "document_id": document_id},
    )
    row = row_to_dict(result.mappings().one()) or {}
    await _log_access(session, context, document_id, "delete")
    await _audit(session, context, "document_delete", "document.delete", "Belge silindi.", row)
    await _outbox(session, context, DOCUMENT_DELETED, row)
    return _document_payload(row)


async def create_new_version(session: AsyncSession, context: dict[str, Any], document_id: str, request: DocumentUploadRequest) -> dict[str, Any]:
    parent = await _load_document(session, context, document_id)
    assert_document_access(context, parent, writable=True)
    data = request.model_copy(update={"owner_entity_type": str(parent["owner_entity_type"]), "owner_entity_id": str(parent["owner_entity_id"]), "company_id": str(parent["company_id"]) if parent.get("company_id") else request.company_id, "branch_id": str(parent["branch_id"]) if parent.get("branch_id") else request.branch_id})
    row = await upload_document(session, context, data)
    await session.execute(
        text(
            """
            update public.documents
            set parent_document_id = :parent_document_id,
                version_no = :version_no,
                updated_at = now()
            where tenant_id = :tenant_id and id = :document_id
            returning *
            """
        ),
        {"tenant_id": context["tenant_id"], "document_id": row["id"], "parent_document_id": document_id, "version_no": next_version_no(parent)},
    )
    await _audit(session, context, "document_new_version", "document.new_version", "Belge yeni versiyonu olusturuldu.", {"parent_document_id": document_id, "new_document_id": row["id"]})
    await _outbox(session, context, DOCUMENT_NEW_VERSION, {"id": row["id"], "parent_document_id": document_id})
    return await get_document(session, context, str(row["id"]))


async def verify_document(session: AsyncSession, context: dict[str, Any], document_id: str) -> dict[str, Any]:
    row = await _status_update(session, context, document_id, status_value="verified", verification_status="verified", action="verify", reason=None)
    await _audit(session, context, "document_verify", "document.verify", "Belge dogrulandi.", row)
    await _outbox(session, context, DOCUMENT_VERIFIED, row)
    return row


async def reject_document(session: AsyncSession, context: dict[str, Any], document_id: str, request: DocumentRejectRequest) -> dict[str, Any]:
    row = await _status_update(session, context, document_id, status_value="rejected", verification_status="rejected", action="reject", reason=request.rejected_reason)
    await _audit(session, context, "document_reject", "document.reject", "Belge reddedildi.", row)
    await _outbox(session, context, DOCUMENT_REJECTED, row)
    return row


async def get_document_url(session: AsyncSession, context: dict[str, Any], document_id: str, *, action: str) -> dict[str, Any]:
    document = await _load_document(session, context, document_id)
    assert_document_access(context, document)
    url = await create_signed_url(str(document["storage_bucket"]), str(document["storage_path"]), str(document["storage_provider"]), expires_in=SIGNED_URL_EXPIRES_IN)
    access_action = "preview" if action == "preview" else "download"
    await _log_access(session, context, document_id, access_action)
    await _audit(
        session,
        context,
        f"document_{access_action}",
        f"document.{access_action}",
        "Belge erisim URL'i uretildi.",
        _public_document_metadata(document),
    )
    await _outbox(session, context, DOCUMENT_PREVIEWED if access_action == "preview" else DOCUMENT_DOWNLOADED, document)
    return {"document_id": document_id, "action": access_action, "url": url, "expires_in": SIGNED_URL_EXPIRES_IN, "storage_provider": document["storage_provider"]}


async def list_documents_by_entity(session: AsyncSession, context: dict[str, Any], entity_type: str, entity_id: str) -> list[dict[str, Any]]:
    query = DocumentListQuery(owner_entity_type=entity_type, owner_entity_id=entity_id, page_size=200)
    result = await list_documents(session, context, query)
    return list(result["data"])


async def list_requirements(session: AsyncSession, context: dict[str, Any], *, module_key: str | None = None, operation_key: str | None = None, entity_type: str | None = None) -> list[dict[str, Any]]:
    defaults = [item.model_dump(mode="json") for item in list_default_requirements(module_key=module_key, operation_key=operation_key, entity_type=entity_type)]
    if not await table_exists(session, "public.document_requirements"):
        return defaults
    where = ["active = true", "(tenant_id is null or tenant_id = :tenant_id)"]
    params: dict[str, Any] = {"tenant_id": context["tenant_id"]}
    if module_key:
        where.append("module_key = :module_key")
        params["module_key"] = module_key
    if operation_key:
        where.append("operation_key = :operation_key")
        params["operation_key"] = operation_key
    if entity_type:
        where.append("entity_type = :entity_type")
        params["entity_type"] = entity_type
    rows = await session.execute(
        text(
            f"""
            select coalesce(module_key || ':' || coalesce(operation_key, 'any') || ':' || entity_type || ':' || document_type, id::text) as requirement_key,
                   module_key, operation_key, entity_type, document_type, required,
                   condition_json as condition, description, accepted_file_types, max_file_size,
                   expiry_required, verification_required
            from public.document_requirements
            where {" and ".join(where)}
            order by required desc, module_key, operation_key nulls first, document_type
            """
        ),
        params,
    )
    return defaults + rows_to_dicts(list(rows.mappings().all()))


async def list_expiring_documents(session: AsyncSession, context: dict[str, Any], *, expired: bool = False) -> list[dict[str, Any]]:
    await ensure_document_tables(session)
    operator = "<" if expired else "between"
    date_filter = "expiry_date < current_date" if operator == "<" else "expiry_date between current_date and current_date + interval '30 days'"
    rows = await session.execute(
        text(
            f"""
            select *
            from public.documents
            where tenant_id = :tenant_id
              and coalesce(is_deleted, false) = false
              and expiry_date is not null
              and {date_filter}
            order by expiry_date asc
            limit 200
            """
        ),
        {"tenant_id": context["tenant_id"]},
    )
    documents = [_document_payload(row) for row in rows_to_dicts(list(rows.mappings().all()))]
    scope_values = context.get("company_scope_ids")
    if scope_values is None:
        return documents
    scope = {str(item) for item in list(scope_values)}
    return [
        item
        for item in documents
        if not item.get("company_id") or str(item.get("company_id")) in scope
    ]


async def list_access_logs(session: AsyncSession, context: dict[str, Any], document_id: str) -> list[dict[str, Any]]:
    await ensure_document_tables(session, access_logs=True)
    document = await _load_document(session, context, document_id)
    assert_document_access(context, document)
    rows = await session.execute(
        text(
            """
            select *
            from public.document_access_logs
            where tenant_id = :tenant_id and document_id = :document_id
            order by created_at desc
            limit 200
            """
        ),
        {"tenant_id": context["tenant_id"], "document_id": document_id},
    )
    return rows_to_dicts(list(rows.mappings().all()))


async def _insert_document(session: AsyncSession, context: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
    result = await session.execute(
        text(
            """
            insert into public.documents (
              id, tenant_id, company_id, branch_id, owner_entity_type, owner_entity_id,
              document_type, document_category, title, description, file_name,
              file_extension, mime_type, file_size, storage_bucket, storage_path,
              storage_provider, checksum, version_no, parent_document_id, status,
              verification_status, required, issue_date, expiry_date, uploaded_by,
              tags, metadata_json
            )
            values (
              :id, :tenant_id, :company_id, :branch_id, :owner_entity_type, :owner_entity_id,
              :document_type, :document_category, :title, :description, :file_name,
              :file_extension, :mime_type, :file_size, :storage_bucket, :storage_path,
              :storage_provider, :checksum, coalesce(:version_no, 1), :parent_document_id, :status,
              :verification_status, :required, :issue_date, :expiry_date, :uploaded_by,
              :tags, cast(:metadata_json as jsonb)
            )
            returning *
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "version_no": 1,
            "parent_document_id": None,
            "status": "uploaded",
            "verification_status": "not_required",
            "required": False,
            "issue_date": None,
            "expiry_date": None,
            "description": None,
            "checksum": None,
            "tags": [],
            **payload,
            "metadata_json": _json(payload.get("metadata_json") or {}),
        },
    )
    return _document_payload(row_to_dict(result.mappings().one()) or {})


async def _insert_relation(session: AsyncSession, context: dict[str, Any], document_id: str, entity_type: str, entity_id: str, relation_type: str) -> None:
    await session.execute(
        text(
            """
            insert into public.document_relations (
              id, tenant_id, document_id, entity_type, entity_id, relation_type, created_at
            )
            values (:id, :tenant_id, :document_id, :entity_type, :entity_id, :relation_type, now())
            """
        ),
        {"id": str(uuid4()), "tenant_id": context["tenant_id"], "document_id": document_id, "entity_type": entity_type, "entity_id": entity_id, "relation_type": relation_type},
    )


async def _load_document(session: AsyncSession, context: dict[str, Any], document_id: str) -> dict[str, Any]:
    await ensure_document_tables(session)
    result = await session.execute(
        text("select * from public.documents where tenant_id = :tenant_id and id = :document_id limit 1"),
        {"tenant_id": context["tenant_id"], "document_id": document_id},
    )
    row = row_to_dict(result.mappings().one_or_none())
    if not row:
        raise DomainError("Belge bulunamadi.", "DOCUMENT_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    return row


async def _status_update(session: AsyncSession, context: dict[str, Any], document_id: str, *, status_value: str, verification_status: str, action: str, reason: str | None) -> dict[str, Any]:
    await ensure_document_tables(session)
    current = await _load_document(session, context, document_id)
    assert_document_access(context, current, writable=True)
    result = await session.execute(
        text(
            """
            update public.documents
            set status = :status,
                verification_status = :verification_status,
                verified_by = case when :verification_status = 'verified' then :user_id else verified_by end,
                verified_at = case when :verification_status = 'verified' then now() else verified_at end,
                rejected_reason = :rejected_reason,
                updated_at = now(),
                version = version + 1
            where tenant_id = :tenant_id and id = :document_id
            returning *
            """
        ),
        {"tenant_id": context["tenant_id"], "document_id": document_id, "status": status_value, "verification_status": verification_status, "user_id": context.get("user_id"), "rejected_reason": reason},
    )
    row = _document_payload(row_to_dict(result.mappings().one()) or {})
    await _log_access(session, context, document_id, action)
    return row


async def _log_access(session: AsyncSession, context: dict[str, Any], document_id: str, action: str) -> None:
    if not await table_exists(session, "public.document_access_logs"):
        return
    await session.execute(
        text(
            """
            insert into public.document_access_logs (
              id, tenant_id, document_id, action_type, user_id, request_id, created_at
            )
            values (:id, :tenant_id, :document_id, :action_type, :user_id, :request_id, now())
            """
        ),
        {"id": str(uuid4()), "tenant_id": context["tenant_id"], "document_id": document_id, "action_type": action, "user_id": context.get("user_id"), "request_id": context.get("request_id")},
    )


async def _audit(session: AsyncSession, context: dict[str, Any], action_type: str, action_key: str, summary: str, document: dict[str, Any]) -> None:
    await record_audit_best_effort(
        session,
        context,
        action_type=action_type,
        action_key=action_key,
        summary=summary,
        entity_type="document",
        entity_id=str(document.get("id") or ""),
        new_values=_public_document_metadata(document),
        metadata={"storage_path": mask_storage_path(str(document.get("storage_path") or "")) if document.get("storage_path") else None},
    )


async def _outbox(session: AsyncSession, context: dict[str, Any], event_type: str, document: dict[str, Any]) -> None:
    document_id = str(document.get("id") or document.get("document_id") or "")
    if not document_id:
        return
    await enqueue_outbox_event_best_effort(
        session,
        context,
        event_type=event_type,
        aggregate_type="document",
        aggregate_id=document_id,
        payload=_public_document_metadata(document),
    )


def _document_payload(row: dict[str, Any]) -> dict[str, Any]:
    payload = dict(row)
    if payload.get("storage_path"):
        payload["storage_path_masked"] = mask_storage_path(str(payload["storage_path"]))
    payload.pop("storage_path", None)
    return payload


def _public_document_metadata(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row.get("id"),
        "owner_entity_type": row.get("owner_entity_type"),
        "owner_entity_id": row.get("owner_entity_id"),
        "document_type": row.get("document_type"),
        "document_category": row.get("document_category"),
        "title": row.get("title"),
        "file_name": row.get("file_name"),
        "file_size": row.get("file_size"),
        "status": row.get("status"),
        "verification_status": row.get("verification_status"),
    }


def _json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, default=str)
