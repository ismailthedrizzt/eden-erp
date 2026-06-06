# ruff: noqa: E501
# mypy: ignore-errors
from __future__ import annotations

import json
from datetime import date
from decimal import Decimal
from typing import Any
from uuid import uuid4

from fastapi import status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.core.serialization import row_to_dict, rows_to_dicts
from app.domains.contracts.registry import CONTRACT_TYPES
from app.domains.contracts.schemas import (
    ContractCreateRequest,
    ContractLifecycleRequest,
    ContractListQuery,
    ContractObligationCreateRequest,
    ContractObligationUpdateRequest,
    ContractRelationCreateRequest,
    ContractUpdateRequest,
    ListResult,
)
from app.domains.operations.service import table_exists

CONTRACT_SORT_COLUMNS = {
    "contract_no": "c.contract_no",
    "contract_title": "c.contract_title",
    "contract_type": "c.contract_type",
    "counterparty_name": "c.counterparty_name",
    "status": "c.status",
    "start_date": "c.start_date",
    "end_date": "c.end_date",
    "renewal_date": "c.renewal_date",
    "contract_value": "c.contract_value",
    "risk_level": "c.risk_level",
    "updated_at": "c.updated_at",
    "created_at": "c.created_at",
}
SAFE_PATCH_COLUMNS = {
    "contract_title",
    "description",
    "owner_user_id",
    "responsible_department",
    "notes",
    "tags",
    "counterparty_contact_name",
    "counterparty_email",
    "counterparty_phone",
    "risk_level",
    "metadata_json",
}
CRITICAL_PATCH_COLUMNS = {
    "status",
    "signed_date",
    "effective_date",
    "start_date",
    "end_date",
    "renewal_date",
    "termination_date",
    "contract_value",
    "currency",
    "payment_terms",
    "auto_renewal",
    "counterparty_name",
    "primary_party_type",
    "primary_party_entity_type",
    "primary_party_entity_id",
}
ACTIVE_LOCK_STATUSES = {
    "active",
    "renewal_pending",
    "amendment_pending",
    "suspended",
    "termination_pending",
    "terminated",
    "expired",
    "archived",
}
ACTIVATABLE_STATUSES = {
    "draft",
    "under_review",
    "approval_pending",
    "approved",
    "ready_for_signature",
    "signed",
}


def json_dumps(value: Any) -> str:
    def default(item: Any) -> Any:
        if isinstance(item, (date, Decimal)):
            return str(item)
        return item

    return json.dumps(value or {}, ensure_ascii=False, default=default)


def list_meta(page: int, page_size: int, total: int) -> dict[str, int]:
    return {"page": page, "pageSize": page_size, "total": total}


def service_context(context: Any, tenant_id: str) -> dict[str, Any]:
    return {
        "tenant_id": tenant_id,
        "user_id": getattr(context, "user_id", None),
        "permissions": getattr(context, "permissions", []),
        "company_scope_ids": getattr(context, "company_scope_ids", None),
        "writable_company_scope_ids": getattr(context, "writable_company_scope_ids", None),
        "module_key": "contracts",
    }


async def ensure_contract_tables(session: AsyncSession) -> None:
    required = [
        "public.contracts",
        "public.contract_parties",
        "public.contract_relations",
        "public.contract_obligations",
        "public.contract_milestones",
        "public.contract_events",
    ]
    missing = [table for table in required if not await table_exists(session, table)]
    if missing:
        raise DomainError(
            "Sözleşme altyapısı hazır değil. Migration uygulanmalıdır.",
            "CONTRACT_TABLES_MISSING",
            status.HTTP_409_CONFLICT,
            {"missing": missing},
        )


def assert_company_scope(context: dict[str, Any], company_id: str | None, *, writable: bool = False) -> None:
    if not company_id:
        return
    scope_key = "writable_company_scope_ids" if writable else "company_scope_ids"
    scope = context.get(scope_key)
    if scope is None:
        return
    if str(company_id) not in [str(item) for item in scope]:
        raise DomainError(
            "Bu şirket kapsamı için yetkiniz bulunmuyor.",
            "COMPANY_SCOPE_DENIED",
            status.HTTP_403_FORBIDDEN,
        )


async def list_contracts(session: AsyncSession, context: dict[str, Any], query: ContractListQuery) -> ListResult:
    await ensure_contract_tables(session)
    where = ["c.tenant_id = :tenant_id", "coalesce(c.is_deleted, false) = false"]
    params: dict[str, Any] = {
        "tenant_id": context["tenant_id"],
        "limit": query.page_size,
        "offset": (query.page - 1) * query.page_size,
    }
    if query.company_id:
        assert_company_scope(context, query.company_id)
        where.append("c.company_id = :company_id")
        params["company_id"] = query.company_id
    elif context.get("company_scope_ids") is not None:
        where.append("(c.company_id is null or c.company_id::text = any(:company_scope_ids))")
        params["company_scope_ids"] = [str(item) for item in context.get("company_scope_ids") or []]
    if query.contract_type:
        where.append("c.contract_type = :contract_type")
        params["contract_type"] = query.contract_type
    if query.status:
        where.append("c.status = :status")
        params["status"] = query.status
    if query.counterparty:
        where.append("c.counterparty_name ilike :counterparty")
        params["counterparty"] = f"%{query.counterparty}%"
    if query.risk_level:
        where.append("c.risk_level = :risk_level")
        params["risk_level"] = query.risk_level
    if query.owner_user_id:
        where.append("c.owner_user_id = :owner_user_id")
        params["owner_user_id"] = query.owner_user_id
    if query.expiring_within_days is not None:
        where.append("c.end_date is not null and c.end_date <= current_date + cast(:expiring_days as int)")
        params["expiring_days"] = query.expiring_within_days
    if query.renewal_due:
        where.append("c.renewal_date is not null and c.renewal_date <= current_date + 30")
    if query.search:
        where.append("(c.contract_no ilike :search or c.contract_title ilike :search or coalesce(c.counterparty_name, '') ilike :search)")
        params["search"] = f"%{query.search}%"
    where_sql = " and ".join(where)
    count_result = await session.execute(text(f"select count(*) from public.contracts c where {where_sql}"), params)
    total = int(count_result.scalar_one() or 0)
    sort_column = CONTRACT_SORT_COLUMNS.get(query.sort, "c.updated_at")
    direction = "asc" if query.direction.lower() == "asc" else "desc"
    result = await session.execute(
        text(
            f"""
            select c.*,
                   coalesce(d.document_count, 0) as document_count,
                   coalesce(o.open_obligations, 0) as open_obligations,
                   coalesce(o.overdue_obligations, 0) as overdue_obligations
            from public.contracts c
            left join lateral (
              select count(*) as document_count
              from public.document_relations r
              where r.tenant_id = c.tenant_id
                and r.entity_type = 'contract'
                and r.entity_id = c.id::text
            ) d on true
            left join lateral (
              select count(*) filter (where status in ('open','in_progress')) as open_obligations,
                     count(*) filter (where status in ('open','in_progress') and due_date < current_date) as overdue_obligations
              from public.contract_obligations o
              where o.tenant_id = c.tenant_id and o.contract_id = c.id
            ) o on true
            where {where_sql}
            order by {sort_column} {direction}, c.id desc
            limit :limit offset :offset
            """
        ),
        params,
    )
    return ListResult(
        data=[contract_payload(row) for row in rows_to_dicts(result.mappings().all())],
        meta=list_meta(query.page, query.page_size, total),
    )


async def get_contract(session: AsyncSession, context: dict[str, Any], contract_id: str) -> dict[str, Any] | None:
    await ensure_contract_tables(session)
    result = await session.execute(
        text(
            """
            select c.*,
                   coalesce(d.document_count, 0) as document_count,
                   coalesce(o.open_obligations, 0) as open_obligations,
                   coalesce(o.overdue_obligations, 0) as overdue_obligations
            from public.contracts c
            left join lateral (
              select count(*) as document_count
              from public.document_relations r
              where r.tenant_id = c.tenant_id and r.entity_type = 'contract' and r.entity_id = c.id::text
            ) d on true
            left join lateral (
              select count(*) filter (where status in ('open','in_progress')) as open_obligations,
                     count(*) filter (where status in ('open','in_progress') and due_date < current_date) as overdue_obligations
              from public.contract_obligations o
              where o.tenant_id = c.tenant_id and o.contract_id = c.id
            ) o on true
            where c.tenant_id = :tenant_id and c.id = :contract_id and coalesce(c.is_deleted, false) = false
            limit 1
            """
        ),
        {"tenant_id": context["tenant_id"], "contract_id": contract_id},
    )
    row = result.mappings().one_or_none()
    payload = contract_payload(row_to_dict(row)) if row else None
    if payload:
        assert_company_scope(context, payload.get("company_id"))
    return payload


async def create_contract(session: AsyncSession, context: dict[str, Any], request: ContractCreateRequest) -> dict[str, Any]:
    await ensure_contract_tables(session)
    payload = request.model_dump(mode="json", exclude_none=True)
    assert_company_scope(context, payload.get("company_id"), writable=True)
    contract_id = str(uuid4())
    contract_no = payload.get("contract_no") or await next_contract_no(session, context["tenant_id"])
    result = await session.execute(
        text(
            """
            insert into public.contracts (
              id, tenant_id, company_id, contract_no, contract_title, contract_type, contract_category,
              status, primary_party_type, primary_party_entity_type, primary_party_entity_id,
              counterparty_name, counterparty_tax_number, counterparty_contact_name, counterparty_email,
              counterparty_phone, start_date, end_date, signed_date, effective_date, renewal_date,
              notice_period_days, auto_renewal, contract_value, currency, payment_terms, billing_frequency,
              renewal_status, termination_status, owner_user_id, responsible_department, related_company_id,
              related_branch_id, related_facility_id, related_project_id, related_customer_id, related_supplier_id,
              related_employee_id, related_asset_id, risk_level, description, notes, tags, metadata_json,
              created_by, updated_by, created_at, updated_at, version, is_deleted
            ) values (
              :id, :tenant_id, :company_id, :contract_no, :contract_title, :contract_type, :contract_category,
              'draft', :primary_party_type, :primary_party_entity_type, :primary_party_entity_id,
              :counterparty_name, :counterparty_tax_number, :counterparty_contact_name, :counterparty_email,
              :counterparty_phone, :start_date, :end_date, :signed_date, :effective_date, :renewal_date,
              :notice_period_days, :auto_renewal, :contract_value, :currency, :payment_terms, :billing_frequency,
              'not_started', 'not_started', :owner_user_id, :responsible_department, :related_company_id,
              :related_branch_id, :related_facility_id, :related_project_id, :related_customer_id, :related_supplier_id,
              :related_employee_id, :related_asset_id, :risk_level, :description, :notes, :tags, cast(:metadata_json as jsonb),
              :created_by, :updated_by, now(), now(), 1, false
            ) returning *
            """
        ),
        {
            **contract_defaults(payload),
            "id": contract_id,
            "tenant_id": context["tenant_id"],
            "contract_no": contract_no,
            "tags": payload.get("tags") or [],
            "metadata_json": json_dumps(payload.get("metadata_json")),
            "created_by": context.get("user_id"),
            "updated_by": context.get("user_id"),
        },
    )
    row = contract_payload(row_to_dict(result.mappings().one()))
    await add_event(session, context, contract_id, "created", None, "draft", "Sözleşme taslağı oluşturuldu.", {})
    return row


async def update_contract(session: AsyncSession, context: dict[str, Any], contract_id: str, request: ContractUpdateRequest) -> dict[str, Any]:
    current = await require_contract(session, context, contract_id)
    payload = request.model_dump(mode="json", exclude_unset=True, exclude_none=True)
    base_version = payload.pop("base_version", None)
    if base_version is not None and int(current.get("version") or 0) != int(base_version):
        raise DomainError("Sözleşme kaydı siz görüntüledikten sonra güncellenmiş. Lütfen sayfayı yenileyin.", "VERSION_CONFLICT", status.HTTP_409_CONFLICT)
    critical = sorted(set(payload) & CRITICAL_PATCH_COLUMNS)
    if critical:
        raise DomainError(
            "Sözleşme yaşam döngüsü alanları normal formdan değiştirilemez. Değişiklik için ilgili işlem wizardını kullanın.",
            "CONTRACT_OPERATION_REQUIRED",
            status.HTTP_409_CONFLICT,
            {"fields": critical},
        )
    mutable = {key: value for key, value in payload.items() if key in SAFE_PATCH_COLUMNS}
    if not mutable:
        return current
    assignments = []
    params: dict[str, Any] = {"tenant_id": context["tenant_id"], "contract_id": contract_id, "updated_by": context.get("user_id")}
    for key, value in mutable.items():
        if key == "metadata_json":
            assignments.append("metadata_json = cast(:metadata_json as jsonb)")
            params[key] = json_dumps(value)
        else:
            assignments.append(f"{key} = :{key}")
            params[key] = value
    result = await session.execute(
        text(f"update public.contracts set {', '.join(assignments)}, updated_by = :updated_by, updated_at = now(), version = version + 1 where tenant_id = :tenant_id and id = :contract_id returning *"),
        params,
    )
    row = result.mappings().one_or_none()
    if not row:
        raise DomainError("Sözleşme bulunamadı.", "CONTRACT_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    await add_event(session, context, contract_id, "updated", current.get("status"), current.get("status"), "Sözleşme kart bilgileri güncellendi.", {"fields": sorted(mutable)})
    return contract_payload(row_to_dict(row))


async def delete_contract(session: AsyncSession, context: dict[str, Any], contract_id: str) -> dict[str, Any]:
    current = await require_contract(session, context, contract_id)
    if current.get("status") == "active":
        raise DomainError("Aktif sözleşme silinemez. Önce fesih veya arşiv işlemi yapılmalıdır.", "CONTRACT_DELETE_REQUIRES_LIFECYCLE", status.HTTP_409_CONFLICT)
    await session.execute(
        text("update public.contracts set is_deleted = true, updated_by = :user_id, updated_at = now(), version = version + 1 where tenant_id = :tenant_id and id = :contract_id"),
        {"tenant_id": context["tenant_id"], "contract_id": contract_id, "user_id": context.get("user_id")},
    )
    await add_event(session, context, contract_id, "archived", current.get("status"), "archived", "Sözleşme kaydı arşivlendi.", {})
    return {"id": contract_id, "deleted": True}


async def precheck_contract_action(session: AsyncSession, context: dict[str, Any], contract_id: str, action: str) -> dict[str, Any]:
    contract = await require_contract(session, context, contract_id)
    blockers: list[str] = []
    warnings: list[str] = []
    status_value = str(contract.get("status") or "")
    if action == "activate":
        if status_value not in ACTIVATABLE_STATUSES:
            blockers.append("Sözleşme bu durumdan aktifleştirilemez.")
        if not contract.get("owner_user_id"):
            blockers.append("Sorumlu kullanıcı seçilmelidir.")
        if not contract.get("counterparty_name"):
            blockers.append("Karşı taraf bilgisi eksik.")
        if not contract.get("start_date"):
            blockers.append("Başlangıç tarihi eksik.")
        if not contract.get("end_date") and not contract.get("auto_renewal"):
            warnings.append("Bitiş tarihi veya otomatik yenileme bilgisi yok.")
        if not await has_signed_contract_document(session, context, contract_id):
            blockers.append("İmzalı sözleşme belgesi eksik.")
    elif action in {"renew", "amend", "suspend", "terminate"} and status_value not in {"active", "renewal_pending", "amendment_pending", "suspended", "termination_pending"}:
        blockers.append("Bu işlem için sözleşme aktif yaşam döngüsünde olmalıdır.")
    elif action == "archive" and status_value not in {"terminated", "expired", "cancelled", "draft"}:
        warnings.append("Aktif sözleşmelerde arşivleme yerine fesih işlemi tercih edilmelidir.")
    return {"eligible": not blockers, "blockers": blockers, "warnings": warnings, "contract": contract}


async def apply_contract_action(session: AsyncSession, context: dict[str, Any], contract_id: str, action: str, request: ContractLifecycleRequest | None = None) -> dict[str, Any]:
    current = await require_contract(session, context, contract_id)
    check = await precheck_contract_action(session, context, contract_id, action)
    if check["blockers"]:
        raise DomainError("Ön kontrol başarısız.", "CONTRACT_PRECHECK_FAILED", status.HTTP_409_CONFLICT, check)
    request = request or ContractLifecycleRequest()
    payload = request.model_dump(mode="json", exclude_none=True)
    next_status = {"activate": "active", "renew": "active", "amend": "active", "suspend": "suspended", "terminate": "terminated", "archive": "archived"}[action]
    updates: dict[str, Any] = {"status": next_status}
    if action in {"activate", "renew", "amend"}:
        for key in ["effective_date", "start_date", "end_date", "renewal_date", "contract_value", "currency", "payment_terms"]:
            if key in payload:
                updates[key] = payload[key]
    if action == "terminate":
        updates["termination_status"] = "terminated"
        updates["termination_date"] = payload.get("termination_date") or date.today().isoformat()
    if action == "renew":
        updates["renewal_status"] = "renewed"
    assignments = []
    params: dict[str, Any] = {"tenant_id": context["tenant_id"], "contract_id": contract_id, "updated_by": context.get("user_id")}
    for key, value in updates.items():
        assignments.append(f"{key} = :{key}")
        params[key] = value
    result = await session.execute(
        text(f"update public.contracts set {', '.join(assignments)}, updated_by = :updated_by, updated_at = now(), version = version + 1 where tenant_id = :tenant_id and id = :contract_id returning *"),
        params,
    )
    row = contract_payload(row_to_dict(result.mappings().one()))
    await add_event(session, context, contract_id, event_type_for_action(action), current.get("status"), next_status, request.notes or request.reason or f"Sözleşme {action} işlemi tamamlandı.", payload.get("metadata_json") or {})
    return row


async def list_relations(session: AsyncSession, context: dict[str, Any], contract_id: str) -> list[dict[str, Any]]:
    await require_contract(session, context, contract_id)
    result = await session.execute(text("select * from public.contract_relations where tenant_id = :tenant_id and contract_id = :contract_id order by created_at desc"), {"tenant_id": context["tenant_id"], "contract_id": contract_id})
    return rows_to_dicts(result.mappings().all())


async def create_relation(session: AsyncSession, context: dict[str, Any], contract_id: str, request: ContractRelationCreateRequest) -> dict[str, Any]:
    await require_contract(session, context, contract_id)
    result = await session.execute(
        text(
            """
            insert into public.contract_relations (id, tenant_id, contract_id, module_key, entity_type, entity_id, relation_type, created_at, metadata_json)
            values (:id, :tenant_id, :contract_id, :module_key, :entity_type, :entity_id, :relation_type, now(), cast(:metadata_json as jsonb))
            on conflict (tenant_id, contract_id, module_key, entity_type, entity_id, relation_type)
            do update set metadata_json = excluded.metadata_json
            returning *
            """
        ),
        {"id": str(uuid4()), "tenant_id": context["tenant_id"], "contract_id": contract_id, **request.model_dump(mode="json"), "metadata_json": json_dumps(request.metadata_json)},
    )
    return row_to_dict(result.mappings().one())


async def list_obligations(session: AsyncSession, context: dict[str, Any], contract_id: str) -> list[dict[str, Any]]:
    await require_contract(session, context, contract_id)
    result = await session.execute(text("select * from public.contract_obligations where tenant_id = :tenant_id and contract_id = :contract_id order by coalesce(due_date, created_at::date), created_at desc"), {"tenant_id": context["tenant_id"], "contract_id": contract_id})
    return rows_to_dicts(result.mappings().all())


async def create_obligation(session: AsyncSession, context: dict[str, Any], contract_id: str, request: ContractObligationCreateRequest) -> dict[str, Any]:
    await require_contract(session, context, contract_id)
    result = await session.execute(
        text(
            """
            insert into public.contract_obligations (id, tenant_id, contract_id, obligation_type, title, description, due_date, recurrence_rule, responsible_user_id, status, created_at, updated_at)
            values (:id, :tenant_id, :contract_id, :obligation_type, :title, :description, :due_date, :recurrence_rule, :responsible_user_id, :status, now(), now())
            returning *
            """
        ),
        {"id": str(uuid4()), "tenant_id": context["tenant_id"], "contract_id": contract_id, **request.model_dump(mode="json")},
    )
    return row_to_dict(result.mappings().one())


async def update_obligation(session: AsyncSession, context: dict[str, Any], contract_id: str, obligation_id: str, request: ContractObligationUpdateRequest) -> dict[str, Any]:
    await require_contract(session, context, contract_id)
    payload = request.model_dump(mode="json", exclude_unset=True, exclude_none=True)
    if not payload:
        result = await session.execute(text("select * from public.contract_obligations where tenant_id = :tenant_id and contract_id = :contract_id and id = :obligation_id"), {"tenant_id": context["tenant_id"], "contract_id": contract_id, "obligation_id": obligation_id})
        row = result.mappings().one_or_none()
        if not row:
            raise DomainError("Yükümlülük bulunamadı.", "CONTRACT_OBLIGATION_NOT_FOUND", status.HTTP_404_NOT_FOUND)
        return row_to_dict(row)
    assignments = []
    params = {"tenant_id": context["tenant_id"], "contract_id": contract_id, "obligation_id": obligation_id}
    for key, value in payload.items():
        assignments.append(f"{key} = :{key}")
        params[key] = value
    result = await session.execute(text(f"update public.contract_obligations set {', '.join(assignments)}, updated_at = now() where tenant_id = :tenant_id and contract_id = :contract_id and id = :obligation_id returning *"), params)
    row = result.mappings().one_or_none()
    if not row:
        raise DomainError("Yükümlülük bulunamadı.", "CONTRACT_OBLIGATION_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    return row_to_dict(row)


async def list_events(session: AsyncSession, context: dict[str, Any], contract_id: str) -> list[dict[str, Any]]:
    await require_contract(session, context, contract_id)
    result = await session.execute(text("select * from public.contract_events where tenant_id = :tenant_id and contract_id = :contract_id order by event_date desc, created_at desc"), {"tenant_id": context["tenant_id"], "contract_id": contract_id})
    return rows_to_dicts(result.mappings().all())


async def list_contract_documents(session: AsyncSession, context: dict[str, Any], contract_id: str) -> list[dict[str, Any]]:
    await require_contract(session, context, contract_id)
    result = await session.execute(
        text(
            """
            select d.*, r.id as relation_id, r.relation_type, r.document_slot_key
            from public.documents d
            join public.document_relations r on r.tenant_id = d.tenant_id and r.document_id = d.id
            where r.tenant_id = :tenant_id and r.entity_type = 'contract' and r.entity_id = :contract_id
              and coalesce(d.is_deleted, false) = false
            order by d.created_at desc
            """
        ),
        {"tenant_id": context["tenant_id"], "contract_id": contract_id},
    )
    return rows_to_dicts(result.mappings().all())


async def require_contract(session: AsyncSession, context: dict[str, Any], contract_id: str) -> dict[str, Any]:
    contract = await get_contract(session, context, contract_id)
    if not contract:
        raise DomainError("Sözleşme bulunamadı.", "CONTRACT_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    return contract


async def next_contract_no(session: AsyncSession, tenant_id: str) -> str:
    result = await session.execute(text("select count(*) + 1 from public.contracts where tenant_id = :tenant_id"), {"tenant_id": tenant_id})
    return f"CNT-{date.today().strftime('%Y%m%d')}-{int(result.scalar_one() or 1):04d}"


async def has_signed_contract_document(session: AsyncSession, context: dict[str, Any], contract_id: str) -> bool:
    result = await session.execute(
        text(
            """
            select 1
            from public.documents d
            join public.document_relations r on r.tenant_id = d.tenant_id and r.document_id = d.id
            where r.tenant_id = :tenant_id and r.entity_type = 'contract' and r.entity_id = :contract_id
              and d.document_type in ('contract.signed_contract', 'contract.amendment')
              and coalesce(d.is_deleted, false) = false
            limit 1
            """
        ),
        {"tenant_id": context["tenant_id"], "contract_id": contract_id},
    )
    return result.first() is not None


async def add_event(session: AsyncSession, context: dict[str, Any], contract_id: str, event_type: str, old_status: Any, new_status: Any, notes: str | None, metadata: dict[str, Any]) -> None:
    await session.execute(
        text(
            """
            insert into public.contract_events (id, tenant_id, contract_id, event_type, event_date, old_status, new_status, performed_by, notes, metadata_json, created_at)
            values (:id, :tenant_id, :contract_id, :event_type, now(), :old_status, :new_status, :performed_by, :notes, cast(:metadata_json as jsonb), now())
            """
        ),
        {"id": str(uuid4()), "tenant_id": context["tenant_id"], "contract_id": contract_id, "event_type": event_type, "old_status": old_status, "new_status": new_status, "performed_by": context.get("user_id"), "notes": notes, "metadata_json": json_dumps(metadata)},
    )


def event_type_for_action(action: str) -> str:
    return {"activate": "activated", "renew": "renewed", "amend": "amended", "suspend": "suspended", "terminate": "terminated", "archive": "archived"}[action]


def contract_payload(row: dict[str, Any]) -> dict[str, Any]:
    data = dict(row)
    data["contract_type_label"] = CONTRACT_TYPES.get(str(data.get("contract_type") or ""), str(data.get("contract_type") or ""))
    return data


def contract_defaults(payload: dict[str, Any]) -> dict[str, Any]:
    keys = [
        "company_id",
        "contract_title",
        "contract_type",
        "contract_category",
        "primary_party_type",
        "primary_party_entity_type",
        "primary_party_entity_id",
        "counterparty_name",
        "counterparty_tax_number",
        "counterparty_contact_name",
        "counterparty_email",
        "counterparty_phone",
        "start_date",
        "end_date",
        "signed_date",
        "effective_date",
        "renewal_date",
        "notice_period_days",
        "auto_renewal",
        "contract_value",
        "currency",
        "payment_terms",
        "billing_frequency",
        "owner_user_id",
        "responsible_department",
        "related_company_id",
        "related_branch_id",
        "related_facility_id",
        "related_project_id",
        "related_customer_id",
        "related_supplier_id",
        "related_employee_id",
        "related_asset_id",
        "risk_level",
        "description",
        "notes",
    ]
    defaults = {key: payload.get(key) for key in keys}
    defaults["contract_type"] = defaults.get("contract_type") or "other"
    defaults["risk_level"] = defaults.get("risk_level") or "medium"
    defaults["auto_renewal"] = bool(defaults.get("auto_renewal"))
    return defaults
