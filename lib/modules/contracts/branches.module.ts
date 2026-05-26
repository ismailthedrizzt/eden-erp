import { PERMISSIONS } from '@/packages/shared/src'
import type { ModuleContract } from '../moduleContract.types'

export const branchesModule: ModuleContract = {
  key: 'branches',
  name: 'Subelerimiz',
  description: 'Sirket subeleri, sube acilisi/kapanisi ve sube belge islemleri.',
  domain: 'company',
  category: 'sirket',
  version: '2026-05-26.1',
  status: 'active',
  defaultEnabled: true,
  licenseRequired: false,
  setupRequired: false,
  dependencies: [
    { moduleKey: 'companies', required: true, reason: 'Subeler bagli sirket kapsaminda acilir ve kapanir.' },
    { moduleKey: 'organization', required: false, reason: 'Organizasyon birimi otomasyonu icin teskilat modulu onerilir.' },
    { moduleKey: 'facilities', required: false, reason: 'Fiziksel lokasyon/tesis otomasyonu icin tesis modulu onerilir.' },
  ],
  entities: [
    { key: 'company_branch', tableName: 'company_branches', displayName: 'Sube', lifecycle: true, draftSupported: false },
  ],
  routes: [
    { path: '/app/sirket/companies/branches', type: 'page', permission: PERMISSIONS.branches.view, fallbackPermission: PERMISSIONS.companies.view },
    { path: '/api/companies/branches', type: 'api', permission: PERMISSIONS.branches.view, fallbackPermission: PERMISSIONS.companies.view },
    { path: '/api/companies/branches/[id]', type: 'api', permission: PERMISSIONS.branches.view, fallbackPermission: PERMISSIONS.companies.view },
    { path: '/api/companies/[company_id]/official-changes/branch-opening', type: 'api', permission: PERMISSIONS.branches.openingStart, fallbackPermission: PERMISSIONS.companies.edit },
    { path: '/api/companies/[company_id]/official-changes/branch-closing', type: 'api', permission: PERMISSIONS.branches.closingStart, fallbackPermission: PERMISSIONS.companies.edit },
  ],
  menus: [
    { label: 'Subelerimiz', path: '/app/sirket/companies/branches', icon: 'MapPin', order: 20, parent: 'sirket', permission: PERMISSIONS.branches.view },
  ],
  permissions: [
    { key: PERMISSIONS.branches.view, label: 'Subeleri goruntuleme', fallback: [PERMISSIONS.companies.view] },
    { key: PERMISSIONS.branches.edit, label: 'Sube kartini duzenleme', fallback: [PERMISSIONS.companies.edit] },
    { key: PERMISSIONS.branches.openingStart, label: 'Sube acilisi baslatma', fallback: [PERMISSIONS.companies.edit] },
    { key: PERMISSIONS.branches.closingStart, label: 'Sube kapanisi baslatma', fallback: [PERMISSIONS.companies.edit] },
    { key: PERMISSIONS.branches.documentsUpdate, label: 'Sube belgelerini guncelleme', fallback: [PERMISSIONS.companies.edit] },
  ],
  actions: [
    { key: 'branch_opening', label: 'Sube acilisi', actionType: 'open_wizard', targetPage: '/app/sirket/companies', wizardKey: 'branch_opening', permission: PERMISSIONS.branches.openingStart, fallbackPermission: PERMISSIONS.companies.edit, requiredRecordType: 'company', requiredRecordStatus: ['active'] },
    { key: 'branch_closing', label: 'Sube kapanisi', actionType: 'open_wizard', targetPage: '/app/sirket/companies/branches', wizardKey: 'branch_closing', permission: PERMISSIONS.branches.closingStart, fallbackPermission: PERMISSIONS.companies.edit, requiredRecordType: 'branch', requiredRecordStatus: ['active'] },
    { key: 'branch_document_update', label: 'Sube belge guncelleme', actionType: 'open_wizard', targetPage: '/app/sirket/companies/branches', wizardKey: 'branch_document_update', permission: PERMISSIONS.branches.documentsUpdate, fallbackPermission: PERMISSIONS.companies.edit, requiredRecordType: 'branch' },
    { key: 'branch_view', label: 'Sube goruntuleme', actionType: 'view', targetPage: '/app/sirket/companies/branches', permission: PERMISSIONS.branches.view, fallbackPermission: PERMISSIONS.companies.view },
  ],
  projections: [
    { key: 'branch_list', projectionKey: 'branchList', required: true },
    { key: 'branch_summary', projectionKey: 'branchSummary', required: true },
  ],
  events: [
    { eventType: 'company.branch_opened', version: '1', aggregateType: 'company_branch' },
    { eventType: 'company.branch_closed', version: '1', aggregateType: 'company_branch' },
  ],
}
