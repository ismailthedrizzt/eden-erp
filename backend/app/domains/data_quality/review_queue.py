# ruff: noqa: E501

from __future__ import annotations

from typing import Any
from uuid import uuid4

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.serialization import row_to_dict, rows_to_dicts
from app.domains.data_quality.schemas import DuplicateCandidateGroupDraft


async def persist_duplicate_group(
    session: AsyncSession,
    tenant_id: str,
    draft: DuplicateCandidateGroupDraft,
) -> dict[str, Any]:
    result = await session.execute(
        text(
            """
            insert into public.duplicate_candidate_groups (
              id, tenant_id, entity_type, duplicate_group_key, match_score,
              match_reason, severity, status, suggested_master_id, created_at, updated_at
            )
            values (
              :id, :tenant_id, :entity_type, :duplicate_group_key, :match_score,
              :match_reason, :severity, 'open', :suggested_master_id, now(), now()
            )
            on conflict (tenant_id, duplicate_group_key)
            do update set
              match_score = excluded.match_score,
              match_reason = excluded.match_reason,
              severity = excluded.severity,
              suggested_master_id = excluded.suggested_master_id,
              status = case
                when public.duplicate_candidate_groups.status in ('dismissed', 'false_positive', 'merged')
                then public.duplicate_candidate_groups.status
                else 'open'
              end,
              updated_at = now()
            returning *
            """
        ),
        {
            "id": str(uuid4()),
            "tenant_id": tenant_id,
            "entity_type": draft.entity_type,
            "duplicate_group_key": draft.duplicate_group_key,
            "match_score": draft.match_score,
            "match_reason": draft.match_reason,
            "severity": draft.severity,
            "suggested_master_id": draft.suggested_master_id,
        },
    )
    group = row_to_dict(result.mappings().one()) or {}
    group_id = str(group["id"])
    await session.execute(
        text("delete from public.duplicate_candidate_items where tenant_id = :tenant_id and group_id = :group_id"),
        {"tenant_id": tenant_id, "group_id": group_id},
    )
    for item in draft.items:
        await session.execute(
            text(
                """
                insert into public.duplicate_candidate_items (
                  id, tenant_id, group_id, entity_type, entity_id, display_name,
                  match_fields, is_suggested_master, created_at
                )
                values (
                  :id, :tenant_id, :group_id, :entity_type, :entity_id, :display_name,
                  cast(:match_fields as jsonb), :is_suggested_master, now()
                )
                """
            ),
            {
                "id": str(uuid4()),
                "tenant_id": tenant_id,
                "group_id": group_id,
                "entity_type": item.entity_type,
                "entity_id": item.entity_id,
                "display_name": item.display_name,
                "match_fields": _json(item.match_fields),
                "is_suggested_master": item.is_suggested_master,
            },
        )
    return group


async def list_groups(
    session: AsyncSession,
    tenant_id: str,
    *,
    entity_type: str | None = None,
    status: str | None = None,
    severity: str | None = None,
    limit: int = 100,
) -> list[dict[str, Any]]:
    where = ["g.tenant_id = :tenant_id"]
    params: dict[str, Any] = {"tenant_id": tenant_id, "limit": min(max(limit, 1), 200)}
    if entity_type:
        where.append("g.entity_type = :entity_type")
        params["entity_type"] = entity_type
    if status:
        where.append("g.status = :status")
        params["status"] = status
    if severity:
        where.append("g.severity = :severity")
        params["severity"] = severity
    result = await session.execute(
        text(
            f"""
            select g.*,
                   count(i.id)::int as candidate_count
            from public.duplicate_candidate_groups g
            left join public.duplicate_candidate_items i
              on i.tenant_id = g.tenant_id and i.group_id = g.id
            where {" and ".join(where)}
            group by g.id
            order by
              case g.severity when 'exact' then 1 when 'strong' then 2 else 3 end,
              g.match_score desc,
              g.created_at desc
            limit :limit
            """
        ),
        params,
    )
    return rows_to_dicts(result.mappings().all())


async def get_group(session: AsyncSession, tenant_id: str, group_id: str) -> dict[str, Any] | None:
    result = await session.execute(
        text("select * from public.duplicate_candidate_groups where tenant_id = :tenant_id and id = :group_id limit 1"),
        {"tenant_id": tenant_id, "group_id": group_id},
    )
    group = row_to_dict(result.mappings().one_or_none())
    if not group:
        return None
    items = await session.execute(
        text(
            """
            select *
            from public.duplicate_candidate_items
            where tenant_id = :tenant_id and group_id = :group_id
            order by is_suggested_master desc, created_at asc
            """
        ),
        {"tenant_id": tenant_id, "group_id": group_id},
    )
    group["items"] = rows_to_dicts(items.mappings().all())
    return group


async def update_group_status(
    session: AsyncSession,
    tenant_id: str,
    group_id: str,
    *,
    status_value: str,
    user_id: str | None,
    notes: str | None,
) -> dict[str, Any] | None:
    result = await session.execute(
        text(
            """
            update public.duplicate_candidate_groups
            set status = :status,
                reviewed_by = :reviewed_by,
                reviewed_at = now(),
                resolution_notes = :resolution_notes,
                updated_at = now()
            where tenant_id = :tenant_id and id = :group_id
            returning *
            """
        ),
        {
            "tenant_id": tenant_id,
            "group_id": group_id,
            "status": status_value,
            "reviewed_by": user_id,
            "resolution_notes": notes,
        },
    )
    return row_to_dict(result.mappings().one_or_none())


def _json(value: Any) -> str:
    import json

    return json.dumps(value, ensure_ascii=True, default=str)
