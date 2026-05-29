# ruff: noqa: E501

from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.operations.service import table_exists
from app.domains.portal.access import PortalAccessContext
from app.domains.portal.service import row_to_dict


async def list_portal_notifications(session: AsyncSession, ctx: PortalAccessContext) -> list[dict[str, object]]:
    if not await table_exists(session, "public.notifications"):
        return []
    result = await session.execute(
        text(
            """
            select id, notification_type, title, message, priority, read_at, created_at
            from public.notifications
            where tenant_id = :tenant_id
              and (user_id = :auth_user_id or user_id = :portal_user_id)
            order by created_at desc
            limit 50
            """
        ),
        {"tenant_id": ctx.tenant_id, "auth_user_id": ctx.auth_user_id, "portal_user_id": ctx.portal_user_id},
    )
    return [row_to_dict(row) for row in result.mappings()]


async def mark_portal_notification_read(session: AsyncSession, ctx: PortalAccessContext, notification_id: str) -> dict[str, object]:
    if not await table_exists(session, "public.notifications"):
        return {"id": notification_id, "read": True}
    result = await session.execute(
        text(
            """
            update public.notifications
            set read_at = coalesce(read_at, now())
            where tenant_id = :tenant_id
              and id = :notification_id
              and (user_id = :auth_user_id or user_id = :portal_user_id)
            returning id, read_at
            """
        ),
        {"tenant_id": ctx.tenant_id, "notification_id": notification_id, "auth_user_id": ctx.auth_user_id, "portal_user_id": ctx.portal_user_id},
    )
    return row_to_dict(result.mappings().one_or_none()) or {"id": notification_id, "read": True}
