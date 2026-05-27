from app.domains.action_center.service import filter_record_items


def test_action_center_filters_by_record() -> None:
    items = [
        {"entity_type": "company", "entity_id": "c1", "item_type": "task"},
        {"entity_type": "branch", "entity_id": "b1", "item_type": "approval"},
    ]
    assert filter_record_items(items, entity_type="company", entity_id="c1") == [items[0]]
