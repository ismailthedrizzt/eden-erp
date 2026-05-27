from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.setup.readiness_checker import check_tenant_readiness
from app.setup.schemas import TenantReadinessResult


async def get_tenant_readiness(
    session: AsyncSession,
    tenant_id: str,
) -> TenantReadinessResult:
    return await check_tenant_readiness(session, tenant_id)
