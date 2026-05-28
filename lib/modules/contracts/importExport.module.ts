import { PERMISSIONS } from '@/packages/shared/src'
import type { ModuleContract } from '../moduleContract.types'

export const importExportModule: ModuleContract = {
  key: 'importExport',
  name: 'Data Import / Export',
  description: 'Sablonlu import, maskeli export ve kontrollu bulk operation altyapisi.',
  domain: 'data-management',
  category: 'platform',
  version: '2026-05-28.18',
  status: 'active',
  defaultEnabled: true,
  licenseRequired: false,
  setupRequired: true,
  dependencies: [
    { moduleKey: 'companies', required: true, reason: 'Import/export sirket scope ve master data uzerinden calisir.' },
    { moduleKey: 'audit', required: true, reason: 'Toplu islem ve export hareketleri auditlenir.' },
    { moduleKey: 'actionCenter', required: false, reason: 'Uzun suren isler kullaniciya is merkezi uzerinden duyurulur.' },
  ],
  entities: [
    { key: 'data_import_job', tableName: 'data_import_jobs', displayName: 'Import job' },
    { key: 'data_export_job', tableName: 'data_export_jobs', displayName: 'Export job' },
    { key: 'data_bulk_action_job', tableName: 'data_bulk_action_jobs', displayName: 'Bulk action job' },
  ],
  routes: [
    { path: '/app/sistem/import', type: 'page', permission: PERMISSIONS.importExport.importView },
    { path: '/app/sistem/export', type: 'page', permission: PERMISSIONS.importExport.exportCreate },
    { path: '/api/import/templates', type: 'api', permission: PERMISSIONS.importExport.importView },
    { path: '/api/import/jobs', type: 'api', permission: PERMISSIONS.importExport.importCreate },
    { path: '/api/export/jobs', type: 'api', permission: PERMISSIONS.importExport.exportCreate },
    { path: '/api/bulk/actions', type: 'api', permission: PERMISSIONS.importExport.bulkCreate },
  ],
  menus: [
    { label: 'Data Import', path: '/app/sistem/import', icon: 'Upload', order: 934, permission: PERMISSIONS.importExport.importView, featureFlag: 'dataImport.enabled' },
    { label: 'Data Export / Bulk', path: '/app/sistem/export', icon: 'Download', order: 935, permission: PERMISSIONS.importExport.exportCreate, featureFlag: 'dataExport.enabled' },
  ],
  permissions: [
    { key: PERMISSIONS.importExport.importView, label: 'Import goruntule' },
    { key: PERMISSIONS.importExport.importCreate, label: 'Import job olustur' },
    { key: PERMISSIONS.importExport.importConfirm, label: 'Import onayla' },
    { key: PERMISSIONS.importExport.importCancel, label: 'Import iptal et' },
    { key: PERMISSIONS.importExport.exportCreate, label: 'Export olustur' },
    { key: PERMISSIONS.importExport.exportDownload, label: 'Export indir' },
    { key: PERMISSIONS.importExport.bulkCreate, label: 'Bulk dry-run olustur' },
    { key: PERMISSIONS.importExport.bulkConfirm, label: 'Bulk onayla' },
    { key: PERMISSIONS.importExport.bulkAdmin, label: 'Bulk admin' },
  ],
  actions: [
    { key: 'data_import_open', label: 'Data import ac', actionType: 'navigate', targetPage: '/app/sistem/import', permission: PERMISSIONS.importExport.importView, featureFlag: 'dataImport.enabled' },
    { key: 'data_export_open', label: 'Data export ac', actionType: 'navigate', targetPage: '/app/sistem/export', permission: PERMISSIONS.importExport.exportCreate, featureFlag: 'dataExport.enabled' },
    { key: 'bulk_operations_open', label: 'Bulk operations ac', actionType: 'navigate', targetPage: '/app/sistem/export', permission: PERMISSIONS.importExport.bulkCreate, featureFlag: 'bulkOperations.enabled' },
  ],
  projections: [],
  events: [
    { eventType: 'import.completed', version: '1', aggregateType: 'data_import_job' },
    { eventType: 'export.completed', version: '1', aggregateType: 'data_export_job' },
    { eventType: 'bulk_action.completed', version: '1', aggregateType: 'data_bulk_action_job' },
  ],
  featureFlags: [
    { key: 'dataImport.enabled', label: 'Data import', defaultEnabled: true },
    { key: 'dataImport.csv', label: 'CSV import', defaultEnabled: true },
    { key: 'dataImport.xlsx', label: 'XLSX import', defaultEnabled: true },
    { key: 'dataExport.enabled', label: 'Data export', defaultEnabled: true },
    { key: 'bulkOperations.enabled', label: 'Bulk operations', defaultEnabled: true },
    { key: 'bulkOperations.confirmationRequired', label: 'Bulk confirmation required', defaultEnabled: true },
  ],
}
