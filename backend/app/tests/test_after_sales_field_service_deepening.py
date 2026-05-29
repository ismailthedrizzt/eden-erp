from __future__ import annotations

from datetime import date

from app.domains.after_sales.checklists import missing_required_items
from app.domains.after_sales.maintenance import next_run_date
from app.domains.after_sales.schemas import (
    ChecklistTemplateCreateRequest,
    FieldAssignmentStatusRequest,
    MaintenancePlanCreateRequest,
    ServiceRecordPhotosRequest,
    ServiceRequestAssignTechnicianRequest,
    ServiceRequestCreateRequest,
)
from app.policies.permissions import permission_exists
from app.setup.readiness_registry import get_readiness_definition


def test_maintenance_plan_contract_and_next_run_date() -> None:
    request = MaintenancePlanCreateRequest(
        plan_name="PlaneGuard 90 gunluk bakim",
        product_id="00000000-0000-4000-8000-000000000001",
        interval_type="days",
        interval_value=90,
        next_run_date=date(2026, 8, 27),
    )
    assert request.maintenance_type == "periodic"
    assert next_run_date(request.model_dump(), date(2026, 5, 29)) == date(2026, 8, 27)


def test_service_request_triage_and_assignment_contracts() -> None:
    request = ServiceRequestCreateRequest(
        company_id="00000000-0000-4000-8000-000000000001",
        customer_name="GlassTech",
        subject="Periyodik bakim",
        status="scheduled",
        warranty_check_result="in_warranty",
        estimated_duration_minutes=120,
        required_skills=["iot", "calibration"],
        required_parts_preview=[{"item_name": "Filtre", "quantity": 1}],
    )
    assignment = ServiceRequestAssignTechnicianRequest(
        technician_user_id="00000000-0000-4000-8000-000000000010",
        create_project_task=True,
    )
    transition = FieldAssignmentStatusRequest(status="in_progress")

    assert request.status == "scheduled"
    assert request.required_skills == ["iot", "calibration"]
    assert assignment.create_project_task is True
    assert transition.status == "in_progress"


def test_checklist_required_validation_and_photo_contract() -> None:
    template = ChecklistTemplateCreateRequest(
        checklist_name="Bakim checklist",
        service_type="maintenance",
        items=[
            {
                "key": "visual_check",
                "label": "Gorsel kontrol",
                "type": "checkbox",
                "required": True,
            },
            {"key": "note", "label": "Not", "type": "text", "required": False},
        ],
    )
    photos = ServiceRecordPhotosRequest(
        photos=[{"document_id": "doc-1", "file_name": "service.jpg"}]
    )

    assert missing_required_items(template.items, {}) == ["visual_check"]
    assert missing_required_items(template.items, {"visual_check": True}) == []
    assert photos.photos[0]["document_id"] == "doc-1"


def test_permissions_and_readiness_include_field_service_deepening() -> None:
    for key in [
        "afterSales.maintenanceView",
        "afterSales.maintenanceManage",
        "afterSales.fieldServiceView",
        "afterSales.fieldServiceAssign",
        "afterSales.fieldServiceExecute",
        "afterSales.checklistManage",
        "afterSales.serviceReportView",
        "afterSales.warrantyOverride",
    ]:
        assert permission_exists(key)

    readiness = get_readiness_definition("after_sales")
    assert readiness is not None
    assert "after_sales_maintenance_plans" in readiness.optional_tables
    assert "after_sales_field_assignments" in readiness.optional_tables
