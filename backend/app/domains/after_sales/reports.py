# ruff: noqa: E501

from __future__ import annotations

from html import escape
from typing import Any

from fastapi import status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.domains.after_sales.checklists import get_service_checklist
from app.domains.after_sales.service import row_to_dict
from app.domains.after_sales.service_records import get_service_record
from app.domains.operations.service import table_exists


async def service_report_preview(session: AsyncSession, context: dict[str, Any], service_id: str) -> dict[str, Any]:
    service_record = await get_service_record(session, context["tenant_id"], service_id)
    if not service_record:
        raise DomainError("Servis kaydi bulunamadi.", "SERVICE_RECORD_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    detail_result = await session.execute(
        text(
            """
            select s.*,
              r.request_no, r.subject, r.description as request_description, r.customer_name,
              r.contact_person, r.contact_phone, r.contact_email, r.location,
              a.product_code, a.product_name, a.serial_no, a.asset_tag,
              a.warranty_start_date, a.warranty_end_date, a.warranty_status,
              a.address, a.city, a.district
            from public.after_sales_service_records s
            left join public.after_sales_service_requests r on r.tenant_id = s.tenant_id and r.id = s.service_request_id
            left join public.after_sales_installed_assets a on a.tenant_id = s.tenant_id and a.id = s.installed_asset_id
            where s.tenant_id = :tenant_id and s.id = :service_id
            limit 1
            """
        ),
        {"tenant_id": context["tenant_id"], "service_id": service_id},
    )
    detail = row_to_dict(detail_result.mappings().one())
    checklist = await get_service_checklist(session, context, service_id)
    documents = await _service_documents(session, context, service_id)
    report_data = {
        "service_no": detail.get("service_no"),
        "customer": {
            "name": detail.get("customer_name"),
            "contact_person": detail.get("contact_person"),
            "contact_phone": detail.get("contact_phone"),
            "contact_email": detail.get("contact_email"),
            "location": detail.get("location") or detail.get("address"),
        },
        "installed_asset": {
            "id": detail.get("installed_asset_id"),
            "product_code": detail.get("product_code"),
            "product_name": detail.get("product_name"),
            "serial_no": detail.get("serial_no"),
            "asset_tag": detail.get("asset_tag"),
        },
        "technician": {
            "user_id": detail.get("technician_user_id"),
            "employee_id": detail.get("technician_employee_id"),
        },
        "service": {
            "date": detail.get("service_date"),
            "type": detail.get("service_type"),
            "status": detail.get("status"),
            "fault_description": detail.get("fault_description") or detail.get("request_description"),
            "work_performed": detail.get("work_performed"),
            "result": detail.get("result"),
            "next_action": detail.get("next_action"),
            "next_service_date": detail.get("next_service_date"),
        },
        "warranty": {
            "status": detail.get("warranty_status"),
            "covered": detail.get("warranty_covered"),
            "start_date": detail.get("warranty_start_date"),
            "end_date": detail.get("warranty_end_date"),
        },
        "checklist": checklist,
        "parts_used": detail.get("parts_used") or [],
        "photos": detail.get("photos") or [],
        "documents": documents,
        "customer_signature_placeholder": detail.get("customer_signature_file") or {"status": "future"},
    }
    return {
        "service_record": detail,
        "report_data": report_data,
        "html_preview": _render_html(report_data),
        "pdf_generation": {"available": False, "known_gap": "PDF service report generation sonraki fazdadir."},
    }


async def _service_documents(session: AsyncSession, context: dict[str, Any], service_id: str) -> list[dict[str, Any]]:
    if not await table_exists(session, "public.documents"):
        return []
    result = await session.execute(
        text(
            """
            select id, document_type, title, file_name, mime_type, file_size, relation_type, status, created_at
            from public.documents
            where tenant_id = :tenant_id
              and owner_entity_type = 'service_record'
              and owner_entity_id = :service_id
              and coalesce(is_deleted, false) = false
            order by created_at desc
            """
        ),
        {"tenant_id": context["tenant_id"], "service_id": service_id},
    )
    return [row_to_dict(row) for row in result.mappings()]


def _render_html(report_data: dict[str, Any]) -> str:
    service = report_data["service"]
    customer = report_data["customer"]
    asset = report_data["installed_asset"]
    service_no = escape(str(report_data.get("service_no") or ""))
    customer_name = escape(str(customer.get("name") or "-"))
    product_name = escape(str(asset.get("product_name") or "-"))
    serial_no = escape(str(asset.get("serial_no") or "-"))
    service_date = escape(str(service.get("date") or "-"))
    fault_description = escape(str(service.get("fault_description") or "-"))
    work_performed = escape(str(service.get("work_performed") or "-"))
    result = escape(str(service.get("result") or "-"))
    return (
        "<section class=\"service-report\">"
        f"<h1>Servis Raporu {service_no}</h1>"
        f"<p><strong>Musteri:</strong> {customer_name}</p>"
        f"<p><strong>Urun:</strong> {product_name} / {serial_no}</p>"
        f"<p><strong>Servis tarihi:</strong> {service_date}</p>"
        f"<p><strong>Ariza/Islem:</strong> {fault_description}</p>"
        f"<p><strong>Yapilan is:</strong> {work_performed}</p>"
        f"<p><strong>Sonuc:</strong> {result}</p>"
        "<div class=\"signature-placeholder\">Musteri imzasi: sonraki faz</div>"
        "</section>"
    )
