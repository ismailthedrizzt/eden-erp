from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.domains.operations.service import table_exists


async def integration_statuses(session: AsyncSession, tenant_id: str) -> list[dict[str, Any]]:
    _ = tenant_id
    settings = get_settings()
    database_ready = bool(settings.database_url)
    cards = [
        _card("supabase_auth", "Supabase Auth", bool(settings.supabase_url), "Kimlik dogrulama"),
        _card("supabase_storage", "Supabase Storage", bool(settings.supabase_url), "Belge saklama"),
        _card("fastapi_backend", "FastAPI Backend", True, "Canonical backend"),
        _card("postgresql", "PostgreSQL Database", database_ready, "Veri deposu"),
        _card(
            "email_smtp",
            "Email / SMTP",
            bool(settings.email_enabled and settings.smtp_host),
            "E-posta kanali",
        ),
        _card(
            "outbox_worker",
            "Outbox Worker",
            await table_exists(session, "public.outbox_events"),
            "Event dispatch",
        ),
        _card("openapi_client", "OpenAPI Client", True, "Backend contract"),
        _card("efatura_future", "e-Fatura / e-Arsiv", False, "Future entegrasyon", disabled=True),
        _card("bank_api_future", "Banka API", False, "Future entegrasyon", disabled=True),
        _card("sgk_future", "SGK", False, "Future entegrasyon", disabled=True),
        _card("gib_future", "GIB", False, "Future entegrasyon", disabled=True),
    ]
    return cards


async def test_integration(
    session: AsyncSession,
    tenant_id: str,
    integration_key: str,
) -> dict[str, Any]:
    cards = {
        card["integration_key"]: card
        for card in await integration_statuses(session, tenant_id)
    }
    card = cards.get(integration_key)
    if not card:
        return {
            "integration_key": integration_key,
            "status": "missing",
            "message": "Entegrasyon bulunamadi.",
        }
    return {
        **card,
        "last_checked_at": None,
        "message": "Secret degerleri gosterilmeden konfigurasyon durumu kontrol edildi.",
    }


def _card(
    key: str,
    label: str,
    configured: bool,
    description: str,
    *,
    disabled: bool = False,
) -> dict[str, Any]:
    status = "disabled" if disabled else "configured" if configured else "missing"
    return {
        "integration_key": key,
        "label": label,
        "status": status,
        "description": description,
        "secret_visible": False,
        "configured": configured,
    }
