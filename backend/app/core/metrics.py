from __future__ import annotations

from dataclasses import dataclass, field
from threading import Lock
from typing import Any


@dataclass
class DurationSummary:
    count: int = 0
    total_ms: float = 0
    min_ms: float | None = None
    max_ms: float | None = None

    def observe(self, value_ms: float) -> None:
        self.count += 1
        self.total_ms += value_ms
        self.min_ms = value_ms if self.min_ms is None else min(self.min_ms, value_ms)
        self.max_ms = value_ms if self.max_ms is None else max(self.max_ms, value_ms)

    def snapshot(self) -> dict[str, float | int | None]:
        return {
            "count": self.count,
            "total_ms": round(self.total_ms, 2),
            "avg_ms": round(self.total_ms / self.count, 2) if self.count else None,
            "min_ms": round(self.min_ms, 2) if self.min_ms is not None else None,
            "max_ms": round(self.max_ms, 2) if self.max_ms is not None else None,
        }


@dataclass
class MetricsRegistry:
    counters: dict[str, int] = field(default_factory=dict)
    durations: dict[str, DurationSummary] = field(default_factory=dict)
    gauges: dict[str, float] = field(default_factory=dict)
    lock: Lock = field(default_factory=Lock)

    def increment(self, name: str, value: int = 1) -> None:
        with self.lock:
            self.counters[name] = self.counters.get(name, 0) + value

    def observe(self, name: str, value_ms: float) -> None:
        with self.lock:
            self.durations.setdefault(name, DurationSummary()).observe(value_ms)

    def set_gauge(self, name: str, value: float) -> None:
        with self.lock:
            self.gauges[name] = value

    def snapshot(self) -> dict[str, Any]:
        with self.lock:
            return {
                "counters": dict(self.counters),
                "durations": {
                    name: summary.snapshot() for name, summary in self.durations.items()
                },
                "gauges": dict(self.gauges),
            }


_registry = MetricsRegistry()


def increment_counter(name: str, value: int = 1) -> None:
    _registry.increment(name, value)


def observe_duration(name: str, value_ms: float) -> None:
    _registry.observe(name, value_ms)


def set_gauge(name: str, value: float) -> None:
    _registry.set_gauge(name, value)


def record_request(status_code: int, duration_ms: float) -> None:
    increment_counter("request_count")
    observe_duration("request_duration_ms", duration_ms)
    if status_code >= 400:
        increment_counter("error_count")


def record_operation(operation_type: str, status: str, duration_ms: float | None = None) -> None:
    increment_counter("operation_count")
    increment_counter(f"operation_{status}_count")
    increment_counter(f"operation_{operation_type}_{status}_count")
    if duration_ms is not None:
        observe_duration("operation_duration_ms", duration_ms)


def record_outbox(status: str, duration_ms: float | None = None) -> None:
    increment_counter(f"outbox_{status}_count")
    if duration_ms is not None:
        observe_duration("outbox_handler_duration_ms", duration_ms)


def record_projection(
    projection_key: str,
    *,
    duration_ms: float,
    fallback_used: bool = False,
) -> None:
    increment_counter("projection_query_count")
    increment_counter(f"projection_{projection_key}_query_count")
    observe_duration("projection_duration_ms", duration_ms)
    if fallback_used:
        increment_counter("projection_fallback_count")


def snapshot_metrics() -> dict[str, Any]:
    return _registry.snapshot()


def reset_metrics_for_tests() -> None:
    global _registry
    _registry = MetricsRegistry()
