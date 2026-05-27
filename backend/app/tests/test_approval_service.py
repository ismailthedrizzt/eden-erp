from app.domains.process.approvals import approval_decision_patch


def test_approval_decision_patch_sets_approver_note() -> None:
    patch = approval_decision_patch("approved", "user-1", "uygun")
    assert patch == {
        "status": "approved",
        "approver_id": "user-1",
        "decision_note": "uygun",
    }
