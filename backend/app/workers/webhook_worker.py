from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import RequestContext
from app.domains.integrations.deliveries import deliver_webhook_row, list_due_deliveries
from app.domains.integrations.service import IntegrationContext, ensure_integration_tables

DEFAULT_BATCH_SIZE = 20


async def run_due_webhook_deliveries(
    session: AsyncSession,
    tenant_id: str,
    *,
    batch_size: int = DEFAULT_BATCH_SIZE,
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
    await ensure_integration_tables(
        session,
        deliveries=True,
        subscriptions=True,
        credentials=True,
        apps=True,
    )
    deliveries = await list_due_deliveries(ctx, limit=batch_size)
    delivered = 0
    failed = 0
    skipped = 0
    dead_letter = 0
    for delivery in deliveries:
        result = await deliver_webhook_row(ctx, delivery)
        status = str(result.get("status") or "")
        if status == "delivered":
            delivered += 1
        elif status == "dead_letter":
            dead_letter += 1
        elif status == "skipped":
            skipped += 1
        else:
            failed += 1
    return {
        "processed": len(deliveries),
        "delivered": delivered,
        "failed": failed,
        "skipped": skipped,
        "dead_letter": dead_letter,
    }
