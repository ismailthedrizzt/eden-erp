// BACKEND_MIGRATION_STATUS: contract_shared
// TARGET_BACKEND_MODULE: setup
// TARGET_FASTAPI_ENDPOINT: /api/v1/setup/readiness
// NOTES: Readiness definitions should become shared/generated contracts after Python migration.

import type { ModuleReadinessDefinition, SetupStepType } from './setup.types'

export const moduleReadinessDefinitions: ModuleReadinessDefinition[] = [
  {
    moduleKey: 'companies',
    requiredTables: ['companies'],
    optionalTables: [
      'company_public_tax',
      'company_public_sgk',
      'company_public_registry',
      'company_public_channels',
      'company_lifecycle_events',
    ],
    optionalViews: ['v_current_ownership'],
    requiredSettings: ['company.default_currency', 'company.default_language'],
    setupSteps: [
      setupStep('companies.check', 'Sirket kayit alanlarini kontrol et', 'Sirket kartlari ve temel ayarlar hazir olmalidir.', 'check'),
      setupStep('companies.configure', 'Varsayilan sirket ayarlarini tamamla', 'Para birimi ve dil gibi baslangic ayarlarini gozden gecirin.', 'configure', '/app/sistem/kurulum'),
    ],
  },
  {
    moduleKey: 'partners',
    requiredTables: ['company_partners', 'ownership_transactions'],
    requiredViews: ['v_current_ownership'],
    requiredDependencies: ['companies'],
    setupSteps: [
      setupStep('partners.check', 'Ortaklik dagilimini kontrol et', 'Sermaye ve pay islemleri icin guncel ortaklik dagilimi hazir olmalidir.', 'check'),
    ],
  },
  {
    moduleKey: 'representatives',
    requiredTables: ['company_representatives', 'company_representative_authority_transactions'],
    optionalViews: ['v_current_representative_authorities'],
    requiredDependencies: ['companies'],
    optionalDependencies: ['branches', 'organization', 'facilities'],
    setupSteps: [
      setupStep('representatives.check', 'Temsil yetkisi alanlarini kontrol et', 'Temsilci kartlari ve yetki islemleri hazir olmalidir.', 'check'),
    ],
  },
  {
    moduleKey: 'branches',
    requiredTables: ['company_branches'],
    optionalTables: ['company_official_change_transactions'],
    optionalViews: ['v_company_branch_list'],
    requiredDependencies: ['companies'],
    optionalDependencies: ['organization', 'facilities'],
    setupSteps: [
      setupStep('branches.check', 'Sube kayit alanlarini kontrol et', 'Sube acilisi ve kapanisi icin sube kayit alani hazir olmalidir.', 'check'),
      setupStep('branches.configure', 'Sube baglantilarini gozden gecir', 'Organizasyon ve lokasyon baglantilari varsa otomatik is akislarini guclendirir.', 'configure', '/app/sistem/kurulum'),
    ],
  },
  {
    moduleKey: 'organization',
    requiredTables: ['organization_units', 'organization_unit_types'],
    requiredDependencies: ['companies'],
    setupSteps: [
      setupStep('organization.defaults', 'Varsayilan organizasyon tiplerini hazirla', 'Organizasyon birimleri icin temel tipler hazir olmalidir.', 'create_default'),
    ],
  },
  {
    moduleKey: 'facilities',
    requiredTables: ['company_facilities'],
    requiredDependencies: ['companies'],
    optionalDependencies: ['branches'],
    setupSteps: [
      setupStep('facilities.check', 'Lokasyon kayit alanlarini kontrol et', 'Tesis ve lokasyon baglantilari hazir olmalidir.', 'check'),
    ],
  },
  {
    moduleKey: 'accounting',
    requiredTables: ['accounting_cari_accounts', 'accounting_cari_transactions'],
    optionalTables: ['accounting_transaction_attachments', 'accounting_reconciliation_links', 'bank_transactions', 'invoices'],
    requiredDependencies: ['companies'],
    setupSteps: [
      setupStep('accounting.cariAccounts', 'Cari kart alanlarini kontrol et', 'Musteri, tedarikci, ortak ve diger cari iliskiler icin cari kart altyapisi hazir olmalidir.', 'check'),
      setupStep('accounting.cariTransactions', 'Cari hareket alanlarini kontrol et', 'Odeme, tahsilat, gider, gelir ve sermaye mutabakati icin cari hareket altyapisi hazir olmalidir.', 'check'),
    ],
  },
  {
    moduleKey: 'hr',
    requiredTables: ['hr_employees', 'hr_employment_records', 'hr_employment_transactions'],
    optionalTables: ['hr_employee_documents'],
    requiredDependencies: ['companies'],
    optionalDependencies: ['organization', 'branches', 'facilities', 'accounting'],
    setupSteps: [
      setupStep('hr.employees', 'Calisan kart alanlarini kontrol et', 'Calisan kartlari ve ozluk bilgileri icin HR calisan altyapisi hazir olmalidir.', 'check'),
      setupStep('hr.employment', 'Istihdam lifecycle alanlarini kontrol et', 'Ise giris, pozisyon degisikligi, SGK ve isten cikis icin istihdam kayitlari hazir olmalidir.', 'check'),
      setupStep('hr.documents', 'Ozluk belge alanlarini kontrol et', 'Kimlik, sozlesme ve SGK belge referanslari icin belge altyapisi hazir olmalidir.', 'check'),
    ],
  },
  {
    moduleKey: 'project_management',
    requiredTables: ['project_projects', 'project_tasks'],
    optionalTables: ['project_task_comments', 'project_task_attachments', 'project_task_history', 'project_boards', 'project_sprints', 'hr_employees', 'organization_units'],
    requiredDependencies: ['companies'],
    optionalDependencies: ['hr', 'organization', 'branches', 'facilities'],
    setupSteps: [
      setupStep('projectManagement.projects', 'Proje alanlarini kontrol et', 'Sirket scope, proje anahtari, durum ve yonetici alanlari hazir olmalidir.', 'check'),
      setupStep('projectManagement.tasks', 'Gorev alanlarini kontrol et', 'Issue key, durum akisi, atama ve related record alanlari hazir olmalidir.', 'check'),
      setupStep('projectManagement.actionCenter', 'Action Center baglantisini kontrol et', 'Proje gorevleri Action Center icinde Proje Gorevi etiketiyle gorunmelidir.', 'check'),
    ],
  },
  {
    moduleKey: 'process',
    requiredTables: ['process_instances', 'process_tasks', 'process_approvals', 'process_events'],
    setupSteps: [
      setupStep('process.check', 'Surec kayitlarini kontrol et', 'Gorev ve onay takibi icin surec altyapisi hazir olmalidir.', 'check'),
    ],
  },
  {
    moduleKey: 'audit',
    requiredTables: ['audit_logs'],
    setupSteps: [
      setupStep('audit.check', 'Denetim izi kayitlarini kontrol et', 'Kritik islemlerin izlenebilmesi icin denetim izi hazir olmalidir.', 'check'),
    ],
  },
  {
    moduleKey: 'outbox',
    requiredTables: ['outbox_events'],
    setupSteps: [
      setupStep('outbox.check', 'Sistem olaylarini kontrol et', 'Islem sonrasi bildirim ve yenilemeler icin olay kayitlari hazir olmalidir.', 'check'),
    ],
  },
  {
    moduleKey: 'actionCenter',
    optionalDependencies: ['process', 'outbox', 'audit'],
    setupSteps: [
      setupStep('actionCenter.check', 'Bekleyen is kaynaklarini kontrol et', 'Gorev, onay ve sistem uyarilarinin tek merkezden gorunmesi icin bagli kaynaklar hazir olmalidir.', 'check'),
    ],
  },
]

const readinessByModule = new Map(moduleReadinessDefinitions.map(definition => [definition.moduleKey, definition]))

export function getModuleReadinessDefinition(moduleKey: string) {
  return readinessByModule.get(moduleKey) || null
}

export function listModuleReadinessDefinitions() {
  return [...moduleReadinessDefinitions]
}

function setupStep(
  key: string,
  label: string,
  description: string,
  type: SetupStepType,
  targetPage?: string
) {
  return {
    key,
    label,
    description,
    type,
    required: true,
    targetPage,
    actionKey: key,
  }
}
