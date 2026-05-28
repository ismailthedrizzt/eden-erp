import { PERMISSIONS } from '@/packages/shared/src/permissions'
import type { ModuleContract } from '../moduleContract.types'

export const reportingModule: ModuleContract = {
  key: 'reporting',
  name: 'Raporlama / Yonetim Dashboard',
  description: 'Yonetim ana paneli, modul KPI kartlari, filtrelenebilir raporlar ve export hazirligi.',
  domain: 'reporting',
  category: 'business',
  version: '2026-05-28.15',
  status: 'active',
  defaultEnabled: true,
  licenseRequired: false,
  setupRequired: false,
  dependencies: [
    { moduleKey: 'companies', required: true, reason: 'Dashboard sirket scope uzerinden filtrelenir.' },
    { moduleKey: 'accounting', required: false, reason: 'Finansal KPI kartlari icin Accounting summary kaynaklari kullanilir.' },
    { moduleKey: 'hr', required: false, reason: 'IK KPI kartlari icin HR summary kaynaklari kullanilir.' },
    { moduleKey: 'project_management', required: false, reason: 'Gorev ve proje KPI kartlari icin Project/Task read modelleri kullanilir.' },
    { moduleKey: 'after_sales', required: false, reason: 'Servis ve bakim KPI kartlari icin After-Sales summary kaynaklari kullanilir.' },
    { moduleKey: 'crm', required: false, reason: 'Musteri, tedarikci ve lead KPI kartlari icin CRM read-side kaynaklari kullanilir.' },
  ],
  entities: [
    { key: 'report_definition', displayName: 'Rapor Tanimi', lifecycle: false, draftSupported: false },
    { key: 'dashboard_kpi', displayName: 'Dashboard KPI', lifecycle: false, draftSupported: false },
    { key: 'report_export_request', displayName: 'Rapor Export Istegi', lifecycle: false, draftSupported: false },
  ],
  routes: [
    { path: '/app/dashboard', type: 'page', permission: PERMISSIONS.reporting.dashboardView },
    { path: '/api/reporting/dashboard', type: 'api', permission: PERMISSIONS.reporting.dashboardView },
    { path: '/api/reporting/reports', type: 'api', permission: PERMISSIONS.reporting.view },
  ],
  menus: [
    { label: 'Yonetim Dashboard', path: '/app/dashboard', icon: 'BarChart2', order: 20, permission: PERMISSIONS.reporting.dashboardView },
  ],
  permissions: [
    { key: PERMISSIONS.reporting.view, label: 'Raporlari goruntule' },
    { key: PERMISSIONS.reporting.dashboardView, label: 'Yonetim dashboard goruntule' },
    { key: PERMISSIONS.reporting.export, label: 'Rapor export al' },
    { key: PERMISSIONS.reporting.admin, label: 'Raporlama yoneticisi' },
    { key: PERMISSIONS.reporting.viewFinancial, label: 'Finansal KPI goruntule' },
    { key: PERMISSIONS.reporting.viewAuditSummary, label: 'Audit ozet KPI goruntule' },
    { key: PERMISSIONS.reporting.viewHR, label: 'IK KPI goruntule' },
    { key: PERMISSIONS.reporting.viewSystem, label: 'Sistem KPI goruntule' },
  ],
  actions: [
    { key: 'open_management_dashboard', label: 'Yonetim dashboard ac', actionType: 'navigate', targetPage: '/app/dashboard', permission: PERMISSIONS.reporting.dashboardView },
    { key: 'query_report', label: 'Rapor sorgula', actionType: 'view', targetPage: '/app/dashboard', permission: PERMISSIONS.reporting.view },
    { key: 'export_report', label: 'Rapor export hazirla', actionType: 'operation', targetPage: '/app/dashboard', permission: PERMISSIONS.reporting.export },
  ],
  projections: [
    { key: 'company_summary', projectionKey: 'companyList', required: false },
    { key: 'current_ownership', projectionKey: 'currentOwnership', required: false },
    { key: 'branch_summary', projectionKey: 'branchSummary', required: false },
    { key: 'pending_actions', projectionKey: 'pendingActions', required: false },
  ],
  events: [
    { eventType: 'report.query_executed', version: '1', aggregateType: 'report' },
    { eventType: 'report.export_requested', version: '1', aggregateType: 'report' },
  ],
  featureFlags: [
    { key: 'reporting.enabled', label: 'Raporlama modulunu etkinlestir', defaultEnabled: true },
    { key: 'reporting.dashboard', label: 'Yonetim dashboard etkinlestir', defaultEnabled: true },
    { key: 'reporting.exports', label: 'Rapor export hazirligini etkinlestir', defaultEnabled: false },
    { key: 'reporting.financialKpis', label: 'Finansal KPI kartlarini etkinlestir', defaultEnabled: true },
    { key: 'reporting.auditKpis', label: 'Audit KPI kartlarini etkinlestir', defaultEnabled: true },
    { key: 'reporting.hrKpis', label: 'IK KPI kartlarini etkinlestir', defaultEnabled: true },
    { key: 'reporting.systemKpis', label: 'Sistem KPI kartlarini etkinlestir', defaultEnabled: true },
  ],
}
