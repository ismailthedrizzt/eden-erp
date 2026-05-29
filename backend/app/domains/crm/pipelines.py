# ruff: noqa: E501, I001

from __future__ import annotations

from typing import Any

from fastapi import status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.domains.crm.schemas import ListResult, PipelineCreateRequest, PipelineStageUpdateRequest
from app.domains.crm.service import assert_company_scope, ensure_crm_deepening_tables, list_meta, row_to_dict

DEFAULT_PIPELINE_STAGES = [
    {"stage_key": "new_opportunity", "stage_name": "Yeni Firsat", "order_index": 10, "probability": 10, "stage_type": "open", "requires_next_action": True},
    {"stage_key": "first_contact", "stage_name": "Ilk Temas", "order_index": 20, "probability": 20, "stage_type": "open", "requires_next_action": True},
    {"stage_key": "needs_analysis", "stage_name": "Ihtiyac Analizi", "order_index": 30, "probability": 35, "stage_type": "open", "requires_next_action": True},
    {"stage_key": "proposal_prep", "stage_name": "Teklif Hazirligi", "order_index": 40, "probability": 50, "stage_type": "open", "requires_next_action": True},
    {"stage_key": "proposal_sent", "stage_name": "Teklif Gonderildi", "order_index": 50, "probability": 65, "stage_type": "open", "requires_next_action": True},
    {"stage_key": "negotiation", "stage_name": "Muzakere", "order_index": 60, "probability": 80, "stage_type": "open", "requires_next_action": True},
    {"stage_key": "won", "stage_name": "Kazanildi", "order_index": 70, "probability": 100, "stage_type": "won", "requires_next_action": False},
    {"stage_key": "lost", "stage_name": "Kaybedildi", "order_index": 80, "probability": 0, "stage_type": "lost", "requires_next_action": False},
]


async def ensure_default_pipeline(session: AsyncSession, context: dict[str, Any], company_id: str | None = None) -> dict[str, Any]:
    await ensure_crm_deepening_tables(session, pipelines=True)
    result = await session.execute(
        text(
            """
            select *
            from public.crm_pipelines
            where tenant_id = :tenant_id
              and (:company_id is null or company_id = cast(:company_id as uuid) or company_id is null)
              and is_default = true
              and active = true
            order by case when company_id = cast(:company_id as uuid) then 0 else 1 end, created_at asc
            limit 1
            """
        ),
        {"tenant_id": context["tenant_id"], "company_id": company_id},
    )
    row = result.mappings().one_or_none()
    if row:
        return row_to_dict(row)
    created = await create_pipeline(
        session,
        context,
        PipelineCreateRequest(
            company_id=company_id,
            pipeline_name="Varsayilan Satis Pipeline",
            is_default=True,
            stages=DEFAULT_PIPELINE_STAGES,
        ),
    )
    return created


async def create_pipeline(session: AsyncSession, context: dict[str, Any], request: PipelineCreateRequest) -> dict[str, Any]:
    await ensure_crm_deepening_tables(session, pipelines=True)
    if request.company_id:
        assert_company_scope(context, request.company_id, write=True)
    if request.is_default:
        await session.execute(
            text(
                """
                update public.crm_pipelines
                set is_default = false, updated_at = now()
                where tenant_id = :tenant_id
                  and ((:company_id is null and company_id is null) or company_id = cast(:company_id as uuid))
                """
            ),
            {"tenant_id": context["tenant_id"], "company_id": request.company_id},
        )
    inserted = await session.execute(
        text(
            """
            insert into public.crm_pipelines (tenant_id, company_id, pipeline_name, active, is_default)
            values (:tenant_id, :company_id, :pipeline_name, :active, :is_default)
            returning *
            """
        ),
        {"tenant_id": context["tenant_id"], **request.model_dump(exclude={"stages"})},
    )
    pipeline = row_to_dict(inserted.mappings().one())
    stages = request.stages or DEFAULT_PIPELINE_STAGES
    for item in stages:
        await session.execute(
            text(
                """
                insert into public.crm_pipeline_stages (
                  tenant_id, pipeline_id, stage_key, stage_name, order_index,
                  probability, stage_type, requires_next_action, active
                )
                values (
                  :tenant_id, :pipeline_id, :stage_key, :stage_name, :order_index,
                  :probability, :stage_type, :requires_next_action, :active
                )
                """
            ),
            {
                "tenant_id": context["tenant_id"],
                "pipeline_id": pipeline["id"],
                "stage_key": item.get("stage_key"),
                "stage_name": item.get("stage_name"),
                "order_index": item.get("order_index", 0),
                "probability": item.get("probability", 0),
                "stage_type": item.get("stage_type", "open"),
                "requires_next_action": item.get("requires_next_action", False),
                "active": item.get("active", True),
            },
        )
    pipeline["stages"] = await list_pipeline_stages(session, context, str(pipeline["id"]))
    return pipeline


async def list_pipelines(session: AsyncSession, context: dict[str, Any], *, company_id: str | None = None, include_inactive: bool = False, page: int = 1, page_size: int = 50) -> ListResult:
    await ensure_crm_deepening_tables(session, pipelines=True)
    filters = ["tenant_id = :tenant_id"]
    params: dict[str, Any] = {"tenant_id": context["tenant_id"], "limit": page_size, "offset": (page - 1) * page_size}
    if company_id:
        assert_company_scope(context, company_id)
        filters.append("(company_id = :company_id or company_id is null)")
        params["company_id"] = company_id
    elif context.get("company_scope_ids"):
        filters.append("(company_id is null or company_id = any(cast(:company_scope_ids as uuid[])))")
        params["company_scope_ids"] = context["company_scope_ids"]
    if not include_inactive:
        filters.append("active = true")
    result = await session.execute(
        text(
            f"""
            select *, count(*) over() as total_count
            from public.crm_pipelines
            where {" and ".join(filters)}
            order by is_default desc, created_at asc
            limit :limit offset :offset
            """
        ),
        params,
    )
    rows = [row_to_dict(row) for row in result.mappings()]
    total = int(rows[0].pop("total_count")) if rows else 0
    for row in rows[1:]:
        row.pop("total_count", None)
    return ListResult(data=rows, meta=list_meta(page, page_size, total))


async def get_pipeline(session: AsyncSession, context: dict[str, Any], pipeline_id: str) -> dict[str, Any] | None:
    await ensure_crm_deepening_tables(session, pipelines=True)
    result = await session.execute(
        text("select * from public.crm_pipelines where tenant_id = :tenant_id and id = :pipeline_id limit 1"),
        {"tenant_id": context["tenant_id"], "pipeline_id": pipeline_id},
    )
    row = result.mappings().one_or_none()
    if not row:
        return None
    pipeline = row_to_dict(row)
    if pipeline.get("company_id"):
        assert_company_scope(context, str(pipeline["company_id"]))
    return pipeline


async def list_pipeline_stages(session: AsyncSession, context: dict[str, Any], pipeline_id: str) -> list[dict[str, Any]]:
    await ensure_crm_deepening_tables(session, pipelines=True)
    pipeline = await get_pipeline(session, context, pipeline_id)
    if not pipeline:
        raise DomainError("Pipeline bulunamadi.", "CRM_PIPELINE_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    result = await session.execute(
        text(
            """
            select *
            from public.crm_pipeline_stages
            where tenant_id = :tenant_id and pipeline_id = :pipeline_id
            order by order_index asc, created_at asc
            """
        ),
        {"tenant_id": context["tenant_id"], "pipeline_id": pipeline_id},
    )
    return [row_to_dict(row) for row in result.mappings()]


async def get_pipeline_stage(session: AsyncSession, context: dict[str, Any], stage_id: str) -> dict[str, Any] | None:
    await ensure_crm_deepening_tables(session, pipelines=True)
    result = await session.execute(
        text(
            """
            select s.*, p.company_id, p.pipeline_name
            from public.crm_pipeline_stages s
            join public.crm_pipelines p on p.tenant_id = s.tenant_id and p.id = s.pipeline_id
            where s.tenant_id = :tenant_id and s.id = :stage_id
            limit 1
            """
        ),
        {"tenant_id": context["tenant_id"], "stage_id": stage_id},
    )
    row = result.mappings().one_or_none()
    if not row:
        return None
    stage = row_to_dict(row)
    if stage.get("company_id"):
        assert_company_scope(context, str(stage["company_id"]))
    return stage


async def first_active_stage(session: AsyncSession, context: dict[str, Any], pipeline_id: str) -> dict[str, Any]:
    result = await session.execute(
        text(
            """
            select *
            from public.crm_pipeline_stages
            where tenant_id = :tenant_id
              and pipeline_id = :pipeline_id
              and active = true
              and stage_type = 'open'
            order by order_index asc
            limit 1
            """
        ),
        {"tenant_id": context["tenant_id"], "pipeline_id": pipeline_id},
    )
    row = result.mappings().one_or_none()
    if not row:
        raise DomainError("Pipeline icin aktif acik asama bulunamadi.", "CRM_PIPELINE_STAGE_MISSING", status.HTTP_409_CONFLICT)
    return row_to_dict(row)


async def update_pipeline_stage(session: AsyncSession, context: dict[str, Any], stage_id: str, request: PipelineStageUpdateRequest) -> dict[str, Any]:
    current = await get_pipeline_stage(session, context, stage_id)
    if not current:
        raise DomainError("Pipeline asamasi bulunamadi.", "CRM_PIPELINE_STAGE_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    if current.get("company_id"):
        assert_company_scope(context, str(current["company_id"]), write=True)
    data = request.model_dump(exclude_unset=True)
    if not data:
        return current
    set_parts = [f"{key} = :{key}" for key in data]
    set_parts.append("updated_at = now()")
    result = await session.execute(
        text(
            f"""
            update public.crm_pipeline_stages
            set {", ".join(set_parts)}
            where tenant_id = :tenant_id and id = :stage_id
            returning *
            """
        ),
        {"tenant_id": context["tenant_id"], "stage_id": stage_id, **data},
    )
    return row_to_dict(result.mappings().one())
