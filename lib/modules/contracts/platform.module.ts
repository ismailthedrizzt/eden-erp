import type { ModuleContract } from '../moduleContract.types'

const platformVersion = '2026-05-26.1'

export const processModule: ModuleContract = {
  key: 'process',
  name: 'Surec Motoru',
  description: 'Surec, gorev ve onay takibi icin platform katmani.',
  domain: 'platform',
  category: 'platform',
  version: platformVersion,
  status: 'active',
  defaultEnabled: true,
  licenseRequired: false,
  setupRequired: true,
  dependencies: [],
  entities: [
    { key: 'process_instance', tableName: 'process_instances', displayName: 'Surec' },
    { key: 'process_task', tableName: 'process_tasks', displayName: 'Surec gorevi' },
    { key: 'process_approval', tableName: 'process_approvals', displayName: 'Surec onayi' },
  ],
  routes: [
    { path: '/app/surecler', type: 'page', permission: 'settings.view' },
    { path: '/api/processes', type: 'api', permission: 'settings.view' },
    { path: '/api/tasks', type: 'api', permission: 'settings.view' },
    { path: '/api/approvals', type: 'api', permission: 'settings.view' },
  ],
  menus: [{ label: 'Surecler', path: '/app/surecler', icon: 'Workflow', order: 940, permission: 'settings.view' }],
  permissions: [{ key: 'settings.view', label: 'Surecleri goruntuleme' }],
  actions: [
    { key: 'start_process', label: 'Surec baslat', actionType: 'operation', targetPage: '/app/surecler', permission: 'settings.view' },
    { key: 'complete_process_step', label: 'Surec adimini tamamla', actionType: 'operation', targetPage: '/app/surecler', permission: 'settings.view' },
  ],
  projections: [],
  events: [
    { eventType: 'process.started', version: '1.0', aggregateType: 'process_instance' },
    { eventType: 'process.task_created', version: '1.0', aggregateType: 'process_task' },
    { eventType: 'process.approval_requested', version: '1.0', aggregateType: 'process_approval' },
    { eventType: 'process.completed', version: '1.0', aggregateType: 'process_instance' },
    { eventType: 'process.failed', version: '1.0', aggregateType: 'process_instance' },
  ],
  featureFlags: [{ key: 'enabled', label: 'Surec motoru', defaultEnabled: true }],
}

export const auditModule: ModuleContract = {
  key: 'audit',
  name: 'Denetim Izi',
  description: 'Kritik islemler ve erisimler icin denetim izi platform katmani.',
  domain: 'platform',
  category: 'platform',
  version: platformVersion,
  status: 'active',
  defaultEnabled: true,
  licenseRequired: false,
  setupRequired: true,
  dependencies: [],
  entities: [{ key: 'audit_log', tableName: 'audit_logs', displayName: 'Denetim izi' }],
  routes: [
    { path: '/app/sistem/audit', type: 'page', permission: 'audit.view', fallbackPermission: 'settings.view' },
    { path: '/api/audit', type: 'api', permission: 'audit.view', fallbackPermission: 'settings.view' },
  ],
  menus: [{ label: 'Denetim Izi', path: '/app/sistem/audit', icon: 'List', order: 930, permission: 'audit.view' }],
  permissions: [{ key: 'audit.view', label: 'Denetim izini goruntuleme', fallback: ['settings.view'] }],
  actions: [
    { key: 'record_audit', label: 'Denetim izi kaydet', actionType: 'operation' },
    { key: 'list_audit_logs', label: 'Denetim izini goruntule', actionType: 'view', targetPage: '/app/sistem/audit', permission: 'audit.view', fallbackPermission: 'settings.view' },
  ],
  projections: [],
  events: [{ eventType: 'audit.recorded', version: '1.0', aggregateType: 'audit_log' }],
  featureFlags: [{ key: 'enabled', label: 'Denetim izi', defaultEnabled: true }],
}

export const outboxModule: ModuleContract = {
  key: 'outbox',
  name: 'Sistem Olaylari',
  description: 'Outbox event kuyrugu ve dispatcher altyapisi.',
  domain: 'platform',
  category: 'platform',
  version: platformVersion,
  status: 'active',
  defaultEnabled: true,
  licenseRequired: false,
  setupRequired: true,
  dependencies: [],
  entities: [
    { key: 'outbox_event', tableName: 'outbox_events', displayName: 'Sistem olayi' },
    { key: 'outbox_handler_run', tableName: 'outbox_event_handler_runs', displayName: 'Olay isleme kaydi' },
  ],
  routes: [{ path: '/api/cron/outbox-dispatch', type: 'api' }],
  menus: [],
  permissions: [],
  actions: [
    { key: 'enqueue_event', label: 'Olay kaydet', actionType: 'operation' },
    { key: 'dispatch_outbox_event', label: 'Olaylari isle', actionType: 'operation' },
    { key: 'retry_outbox_event', label: 'Olayi tekrar dene', actionType: 'operation' },
  ],
  projections: [],
  events: [
    { eventType: 'projection.refresh_requested', version: '1.0', aggregateType: 'system' },
    { eventType: 'notification.created', version: '1.0', aggregateType: 'system' },
    { eventType: 'ai_context.refresh_requested', version: '1.0', aggregateType: 'system' },
  ],
}

export const actionCenterModule: ModuleContract = {
  key: 'actionCenter',
  name: 'Is Merkezi',
  description: 'Bekleyen gorev, onay, islem ve sistem uyarilarini birlestiren platform katmani.',
  domain: 'platform',
  category: 'platform',
  version: platformVersion,
  status: 'active',
  defaultEnabled: true,
  licenseRequired: false,
  setupRequired: false,
  dependencies: [
    { moduleKey: 'process', required: false, reason: 'Surec gorevleri ve onaylar is merkezini zenginlestirir.' },
    { moduleKey: 'outbox', required: false, reason: 'Sistem olay uyarilari is merkezine eklenebilir.' },
  ],
  entities: [{ key: 'action_center_item', displayName: 'Bekleyen is' }],
  routes: [
    { path: '/api/action-center', type: 'api' },
    { path: '/api/action-center/counts', type: 'api' },
    { path: '/api/action-center/summary', type: 'api' },
    { path: '/api/action-center/by-record', type: 'api' },
  ],
  menus: [],
  permissions: [],
  actions: [
    { key: 'dismiss_action_item', label: 'Bekleyen isi kapat', actionType: 'operation' },
    { key: 'resolve_action_item', label: 'Bekleyen isi tamamla', actionType: 'operation' },
  ],
  projections: [{ key: 'pending_actions', projectionKey: 'pendingActions', required: false }],
  events: [
    { eventType: 'notification.created', version: '1.0', aggregateType: 'system' },
    { eventType: 'process.task_created', version: '1.0', aggregateType: 'process_task' },
  ],
  featureFlags: [{ key: 'enabled', label: 'Is merkezi', defaultEnabled: true }],
}
