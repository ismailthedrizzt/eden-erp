import { PERMISSIONS } from '@/packages/shared/src/permissions'
import type { ModuleContract } from '../moduleContract.types'

export const aiCopilotModule: ModuleContract = {
  key: 'aiCopilot',
  name: 'AI Copilot',
  description: 'Baglamsal copilot, kayit ozeti, guvenli action preview, form assist ve belge zekasi.',
  domain: 'platform',
  category: 'platform',
  version: '2026-05-29.2390',
  status: 'active',
  defaultEnabled: true,
  licenseRequired: false,
  setupRequired: true,
  dependencies: [
    { moduleKey: 'documents', required: false, reason: 'Belge zekasi document text/metadata kaynaklarini kullanir.' },
    { moduleKey: 'audit', required: false, reason: 'AI query ve action preview izleri audit loga best-effort yazilir.' },
    { moduleKey: 'actionCenter', required: false, reason: 'Pending action ozeti context builder tarafindan okunur.' },
  ],
  entities: [
    { key: 'ai_copilot_history', tableName: 'ai_copilot_history', displayName: 'AI Copilot Gecmisi', lifecycle: false, draftSupported: false },
    { key: 'ai_copilot_feedback', tableName: 'ai_copilot_feedback', displayName: 'AI Feedback', lifecycle: false, draftSupported: false },
    { key: 'ai_document_intelligence_result', tableName: 'ai_document_intelligence_results', displayName: 'AI Belge Zekasi Sonucu', lifecycle: false, draftSupported: false },
  ],
  routes: [
    { path: '/app/sistem/ai-copilot', type: 'page', permission: PERMISSIONS.aiCopilot.manageSettings },
    { path: '/api/ai/copilot/query', type: 'api', permission: PERMISSIONS.aiCopilot.use },
    { path: '/api/ai/copilot/form-assist', type: 'api', permission: PERMISSIONS.aiCopilot.formAssist },
    { path: '/api/ai/copilot/document-summary', type: 'api', permission: PERMISSIONS.aiCopilot.documentIntelligence },
  ],
  menus: [
    { label: 'AI Copilot', path: '/app/sistem/ai-copilot', icon: 'Sparkles', order: 909, parent: 'settings', permission: PERMISSIONS.aiCopilot.manageSettings, featureFlag: 'aiCopilot.enabled' },
  ],
  permissions: [
    { key: PERMISSIONS.aiCopilot.use, label: 'AI Copilot kullan' },
    { key: PERMISSIONS.aiCopilot.formAssist, label: 'AI form assist kullan' },
    { key: PERMISSIONS.aiCopilot.documentIntelligence, label: 'AI belge zekasi kullan' },
    { key: PERMISSIONS.aiCopilot.adminAssist, label: 'AI admin yardimi kullan' },
    { key: PERMISSIONS.aiCopilot.viewHistory, label: 'AI gecmisini gor' },
    { key: PERMISSIONS.aiCopilot.manageSettings, label: 'AI ayarlarini yonet' },
  ],
  actions: [
    { key: 'ai_copilot_open', label: 'AI Copilot ac', actionType: 'navigate', targetPage: '/app', permission: PERMISSIONS.aiCopilot.use, featureFlag: 'aiCopilot.enabled' },
    { key: 'ai_copilot_form_assist', label: 'Form assist kullan', actionType: 'operation', targetPage: '/app', permission: PERMISSIONS.aiCopilot.formAssist, featureFlag: 'aiCopilot.formAssist' },
    { key: 'ai_copilot_document_summary', label: 'Belgeyi ozetle', actionType: 'operation', targetPage: '/app/belgeler', permission: PERMISSIONS.aiCopilot.documentIntelligence, featureFlag: 'aiCopilot.documentIntelligence' },
  ],
  projections: [],
  events: [
    { eventType: 'ai.query_submitted', version: '1', aggregateType: 'ai_copilot' },
    { eventType: 'ai.action_preview_created', version: '1', aggregateType: 'ai_action' },
    { eventType: 'ai.document_summary_created', version: '1', aggregateType: 'ai_document' },
  ],
  featureFlags: [
    { key: 'aiCopilot.enabled', label: 'AI Copilot', defaultEnabled: true },
    { key: 'aiCopilot.recordSummary', label: 'Kayit ozeti', defaultEnabled: true },
    { key: 'aiCopilot.formAssist', label: 'Form assist', defaultEnabled: true },
    { key: 'aiCopilot.documentIntelligence', label: 'Belge zekasi', defaultEnabled: true },
    { key: 'aiCopilot.safeActions', label: 'Safe AI actions', defaultEnabled: true },
    { key: 'aiCopilot.adminAssist', label: 'Admin assist', defaultEnabled: true },
    { key: 'aiCopilot.feedback', label: 'AI feedback', defaultEnabled: true },
    { key: 'aiCopilot.history', label: 'AI history', defaultEnabled: true },
  ],
}
