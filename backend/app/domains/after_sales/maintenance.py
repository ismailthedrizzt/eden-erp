from __future__ import annotations

from datetime import date


def is_maintenance_due(next_maintenance_date: date | None, today: date | None = None) -> bool:
    if not next_maintenance_date:
        return False
    return next_maintenance_date <= (today or date.today())
