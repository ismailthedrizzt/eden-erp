from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import RequestContext
from app.domains.integrations.deliveries import create_deliveries_for_outbox_event
from app.domains.integrations.service import IntegrationContext, ensure_integration_tables


async def webhook_subscription_handler(
    session: AsyncSession,
    tenant_id: str,
    outbox_event: dict[str, Any],
) -> dict[str, Any]:
    ctx = IntegrationContext(
        session=session,
        request_context=RequestContext(
            tenant_id=tenant_id,
            user_id=None,
            permissions=["integrations.admin", "system.admin"],
        ),
        tenant_id=tenant_id,
    )
    await ensure_integration_tables(session, apps=True, subscriptions=True, deliveries=True)
    deliveries = await create_deliveries_for_outbox_event(ctx, outbox_event)
    return {"created": len(deliveries), "deliveries": deliveries}
