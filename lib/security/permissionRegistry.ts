import { PERMISSIONS } from '@/packages/shared/src'

export type PermissionCategory = 'view' | 'edit' | 'operation' | 'approval' | 'admin'

export interface PermissionContract {
  key: string
  label: string
  description?: string
  moduleKey: string
  domain?: string
  category?: PermissionCategory
  fallback?: string[]
  deprecated?: boolean
}

export const permissionRegistry = {
  companies: {
    view: PERMISSIONS.companies.view,
    insert: PERMISSIONS.companies.insert,
    edit: PERMISSIONS.companies.edit,
    openingStart: PERMISSIONS.companies.openingStart,
    liquidationStart: PERMISSIONS.companies.liquidationStart,
    deregistrationStart: PERMISSIONS.companies.deregistrationStart,
    officialChangeStart: 'companies.official_change.start',
    capitalIncreaseStart: 'companies.capital_increase.start',
    capitalDecreaseStart: 'companies.capital_decrease.start',
  },
  branches: {
    view: PERMISSIONS.branches.view,
    edit: PERMISSIONS.branches.edit,
    openingStart: PERMISSIONS.branches.openingStart,
    closingStart: PERMISSIONS.branches.closingStart,
    documentsUpdate: PERMISSIONS.branches.documentsUpdate,
  },
  partners: {
    view: 'partners.view',
    edit: 'partners.edit',
    ownershipStart: 'partners.ownership.start',
    ownershipUpdate: 'partners.ownership.update',
    ownershipApprove: 'partners.ownership.approve',
    ownershipReverse: 'partners.ownership.reverse',
  },
  representatives: {
    view: 'representatives.view',
    insert: 'representatives.insert',
    edit: 'representatives.edit',
    delete: 'representatives.delete',
    authorityStart: 'representatives.authority.start',
    authorityUpdate: 'representatives.authority.update',
    authoritySuspend: 'representatives.authority.suspend',
    authorityTerminate: 'representatives.authority.terminate',
    authorityApprove: 'representatives.authority.approve',
  },
  organization: {
    view: 'organization.view',
    edit: 'organization.edit',
    structureManage: 'organization.structure.manage',
    positionManage: 'organization.position.manage',
  },
  facilities: {
    view: 'facilities.view',
    edit: 'facilities.edit',
    linkBranch: 'facilities.link_branch',
    deactivate: 'facilities.deactivate',
  },
  settings: {
    view: 'settings.view',
    edit: 'settings.edit',
    auditView: 'audit.view',
    modulesManage: 'settings.modules.manage',
    usersManage: 'settings.users.manage',
  },
  importExport: {
    importView: PERMISSIONS.importExport.importView,
    importCreate: PERMISSIONS.importExport.importCreate,
    importConfirm: PERMISSIONS.importExport.importConfirm,
    importCancel: PERMISSIONS.importExport.importCancel,
    exportCreate: PERMISSIONS.importExport.exportCreate,
    exportDownload: PERMISSIONS.importExport.exportDownload,
    bulkCreate: PERMISSIONS.importExport.bulkCreate,
    bulkConfirm: PERMISSIONS.importExport.bulkConfirm,
    bulkAdmin: PERMISSIONS.importExport.bulkAdmin,
  },
  documents: {
    view: PERMISSIONS.documents.view,
    upload: PERMISSIONS.documents.upload,
    download: PERMISSIONS.documents.download,
    verify: PERMISSIONS.documents.verify,
    reject: PERMISSIONS.documents.reject,
    delete: PERMISSIONS.documents.delete,
    admin: PERMISSIONS.documents.admin,
    accessLogsView: PERMISSIONS.documents.accessLogsView,
  },
  notifications: {
    view: PERMISSIONS.notifications.view,
    manage: PERMISSIONS.notifications.manage,
    admin: PERMISSIONS.notifications.admin,
    emailAdmin: PERMISSIONS.notifications.emailAdmin,
    remindersManage: PERMISSIONS.notifications.remindersManage,
  },
  dataQuality: {
    view: PERMISSIONS.dataQuality.view,
    runChecks: PERMISSIONS.dataQuality.runChecks,
    reviewDuplicates: PERMISSIONS.dataQuality.reviewDuplicates,
    merge: PERMISSIONS.dataQuality.merge,
    dismissFinding: PERMISSIONS.dataQuality.dismissFinding,
    admin: PERMISSIONS.dataQuality.admin,
  },
  adminConsole: {
    view: PERMISSIONS.adminConsole.view,
    manage: PERMISSIONS.adminConsole.manage,
    technical: PERMISSIONS.adminConsole.technical,
    outboxAdmin: PERMISSIONS.adminConsole.outboxAdmin,
  },
  automation: {
    view: PERMISSIONS.automation.view,
    create: PERMISSIONS.automation.create,
    edit: PERMISSIONS.automation.edit,
    activate: PERMISSIONS.automation.activate,
    run: PERMISSIONS.automation.run,
    admin: PERMISSIONS.automation.admin,
    viewRuns: PERMISSIONS.automation.viewRuns,
  },
  aiCopilot: {
    use: PERMISSIONS.aiCopilot.use,
    formAssist: PERMISSIONS.aiCopilot.formAssist,
    documentIntelligence: PERMISSIONS.aiCopilot.documentIntelligence,
    adminAssist: PERMISSIONS.aiCopilot.adminAssist,
    viewHistory: PERMISSIONS.aiCopilot.viewHistory,
    manageSettings: PERMISSIONS.aiCopilot.manageSettings,
  },
  portal: {
    manageUsers: PERMISSIONS.portal.manageUsers,
    inviteUsers: PERMISSIONS.portal.inviteUsers,
    suspendUsers: PERMISSIONS.portal.suspendUsers,
    viewActivity: PERMISSIONS.portal.viewActivity,
    shareDocuments: PERMISSIONS.portal.shareDocuments,
  },
  integrations: {
    view: PERMISSIONS.integrations.view,
    manageApps: PERMISSIONS.integrations.manageApps,
    manageCredentials: PERMISSIONS.integrations.manageCredentials,
    manageWebhooks: PERMISSIONS.integrations.manageWebhooks,
    viewDeliveries: PERMISSIONS.integrations.viewDeliveries,
    retryDelivery: PERMISSIONS.integrations.retryDelivery,
    viewInbound: PERMISSIONS.integrations.viewInbound,
    processInbound: PERMISSIONS.integrations.processInbound,
    admin: PERMISSIONS.integrations.admin,
  },
} as const

const permissionAliases: Record<string, string> = {
  'companies.openingStart': permissionRegistry.companies.openingStart,
  'companies.liquidationStart': permissionRegistry.companies.liquidationStart,
  'companies.deregistrationStart': permissionRegistry.companies.deregistrationStart,
  'companies.officialChangeStart': permissionRegistry.companies.officialChangeStart,
  'companies.capitalIncreaseStart': permissionRegistry.companies.capitalIncreaseStart,
  'companies.capitalDecreaseStart': permissionRegistry.companies.capitalDecreaseStart,
  'branches.openingStart': permissionRegistry.branches.openingStart,
  'branches.closingStart': permissionRegistry.branches.closingStart,
  'branches.documentsUpdate': permissionRegistry.branches.documentsUpdate,
  'partners.ownershipStart': permissionRegistry.partners.ownershipStart,
  'partners.ownershipUpdate': permissionRegistry.partners.ownershipUpdate,
  'partners.ownershipApprove': permissionRegistry.partners.ownershipApprove,
  'partners.ownershipReverse': permissionRegistry.partners.ownershipReverse,
  'representatives.authorityStart': permissionRegistry.representatives.authorityStart,
  'representatives.authorityUpdate': permissionRegistry.representatives.authorityUpdate,
  'representatives.authoritySuspend': permissionRegistry.representatives.authoritySuspend,
  'representatives.authorityTerminate': permissionRegistry.representatives.authorityTerminate,
  'representatives.authorityApprove': permissionRegistry.representatives.authorityApprove,
  'organization.structureManage': permissionRegistry.organization.structureManage,
  'organization.positionManage': permissionRegistry.organization.positionManage,
  'facilities.linkBranch': permissionRegistry.facilities.linkBranch,
  'settings.auditView': permissionRegistry.settings.auditView,
  'settings.modulesManage': permissionRegistry.settings.modulesManage,
  'settings.usersManage': permissionRegistry.settings.usersManage,
  'importExport.importView': permissionRegistry.importExport.importView,
  'importExport.importCreate': permissionRegistry.importExport.importCreate,
  'importExport.importConfirm': permissionRegistry.importExport.importConfirm,
  'importExport.exportCreate': permissionRegistry.importExport.exportCreate,
  'importExport.exportDownload': permissionRegistry.importExport.exportDownload,
  'importExport.bulkCreate': permissionRegistry.importExport.bulkCreate,
  'importExport.bulkConfirm': permissionRegistry.importExport.bulkConfirm,
  'documents.view': permissionRegistry.documents.view,
  'documents.upload': permissionRegistry.documents.upload,
  'documents.download': permissionRegistry.documents.download,
  'documents.verify': permissionRegistry.documents.verify,
  'documents.reject': permissionRegistry.documents.reject,
  'documents.delete': permissionRegistry.documents.delete,
  'documents.admin': permissionRegistry.documents.admin,
  'documents.accessLogsView': permissionRegistry.documents.accessLogsView,
  'notifications.view': permissionRegistry.notifications.view,
  'notifications.manage': permissionRegistry.notifications.manage,
  'notifications.admin': permissionRegistry.notifications.admin,
  'email.admin': permissionRegistry.notifications.emailAdmin,
  'reminders.manage': permissionRegistry.notifications.remindersManage,
  'dataQuality.view': permissionRegistry.dataQuality.view,
  'dataQuality.runChecks': permissionRegistry.dataQuality.runChecks,
  'dataQuality.reviewDuplicates': permissionRegistry.dataQuality.reviewDuplicates,
  'dataQuality.merge': permissionRegistry.dataQuality.merge,
  'dataQuality.dismissFinding': permissionRegistry.dataQuality.dismissFinding,
  'dataQuality.admin': permissionRegistry.dataQuality.admin,
  'adminConsole.view': permissionRegistry.adminConsole.view,
  'adminConsole.manage': permissionRegistry.adminConsole.manage,
  'adminConsole.technical': permissionRegistry.adminConsole.technical,
  'adminConsole.outboxAdmin': permissionRegistry.adminConsole.outboxAdmin,
  'automation.view': permissionRegistry.automation.view,
  'automation.create': permissionRegistry.automation.create,
  'automation.edit': permissionRegistry.automation.edit,
  'automation.activate': permissionRegistry.automation.activate,
  'automation.run': permissionRegistry.automation.run,
  'automation.admin': permissionRegistry.automation.admin,
  'automation.viewRuns': permissionRegistry.automation.viewRuns,
  'aiCopilot.use': permissionRegistry.aiCopilot.use,
  'aiCopilot.formAssist': permissionRegistry.aiCopilot.formAssist,
  'aiCopilot.documentIntelligence': permissionRegistry.aiCopilot.documentIntelligence,
  'aiCopilot.adminAssist': permissionRegistry.aiCopilot.adminAssist,
  'aiCopilot.viewHistory': permissionRegistry.aiCopilot.viewHistory,
  'aiCopilot.manageSettings': permissionRegistry.aiCopilot.manageSettings,
  'portal.manageUsers': permissionRegistry.portal.manageUsers,
  'portal.inviteUsers': permissionRegistry.portal.inviteUsers,
  'portal.suspendUsers': permissionRegistry.portal.suspendUsers,
  'portal.viewActivity': permissionRegistry.portal.viewActivity,
  'portal.shareDocuments': permissionRegistry.portal.shareDocuments,
  'integrations.view': permissionRegistry.integrations.view,
  'integrations.manageApps': permissionRegistry.integrations.manageApps,
  'integrations.manageCredentials': permissionRegistry.integrations.manageCredentials,
  'integrations.manageWebhooks': permissionRegistry.integrations.manageWebhooks,
  'integrations.viewDeliveries': permissionRegistry.integrations.viewDeliveries,
  'integrations.retryDelivery': permissionRegistry.integrations.retryDelivery,
  'integrations.viewInbound': permissionRegistry.integrations.viewInbound,
  'integrations.processInbound': permissionRegistry.integrations.processInbound,
  'integrations.admin': permissionRegistry.integrations.admin,
}

export const permissionContracts = [
  contract(permissionRegistry.companies.view, 'Sirketleri goruntuleme', 'companies', 'view'),
  contract(permissionRegistry.companies.insert, 'Sirket taslagi olusturma', 'companies', 'edit', [permissionRegistry.companies.edit]),
  contract(permissionRegistry.companies.edit, 'Sirketleri duzenleme', 'companies', 'edit'),
  contract(permissionRegistry.companies.openingStart, 'Sirket acilisi baslatma', 'companies', 'operation', [permissionRegistry.companies.edit]),
  contract(permissionRegistry.companies.liquidationStart, 'Sirket tasfiyesi baslatma', 'companies', 'operation', [permissionRegistry.companies.edit]),
  contract(permissionRegistry.companies.deregistrationStart, 'Sirket terkini baslatma', 'companies', 'operation', [permissionRegistry.companies.edit]),
  contract(permissionRegistry.companies.officialChangeStart, 'Resmi degisiklik baslatma', 'companies', 'operation', [permissionRegistry.companies.edit]),
  contract(permissionRegistry.companies.capitalIncreaseStart, 'Sermaye artirimi baslatma', 'companies', 'operation', [permissionRegistry.companies.edit]),
  contract(permissionRegistry.companies.capitalDecreaseStart, 'Sermaye azaltimi baslatma', 'companies', 'operation', [permissionRegistry.companies.edit]),

  contract(permissionRegistry.branches.view, 'Subeleri goruntuleme', 'branches', 'view', [permissionRegistry.companies.view]),
  contract(permissionRegistry.branches.edit, 'Subeleri duzenleme', 'branches', 'edit', [permissionRegistry.companies.edit]),
  contract(permissionRegistry.branches.openingStart, 'Sube acilisi baslatma', 'branches', 'operation', [permissionRegistry.companies.edit]),
  contract(permissionRegistry.branches.closingStart, 'Sube kapanisi baslatma', 'branches', 'operation', [permissionRegistry.companies.edit]),
  contract(permissionRegistry.branches.documentsUpdate, 'Sube belgelerini guncelleme', 'branches', 'operation', [permissionRegistry.companies.edit]),

  contract(permissionRegistry.partners.view, 'Ortaklari goruntuleme', 'partners', 'view', [permissionRegistry.companies.view]),
  contract(permissionRegistry.partners.edit, 'Ortaklari duzenleme', 'partners', 'edit', [permissionRegistry.companies.edit]),
  contract(permissionRegistry.partners.ownershipStart, 'Ortaklik islemi baslatma', 'partners', 'operation', [permissionRegistry.partners.edit]),
  contract(permissionRegistry.partners.ownershipUpdate, 'Ortaklik islemi guncelleme', 'partners', 'operation', [permissionRegistry.partners.edit]),
  contract(permissionRegistry.partners.ownershipApprove, 'Ortaklik islemi onaylama', 'partners', 'approval', [permissionRegistry.partners.edit]),
  contract(permissionRegistry.partners.ownershipReverse, 'Ortaklik islemi ters kayit', 'partners', 'operation', [permissionRegistry.partners.edit]),

  contract(permissionRegistry.representatives.view, 'Temsilcileri goruntuleme', 'representatives', 'view', [permissionRegistry.companies.view]),
  contract(permissionRegistry.representatives.insert, 'Temsilci taslagi olusturma', 'representatives', 'edit', [permissionRegistry.representatives.edit]),
  contract(permissionRegistry.representatives.edit, 'Temsilcileri duzenleme', 'representatives', 'edit', [permissionRegistry.companies.edit]),
  contract(permissionRegistry.representatives.delete, 'Temsilci taslagi silme', 'representatives', 'edit', [permissionRegistry.representatives.edit]),
  contract(permissionRegistry.representatives.authorityStart, 'Temsil yetkisi baslatma', 'representatives', 'operation', [permissionRegistry.representatives.edit]),
  contract(permissionRegistry.representatives.authorityUpdate, 'Temsil yetkisi guncelleme', 'representatives', 'operation', [permissionRegistry.representatives.edit]),
  contract(permissionRegistry.representatives.authoritySuspend, 'Temsil yetkisini askiya alma', 'representatives', 'operation', [permissionRegistry.representatives.edit]),
  contract(permissionRegistry.representatives.authorityTerminate, 'Temsil yetkisi sonlandirma', 'representatives', 'operation', [permissionRegistry.representatives.edit]),
  contract(permissionRegistry.representatives.authorityApprove, 'Temsil yetkisi onaylama', 'representatives', 'approval', [permissionRegistry.representatives.edit]),

  contract(permissionRegistry.organization.view, 'Organizasyonu goruntuleme', 'organization', 'view', [permissionRegistry.companies.view]),
  contract(permissionRegistry.organization.edit, 'Organizasyonu duzenleme', 'organization', 'edit', [permissionRegistry.companies.edit]),
  contract(permissionRegistry.organization.structureManage, 'Organizasyon yapisini yonetme', 'organization', 'operation', [permissionRegistry.organization.edit]),
  contract(permissionRegistry.organization.positionManage, 'Kadro/pozisyon yonetme', 'organization', 'operation', [permissionRegistry.organization.edit]),

  contract(permissionRegistry.facilities.view, 'Tesisleri goruntuleme', 'facilities', 'view', [permissionRegistry.companies.view]),
  contract(permissionRegistry.facilities.edit, 'Tesisleri duzenleme', 'facilities', 'edit', [permissionRegistry.companies.edit]),
  contract(permissionRegistry.facilities.linkBranch, 'Tesisi subeye baglama', 'facilities', 'operation', [permissionRegistry.facilities.edit]),
  contract(permissionRegistry.facilities.deactivate, 'Tesisi pasife alma', 'facilities', 'operation', [permissionRegistry.facilities.edit]),

  contract(permissionRegistry.settings.view, 'Ayarlar goruntuleme', 'settings', 'view'),
  contract(permissionRegistry.settings.edit, 'Ayarlar duzenleme', 'settings', 'edit'),
  contract(permissionRegistry.settings.auditView, 'Denetim izini goruntuleme', 'settings', 'admin', [permissionRegistry.settings.view]),
  contract(permissionRegistry.settings.modulesManage, 'Modul lisanslarini yonetme', 'settings', 'admin', [permissionRegistry.settings.edit]),
  contract(permissionRegistry.settings.usersManage, 'Kullanicilari yonetme', 'settings', 'admin', [permissionRegistry.settings.edit]),

  contract(permissionRegistry.importExport.importView, 'Import job ve sablon goruntuleme', 'importExport', 'view', [permissionRegistry.settings.view]),
  contract(permissionRegistry.importExport.importCreate, 'Import job olusturma ve dosya yukleme', 'importExport', 'operation', [permissionRegistry.importExport.importView]),
  contract(permissionRegistry.importExport.importConfirm, 'Import job onaylama', 'importExport', 'approval', [permissionRegistry.importExport.importCreate]),
  contract(permissionRegistry.importExport.importCancel, 'Import job iptal etme', 'importExport', 'operation', [permissionRegistry.importExport.importCreate]),
  contract(permissionRegistry.importExport.exportCreate, 'Export job olusturma', 'importExport', 'operation', [permissionRegistry.importExport.importView]),
  contract(permissionRegistry.importExport.exportDownload, 'Export dosyasi indirme', 'importExport', 'operation', [permissionRegistry.importExport.exportCreate]),
  contract(permissionRegistry.importExport.bulkCreate, 'Bulk action dry-run olusturma', 'importExport', 'operation', [permissionRegistry.importExport.importView]),
  contract(permissionRegistry.importExport.bulkConfirm, 'Bulk action onaylama', 'importExport', 'approval', [permissionRegistry.importExport.bulkCreate]),
  contract(permissionRegistry.importExport.bulkAdmin, 'Bulk operation admin yetkisi', 'importExport', 'admin', [permissionRegistry.importExport.bulkConfirm]),

  contract(permissionRegistry.documents.view, 'Belgeleri goruntuleme', 'documents', 'view', [permissionRegistry.companies.view]),
  contract(permissionRegistry.documents.upload, 'Belge yukleme ve metadata guncelleme', 'documents', 'operation', [permissionRegistry.documents.view]),
  contract(permissionRegistry.documents.download, 'Belge indirme', 'documents', 'view', [permissionRegistry.documents.view]),
  contract(permissionRegistry.documents.verify, 'Belge dogrulama', 'documents', 'approval', [permissionRegistry.documents.upload]),
  contract(permissionRegistry.documents.reject, 'Belge reddetme', 'documents', 'approval', [permissionRegistry.documents.verify]),
  contract(permissionRegistry.documents.delete, 'Belge silme veya arsivleme', 'documents', 'admin', [permissionRegistry.documents.upload]),
  contract(permissionRegistry.documents.admin, 'Belge yonetimi admin', 'documents', 'admin', [permissionRegistry.documents.delete]),
  contract(permissionRegistry.documents.accessLogsView, 'Belge erisim loglarini goruntuleme', 'documents', 'admin', [permissionRegistry.documents.admin]),
  contract(permissionRegistry.notifications.view, 'Kendi bildirimlerini goruntuleme', 'notifications', 'view'),
  contract(permissionRegistry.notifications.manage, 'Bildirim tercihleri ve hatirlatmalari yonetme', 'notifications', 'edit', [permissionRegistry.notifications.view]),
  contract(permissionRegistry.notifications.admin, 'Sistem bildirimlerini yonetme', 'notifications', 'admin', [permissionRegistry.settings.view]),
  contract(permissionRegistry.notifications.emailAdmin, 'Sistem e-posta kuyrugunu yonetme', 'notifications', 'admin', [permissionRegistry.notifications.admin]),
  contract(permissionRegistry.notifications.remindersManage, 'Hatirlatmalari yonetme', 'notifications', 'edit', [permissionRegistry.notifications.manage]),
  contract(permissionRegistry.dataQuality.view, 'Veri kalitesi dashboard goruntuleme', 'dataQuality', 'view', [permissionRegistry.settings.view]),
  contract(permissionRegistry.dataQuality.runChecks, 'Veri kalite kontrollerini calistirma', 'dataQuality', 'operation', [permissionRegistry.dataQuality.view]),
  contract(permissionRegistry.dataQuality.reviewDuplicates, 'Duplicate adaylarini inceleme', 'dataQuality', 'operation', [permissionRegistry.dataQuality.view]),
  contract(permissionRegistry.dataQuality.merge, 'Guvenli merge onaylama', 'dataQuality', 'approval', [permissionRegistry.dataQuality.reviewDuplicates]),
  contract(permissionRegistry.dataQuality.dismissFinding, 'Veri kalite bulgusunu kapatma', 'dataQuality', 'edit', [permissionRegistry.dataQuality.reviewDuplicates]),
  contract(permissionRegistry.dataQuality.admin, 'Veri kalitesi kurallarini yonetme', 'dataQuality', 'admin', [permissionRegistry.dataQuality.merge]),
  contract(permissionRegistry.adminConsole.view, 'Admin Console goruntuleme', 'adminConsole', 'view', [permissionRegistry.settings.view]),
  contract(permissionRegistry.adminConsole.manage, 'Admin Console ayar yonetimi', 'adminConsole', 'admin', [permissionRegistry.settings.edit]),
  contract(permissionRegistry.adminConsole.technical, 'Teknik admin bilgileri', 'adminConsole', 'admin', ['system.admin']),
  contract(permissionRegistry.adminConsole.outboxAdmin, 'Outbox admin islemleri', 'adminConsole', 'admin', ['outbox.dispatch']),
  contract(permissionRegistry.automation.view, 'Otomasyonlari goruntuleme', 'automation', 'view', [permissionRegistry.settings.view]),
  contract(permissionRegistry.automation.create, 'Otomasyon kurali olusturma', 'automation', 'operation', [permissionRegistry.automation.edit]),
  contract(permissionRegistry.automation.edit, 'Otomasyon kurali duzenleme', 'automation', 'edit', [permissionRegistry.automation.view]),
  contract(permissionRegistry.automation.activate, 'Otomasyon kurali aktiflestirme', 'automation', 'approval', [permissionRegistry.automation.admin]),
  contract(permissionRegistry.automation.run, 'Otomasyon calistirma ve simulation', 'automation', 'operation', [permissionRegistry.automation.view]),
  contract(permissionRegistry.automation.viewRuns, 'Otomasyon run log goruntuleme', 'automation', 'view', [permissionRegistry.automation.view]),
  contract(permissionRegistry.automation.admin, 'Otomasyon yonetimi', 'automation', 'admin', ['system.admin']),
  contract(permissionRegistry.aiCopilot.use, 'AI Copilot kullanma', 'aiCopilot', 'view', [permissionRegistry.settings.view]),
  contract(permissionRegistry.aiCopilot.formAssist, 'AI form onerilerini kullanma', 'aiCopilot', 'operation', [permissionRegistry.aiCopilot.use]),
  contract(permissionRegistry.aiCopilot.documentIntelligence, 'AI belge zekasini kullanma', 'aiCopilot', 'operation', [permissionRegistry.aiCopilot.use, permissionRegistry.documents.view]),
  contract(permissionRegistry.aiCopilot.adminAssist, 'AI admin yardimi', 'aiCopilot', 'admin', [permissionRegistry.adminConsole.view]),
  contract(permissionRegistry.aiCopilot.viewHistory, 'AI Copilot gecmisini goruntuleme', 'aiCopilot', 'view', [permissionRegistry.aiCopilot.use]),
  contract(permissionRegistry.aiCopilot.manageSettings, 'AI Copilot ayarlarini yonetme', 'aiCopilot', 'admin', ['system.admin']),
  contract(permissionRegistry.portal.manageUsers, 'Musteri portali kullanicilarini yonetme', 'customerPortal', 'admin', ['system.admin', permissionRegistry.adminConsole.manage]),
  contract(permissionRegistry.portal.inviteUsers, 'Musteri portali daveti olusturma', 'customerPortal', 'operation', [permissionRegistry.portal.manageUsers]),
  contract(permissionRegistry.portal.suspendUsers, 'Musteri portali kullanicisini askiya alma', 'customerPortal', 'admin', [permissionRegistry.portal.manageUsers]),
  contract(permissionRegistry.portal.viewActivity, 'Musteri portali erisim izlerini goruntuleme', 'customerPortal', 'view', [permissionRegistry.portal.manageUsers]),
  contract(permissionRegistry.portal.shareDocuments, 'Belgeyi musteri portaliyla paylasma', 'customerPortal', 'operation', [permissionRegistry.documents.upload, permissionRegistry.portal.manageUsers]),
  contract(permissionRegistry.integrations.view, 'Entegrasyonlari goruntuleme', 'integrations', 'view', [permissionRegistry.adminConsole.view]),
  contract(permissionRegistry.integrations.manageApps, 'Integration app yonetimi', 'integrations', 'admin', [permissionRegistry.integrations.view, permissionRegistry.adminConsole.manage]),
  contract(permissionRegistry.integrations.manageCredentials, 'Entegrasyon credential yonetimi', 'integrations', 'admin', [permissionRegistry.integrations.manageApps]),
  contract(permissionRegistry.integrations.manageWebhooks, 'Webhook abonelik yonetimi', 'integrations', 'operation', [permissionRegistry.integrations.manageApps]),
  contract(permissionRegistry.integrations.viewDeliveries, 'Webhook teslimatlarini goruntuleme', 'integrations', 'view', [permissionRegistry.integrations.view]),
  contract(permissionRegistry.integrations.retryDelivery, 'Webhook teslimatini tekrar deneme', 'integrations', 'operation', [permissionRegistry.integrations.viewDeliveries]),
  contract(permissionRegistry.integrations.viewInbound, 'Inbound webhook olaylarini goruntuleme', 'integrations', 'view', [permissionRegistry.integrations.view]),
  contract(permissionRegistry.integrations.processInbound, 'Inbound webhook olaylarini isleme', 'integrations', 'operation', [permissionRegistry.integrations.viewInbound]),
  contract(permissionRegistry.integrations.admin, 'Integration Hub yonetimi', 'integrations', 'admin', ['system.admin']),
] satisfies PermissionContract[]

const permissionByKey = new Map(permissionContracts.map(item => [item.key, item]))

export const permissionFallbacks = Object.fromEntries(
  permissionContracts
    .filter(item => item.fallback?.length)
    .map(item => [item.key, item.fallback || []])
) as Record<string, string[]>

export function getPermissionContract(key: string) {
  return permissionByKey.get(normalizePermissionKey(key)) || null
}

export function listPermissionContracts() {
  return [...permissionContracts]
}

export function listPermissionsByModule(moduleKey: string) {
  return permissionContracts.filter(item => item.moduleKey === moduleKey)
}

export function getPermissionFallbacks(key: string) {
  return getPermissionContract(key)?.fallback || []
}

export function normalizePermissionKey(key: string) {
  return permissionAliases[key] || key
}

export function permissionExists(key: string) {
  return permissionByKey.has(normalizePermissionKey(key))
}

export function resolvePermissionWithFallback(permissionKey: string) {
  const visited = new Set<string>()
  const resolved: string[] = []

  function visit(key: string) {
    const normalized = normalizePermissionKey(key)
    if (visited.has(normalized)) return
    visited.add(normalized)
    resolved.push(normalized)
    getPermissionFallbacks(normalized).forEach(visit)
  }

  visit(permissionKey)
  return resolved
}

export function expandPermissionFallbacks(permissionKeys: string[]) {
  return Array.from(new Set(permissionKeys.flatMap(resolvePermissionWithFallback)))
}

export function hasAnyPermission(userPermissions: string[] | undefined, permissionKeys: string[]) {
  const permissions = new Set(userPermissions || [])
  if (permissions.has('__eden_demo_allow_all__')) return true
  return expandPermissionFallbacks(permissionKeys).some(key => permissions.has(normalizePermissionKey(key)))
}

function contract(
  key: string,
  label: string,
  moduleKey: string,
  category?: PermissionCategory,
  fallback?: string[],
  description?: string
): PermissionContract {
  return {
    key,
    label,
    moduleKey,
    category,
    fallback,
    description,
    domain: moduleKey === 'settings' ? 'platform' : 'company',
  }
}
