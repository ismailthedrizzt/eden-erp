from __future__ import annotations

from datetime import datetime

import pytest
from pydantic import ValidationError

from app.contracts.page_flow_contracts import (
    GenericLifecycleOperationPayloadContract,
    ThemeManagementPayloadContract,
)

TENANT_ID = "11111111-1111-4111-8111-111111111111"
THEME_ENTITY_ID = "33333333-3333-4333-8333-333333333333"


def _theme_operation(operation_type: str, payload: dict[str, object]) -> GenericLifecycleOperationPayloadContract:
    return GenericLifecycleOperationPayloadContract.model_validate({
        "tenant_id": TENANT_ID,
        "operation_type": operation_type,
        "entity_type": "workspace_theme",
        "entity_id": THEME_ENTITY_ID,
        "lifecycle_state": "submitted",
        "payload_json": payload,
        "base_updated_at": "2026-06-11T10:00:00Z",
    })


def _validate_theme_json_before_activation(theme_json: dict[str, object]) -> None:
    meta = theme_json.get("meta")
    if not isinstance(meta, dict) or meta.get("scope") != "system":
        raise ValueError("Theme JSON must include meta.scope=system before activation.")


def test_theme_contract_rejects_invalid_status() -> None:
    with pytest.raises(ValidationError):
        ThemeManagementPayloadContract.model_validate({
            "tenant_id": TENANT_ID,
            "theme_key": "hikmet",
            "display_name": "Hikmet",
            "status": "published",
            "theme_json": {"meta": {"scope": "system"}},
        })


def test_theme_contract_normalizes_iso_datetime() -> None:
    payload = ThemeManagementPayloadContract.model_validate({
        "tenant_id": TENANT_ID,
        "theme_key": "hikmet",
        "display_name": "Hikmet",
        "status": "draft",
        "theme_json": {"meta": {"scope": "system"}},
        "updated_at": "2026-06-11T10:00:00Z",
    })
    assert isinstance(payload.updated_at, datetime)


def test_theme_invalid_json_rejected_before_activation() -> None:
    with pytest.raises(ValueError):
        _validate_theme_json_before_activation({"colors": {}})


def test_theme_activation_requires_lifecycle_operation() -> None:
    _validate_theme_json_before_activation({"meta": {"scope": "system"}})
    operation = _theme_operation("workspace_theme.activate", {
        "theme_key": "hikmet",
        "validation_passed": True,
        "deactivate_existing_active_theme": True,
    })
    assert operation.entity_type == "workspace_theme"
    assert operation.payload_json["validation_passed"] is True


def test_theme_import_requires_lifecycle_operation() -> None:
    operation = _theme_operation("workspace_theme.import", {
        "theme_key": "hikmet",
        "source_type": "eden_theme_json",
    })
    assert operation.operation_type == "workspace_theme.import"


def test_theme_export_requires_contract_payload() -> None:
    operation = _theme_operation("workspace_theme.export", {
        "theme_key": "hikmet",
        "format": "eden",
    })
    assert operation.payload_json["format"] == "eden"


def test_theme_asset_upload_requires_contract_payload() -> None:
    operation = _theme_operation("workspace_theme.asset_upload", {
        "theme_key": "hikmet",
        "slot_id": "light_page_banner",
        "asset_kind": "image",
    })
    assert operation.payload_json["slot_id"] == "light_page_banner"
