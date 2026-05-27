import pytest

from app.domains.outbox.handlers import resolve_handlers


@pytest.mark.asyncio
async def test_noop_handlers_return_completed_payloads() -> None:
    handlers = resolve_handlers({"id": "event-1", "event_type": "process.started"})
    results = []
    for handler in handlers.values():
        results.append(await handler(None, {"id": "event-1"}))  # type: ignore[arg-type]

    assert len(results) >= 1
    assert all(result["status"] == "noop" for result in results)
