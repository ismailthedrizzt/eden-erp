from app.domains.process.tasks import completed_task_patch


def test_complete_task_patch_sets_completed() -> None:
    patch = completed_task_patch("user-1", {"ok": True})
    assert patch["status"] == "completed"
    assert patch["completed_by"] == "user-1"
    assert patch["result_json"] == {"ok": True}
