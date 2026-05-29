from __future__ import annotations

import pytest

from app.seeds.demo_data.common import DEMO_TENANT_ID
from app.seeds.demo_seed import DemoSeedOptions, assert_seed_allowed, build_demo_seed_plan


def test_demo_seed_plan_contains_core_pilot_tables() -> None:
    plan = build_demo_seed_plan(DemoSeedOptions(dry_run=True))
    summary = plan.summary()
    tables = summary["records_by_table"]

    assert summary["tenant_id"] == DEMO_TENANT_ID
    assert tables["companies"] >= 4
    assert tables["security_users_profile"] >= 7
    assert tables["project_projects"] >= 1
    assert tables["documents"] >= 3
    assert tables["data_quality_findings"] >= 2


def test_demo_seed_plan_marks_records_as_demo_data() -> None:
    plan = build_demo_seed_plan(DemoSeedOptions(dry_run=True))

    metadata_rows = [
        record.values["metadata_json"]
        for record in plan.records
        if isinstance(record.values.get("metadata_json"), dict)
    ]

    assert metadata_rows
    assert all(row.get("demo_data") is True for row in metadata_rows)


def test_demo_seed_blocks_production_mutations() -> None:
    with pytest.raises(RuntimeError):
        assert_seed_allowed("production", dry_run=False)


def test_demo_seed_allows_production_dry_run() -> None:
    assert_seed_allowed("production", dry_run=True)

