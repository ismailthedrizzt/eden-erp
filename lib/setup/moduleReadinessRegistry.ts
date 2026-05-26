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
