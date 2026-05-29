from __future__ import annotations

from datetime import date
from typing import Any

from fastapi import status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.domains.after_sales.assets import get_asset


async def warranty_check(
    session: AsyncSession,
    context: dict[str, Any],
    asset_id: str,
    *,
    service_date: date | None = None,
) -> dict[str, Any]:
    asset = await get_asset(session, context["tenant_id"], asset_id)
    if not asset:
        raise DomainError(
            "Kurulu urun kaydi bulunamadi.",
            "INSTALLED_ASSET_NOT_FOUND",
            status.HTTP_404_NOT_FOUND,
        )
    check_date = service_date or date.today()
    status_value = str(asset.get("warranty_status") or "unknown")
    start = asset.get("warranty_start_date")
    end = asset.get("warranty_end_date")
    if status_value == "void":
        result = "void"
    elif end and check_date > end:
        result = "out_of_warranty"
    elif start and check_date < start:
        result = "unknown"
    elif end:
        result = "in_warranty"
    else:
        result = (
            status_value
            if status_value in {"in_warranty", "out_of_warranty", "unknown", "void"}
            else "unknown"
        )
    billable_warning = result in {"out_of_warranty", "void"}
    return {
        "asset_id": asset_id,
        "service_date": check_date,
        "warranty_start_date": start,
        "warranty_end_date": end,
        "warranty_status": result,
        "warranty_covered_default": result == "in_warranty",
        "billable_warning": billable_warning,
        "notes": "Garanti disi servis ucretlendirilebilir." if billable_warning else None,
    }
