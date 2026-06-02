import { PERMISSIONS } from '@/packages/shared/src'
import type { ModuleContract } from '../moduleContract.types'

export const notificationsModule: ModuleContract = {
  key: 'notifications',
  name: 'Bildirim / Hatirlatma / E-posta',
  description: 'Uygulama ici bildirim, hatirlatma, e-posta kuyrugu ve kullanici tercihleri altyapisi.',
  domain: 'notifications',
  category: 'platform',
  version: '2026-05-28.20',
  status: 'active',
  defaultEnabled: true,
  licenseRequired: false,
  setupRequired: true,
  dependencies: [
    { moduleKey: 'security', required: true, reason: 'Bildirimler kullanici, rol, scope ve permission kontrollerine baglidir.' },
    { moduleKey: 'outbox', required: false, reason: 'Teknik eventler kullanici dilindeki bildirimlere outbox handler ile donusur.' },
    { moduleKey: 'actionCenter', required: false, reason: 'Aksiyon gerektiren bildirimler Is Merkezi itemi olarak da gorunebilir.' },
    { moduleKey: 'documents', required: false, reason: 'Belge eksigi, red ve sure yaklasimi bildirimleri buradan beslenir.' },
  ],
  entities: [
    { key: 'notification', tableName: 'notifications', displayName: 'Bildirim' },
    { key: 'notification_preference', tableName: 'notification_preferences', displayName: 'Bildirim tercihi' },
    { key: 'reminder', tableName: 'reminders', displayName: 'Hatirlatma' },
    { key: 'email_message', tableName: 'email_messages', displayName: 'E-posta mesaji' },
    { key: 'notification_template', tableName: 'notification_templates', displayName: 'Bildirim sablonu' },
  ],
  routes: [
    { path: '/app/ayarlar/bildirimler', type: 'page', permission: PERMISSIONS.notifications.view },
    { path: '/app/sistem/e-postalar', type: 'page', permission: PERMISSIONS.notifications.emailAdmin },
    { path: '/api/notifications', type: 'api', permission: PERMISSIONS.notifications.view },
    { path: '/api/notifications/preferences', type: 'api', permission: PERMISSIONS.notifications.manage },
    { path: '/api/reminders', type: 'api', permission: PERMISSIONS.notifications.remindersManage },
    { path: '/api/system/email/messages', type: 'api', permission: PERMISSIONS.notifications.emailAdmin },
  ],
  menus: [
    { label: 'Sistem E-postalari', path: '/app/sistem/e-postalar', icon: 'Mail', order: 936, permission: PERMISSIONS.notifications.emailAdmin, featureFlag: 'notifications.email' },
  ],
  permissions: [
    { key: PERMISSIONS.notifications.view, label: 'Kendi bildirimlerini goruntule' },
    { key: PERMISSIONS.notifications.manage, label: 'Bildirim tercihleri ve hatirlatmalari yonet' },
    { key: PERMISSIONS.notifications.admin, label: 'Sistem bildirimlerini yonet' },
    { key: PERMISSIONS.notifications.emailAdmin, label: 'Sistem e-posta kuyrugunu yonet' },
    { key: PERMISSIONS.notifications.remindersManage, label: 'Hatirlatmalari yonet' },
  ],
  actions: [
    { key: 'view_system_emails', label: 'Sistem e-posta kuyrugunu gor', actionType: 'navigate', targetPage: '/app/sistem/e-postalar', permission: PERMISSIONS.notifications.emailAdmin, featureFlag: 'notifications.email' },
    { key: 'retry_failed_email', label: 'Basarisiz e-postayi tekrar dene', actionType: 'navigate', targetPage: '/app/sistem/e-postalar', permission: PERMISSIONS.notifications.emailAdmin, featureFlag: 'notifications.email' },
  ],
  projections: [],
  events: [
    { eventType: 'notification.created', version: '1', aggregateType: 'notification' },
    { eventType: 'reminder.sent', version: '1', aggregateType: 'reminder' },
    { eventType: 'email.sent', version: '1', aggregateType: 'email_message' },
    { eventType: 'email.failed', version: '1', aggregateType: 'email_message' },
  ],
  featureFlags: [
    { key: 'notifications.enabled', label: 'Bildirim sistemi', defaultEnabled: true },
    { key: 'notifications.inApp', label: 'Uygulama ici bildirimler', defaultEnabled: true },
    { key: 'notifications.email', label: 'E-posta bildirimleri', defaultEnabled: true },
    { key: 'notifications.reminders', label: 'Hatirlatmalar', defaultEnabled: true },
    { key: 'notifications.digest', label: 'Bildirim ozetleri', defaultEnabled: false },
    { key: 'notifications.systemWarnings', label: 'Sistem uyarilari', defaultEnabled: true },
    { key: 'notifications.emailTemplates', label: 'E-posta sablonlari', defaultEnabled: true },
  ],
}
