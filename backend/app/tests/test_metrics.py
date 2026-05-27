from __future__ import annotations

from app.core.metrics import (
    increment_counter,
    observe_duration,
    record_outbox,
    reset_metrics_for_tests,
    snapshot_metrics,
)


def test_metrics_counter_and_duration_snapshot() -> None:
    reset_metrics_for_tests()

    increment_counter("request_count")
    observe_duration("request_duration_ms", 25)

    snapshot = snapshot_metrics()

    assert snapshot["counters"]["request_count"] == 1
    assert snapshot["durations"]["request_duration_ms"]["count"] == 1
    assert snapshot["durations"]["request_duration_ms"]["avg_ms"] == 25


def test_outbox_failed_metric_increments() -> None:
    reset_metrics_for_tests()

    record_outbox("failed", 10)

    snapshot = snapshot_metrics()

    assert snapshot["counters"]["outbox_failed_count"] == 1
    assert snapshot["durations"]["outbox_handler_duration_ms"]["count"] == 1
