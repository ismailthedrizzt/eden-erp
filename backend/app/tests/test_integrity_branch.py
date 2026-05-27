from __future__ import annotations

from app.integrity.checker import build_integrity_summary
from app.integrity.checks.branches import branch_can_close_result


def test_branch_closing_closed_branch_blocks() -> None:
    result = branch_can_close_result({"record_status": "closed"})
    summary = build_integrity_summary([result])

    assert result.ok is False
    assert result.severity == "blocking"
    assert summary.ok is False
    assert summary.blocking_count == 1
