from __future__ import annotations

from app.projections.hydration import display_name_from_partner


def test_partner_display_name_preserves_record_status() -> None:
    row = {
        "first_name": "Ada",
        "last_name": "Lovelace",
        "record_status": "active",
    }

    assert display_name_from_partner(row) == "Ada Lovelace"
    assert row["record_status"] == "active"
