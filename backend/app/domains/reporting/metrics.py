# ruff: noqa: E501

from __future__ import annotations

from app.domains.reporting.schemas import KpiCard
from app.domains.reporting.service import (
    ReportingQueryContext,
    base_where,
    can,
    card,
    safe_scalar,
    status_from_count,
)


async def company_kpis(ctx: ReportingQueryContext) -> list[KpiCard]:
    visible = can(ctx.request_context, "companies.view") or can(
        ctx.request_context, "reporting.dashboardView"
    )
    total = await safe_scalar(
        ctx,
        "public.companies",
        "select count(*) from public.companies where tenant_id = :tenant_id and coalesce(is_deleted, false) = false",
        {"tenant_id": ctx.tenant_id},
        label="Sirket",
    )
    active = await safe_scalar(
        ctx,
        "public.companies",
        "select count(*) from public.companies where tenant_id = :tenant_id and coalesce(is_deleted, false) = false and status = 'active'",
        {"tenant_id": ctx.tenant_id},
        label="Aktif sirket",
    )
    draft = await safe_scalar(
        ctx,
        "public.companies",
        "select count(*) from public.companies where tenant_id = :tenant_id and coalesce(is_deleted, false) = false and status = 'draft'",
        {"tenant_id": ctx.tenant_id},
        label="Taslak sirket",
    )
    liquidation = await safe_scalar(
        ctx,
        "public.companies",
        "select count(*) from public.companies where tenant_id = :tenant_id and coalesce(is_deleted, false) = false and status in ('liquidation','liquidation_started')",
        {"tenant_id": ctx.tenant_id},
        label="Tasfiye sirket",
    )
    return [
        card(
            key="companies.total",
            title="Toplam sirket",
            value=total,
            module_key="companies",
            permission_visible=visible,
            description="Yetkili oldugunuz sirket kayitlari.",
            target_page="/app/sirket/companies",
            status_value="info",
        ),
        card(
            key="companies.active",
            title="Aktif sirket",
            value=active,
            module_key="companies",
            permission_visible=visible,
            description="Aktif lifecycle durumundaki sirketler.",
            target_page="/app/sirket/companies",
            status_value="normal",
        ),
        card(
            key="companies.draft",
            title="Taslak sirket",
            value=draft,
            module_key="companies",
            permission_visible=visible,
            description="Acilisi tamamlanmamis sirket kartlari.",
            target_page="/app/sirket/companies",
            status_value=status_from_count(draft),
        ),
        card(
            key="companies.liquidation",
            title="Tasfiye/terkin sureci",
            value=liquidation,
            module_key="companies",
            permission_visible=visible,
            description="Lifecycle dikkat isteyen sirketler.",
            target_page="/app/sirket/companies",
            status_value=status_from_count(liquidation),
        ),
    ]


async def ownership_kpis(ctx: ReportingQueryContext) -> list[KpiCard]:
    visible = can(ctx.request_context, "partners.view") or can(
        ctx.request_context, "reporting.dashboardView"
    )
    partners_where, partners_params = base_where(ctx)
    active_partners = await safe_scalar(
        ctx,
        "public.company_partners",
        f"select count(*) from public.company_partners where {' and '.join(partners_where)} and record_status = 'active'",
        partners_params,
        label="Ortak",
    )
    pending = await safe_scalar(
        ctx,
        "public.ownership_transactions",
        "select count(*) from public.ownership_transactions where tenant_id = :tenant_id and coalesce(is_deleted, false) = false and status in ('draft','pending','in_review')",
        {"tenant_id": ctx.tenant_id},
        label="Ortaklik islemi",
    )
    incomplete = await safe_scalar(
        ctx,
        "public.v_current_ownership",
        "select count(*) from (select company_id, sum(coalesce(share_ratio,0)) total_share from public.v_current_ownership where tenant_id = :tenant_id group by company_id) t where abs(t.total_share - 100) > 0.001",
        {"tenant_id": ctx.tenant_id},
        label="Guncel ortaklik",
    )
    return [
        card(
            key="ownership.activePartners",
            title="Aktif ortak",
            value=active_partners,
            module_key="partners",
            permission_visible=visible,
            description="Aktif ortak kartlari.",
            target_page="/app/sirket/companies/partners",
            status_value="info",
        ),
        card(
            key="ownership.incompleteDistribution",
            title="Ortaklik %100 degil",
            value=incomplete,
            module_key="partners",
            permission_visible=visible,
            description="Guncel ortaklik dagilimi tamamlanmamis sirketler.",
            target_page="/app/sirket/companies/partners",
            status_value=status_from_count(incomplete, critical_at=3),
        ),
        card(
            key="ownership.pendingTransactions",
            title="Bekleyen ortaklik islemi",
            value=pending,
            module_key="partners",
            permission_visible=visible,
            description="Onay veya tamamlanma bekleyen ownership islemleri.",
            target_page="/app/sirket/companies/partners",
            status_value=status_from_count(pending),
        ),
    ]


async def representative_kpis(ctx: ReportingQueryContext) -> list[KpiCard]:
    visible = can(ctx.request_context, "representatives.view") or can(
        ctx.request_context, "reporting.dashboardView"
    )
    reps_where, reps_params = base_where(ctx)
    active_reps = await safe_scalar(
        ctx,
        "public.company_representatives",
        f"select count(*) from public.company_representatives where {' and '.join(reps_where)} and record_status = 'active'",
        reps_params,
        label="Temsilci",
    )
    active_authorities = await safe_scalar(
        ctx,
        "public.v_current_representative_authorities",
        "select count(*) from public.v_current_representative_authorities where tenant_id = :tenant_id and authority_status = 'active'",
        {"tenant_id": ctx.tenant_id},
        label="Temsil yetkisi",
    )
    expiring = await safe_scalar(
        ctx,
        "public.v_current_representative_authorities",
        "select count(*) from public.v_current_representative_authorities where tenant_id = :tenant_id and authority_status = 'active' and valid_until between current_date and current_date + interval '30 days'",
        {"tenant_id": ctx.tenant_id},
        label="Suresi dolacak yetki",
    )
    return [
        card(
            key="representatives.active",
            title="Aktif temsilci",
            value=active_reps,
            module_key="representatives",
            permission_visible=visible,
            description="Aktif temsilci kartlari.",
            target_page="/app/sirket/companies/representatives",
            status_value="info",
        ),
        card(
            key="representatives.authorities",
            title="Aktif yetki",
            value=active_authorities,
            module_key="representatives",
            permission_visible=visible,
            description="Current authority projection ozeti.",
            target_page="/app/sirket/companies/representatives",
            status_value="normal",
        ),
        card(
            key="representatives.expiring",
            title="30 gunde bitecek yetki",
            value=expiring,
            module_key="representatives",
            permission_visible=visible,
            description="Yaklasan yetki bitisleri.",
            target_page="/app/sirket/companies/representatives",
            status_value=status_from_count(expiring, critical_at=5),
        ),
    ]


async def branch_kpis(ctx: ReportingQueryContext) -> list[KpiCard]:
    visible = can(ctx.request_context, "branches.view") or can(
        ctx.request_context, "reporting.dashboardView"
    )
    where, params = base_where(ctx)
    total = await safe_scalar(
        ctx,
        "public.company_branches",
        f"select count(*) from public.company_branches where {' and '.join(where)}",
        params,
        label="Sube",
    )
    active = await safe_scalar(
        ctx,
        "public.company_branches",
        f"select count(*) from public.company_branches where {' and '.join(where)} and status = 'active'",
        params,
        label="Aktif sube",
    )
    closed = await safe_scalar(
        ctx,
        "public.company_branches",
        f"select count(*) from public.company_branches where {' and '.join(where)} and status in ('closed','passive')",
        params,
        label="Kapali sube",
    )
    missing_facility = await safe_scalar(
        ctx,
        "public.company_branches",
        f"select count(*) from public.company_branches where {' and '.join(where)} and facility_id is null",
        params,
        label="Tesis baglantisi eksik sube",
    )
    return [
        card(
            key="branches.total",
            title="Toplam sube",
            value=total,
            module_key="branches",
            permission_visible=visible,
            description="Yetkili oldugunuz subeler.",
            target_page="/app/sirket/companies/branches",
            status_value="info",
        ),
        card(
            key="branches.active",
            title="Aktif sube",
            value=active,
            module_key="branches",
            permission_visible=visible,
            description="Aktif sube kayitlari.",
            target_page="/app/sirket/companies/branches",
            status_value="normal",
        ),
        card(
            key="branches.closed",
            title="Kapali sube",
            value=closed,
            module_key="branches",
            permission_visible=visible,
            description="Kapali/pasif subeler.",
            target_page="/app/sirket/companies/branches",
            status_value=status_from_count(closed),
        ),
        card(
            key="branches.missingFacility",
            title="Tesis baglantisi eksik",
            value=missing_facility,
            module_key="branches",
            permission_visible=visible,
            description="Facility/location baglantisi olmayan subeler.",
            target_page="/app/sirket/companies/branches",
            status_value=status_from_count(missing_facility),
        ),
    ]


async def action_center_kpis(ctx: ReportingQueryContext) -> list[KpiCard]:
    visible = can(ctx.request_context, "actionCenter.view") or can(
        ctx.request_context, "reporting.dashboardView"
    )
    tasks = await safe_scalar(
        ctx,
        "public.process_tasks",
        "select count(*) from public.process_tasks where tenant_id = :tenant_id and status in ('open','pending','in_progress')",
        {"tenant_id": ctx.tenant_id},
        label="Surec gorevi",
    )
    approvals = await safe_scalar(
        ctx,
        "public.process_approvals",
        "select count(*) from public.process_approvals where tenant_id = :tenant_id and status in ('pending','waiting')",
        {"tenant_id": ctx.tenant_id},
        label="Onay",
    )
    failed = await safe_scalar(
        ctx,
        "public.operation_requests",
        "select count(*) from public.operation_requests where tenant_id = :tenant_id and operation_status in ('failed','stuck')",
        {"tenant_id": ctx.tenant_id},
        label="Islem uyarisi",
    )
    return [
        card(
            key="actionCenter.openTasks",
            title="Acik surec gorevi",
            value=tasks,
            module_key="actionCenter",
            permission_visible=visible,
            description="Process Engine kaynakli acik gorevler.",
            target_page="/app/surecler",
            status_value=status_from_count(tasks),
        ),
        card(
            key="actionCenter.pendingApprovals",
            title="Bekleyen onay",
            value=approvals,
            module_key="actionCenter",
            permission_visible=visible,
            description="Onay bekleyen surec adimlari.",
            target_page="/app/surecler",
            status_value=status_from_count(approvals, critical_at=10),
        ),
        card(
            key="actionCenter.failedOperations",
            title="Tamamlanamayan islem",
            value=failed,
            module_key="actionCenter",
            permission_visible=visible,
            description="Failed/stuck operation uyarilari.",
            target_page="/app/surecler",
            status_value=status_from_count(failed, critical_at=3),
        ),
    ]


async def accounting_kpis(ctx: ReportingQueryContext) -> list[KpiCard]:
    visible = can(ctx.request_context, "accounting.view") or can(
        ctx.request_context, "reporting.viewFinancial"
    )
    where, params = base_where(ctx)
    accounts = await safe_scalar(
        ctx,
        "public.accounting_cari_accounts",
        f"select count(*) from public.accounting_cari_accounts where {' and '.join(where)}",
        params,
        label="Cari kart",
    )
    debit = await safe_scalar(
        ctx,
        "public.accounting_cari_transactions",
        f"select coalesce(sum(case when direction = 'debit' then amount else 0 end),0) from public.accounting_cari_transactions where {' and '.join(where)} and status <> 'cancelled'",
        params,
        label="Borclu cari hareket",
    )
    credit = await safe_scalar(
        ctx,
        "public.accounting_cari_transactions",
        f"select coalesce(sum(case when direction = 'credit' then amount else 0 end),0) from public.accounting_cari_transactions where {' and '.join(where)} and status <> 'cancelled'",
        params,
        label="Alacak cari hareket",
    )
    missing_docs = await safe_scalar(
        ctx,
        "public.accounting_cari_transactions",
        f"select count(*) from public.accounting_cari_transactions where {' and '.join(where)} and document_status = 'document_needed'",
        params,
        label="Belge aranacak hareket",
    )
    unmatched = await safe_scalar(
        ctx,
        "public.accounting_cari_transactions",
        f"select count(*) from public.accounting_cari_transactions where {' and '.join(where)} and reconciliation_status = 'unmatched'",
        params,
        label="Eslesmeyen hareket",
    )
    unmatched_bank = await safe_scalar(
        ctx,
        "public.accounting_bank_transactions",
        f"select count(*) from public.accounting_bank_transactions where {' and '.join(where)} and reconciliation_status in ('unmatched','needs_review')",
        params,
        label="Eslesmeyen banka hareketi",
    )
    unmatched_documents = await safe_scalar(
        ctx,
        "public.accounting_e_documents",
        f"select count(*) from public.accounting_e_documents where {' and '.join(where)} and reconciliation_status in ('unmatched','needs_review')",
        params,
        label="Eslesmeyen e-belge",
    )
    capital_outstanding = await safe_scalar(
        ctx,
        "public.accounting_capital_reconciliation",
        f"select coalesce(sum(outstanding_amount),0) from public.accounting_capital_reconciliation where {' and '.join(where)} and reconciliation_status <> 'matched'",
        params,
        label="Sermaye mutabakati",
    )
    return [
        card(
            key="accounting.accounts",
            title="Cari kart",
            value=accounts,
            module_key="accounting",
            permission_visible=visible,
            description="Finansal iliski kartlari.",
            target_page="/app/muhasebe/cari-kartlar",
            status_value="info",
        ),
        card(
            key="accounting.debit",
            title="Toplam borc",
            value=debit,
            module_key="accounting",
            permission_visible=visible,
            description="Secili kapsam cari borc toplami.",
            target_page="/app/muhasebe/cari-hareketler",
            status_value="info",
        ),
        card(
            key="accounting.credit",
            title="Toplam alacak",
            value=credit,
            module_key="accounting",
            permission_visible=visible,
            description="Secili kapsam cari alacak toplami.",
            target_page="/app/muhasebe/cari-hareketler",
            status_value="info",
        ),
        card(
            key="accounting.missingDocuments",
            title="Belge aranacak",
            value=missing_docs,
            module_key="accounting",
            permission_visible=visible,
            description="Belge durumu takip isteyen hareketler.",
            target_page="/app/muhasebe/cari-hareketler",
            status_value=status_from_count(missing_docs, critical_at=10),
        ),
        card(
            key="accounting.unmatched",
            title="Eslesmeyen hareket",
            value=unmatched,
            module_key="accounting",
            permission_visible=visible,
            description="Mutabakat bekleyen hareketler.",
            target_page="/app/muhasebe/cari-hareketler",
            status_value=status_from_count(unmatched, critical_at=20),
        ),
        card(
            key="accounting.unmatchedBank",
            title="Eslesmeyen banka",
            value=unmatched_bank,
            module_key="accounting",
            permission_visible=visible,
            description="Banka ekstresiyle mutabakat bekleyen hareketler.",
            target_page="/app/muhasebe/mutabakat",
            status_value=status_from_count(unmatched_bank, critical_at=20),
        ),
        card(
            key="accounting.unmatchedDocuments",
            title="Eslesmeyen e-belge",
            value=unmatched_documents,
            module_key="accounting",
            permission_visible=visible,
            description="Cari/banka hareketiyle eslesmemis e-belgeler.",
            target_page="/app/muhasebe/e-fatura-e-arsiv",
            status_value=status_from_count(unmatched_documents, critical_at=20),
        ),
        card(
            key="accounting.capitalOutstanding",
            title="Sermaye acigi",
            value=capital_outstanding,
            module_key="accounting",
            permission_visible=visible,
            description="Sermaye odeme mutabakatinda kalan tutar.",
            target_page="/app/muhasebe/sermaye-mutabakati",
            status_value=status_from_count(capital_outstanding, critical_at=1),
        ),
    ]


async def hr_kpis(ctx: ReportingQueryContext) -> list[KpiCard]:
    visible = can(ctx.request_context, "hr.view") or can(ctx.request_context, "reporting.viewHR")
    leave_visible = visible or can(ctx.request_context, "hr.leaveView")
    attendance_visible = visible or can(ctx.request_context, "hr.attendanceView")
    timesheet_visible = visible or can(ctx.request_context, "hr.timesheetView")
    where, params = base_where(ctx)
    total = await safe_scalar(
        ctx,
        "public.hr_employees",
        f"select count(*) from public.hr_employees where {' and '.join(where)}",
        params,
        label="Calisan",
    )
    active = await safe_scalar(
        ctx,
        "public.hr_employees",
        f"select count(*) from public.hr_employees where {' and '.join(where)} and employment_status = 'active'",
        params,
        label="Aktif calisan",
    )
    draft = await safe_scalar(
        ctx,
        "public.hr_employees",
        f"select count(*) from public.hr_employees where {' and '.join(where)} and record_status = 'draft'",
        params,
        label="Taslak calisan",
    )
    sgk_pending = await safe_scalar(
        ctx,
        "public.hr_employment_records",
        f"select count(*) from public.hr_employment_records where {' and '.join(where)} and sgk_status = 'pending'",
        params,
        label="SGK bekleyen",
    )
    low_leave_balance = await safe_scalar(
        ctx,
        "public.hr_leave_balances",
        f"select count(*) from public.hr_leave_balances where {' and '.join(where)} and coalesce(remaining_days, 0) <= 3 and status = 'active'",
        params,
        label="Dusuk izin bakiyesi",
    )
    pending_leave_requests = await safe_scalar(
        ctx,
        "public.hr_leave_requests",
        f"select count(*) from public.hr_leave_requests where {' and '.join(where)} and status in ('submitted','pending_approval')",
        params,
        label="Onay bekleyen izin",
    )
    month_leave_requests = await safe_scalar(
        ctx,
        "public.hr_leave_requests",
        f"select count(*) from public.hr_leave_requests where {' and '.join(where)} and status = 'approved' and start_date <= (date_trunc('month', current_date) + interval '1 month' - interval '1 day')::date and end_date >= date_trunc('month', current_date)::date",
        params,
        label="Bu ay izin",
    )
    attendance_issues = await safe_scalar(
        ctx,
        "public.hr_attendance_records",
        f"select count(*) from public.hr_attendance_records where {' and '.join(where)} and status in ('absent','late','early_leave') and work_date >= date_trunc('month', current_date)::date",
        params,
        label="Devamsizlik",
    )
    overtime_hours = await safe_scalar(
        ctx,
        "public.hr_attendance_records",
        f"select coalesce(sum(overtime_hours), 0) from public.hr_attendance_records where {' and '.join(where)} and work_date >= date_trunc('month', current_date)::date",
        params,
        label="Fazla mesai",
    )
    open_timesheets = await safe_scalar(
        ctx,
        "public.hr_timesheet_periods",
        f"select count(*) from public.hr_timesheet_periods where {' and '.join(where)} and status in ('draft','calculating','ready_for_review')",
        params,
        label="Puantaj",
    )
    return [
        card(
            key="hr.total",
            title="Toplam calisan",
            value=total,
            module_key="hr",
            permission_visible=visible,
            description="Calisan kartlari.",
            target_page="/app/ik/calisanlar",
            status_value="info",
        ),
        card(
            key="hr.active",
            title="Aktif calisan",
            value=active,
            module_key="hr",
            permission_visible=visible,
            description="Aktif istihdam kayitlari.",
            target_page="/app/ik/calisanlar",
            status_value="normal",
        ),
        card(
            key="hr.draft",
            title="Taslak calisan",
            value=draft,
            module_key="hr",
            permission_visible=visible,
            description="Ise giris bekleyen kartlar.",
            target_page="/app/ik/calisanlar",
            status_value=status_from_count(draft),
        ),
        card(
            key="hr.sgkPending",
            title="SGK bekleyen",
            value=sgk_pending,
            module_key="hr",
            permission_visible=visible,
            description="Manuel SGK tamamlanmasi bekleyen kayitlar.",
            target_page="/app/ik/calisanlar",
            status_value=status_from_count(sgk_pending, critical_at=10),
        ),
        card(
            key="hr.lowLeaveBalance",
            title="Dusuk izin bakiyesi",
            value=low_leave_balance,
            module_key="hr",
            permission_visible=leave_visible,
            description="3 gun ve altinda kalan aktif izin bakiyeleri.",
            target_page="/app/ik/izin-bakiyeleri",
            status_value=status_from_count(low_leave_balance, critical_at=10),
        ),
        card(
            key="hr.pendingLeaveRequests",
            title="Onay bekleyen izin",
            value=pending_leave_requests,
            module_key="hr",
            permission_visible=leave_visible,
            description="Gonderilmis veya onay bekleyen izin talepleri.",
            target_page="/app/ik/izinler",
            status_value=status_from_count(pending_leave_requests, critical_at=10),
        ),
        card(
            key="hr.monthLeaveRequests",
            title="Bu ay izinli",
            value=month_leave_requests,
            module_key="hr",
            permission_visible=leave_visible,
            description="Bu ay icinde onayli izni olan calisan/talep sayisi.",
            target_page="/app/ik/izinler",
            status_value="info",
        ),
        card(
            key="hr.attendanceIssues",
            title="Devamsizlik kaydi",
            value=attendance_issues,
            module_key="hr",
            permission_visible=attendance_visible,
            description="Bu ay devamsizlik, gec kalma veya erken cikis kayitlari.",
            target_page="/app/ik/devam-devamsizlik",
            status_value=status_from_count(attendance_issues, critical_at=10),
        ),
        card(
            key="hr.overtimeHours",
            title="Fazla mesai saati",
            value=overtime_hours,
            module_key="hr",
            permission_visible=attendance_visible,
            description="Bu ay puantaja hazirlanan fazla mesai saatleri.",
            target_page="/app/ik/devam-devamsizlik",
            status_value=status_from_count(overtime_hours, warning_at=20, critical_at=80),
        ),
        card(
            key="hr.openTimesheets",
            title="Acik puantaj",
            value=open_timesheets,
            module_key="hr",
            permission_visible=timesheet_visible,
            description="Taslak, hesaplanan veya inceleme bekleyen puantaj donemleri.",
            target_page="/app/ik/puantaj",
            status_value=status_from_count(open_timesheets, warning_at=1, critical_at=3),
        ),
    ]


async def project_kpis(ctx: ReportingQueryContext) -> list[KpiCard]:
    visible = can(ctx.request_context, "projects.view") or can(
        ctx.request_context, "reporting.dashboardView"
    )
    where, params = base_where(ctx)
    active_projects = await safe_scalar(
        ctx,
        "public.project_projects",
        f"select count(*) from public.project_projects where {' and '.join(where)} and status = 'active'",
        params,
        label="Proje",
    )
    open_tasks = await safe_scalar(
        ctx,
        "public.project_tasks",
        f"select count(*) from public.project_tasks where {' and '.join(where)} and status in ('backlog','todo','in_progress','blocked','review')",
        params,
        label="Proje gorevi",
    )
    overdue = await safe_scalar(
        ctx,
        "public.project_tasks",
        f"select count(*) from public.project_tasks where {' and '.join(where)} and status in ('backlog','todo','in_progress','blocked','review') and due_date < current_date",
        params,
        label="Geciken proje gorevi",
    )
    blocked = await safe_scalar(
        ctx,
        "public.project_tasks",
        f"select count(*) from public.project_tasks where {' and '.join(where)} and status = 'blocked'",
        params,
        label="Bloke proje gorevi",
    )
    return [
        card(
            key="projects.active",
            title="Aktif proje",
            value=active_projects,
            module_key="project_management",
            permission_visible=visible,
            description="Aktif proje kartlari.",
            target_page="/app/gorev-ve-proje-yonetimi/projeler",
            status_value="info",
        ),
        card(
            key="projects.openTasks",
            title="Acik proje gorevi",
            value=open_tasks,
            module_key="project_management",
            permission_visible=visible,
            description="Project task acik is yukunu gosterir.",
            target_page="/app/gorev-ve-proje-yonetimi/gorevler",
            status_value=status_from_count(open_tasks, warning_at=20, critical_at=50),
        ),
        card(
            key="projects.overdue",
            title="Geciken gorev",
            value=overdue,
            module_key="project_management",
            permission_visible=visible,
            description="Son tarihi gecmis proje gorevleri.",
            target_page="/app/gorev-ve-proje-yonetimi/gorevler",
            status_value=status_from_count(overdue, critical_at=10),
        ),
        card(
            key="projects.blocked",
            title="Bloke gorev",
            value=blocked,
            module_key="project_management",
            permission_visible=visible,
            description="Bloke durumdaki proje gorevleri.",
            target_page="/app/gorev-ve-proje-yonetimi/kanban-board",
            status_value=status_from_count(blocked, critical_at=5),
        ),
    ]


async def after_sales_kpis(ctx: ReportingQueryContext) -> list[KpiCard]:
    visible = can(ctx.request_context, "afterSales.view") or can(
        ctx.request_context, "reporting.dashboardView"
    )
    where, params = base_where(ctx)
    asset_where = [part.replace("company_id", "owning_company_id") for part in where]
    assets = await safe_scalar(
        ctx,
        "public.after_sales_installed_assets",
        f"select count(*) from public.after_sales_installed_assets where {' and '.join(asset_where)}",
        params,
        label="Kurulu urun",
    )
    in_warranty = await safe_scalar(
        ctx,
        "public.after_sales_installed_assets",
        f"select count(*) from public.after_sales_installed_assets where {' and '.join(asset_where)} and warranty_status = 'in_warranty'",
        params,
        label="Garantili kurulu urun",
    )
    open_requests = await safe_scalar(
        ctx,
        "public.after_sales_service_requests",
        f"select count(*) from public.after_sales_service_requests where {' and '.join(where)} and status in ('new','triage','assigned','in_progress','waiting_customer')",
        params,
        label="Servis talebi",
    )
    urgent = await safe_scalar(
        ctx,
        "public.after_sales_service_requests",
        f"select count(*) from public.after_sales_service_requests where {' and '.join(where)} and status in ('new','triage','assigned','in_progress','waiting_customer') and priority = 'urgent'",
        params,
        label="Urgent servis talebi",
    )
    maintenance_due = await safe_scalar(
        ctx,
        "public.after_sales_maintenance_due_items",
        f"select count(*) from public.after_sales_maintenance_due_items where {' and '.join(where)} and status in ('scheduled','due_soon','overdue') and due_date <= current_date + interval '30 days'",
        params,
        label="Bakim takvimi",
    )
    assigned_jobs = await safe_scalar(
        ctx,
        "public.after_sales_field_assignments",
        f"select count(*) from public.after_sales_field_assignments where {' and '.join(where)} and status in ('assigned','accepted','on_the_way','arrived','in_progress')",
        params,
        label="Saha gorevi",
    )
    overdue_jobs = await safe_scalar(
        ctx,
        "public.after_sales_field_assignments",
        f"select count(*) from public.after_sales_field_assignments where {' and '.join(where)} and status in ('assigned','accepted','on_the_way','arrived','in_progress') and scheduled_start < now()",
        params,
        label="Geciken saha gorevi",
    )
    completed_this_month = await safe_scalar(
        ctx,
        "public.after_sales_service_records",
        f"select count(*) from public.after_sales_service_records where {' and '.join(where)} and status = 'completed' and service_date >= date_trunc('month', current_date)::date",
        params,
        label="Aylik tamamlanan servis",
    )
    return [
        card(
            key="afterSales.assets",
            title="Kurulu urun",
            value=assets,
            module_key="after_sales",
            permission_visible=visible,
            description="Musteri envanteri/kurulu varliklar.",
            target_page="/app/satis-sonrasi/kurulu-urunler",
            status_value="info",
        ),
        card(
            key="afterSales.inWarranty",
            title="Garanti icinde",
            value=in_warranty,
            module_key="after_sales",
            permission_visible=visible,
            description="Garanti kapsamindaki kurulu urunler.",
            target_page="/app/satis-sonrasi/kurulu-urunler",
            status_value="normal",
        ),
        card(
            key="afterSales.openRequests",
            title="Acik servis talebi",
            value=open_requests,
            module_key="after_sales",
            permission_visible=visible,
            description="Cozum bekleyen servis talepleri.",
            target_page="/app/satis-sonrasi/servis-talepleri",
            status_value=status_from_count(open_requests, warning_at=5, critical_at=20),
        ),
        card(
            key="afterSales.urgentRequests",
            title="Urgent servis",
            value=urgent,
            module_key="after_sales",
            permission_visible=visible,
            description="Acil oncelikli servis talepleri.",
            target_page="/app/satis-sonrasi/servis-talepleri",
            status_value=status_from_count(urgent, critical_at=3),
        ),
        card(
            key="afterSales.maintenanceDue",
            title="Bakimi gelen",
            value=maintenance_due,
            module_key="after_sales",
            permission_visible=visible,
            description="30 gun icinde bakim isteyen kurulu urunler.",
            target_page="/app/satis-sonrasi/bakimi-gelenler",
            status_value=status_from_count(maintenance_due, critical_at=10),
        ),
        card(
            key="afterSales.assignedFieldJobs",
            title="Saha gorevleri",
            value=assigned_jobs,
            module_key="after_sales",
            permission_visible=visible,
            description="Atanmis ve acik saha servis gorevleri.",
            target_page="/app/satis-sonrasi/saha-gorevleri",
            status_value=status_from_count(assigned_jobs, warning_at=10, critical_at=30),
        ),
        card(
            key="afterSales.overdueServices",
            title="Geciken servis",
            value=overdue_jobs,
            module_key="after_sales",
            permission_visible=visible,
            description="Planlanan saati gecmis acik saha gorevleri.",
            target_page="/app/satis-sonrasi/saha-gorevleri",
            status_value=status_from_count(overdue_jobs, warning_at=1, critical_at=5),
        ),
        card(
            key="afterSales.completedThisMonth",
            title="Bu ay tamamlanan",
            value=completed_this_month,
            module_key="after_sales",
            permission_visible=visible,
            description="Bu ay tamamlanan servis kayitlari.",
            target_page="/app/satis-sonrasi/servis-kayitlari",
            status_value="normal",
        ),
    ]


async def crm_kpis(ctx: ReportingQueryContext) -> list[KpiCard]:
    visible = (
        can(ctx.request_context, "crm.view")
        or can(ctx.request_context, "crm.leadsView")
        or can(ctx.request_context, "crm.opportunitiesView")
        or can(ctx.request_context, "reporting.dashboardView")
    )
    where, params = base_where(ctx)
    active_customers = await safe_scalar(
        ctx,
        "public.crm_stakeholders",
        f"select count(*) from public.crm_stakeholders where {' and '.join(where)} and relationship_status = 'active' and stakeholder_type in ('customer','customer_supplier')",
        params,
        label="CRM musteri",
    )
    active_suppliers = await safe_scalar(
        ctx,
        "public.crm_stakeholders",
        f"select count(*) from public.crm_stakeholders where {' and '.join(where)} and relationship_status = 'active' and stakeholder_type in ('supplier','customer_supplier')",
        params,
        label="CRM tedarikci",
    )
    leads = await safe_scalar(
        ctx,
        "public.crm_stakeholders",
        f"select count(*) from public.crm_stakeholders where {' and '.join(where)} and (stakeholder_type = 'lead' or customer_status in ('lead','prospect'))",
        params,
        label="Lead",
    )
    followups = await safe_scalar(
        ctx,
        "public.crm_stakeholders",
        f"select count(*) from public.crm_stakeholders where {' and '.join(where)} and next_followup_date <= current_date",
        params,
        label="CRM takip",
    )
    without_cari = await safe_scalar(
        ctx,
        "public.crm_stakeholders",
        f"select count(*) from public.crm_stakeholders where {' and '.join(where)} and stakeholder_type in ('customer','supplier','customer_supplier') and related_cari_account_id is null",
        params,
        label="Cari baglantisi olmayan paydas",
    )
    new_leads = await safe_scalar(
        ctx,
        "public.crm_leads",
        f"select count(*) from public.crm_leads where {' and '.join(where)} and lead_status = 'new' and coalesce(is_deleted, false) = false",
        params,
        label="Yeni lead",
    )
    qualified_leads = await safe_scalar(
        ctx,
        "public.crm_leads",
        f"select count(*) from public.crm_leads where {' and '.join(where)} and lead_status = 'qualified' and coalesce(is_deleted, false) = false",
        params,
        label="Qualified lead",
    )
    open_opportunities = await safe_scalar(
        ctx,
        "public.crm_opportunities",
        f"select count(*) from public.crm_opportunities where {' and '.join(where)} and status = 'open' and coalesce(is_deleted, false) = false",
        params,
        label="Acik firsat",
    )
    pipeline_value = await safe_scalar(
        ctx,
        "public.crm_opportunities",
        f"select coalesce(sum(estimated_value), 0) from public.crm_opportunities where {' and '.join(where)} and status = 'open' and coalesce(is_deleted, false) = false",
        params,
        label="Pipeline toplam",
    )
    weighted_pipeline = await safe_scalar(
        ctx,
        "public.crm_opportunities",
        f"select coalesce(sum(weighted_value), 0) from public.crm_opportunities where {' and '.join(where)} and status = 'open' and coalesce(is_deleted, false) = false",
        params,
        label="Agirlikli pipeline",
    )
    overdue_followups = await safe_scalar(
        ctx,
        "public.crm_leads",
        f"select count(*) from public.crm_leads where {' and '.join(where)} and next_followup_date < current_date and lead_status not in ('converted','lost','unqualified') and coalesce(is_deleted, false) = false",
        params,
        label="Geciken lead takibi",
    ) + await safe_scalar(
        ctx,
        "public.crm_opportunities",
        f"select count(*) from public.crm_opportunities where {' and '.join(where)} and next_followup_date < current_date and status = 'open' and coalesce(is_deleted, false) = false",
        params,
        label="Geciken firsat takibi",
    )
    proposals_sent = await safe_scalar(
        ctx,
        "public.crm_opportunities",
        f"select count(*) from public.crm_opportunities where {' and '.join(where)} and proposal_status = 'sent' and coalesce(is_deleted, false) = false",
        params,
        label="Gonderilen teklifler",
    )
    expected_close_this_month = await safe_scalar(
        ctx,
        "public.crm_opportunities",
        f"select count(*) from public.crm_opportunities where {' and '.join(where)} and status = 'open' and expected_close_date between date_trunc('month', current_date)::date and (date_trunc('month', current_date) + interval '1 month - 1 day')::date and coalesce(is_deleted, false) = false",
        params,
        label="Bu ay kapanacak firsat",
    )
    return [
        card(
            key="crm.customers",
            title="Aktif musteri",
            value=active_customers,
            module_key="crm",
            permission_visible=visible,
            description="Aktif musteri paydas rolleri.",
            target_page="/app/crm/paydaslar?type=customer",
            status_value="normal",
        ),
        card(
            key="crm.suppliers",
            title="Aktif tedarikci",
            value=active_suppliers,
            module_key="crm",
            permission_visible=visible,
            description="Aktif tedarikci paydas rolleri.",
            target_page="/app/crm/paydaslar?type=supplier",
            status_value="normal",
        ),
        card(
            key="crm.leads",
            title="Lead / prospect",
            value=leads,
            module_key="crm",
            permission_visible=visible,
            description="Takip gereken aday musteri kayitlari.",
            target_page="/app/crm/paydaslar?type=lead",
            status_value=status_from_count(leads, warning_at=10),
        ),
        card(
            key="crm.followupsDue",
            title="Takibi gelen",
            value=followups,
            module_key="crm",
            permission_visible=visible,
            description="Next follow-up tarihi gelen paydaslar.",
            target_page="/app/crm/paydaslar",
            status_value=status_from_count(followups, critical_at=10),
        ),
        card(
            key="crm.withoutCari",
            title="Cari baglantisi yok",
            value=without_cari,
            module_key="crm",
            permission_visible=visible,
            description="Musteri/tedarikci olup cari karta baglanmamis paydaslar.",
            target_page="/app/crm/paydaslar",
            status_value=status_from_count(without_cari, critical_at=10),
        ),
        card(
            key="crm.newLeads",
            title="Yeni lead",
            value=new_leads,
            module_key="crm",
            permission_visible=visible,
            description="Yeni durumda bekleyen lead kayitlari.",
            target_page="/app/crm/leadler",
            status_value=status_from_count(new_leads, warning_at=20),
        ),
        card(
            key="crm.qualifiedLeads",
            title="Qualified lead",
            value=qualified_leads,
            module_key="crm",
            permission_visible=visible,
            description="Firsata donusmeye hazir leadler.",
            target_page="/app/crm/leadler",
            status_value="normal",
        ),
        card(
            key="crm.openOpportunities",
            title="Acik firsat",
            value=open_opportunities,
            module_key="crm",
            permission_visible=visible,
            description="Pipeline icindeki acik satis firsatlari.",
            target_page="/app/crm/firsatlar",
            status_value=status_from_count(open_opportunities, warning_at=20),
        ),
        card(
            key="crm.pipelineValue",
            title="Pipeline tutari",
            value=pipeline_value,
            module_key="crm",
            permission_visible=visible,
            description="Acik firsatlarin toplam potansiyel degeri.",
            target_page="/app/crm/pipeline",
            status_value="info",
        ),
        card(
            key="crm.weightedPipelineValue",
            title="Agirlikli pipeline",
            value=weighted_pipeline,
            module_key="crm",
            permission_visible=visible,
            description="Olasilik ile agirliklandirilmis pipeline degeri.",
            target_page="/app/crm/pipeline",
            status_value="info",
        ),
        card(
            key="crm.overdueFollowups",
            title="Geciken takip",
            value=overdue_followups,
            module_key="crm",
            permission_visible=visible,
            description="Takip tarihi gecmis lead ve firsatlar.",
            target_page="/app/crm/takipler",
            status_value=status_from_count(overdue_followups, warning_at=1, critical_at=10),
        ),
        card(
            key="crm.proposalsSent",
            title="Gonderilen teklif",
            value=proposals_sent,
            module_key="crm",
            permission_visible=visible,
            description="Teklif gonderildi durumundaki firsatlar.",
            target_page="/app/crm/firsatlar",
            status_value="normal",
        ),
        card(
            key="crm.expectedCloseThisMonth",
            title="Bu ay kapanis",
            value=expected_close_this_month,
            module_key="crm",
            permission_visible=visible,
            description="Bu ay kapanmasi beklenen acik firsatlar.",
            target_page="/app/crm/firsatlar",
            status_value="info",
        ),
    ]


async def system_kpis(ctx: ReportingQueryContext) -> list[KpiCard]:
    visible = can(ctx.request_context, "settings.view") or can(
        ctx.request_context, "reporting.viewSystem"
    )
    outbox_failed = await safe_scalar(
        ctx,
        "public.outbox_events",
        "select count(*) from public.outbox_events where tenant_id = :tenant_id and status in ('failed','dead_letter')",
        {"tenant_id": ctx.tenant_id},
        label="Outbox",
    )
    audit_denied = await safe_scalar(
        ctx,
        "public.audit_logs",
        "select count(*) from public.audit_logs where tenant_id = :tenant_id and action_type ilike '%permission%' and created_at >= now() - interval '7 days'",
        {"tenant_id": ctx.tenant_id},
        label="Audit",
    )
    return [
        card(
            key="system.outboxFailed",
            title="Outbox hatasi",
            value=outbox_failed,
            module_key="system",
            permission_visible=visible,
            description="Dispatch edilemeyen sistem olaylari.",
            target_page="/app/sistem",
            status_value=status_from_count(outbox_failed, critical_at=3),
        ),
        card(
            key="system.permissionDenied",
            title="Yetki reddi",
            value=audit_denied,
            module_key="audit",
            permission_visible=visible or can(ctx.request_context, "reporting.viewAuditSummary"),
            description="Son 7 gundeki permission denied audit olaylari.",
            target_page="/app/sistem/audit",
            status_value=status_from_count(audit_denied, critical_at=10),
        ),
    ]


KPI_BUILDERS = {
    "company": company_kpis,
    "companies": company_kpis,
    "ownership": ownership_kpis,
    "partners": ownership_kpis,
    "representatives": representative_kpis,
    "branches": branch_kpis,
    "action-center": action_center_kpis,
    "actionCenter": action_center_kpis,
    "accounting": accounting_kpis,
    "hr": hr_kpis,
    "projects": project_kpis,
    "project_management": project_kpis,
    "after-sales": after_sales_kpis,
    "after_sales": after_sales_kpis,
    "crm": crm_kpis,
    "system": system_kpis,
}


async def build_kpis(ctx: ReportingQueryContext, module_key: str) -> list[KpiCard]:
    builder = KPI_BUILDERS.get(module_key)
    if not builder:
        return []
    return await builder(ctx)
