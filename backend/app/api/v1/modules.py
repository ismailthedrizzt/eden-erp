from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.security import RequestContext, require_permission
from app.features.registry import feature_flag_payload, list_feature_flags
from app.setup.readiness_checker import check_module_readiness, check_tenant_readiness
from app.setup.readiness_registry import list_readiness_definitions
from app.setup.schemas import ModuleReadinessResult

router = APIRouter()
SessionDep = Annotated[AsyncSession, Depends(get_session)]
SettingsViewDep = Annotated[RequestContext, Depends(require_permission("settings.view"))]
SettingsManageDep = Annotated[
    RequestContext, Depends(require_permission("settings.modulesManage"))
]

MODULE_META: dict[str, dict[str, str]] = {
    "companies": {
        "name": "Sirketlerimiz",
        "category": "Core ERP",
        "description": "Tuzel kisilik, resmi islem ve sirket karti merkezi.",
    },
    "partners": {
        "name": "Ortaklarimiz",
        "category": "Core ERP",
        "description": "Ortak kartlari ve ownership transaction merkezi.",
    },
    "representatives": {
        "name": "Temsilcilerimiz",
        "category": "Core ERP",
        "description": "Temsilci kartlari, yetki, kapsam ve limit merkezi.",
    },
    "branches": {
        "name": "Subelerimiz",
        "category": "Core ERP",
        "description": "Resmi sube ve operasyon noktasi gorunumleri.",
    },
    "organization": {
        "name": "Teskilat/Kadro",
        "category": "Platform",
        "description": "Organizasyon birimi, hiyerarsi ve kadro altyapisi.",
    },
    "facilities": {
        "name": "Tesisler/Lokasyonlar",
        "category": "Platform",
        "description": "Fiziksel lokasyon ve tesis kayitlari.",
    },
    "process": {
        "name": "Surec Merkezi",
        "category": "Platform",
        "description": "Surec, gorev ve onay altyapisi.",
    },
    "audit": {
        "name": "Denetim Izi",
        "category": "Platform",
        "description": "Audit ve compliance raporlama altyapisi.",
    },
    "outbox": {
        "name": "Sistem Olaylari",
        "category": "Platform",
        "description": "Arka plan olay kuyrugu ve retry altyapisi.",
    },
    "importExport": {
        "name": "Data Import / Export",
        "category": "Platform",
        "description": "Sablonlu import, maskeli export ve kontrollu bulk operation altyapisi.",
    },
    "documents": {
        "name": "Belgeler",
        "category": "Platform",
        "description": "Merkezi belge metadata, storage, versiyon, requirement ve audit altyapisi.",
    },
    "notifications": {
        "name": "Bildirimler",
        "category": "Platform",
        "description": "Uygulama ici bildirim, hatirlatma ve e-posta kuyrugu altyapisi.",
    },
    "search": {
        "name": "Global Arama",
        "category": "Platform",
        "description": "Kayit, islem, belge, rapor ve ayarlara komut paletiyle hizli erisim.",
    },
}

_MODULE_ACTIVATION_OVERRIDES: dict[str, dict[str, bool]] = {}


class ModuleActivationUpdateRequest(BaseModel):
    enabled: bool


@router.get("")
async def list_modules(
    request: Request,
    session: SessionDep,
    context: SettingsViewDep,
) -> dict[str, object]:
    tenant_id = context.tenant_id or request.headers.get("x-tenant-id") or ""
    tenant_readiness = await check_tenant_readiness(session, tenant_id)
    modules = [
        _module_payload(
            module_key,
            readiness,
            tenant_id=tenant_id,
        )
        for module_key, readiness in tenant_readiness.modules.items()
    ]
    return {
        "data": {
            "modules": modules,
            "summary": _summary(modules),
        },
        "warnings": tenant_readiness.warnings,
    }


@router.get("/{module_key}")
async def get_module(
    module_key: str,
    request: Request,
    session: SessionDep,
    context: SettingsViewDep,
) -> dict[str, object]:
    tenant_id = context.tenant_id or request.headers.get("x-tenant-id") or ""
    if module_key not in {definition.module_key for definition in list_readiness_definitions()}:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": "Modul bulunamadi.",
                "code": "MODULE_NOT_FOUND",
                "message": "Modul bulunamadi.",
            },
        )
    readiness = await check_module_readiness(session, tenant_id, module_key)
    return {"data": _module_payload(module_key, readiness, tenant_id=tenant_id), "warnings": []}


@router.patch("/{module_key}/activation")
async def patch_module_activation(
    module_key: str,
    payload: ModuleActivationUpdateRequest,
    context: SettingsManageDep,
) -> dict[str, object]:
    tenant_id = context.tenant_id or ""
    if module_key not in {definition.module_key for definition in list_readiness_definitions()}:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": "Modul bulunamadi.",
                "code": "MODULE_NOT_FOUND",
                "message": "Modul bulunamadi.",
            },
        )
    _MODULE_ACTIVATION_OVERRIDES.setdefault(tenant_id, {})[module_key] = payload.enabled
    return {
        "data": {
            "module_key": module_key,
            "enabled": payload.enabled,
            "status": "available" if payload.enabled else "disabled",
        },
        "warnings": [
            (
                "Bu MVP'de modul aktivasyon degisiklikleri process bellegi icinde "
                "tutulur; kalici lisans ayarlari P1 borctur."
            )
        ],
    }


def _module_payload(
    module_key: str,
    readiness: ModuleReadinessResult,
    *,
    tenant_id: str,
) -> dict[str, object]:
    meta = MODULE_META.get(module_key, {})
    enabled = _MODULE_ACTIVATION_OVERRIDES.get(tenant_id, {}).get(module_key, True)
    license_status = "included"
    status_value = _module_status(enabled, license_status, readiness)
    return {
        "module_key": module_key,
        "name": meta.get("name", module_key),
        "category": meta.get("category", "Platform"),
        "description": meta.get("description", ""),
        "enabled": enabled,
        "license_status": license_status,
        "readiness_status": readiness.status,
        "status": status_value,
        "ready": status_value == "available",
        "blocking_reasons": [] if readiness.ok else [readiness.message],
        "warnings": readiness.warnings,
        "setup_steps": _setup_step_payload(readiness),
        "dependencies": readiness.missing_dependencies,
        "feature_flags": [
            feature_flag_payload(flag, tenant_id=tenant_id)
            for flag in list_feature_flags(module_key)
        ],
    }


def _module_status(
    enabled: bool,
    license_status: str,
    readiness: ModuleReadinessResult,
) -> str:
    if not enabled:
        return "disabled"
    if license_status not in ("included", "trial"):
        return "unlicensed"
    if readiness.missing_dependencies:
        return "dependency_missing"
    if not readiness.ok:
        return "setup_required"
    return "available"


def _setup_step_payload(readiness: ModuleReadinessResult) -> list[dict[str, object]]:
    if readiness.setup_steps:
        return [
            {
                "key": f"{readiness.module_key}.{index}",
                "label": step,
                "description": step,
                "required": True,
                "status": "completed" if readiness.ok else "missing",
                "action": "configure",
            }
            for index, step in enumerate(readiness.setup_steps)
        ]
    return [
        {
            "key": f"{readiness.module_key}.readiness",
            "label": "Modul hazirlik kontrolu",
            "description": readiness.message,
            "required": True,
            "status": "completed" if readiness.ok else "missing",
            "action": "configure",
        }
    ]


def _summary(modules: list[dict[str, object]]) -> dict[str, int]:
    return {
        "total": len(modules),
        "available": sum(1 for item in modules if item["status"] == "available"),
        "setup_required": sum(1 for item in modules if item["status"] == "setup_required"),
        "dependency_missing": sum(1 for item in modules if item["status"] == "dependency_missing"),
        "disabled": sum(1 for item in modules if item["status"] == "disabled"),
        "unlicensed": sum(1 for item in modules if item["status"] == "unlicensed"),
    }
