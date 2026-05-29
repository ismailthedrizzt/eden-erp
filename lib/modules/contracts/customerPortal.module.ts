import { PERMISSIONS } from '@/packages/shared/src/permissions'
import type { ModuleContract } from '../moduleContract.types'

export const customerPortalModule: ModuleContract = {
  key: 'customerPortal',
  name: 'Customer Portal',
  description: 'Dis musteri kullanicilari icin scoped urun, servis talebi, servis kaydi, belge ve bildirim self-service portali.',
  domain: 'platform',
  category: 'operations',
  version: '2026-05-29.2400',
  status: 'active',
  defaultEnabled: true,
  licenseRequired: false,
  setupRequired: true,
  dependencies: [
    { moduleKey: 'crm', required: true, reason: 'Portal kullanicisi CRM stakeholder/customer kaydina baglanir.' },
    { moduleKey: 'after_sales', required: true, reason: 'Kurulu urun, servis talebi ve servis kayitlari portal veri kaynagidir.' },
    { moduleKey: 'documents', required: false, reason: 'Paylasilan servis raporlari ve musteri yuklemeleri document domain uzerinden izlenir.' },
    { moduleKey: 'notifications', required: false, reason: 'Portal bildirimleri best-effort notification altyapisindan okunur.' },
  ],
  entities: [
    { key: 'portal_external_user', tableName: 'portal_external_users', displayName: 'Portal Kullanicisi', lifecycle: false, draftSupported: false },
    { key: 'portal_invitation', tableName: 'portal_invitations', displayName: 'Portal Daveti', lifecycle: false, draftSupported: false },
    { key: 'portal_shared_document', tableName: 'portal_shared_documents', displayName: 'Portal Paylasilan Belge', lifecycle: false, draftSupported: false },
    { key: 'portal_activity_log', tableName: 'portal_activity_logs', displayName: 'Portal Aktivite Logu', lifecycle: false, draftSupported: false },
  ],
  routes: [
    { path: '/portal/dashboard', type: 'page' },
    { path: '/portal/products', type: 'page' },
    { path: '/portal/service-requests', type: 'page' },
    { path: '/portal/service-records', type: 'page' },
    { path: '/portal/documents', type: 'page' },
    { path: '/api/portal/me', type: 'api' },
    { path: '/api/portal/service-requests', type: 'api' },
    { path: '/api/admin/portal/users', type: 'api', permission: PERMISSIONS.portal.manageUsers },
  ],
  menus: [],
  permissions: [
    { key: PERMISSIONS.portal.manageUsers, label: 'Portal kullanicilarini yonet' },
    { key: PERMISSIONS.portal.inviteUsers, label: 'Portal kullanicisi davet et' },
    { key: PERMISSIONS.portal.suspendUsers, label: 'Portal kullanicisini askiya al' },
    { key: PERMISSIONS.portal.viewActivity, label: 'Portal aktivite izlerini goruntule' },
    { key: PERMISSIONS.portal.shareDocuments, label: 'Belgeyi portalla paylas' },
  ],
  actions: [
    { key: 'customerPortal_open_dashboard', label: 'Musteri portalini ac', actionType: 'navigate', targetPage: '/portal/dashboard', featureFlag: 'customerPortal.enabled' },
    { key: 'customerPortal_invite_user', label: 'Portal kullanicisi davet et', actionType: 'operation', targetPage: '/app/sirket/companies/stakeholders', permission: PERMISSIONS.portal.inviteUsers, featureFlag: 'customerPortal.invitations' },
  ],
  projections: [],
  events: [
    { eventType: 'portal.user_invited', version: '1', aggregateType: 'portal_external_user' },
    { eventType: 'portal.service_request_created', version: '1', aggregateType: 'service_request' },
    { eventType: 'portal.document_uploaded', version: '1', aggregateType: 'document' },
    { eventType: 'portal.access_denied', version: '1', aggregateType: 'portal_activity_log' },
  ],
  featureFlags: [
    { key: 'customerPortal.enabled', label: 'Musteri portali', defaultEnabled: true },
    { key: 'customerPortal.serviceRequests', label: 'Portal servis talepleri', defaultEnabled: true },
    { key: 'customerPortal.installedAssets', label: 'Portal kurulu urunleri', defaultEnabled: true },
    { key: 'customerPortal.documents', label: 'Portal belgeleri', defaultEnabled: true },
    { key: 'customerPortal.notifications', label: 'Portal bildirimleri', defaultEnabled: true },
    { key: 'customerPortal.invitations', label: 'Portal davetleri', defaultEnabled: true },
    { key: 'customerPortal.branding', label: 'Portal marka ayarlari', defaultEnabled: true },
    { key: 'customerPortal.customerComments', label: 'Portal musteri yorumlari', defaultEnabled: true },
  ],
}

