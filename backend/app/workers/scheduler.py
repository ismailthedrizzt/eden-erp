from __future__ import annotations

import asyncio

from app.workers.outbox_worker import run_once


async def run_scheduler_once() -> dict[str, int | list[str]]:
    return await run_once()


def main() -> None:
    asyncio.run(run_scheduler_once())


if __name__ == "__main__":
    main()
