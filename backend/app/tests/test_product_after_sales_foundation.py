from __future__ import annotations

# ruff: noqa: E501, I001

from datetime import date

from app.domains.after_sales.maintenance import is_maintenance_due
from app.domains.after_sales.schemas import InstalledAssetCreateRequest, ServiceRecordCompleteRequest, ServiceRequestCreateRequest
from app.domains.products.schemas import ProductCreateRequest
from app.domains.products.service import add_months, warranty_status_for
from app.policies.permissions import permission_exists, resolve_permission_with_fallback
from app.setup.readiness_registry import get_readiness_definition


def test_product_catalog_defaults_are_service_ready() -> None:
    request = ProductCreateRequest(product_name="PlaneGuard", after_sales_enabled=True)

    assert request.product_type == "physical_product"
    assert request.serviceable is True
    assert request.sale_enabled is True
    assert request.after_sales_enabled is True


def test_warranty_helpers_calculate_end_and_status() -> None:
    assert add_months(date(2026, 1, 31), 1) == date(2026, 2, 28)
    assert warranty_status_for(date(2026, 12, 31), today=date(2026, 5, 28)) == "in_warranty"
    assert warranty_status_for(date(2025, 12, 31), today=date(2026, 5, 28)) == "out_of_warranty"


def test_after_sales_request_and_completion_contracts() -> None:
    asset = InstalledAssetCreateRequest(
        owning_company_id="00000000-0000-4000-8000-000000000001",
        customer_name="Demo Musteri",
        product_id="00000000-0000-4000-8000-000000000002",
        serial_no="PG-001",
    )
    request = ServiceRequestCreateRequest(
        company_id=asset.owning_company_id,
        customer_name=asset.customer_name,
        subject="PlaneGuard ariza talebi",
        create_project_task=True,
    )
    completion = ServiceRecordCompleteRequest(result="follow_up_required")

    assert request.request_type == "fault"
    assert request.create_project_task is True
    assert completion.create_followup_task is False
    assert completion.result == "follow_up_required"


def test_maintenance_due_helper() -> None:
    assert is_maintenance_due(date(2026, 5, 1), today=date(2026, 5, 28)) is True
    assert is_maintenance_due(date(2026, 6, 1), today=date(2026, 5, 28)) is False


def test_permissions_and_readiness_are_registered() -> None:
    for key in [
        "products.view",
        "products.create",
        "afterSales.view",
        "afterSales.assetCreate",
        "afterSales.requestAssign",
        "afterSales.serviceComplete",
    ]:
        assert permission_exists(key)

    assert "product_services.view" in resolve_permission_with_fallback("products.view")
    assert get_readiness_definition("product_services") is not None
    after_sales = get_readiness_definition("after_sales")
    assert after_sales is not None
    assert "after_sales_service_records" in after_sales.required_tables
