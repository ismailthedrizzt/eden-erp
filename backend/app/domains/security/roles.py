# ruff: noqa: E501

from __future__ import annotations

from typing import Any

from fastapi import status

from app.core.errors import DomainError
from app.domains.operations.service import table_exists

from .permissions import permission_key_exists
from .schemas import RiskLevel, RoleCreate, RolePatch, RolePermissionsPatch, RoleRecord, ScopeMode
from .service import SecurityServiceContext, execute, fetch_all, fetch_one, require_table

DEFAULT_ROLES: list[RoleRecord] = [
    RoleRecord(
        id="default-system-admin",
        role_key="system_admin",
        role_name="Sistem Yoneticisi",
        description="Tum moduller, ayarlar, audit ve kullanici/rol yonetimi.",
        system_role=True,
        risk_level="critical",
        default_scope="all_companies",
        module_dependencies=["settings", "security", "audit"],
        permissions=["system.admin"],
    ),
    RoleRecord(
        id="default-company-manager",
        role_key="company_manager",
        role_name="Sirket Yoneticisi",
        description="Sirketler, ortaklar, temsilciler, subeler ve resmi operasyonlar.",
        system_role=True,
        risk_level="high",
        default_scope="assigned_companies",
        module_dependencies=["companies", "partners", "representatives", "branches"],
        permissions=[
            "companies.view",
            "companies.edit",
            "companies.openingStart",
            "companies.officialChangeStart",
            "companies.capitalIncreaseStart",
            "companies.capitalDecreaseStart",
            "branches.view",
            "branches.edit",
            "branches.openingStart",
            "branches.closingStart",
            "partners.view",
            "partners.edit",
            "partners.ownershipStart",
            "representatives.view",
            "representatives.edit",
            "representatives.authorityStart",
            "representatives.authorityUpdate",
            "organization.view",
            "facilities.view",
            "reporting.dashboardView",
        ],
    ),
    RoleRecord(
        id="default-accounting-user",
        role_key="accounting_user",
        role_name="Muhasebe Kullanicisi",
        description="Cari kartlar, cari hareketler, mutabakat ve finansal KPI.",
        system_role=True,
        risk_level="medium",
        default_scope="assigned_companies",
        module_dependencies=["accounting", "companies", "reporting"],
        permissions=[
            "companies.view",
            "accounting.view",
            "accounting.edit",
            "accounting.transactionCreate",
            "accounting.reconcile",
            "reporting.view",
            "reporting.viewFinancial",
        ],
    ),
    RoleRecord(
        id="default-hr-user",
        role_key="hr_user",
        role_name="IK Kullanicisi",
        description="Calisan kartlari, istihdam lifecycle, SGK manuel takip ve belgeler.",
        system_role=True,
        risk_level="medium",
        default_scope="assigned_companies",
        module_dependencies=["hr", "companies", "organization"],
        permissions=[
            "companies.view",
            "hr.view",
            "hr.edit",
            "hr.employeeCreate",
            "hr.employmentStart",
            "hr.employmentTerminate",
            "hr.assignmentChange",
            "hr.documentsManage",
            "reporting.viewHR",
        ],
    ),
    RoleRecord(
        id="default-operations-user",
        role_key="operations_user",
        role_name="Operasyon Kullanicisi",
        description="Sube, tesis/lokasyon, proje/gorev ve satis sonrasi servis operasyonlari.",
        system_role=True,
        risk_level="medium",
        default_scope="assigned_branches",
        module_dependencies=["branches", "facilities", "project_management", "after_sales"],
        permissions=[
            "companies.view",
            "branches.view",
            "branches.edit",
            "facilities.view",
            "facilities.edit",
            "projects.view",
            "projects.create",
            "tasks.view",
            "tasks.create",
            "tasks.edit",
            "tasks.transition",
            "afterSales.view",
            "afterSales.edit",
            "afterSales.requestAssign",
            "afterSales.serviceRecordCreate",
            "afterSales.serviceComplete",
            "actionCenter.view",
        ],
    ),
    RoleRecord(
        id="default-auditor",
        role_key="auditor",
        role_name="Denetci",
        description="Read-only genis gorunum, audit/compliance raporlari ve islem gecmisi.",
        system_role=True,
        risk_level="medium",
        default_scope="read_only",
        module_dependencies=["audit", "reporting"],
        permissions=[
            "companies.view",
            "branches.view",
            "partners.view",
            "representatives.view",
            "accounting.view",
            "hr.view",
            "projects.view",
            "afterSales.view",
            "crm.view",
            "reporting.view",
            "reporting.viewAuditSummary",
            "audit.view",
        ],
    ),
    RoleRecord(
        id="default-standard-user",
        role_key="standard_user",
        role_name="Standart Kullanici",
        description="Kendi gorevleri ve kendisine atanan isler icin sinirli erisim.",
        system_role=True,
        risk_level="low",
        default_scope="own_tasks_only",
        module_dependencies=["actionCenter", "project_management"],
        permissions=[
            "companies.view",
            "tasks.view",
            "tasks.comment",
            "actionCenter.view",
        ],
    ),
    RoleRecord(
        id="default-external-user",
        role_key="external_user_future",
        role_name="Dis Kullanici / Musteri Portali",
        description="Musteri portali icin planli rol. Bu fazda aktif degil.",
        system_role=True,
        risk_level="low",
        status="planned",
        default_scope="custom",
        module_dependencies=["crm", "after_sales"],
        permissions=[],
    ),
]

DEFAULT_ROLE_BY_KEY = {role.role_key: role for role in DEFAULT_ROLES}


def _role_from_row(row: dict[str, Any]) -> RoleRecord:
    permissions = row.get("permissions") or []
    dependencies = row.get("module_dependencies") or []
    risk_level = str(row.get("risk_level") or "medium")
    default_scope = str(row.get("default_scope") or "assigned_companies")
    return RoleRecord(
        id=str(row["id"]),
        tenant_id=str(row.get("tenant_id")) if row.get("tenant_id") else None,
        role_key=str(row["role_key"]),
        role_name=str(row["role_name"]),
        description=str(row.get("description")) if row.get("description") else None,
        system_role=bool(row.get("system_role", False)),
        risk_level=_risk_level_or_default(risk_level),
        status=str(row.get("status") or "active"),
        permissions=[str(item) for item in permissions] if isinstance(permissions, list) else [],
        default_scope=_scope_mode_or_default(default_scope),
        module_dependencies=[str(item) for item in dependencies] if isinstance(dependencies, list) else [],
        user_count=int(row.get("user_count") or 0),
        created_at=row.get("created_at"),
        updated_at=row.get("updated_at"),
    )


def _risk_level_or_default(value: str) -> RiskLevel:
    if value in {"low", "medium", "high", "critical"}:
        return value  # type: ignore[return-value]
    return "medium"


def _scope_mode_or_default(value: str) -> ScopeMode:
    if value in {"all_companies", "assigned_companies", "assigned_branches", "organization_unit_scope", "own_tasks_only", "read_only", "custom"}:
        return value  # type: ignore[return-value]
    return "assigned_companies"


async def list_roles(ctx: SecurityServiceContext) -> list[RoleRecord]:
    if not await table_exists(ctx.session, "security_roles"):
        return DEFAULT_ROLES
    rows = await fetch_all(
        ctx,
        """
        select
          r.*,
          coalesce(array_remove(array_agg(distinct rp.permission_key), null), '{}') as permissions,
          coalesce(r.metadata_json->'module_dependencies', '[]'::jsonb) as module_dependencies,
          coalesce((r.metadata_json->>'default_scope'), 'assigned_companies') as default_scope,
          count(distinct ur.user_id) as user_count
        from security_roles r
        left join security_role_permissions rp on rp.role_id = r.id and rp.granted = true
        left join security_user_roles ur on ur.role_id = r.id
        where r.tenant_id = :tenant_id and r.status <> 'deleted'
        group by r.id
        order by r.system_role desc, r.role_name asc
        """,
        {"tenant_id": ctx.tenant_id},
    )
    db_roles = [_role_from_row(row) for row in rows]
    existing_keys = {role.role_key for role in db_roles}
    return db_roles + [role for role in DEFAULT_ROLES if role.role_key not in existing_keys]


async def get_role(ctx: SecurityServiceContext, role_id: str) -> RoleRecord:
    for default_role in DEFAULT_ROLES:
        if default_role.id == role_id or default_role.role_key == role_id:
            if not await table_exists(ctx.session, "security_roles"):
                return default_role
    if not await table_exists(ctx.session, "security_roles"):
        raise DomainError("Rol bulunamadi.", "SECURITY_ROLE_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    row = await fetch_one(
        ctx,
        """
        select
          r.*,
          coalesce(array_remove(array_agg(distinct rp.permission_key), null), '{}') as permissions,
          coalesce(r.metadata_json->'module_dependencies', '[]'::jsonb) as module_dependencies,
          coalesce((r.metadata_json->>'default_scope'), 'assigned_companies') as default_scope,
          count(distinct ur.user_id) as user_count
        from security_roles r
        left join security_role_permissions rp on rp.role_id = r.id and rp.granted = true
        left join security_user_roles ur on ur.role_id = r.id
        where r.tenant_id = :tenant_id and (r.id::text = :role_id or r.role_key = :role_id)
        group by r.id
        limit 1
        """,
        {"tenant_id": ctx.tenant_id, "role_id": role_id},
    )
    if not row:
        default = DEFAULT_ROLE_BY_KEY.get(role_id)
        if default:
            return default
        raise DomainError("Rol bulunamadi.", "SECURITY_ROLE_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    return _role_from_row(row)


async def create_role(ctx: SecurityServiceContext, request: RoleCreate) -> RoleRecord:
    await require_table(ctx, "security_roles")
    _validate_permission_keys(request.permissions)
    row = await execute(
        ctx,
        """
        insert into security_roles (tenant_id, role_key, role_name, description, risk_level, status, metadata_json)
        values (:tenant_id, :role_key, :role_name, :description, :risk_level, 'active', '{}'::jsonb)
        returning id
        """,
        {
            "tenant_id": ctx.tenant_id,
            "role_key": request.role_key,
            "role_name": request.role_name,
            "description": request.description,
            "risk_level": request.risk_level,
        },
    )
    if not row:
        raise DomainError("Rol olusturulamadi.", "SECURITY_ROLE_CREATE_FAILED", status.HTTP_409_CONFLICT)
    role_id = str(row["id"])
    await set_role_permissions(ctx, role_id, RolePermissionsPatch(permission_keys=request.permissions))
    return await get_role(ctx, role_id)


async def patch_role(ctx: SecurityServiceContext, role_id: str, patch: RolePatch) -> RoleRecord:
    await require_table(ctx, "security_roles")
    current = await get_role(ctx, role_id)
    if current.system_role:
        raise DomainError("Sistem rolleri dogrudan duzenlenemez.", "SECURITY_SYSTEM_ROLE_LOCKED", status.HTTP_409_CONFLICT)
    payload = patch.model_dump(exclude_unset=True)
    if not payload:
        return current
    assignments = ", ".join([f"{key} = :{key}" for key in payload])
    await execute(
        ctx,
        f"""
        update security_roles
           set {assignments}, updated_at = now()
         where tenant_id = :tenant_id and id::text = :role_id
        returning id
        """,
        {"tenant_id": ctx.tenant_id, "role_id": current.id, **payload},
    )
    return await get_role(ctx, current.id)


async def delete_role(ctx: SecurityServiceContext, role_id: str) -> None:
    await require_table(ctx, "security_roles")
    current = await get_role(ctx, role_id)
    if current.system_role:
        raise DomainError("Sistem rolleri silinemez.", "SECURITY_SYSTEM_ROLE_LOCKED", status.HTTP_409_CONFLICT)
    await execute(
        ctx,
        """
        update security_roles
           set status = 'deleted', updated_at = now()
         where tenant_id = :tenant_id and id::text = :role_id
        returning id
        """,
        {"tenant_id": ctx.tenant_id, "role_id": current.id},
    )


async def set_role_permissions(ctx: SecurityServiceContext, role_id: str, request: RolePermissionsPatch) -> RoleRecord:
    await require_table(ctx, "security_role_permissions")
    role = await get_role(ctx, role_id)
    if role.system_role and role.id.startswith("default-"):
        raise DomainError("Varsayilan sistem rolunun izinleri DB kaydi olmadan degistirilemez.", "SECURITY_SYSTEM_ROLE_LOCKED", status.HTTP_409_CONFLICT)
    _validate_permission_keys(request.permission_keys)
    await execute(
        ctx,
        "delete from security_role_permissions where tenant_id = :tenant_id and role_id::text = :role_id returning id",
        {"tenant_id": ctx.tenant_id, "role_id": role.id},
    )
    for permission_key in request.permission_keys:
        await execute(
            ctx,
            """
            insert into security_role_permissions (tenant_id, role_id, permission_key, granted)
            values (:tenant_id, :role_id, :permission_key, true)
            returning id
            """,
            {"tenant_id": ctx.tenant_id, "role_id": role.id, "permission_key": permission_key},
        )
    return await get_role(ctx, role.id)


def _validate_permission_keys(permission_keys: list[str]) -> None:
    unknown = [key for key in permission_keys if not permission_key_exists(key)]
    if unknown:
        raise DomainError(
            f"Registry disi yetki kaydedilemez: {', '.join(unknown)}",
            "SECURITY_UNKNOWN_PERMISSION",
            status.HTTP_422_UNPROCESSABLE_ENTITY,
        )
