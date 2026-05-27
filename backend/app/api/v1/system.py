from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_session
from app.domains.outbox.service import dispatch_pending_events

router = APIRouter()

SessionDep = Annotated[AsyncSession, Depends(get_session)]


def _bearer_token(value: str | None) -> str | None:
    if not value:
        return None
    if value.lower().startswith("bearer "):
        return value[7:].strip()
    return value


def _assert_system_secret(authorization: str | None, secret: str | None) -> None:
    settings = get_settings()
    provided = _bearer_token(authorization) or secret
    expected = settings.internal_backend_token or settings.cron_secret
    if not expected or provided != expected:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error": "Sistem gorevi icin yetki dogrulanamadi.",
                "code": "SYSTEM_UNAUTHORIZED",
                "message": "Sistem gorevi icin yetki dogrulanamadi.",
            },
        )


@router.post("/outbox/dispatch")
async def dispatch_outbox(
    session: SessionDep,
    authorization: str | None = Header(default=None),
    secret: str | None = Query(default=None),
    limit: int | None = Query(default=None),
) -> dict[str, int | list[str]]:
    _assert_system_secret(authorization, secret)
    settings = get_settings()
    batch_size = limit or settings.outbox_batch_size
    async with session.begin():
        return await dispatch_pending_events(
            session,
            batch_size=max(1, min(batch_size, 100)),
            locked_by=settings.worker_id,
        )
