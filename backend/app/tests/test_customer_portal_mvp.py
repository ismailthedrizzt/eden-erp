# ruff: noqa: E501

from __future__ import annotations

from typing import Any

from app.domains.portal.access import (
    PortalAccessContext,
    allowed_asset_ids,
    can_create_service_request,
    customer_scope_values,
)
from app.domains.portal.service import (
    portal_status_label,
    public_request_payload,
    public_service_record_payload,
)
from app.policies.permissions import PERMISSIONS
from app.setup.readiness_registry import get_readiness_definition


def portal_context(**overrides: object) -> PortalAccessContext:
    base: dict[str, Any] = {
        "tenant_id": "00000000-0000-0000-0000-000000000000",
        "portal_user_id": "11111111-1111-1111-1111-111111111111",
        "auth_user_id": "22222222-2222-2222-2222-222222222222",
        "external_user_type": "customer",
        "stakeholder_id": "33333333-3333-3333-3333-333333333333",
        "customer_account_id": "44444444-4444-4444-4444-444444444444",
        "master_organization_id": "55555555-5555-5555-5555-555555555555",
        "portal_role": "customer_user",
        "status": "active",
        "access_scope": {},
        "preferences": {},
        "stakeholder": {"related_cari_account_id": "66666666-6666-6666-6666-666666666666", "master_entity_id": "77777777-7777-7777-7777-777777777777"},
    }
    base.update(overrides)
    return PortalAccessContext(**base)


def test_portal_statuses_are_customer_friendly() -> None:
    assert portal_status_label("triage") == "inceleniyor"
    assert portal_status_label("waiting_customer") == "musteri_bekleniyor"
    assert portal_status_label("closed") == "kapandi"


def test_portal_scope_values_include_customer_links() -> None:
    values = set(customer_scope_values(portal_context()))
    assert "33333333-3333-3333-3333-333333333333" in values
    assert "44444444-4444-4444-4444-444444444444" in values
    assert "55555555-5555-5555-5555-555555555555" in values
    assert "66666666-6666-6666-6666-666666666666" in values


def test_portal_role_and_scope_defaults_are_restrictive() -> None:
    assert can_create_service_request(portal_context())
    assert not can_create_service_request(portal_context(portal_role="customer_viewer"))
    scoped = portal_context(access_scope={"allowed_asset_ids": ["asset-1"], "can_create_service_request": False})
    assert allowed_asset_ids(scoped) == ["asset-1"]
    assert not can_create_service_request(scoped)


def test_public_payload_hides_internal_service_fields() -> None:
    payload = public_request_payload(
        {
            "id": "request-1",
            "status": "triage",
            "subject": "Ariza",
            "notes": "internal",
            "required_skills": ["private"],
            "suggested_technician_user_id": "user-1",
        }
    )
    assert payload["portal_status"] == "inceleniyor"
    assert "notes" not in payload
    assert "required_skills" not in payload
    assert "suggested_technician_user_id" not in payload


def test_public_service_record_hides_costs_and_internal_notes() -> None:
    payload = public_service_record_payload(
        {
            "id": "record-1",
            "notes": "internal",
            "parts_used": [{"item_name": "Batarya", "quantity": 1, "unit_cost": 500, "internal_cost": 400}],
        }
    )
    assert "notes" not in payload
    assert payload["parts_used"] == [{"item_name": "Batarya", "quantity": 1}]


def test_customer_portal_permissions_and_readiness_registered() -> None:
    for permission in [
        "portal.manageUsers",
        "portal.inviteUsers",
        "portal.suspendUsers",
        "portal.viewActivity",
        "portal.shareDocuments",
    ]:
        assert permission in PERMISSIONS

    definition = get_readiness_definition("customerPortal")
    assert definition is not None
    assert "portal_external_users" in definition.required_tables
    assert "portal_shared_documents" in definition.optional_tables
