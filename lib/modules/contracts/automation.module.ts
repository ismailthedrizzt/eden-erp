import { PERMISSIONS } from '@/packages/shared/src/permissions'
import type { ModuleContract } from '../moduleContract.types'

export const automationModule: ModuleContract = {
  key: 'automation',
  name: 'Workflow Automation',
  description: 'Registry kontrollu kural motoru, scheduled/event/condition triggerlari, simulation, run log ve guvenli action template altyapisi.',
  domain: 'platform',
  category: 'platform',
  version: '2026-05-29.2380',
  status: 'active',
  defaultEnabled: true,
  licenseRequired: false,
  setupRequired: true,
  dependencies: [
    { moduleKey: 'outbox', required: false, reason: 'Event based automation icin outbox eventleri okunur.' },
    { moduleKey: 'notifications', required: false, reason: 'Bildirim, reminder ve email aksiyonlari optional olarak uretilir.' },
    { moduleKey: 'project_management', required: false, reason: 'Task/follow-up aksiyonlari proje gorevi olarak yazilabilir.' },
    { moduleKey: 'audit', required: false, reason: 'Kural ve aksiyon izleri audit loga best-effort yazilir.' },
  ],
  entities: [
    { key: 'automation_rule', tableName: 'automation_rules', displayName: 'Otomasyon Kurali', lifecycle: false, draftSupported: true },
    { key: 'automation_rule_run', tableName: 'automation_rule_runs', displayName: 'Otomasyon Calisma Logu', lifecycle: false, draftSupported: false },
    { key: 'automation_rule_template', tableName: 'automation_rule_templates', displayName: 'Otomasyon Sablonu', lifecycle: false, draftSupported: false },
    { key: 'automation_action_result', tableName: 'automation_action_results', displayName: 'Otomasyon Aksiyon Sonucu', lifecycle: false, draftSupported: false },
  ],
  routes: [
    { path: '/app/sistem/otomasyonlar', type: 'page', permission: PERMISSIONS.automation.view },
    { path: '/api/automation/rules', type: 'api', permission: PERMISSIONS.automation.view },
    { path: '/api/automation/templates', type: 'api', permission: PERMISSIONS.automation.view },
    { path: '/api/automation/runs', type: 'api', permission: PERMISSIONS.automation.viewRuns },
  ],
  menus: [
    { label: 'Otomasyonlar', path: '/app/sistem/otomasyonlar', icon: 'Workflow', order: 908, parent: 'settings', permission: PERMISSIONS.automation.view, featureFlag: 'automation.enabled' },
  ],
  permissions: [
    { key: PERMISSIONS.automation.view, label: 'Otomasyonlari goruntule' },
    { key: PERMISSIONS.automation.create, label: 'Otomasyon kurali olustur' },
    { key: PERMISSIONS.automation.edit, label: 'Otomasyon kurali duzenle' },
    { key: PERMISSIONS.automation.activate, label: 'Otomasyon kurali aktiflestir/duraklat' },
    { key: PERMISSIONS.automation.run, label: 'Otomasyon calistir/simule et' },
    { key: PERMISSIONS.automation.viewRuns, label: 'Run loglarini goruntule' },
    { key: PERMISSIONS.automation.admin, label: 'Otomasyon yoneticisi' },
  ],
  actions: [
    { key: 'automation_open_rules', label: 'Otomasyonlari ac', actionType: 'navigate', targetPage: '/app/sistem/otomasyonlar', permission: PERMISSIONS.automation.view, featureFlag: 'automation.enabled' },
    { key: 'automation_create_rule', label: 'Otomasyon kurali olustur', actionType: 'operation', targetPage: '/app/sistem/otomasyonlar', permission: PERMISSIONS.automation.create, featureFlag: 'automation.enabled' },
    { key: 'automation_simulate_rule', label: 'Kurali test et', actionType: 'operation', targetPage: '/app/sistem/otomasyonlar', permission: PERMISSIONS.automation.run, featureFlag: 'automation.simulation' },
  ],
  projections: [],
  events: [
    { eventType: 'automation.rule_created', version: '1', aggregateType: 'automation_rule' },
    { eventType: 'automation.rule_run', version: '1', aggregateType: 'automation_rule' },
    { eventType: 'automation.action_created', version: '1', aggregateType: 'automation_action' },
  ],
  featureFlags: [
    { key: 'automation.enabled', label: 'Workflow Automation', defaultEnabled: true },
    { key: 'automation.eventRules', label: 'Event rules', defaultEnabled: true },
    { key: 'automation.scheduledRules', label: 'Scheduled rules', defaultEnabled: true },
    { key: 'automation.conditionRules', label: 'Condition rules', defaultEnabled: true },
    { key: 'automation.ruleTemplates', label: 'Rule templates', defaultEnabled: true },
    { key: 'automation.simulation', label: 'Rule simulation', defaultEnabled: true },
    { key: 'automation.emailActions', label: 'Email actions', defaultEnabled: true },
    { key: 'automation.taskActions', label: 'Task actions', defaultEnabled: true },
    { key: 'automation.notificationActions', label: 'Notification actions', defaultEnabled: true },
  ],
}
