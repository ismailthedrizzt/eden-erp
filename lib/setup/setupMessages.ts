import { getModuleContract } from '@/lib/modules/moduleRegistry'

const moduleLabelOverrides: Record<string, string> = {
  companies: 'Sirketlerimiz',
  partners: 'Ortaklarimiz',
  representatives: 'Temsilcilerimiz',
  branches: 'Subelerimiz',
  organization: 'Teskilat/Kadro',
  facilities: 'Tesisler/Lokasyonlar',
  process: 'Surecler',
  audit: 'Denetim Izi',
  outbox: 'Sistem Olaylari',
}

export function moduleSetupLabel(moduleKey: string) {
  return getModuleContract(moduleKey)?.name || moduleLabelOverrides[moduleKey] || moduleKey
}

export function moduleSetupIncompleteMessage(moduleKey: string) {
  return `${moduleSetupLabel(moduleKey)} modulunun kurulumu tamamlanmamis.`
}

export function moduleDependencyMissingMessage(moduleKey: string, dependencyKey: string) {
  return `${moduleSetupLabel(moduleKey)} icin ${moduleSetupLabel(dependencyKey)} modulu aktif ve hazir olmalidir.`
}

export function optionalDependencyWarning(moduleKey: string, dependencyKey: string) {
  return `${moduleSetupLabel(dependencyKey)} modulu hazir olmadigi icin ${moduleSetupLabel(moduleKey)} bazi islemlerde sinirli calisabilir.`
}

export function optionalInfrastructureWarning(moduleKey: string) {
  return `${moduleSetupLabel(moduleKey)} icin ek gorunumler henuz hazir degil; ana is akisi calismaya devam eder.`
}

export function setupStatusLabel(status: string) {
  if (status === 'ready') return 'Hazir'
  if (status === 'setup_required') return 'Kurulum gerekli'
  if (status === 'dependency_missing') return 'Gerekli modul eksik'
  if (status === 'infrastructure_missing') return 'Kurulum tamamlanmamis'
  if (status === 'disabled') return 'Devre disi'
  if (status === 'unlicensed') return 'Lisans gerekli'
  return 'Kontrol gerekli'
}
