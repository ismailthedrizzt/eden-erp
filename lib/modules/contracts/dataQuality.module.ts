import { PERMISSIONS } from '@/packages/shared/src'
import type { ModuleContract } from '../moduleContract.types'

export const dataQualityModule: ModuleContract = {
  key: 'dataQuality',
  name: 'Veri Kalitesi',
  description: 'Duplicate detection, kalite skorlari, merge review ve master data governance altyapisi.',
  domain: 'data-governance',
  category: 'platform',
  version: '2026-05-29.23',
  status: 'active',
  defaultEnabled: true,
  licenseRequired: false,
  setupRequired: true,
  dependencies: [
    { moduleKey: 'crm', required: false, reason: 'Master kisi/kurum ve paydas duplicate kontrolleri icin veri kaynagidir.' },
    { moduleKey: 'accounting', required: false, reason: 'Cari kart duplicate ve link kalitesi kontrolleri icin veri kaynagidir.' },
    { moduleKey: 'documents', required: false, reason: 'Zorunlu belge, expired belge ve duplicate file checksum kontrolleri icin veri kaynagidir.' },
    { moduleKey: 'audit', required: true, reason: 'Merge ve rule degisiklikleri auditlenmelidir.' },
  ],
  entities: [
    { key: 'data_quality_rule', tableName: 'data_quality_rules', displayName: 'Kalite kurali' },
    { key: 'data_quality_score', tableName: 'data_quality_scores', displayName: 'Kalite skoru' },
    { key: 'duplicate_candidate_group', tableName: 'duplicate_candidate_groups', displayName: 'Duplicate grup' },
    { key: 'merge_operation', tableName: 'merge_operations', displayName: 'Merge islemi' },
    { key: 'data_quality_finding', tableName: 'data_quality_findings', displayName: 'Kalite bulgusu' },
  ],
  routes: [
    { path: '/app/sistem/veri-kalitesi', type: 'page', permission: PERMISSIONS.dataQuality.view },
    { path: '/api/data-quality/summary', type: 'api', permission: PERMISSIONS.dataQuality.view },
    { path: '/api/data-quality/check', type: 'api', permission: PERMISSIONS.dataQuality.runChecks },
    { path: '/api/data-quality/duplicates', type: 'api', permission: PERMISSIONS.dataQuality.reviewDuplicates },
    { path: '/api/data-quality/merge/preview', type: 'api', permission: PERMISSIONS.dataQuality.reviewDuplicates },
    { path: '/api/data-quality/merge/confirm', type: 'api', permission: PERMISSIONS.dataQuality.merge },
  ],
  menus: [
    { label: 'Veri Kalitesi', path: '/app/sistem/veri-kalitesi', icon: 'ShieldAlert', order: 936, permission: PERMISSIONS.dataQuality.view, featureFlag: 'dataQuality.enabled' },
  ],
  permissions: [
    { key: PERMISSIONS.dataQuality.view, label: 'Veri kalitesi goruntule' },
    { key: PERMISSIONS.dataQuality.runChecks, label: 'Veri kalite kontrolu calistir' },
    { key: PERMISSIONS.dataQuality.reviewDuplicates, label: 'Duplicate adaylarini incele' },
    { key: PERMISSIONS.dataQuality.merge, label: 'Guvenli merge onayla' },
    { key: PERMISSIONS.dataQuality.dismissFinding, label: 'Bulgu kapat veya false positive isaretle' },
    { key: PERMISSIONS.dataQuality.admin, label: 'Veri kalitesi kurallarini yonet' },
  ],
  actions: [
    { key: 'data_quality_open', label: 'Veri kalitesi ekranini ac', actionType: 'navigate', targetPage: '/app/sistem/veri-kalitesi', permission: PERMISSIONS.dataQuality.view, featureFlag: 'dataQuality.enabled' },
    { key: 'data_quality_detect_duplicates', label: 'Duplicate taramasi baslat', actionType: 'operation', targetPage: '/app/sistem/veri-kalitesi', permission: PERMISSIONS.dataQuality.runChecks, featureFlag: 'dataQuality.duplicateDetection' },
    { key: 'data_quality_review_merge', label: 'Merge incele', actionType: 'operation', targetPage: '/app/sistem/veri-kalitesi', permission: PERMISSIONS.dataQuality.reviewDuplicates, featureFlag: 'dataQuality.merge' },
  ],
  projections: [],
  events: [
    { eventType: 'data_quality.check_completed', version: '1', aggregateType: 'data_quality' },
    { eventType: 'data_quality.duplicate_detected', version: '1', aggregateType: 'duplicate_candidate_group' },
    { eventType: 'data_quality.merge_completed', version: '1', aggregateType: 'merge_operation' },
  ],
  featureFlags: [
    { key: 'dataQuality.enabled', label: 'Veri kalitesi', defaultEnabled: true },
    { key: 'dataQuality.duplicateDetection', label: 'Duplicate detection', defaultEnabled: true },
    { key: 'dataQuality.merge', label: 'Guvenli merge', defaultEnabled: true },
    { key: 'dataQuality.qualityScores', label: 'Kalite skorlari', defaultEnabled: true },
    { key: 'dataQuality.actionCenterWarnings', label: 'Action Center kalite uyarilari', defaultEnabled: true },
    { key: 'dataQuality.importIntegration', label: 'Import duplicate entegrasyonu', defaultEnabled: true },
  ],
}

