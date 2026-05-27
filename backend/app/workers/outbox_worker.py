from __future__ import annotations

import argparse
import asyncio
import logging

from app.core.config import get_settings
from app.core.database import get_session_factory
from app.core.logging import configure_logging, log_info
from app.domains.outbox.service import dispatch_pending_events, release_stale_locks

logger = logging.getLogger(__name__)


async def run_once() -> dict[str, int | list[str]]:
    settings = get_settings()
    log_info(
        "Outbox worker batch starting.",
        logger_name="eden.worker",
        worker_id=settings.worker_id,
        batch_size=settings.outbox_batch_size,
        max_runtime_ms=settings.outbox_max_runtime_ms,
        lock_ttl_seconds=settings.outbox_lock_ttl_seconds,
        max_retries=settings.outbox_max_retries,
    )
    async with get_session_factory()() as session:
        async with session.begin():
            await release_stale_locks(session, lock_ttl_seconds=settings.outbox_lock_ttl_seconds)
            result = await dispatch_pending_events(
                session,
                batch_size=settings.outbox_batch_size,
                locked_by=settings.worker_id,
            )
    logger.info("Outbox dispatch summary: %s", result)
    log_info(
        "Outbox worker batch completed.",
        logger_name="eden.worker",
        worker_id=settings.worker_id,
        result=result,
    )
    return result


async def run_loop() -> None:
    settings = get_settings()
    while True:
        await run_once()
        await asyncio.sleep(settings.outbox_poll_interval_seconds)


def main() -> None:
    parser = argparse.ArgumentParser(description="Eden ERP outbox worker")
    parser.add_argument("--once", action="store_true", help="Process one batch and exit.")
    args = parser.parse_args()
    settings = get_settings()
    configure_logging(settings)
    log_info(
        "Outbox worker starting.",
        logger_name="eden.worker",
        worker_id=settings.worker_id,
        batch_size=settings.outbox_batch_size,
        poll_interval=settings.outbox_poll_interval_seconds,
        max_runtime_ms=settings.outbox_max_runtime_ms,
        lock_ttl_seconds=settings.outbox_lock_ttl_seconds,
        max_retries=settings.outbox_max_retries,
    )
    if args.once:
        asyncio.run(run_once())
    else:
        asyncio.run(run_loop())


if __name__ == "__main__":
    main()
