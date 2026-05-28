from __future__ import annotations

import argparse
import asyncio
import logging

from app.core.config import get_settings
from app.core.database import get_session_factory
from app.core.logging import configure_logging, log_info
from app.domains.notifications.reminders import process_due_reminders

logger = logging.getLogger(__name__)


async def run_once() -> dict[str, int]:
    settings = get_settings()
    async with get_session_factory()() as session:
        async with session.begin():
            result = await process_due_reminders(
                session,
                {"module_key": "notifications"},
                batch_size=settings.reminder_batch_size,
            )
    logger.info("Reminder worker summary: %s", result)
    log_info("Reminder worker batch completed.", logger_name="eden.worker", result=result)
    return result


async def run_loop() -> None:
    settings = get_settings()
    while True:
        await run_once()
        await asyncio.sleep(settings.reminder_poll_interval_seconds)


def main() -> None:
    parser = argparse.ArgumentParser(description="Eden ERP reminder worker")
    parser.add_argument("--once", action="store_true", help="Process one batch and exit.")
    args = parser.parse_args()
    configure_logging(get_settings())
    if args.once:
        asyncio.run(run_once())
    else:
        asyncio.run(run_loop())


if __name__ == "__main__":
    main()
