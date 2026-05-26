import type { ActionCenterPriority, ActionCenterSeverity } from './actionCenter.types'

export function processTaskStatusLabel(status?: string | null) {
  if (status === 'in_progress') return 'Devam ediyor'
  if (status === 'overdue') return 'Gecikmis gorev'
  return 'Acik gorev'
}

export function approvalTitle() {
  return 'Onay bekleyen islem var'
}

export function operationTitle(status?: string | null) {
  if (status === 'failed') return 'Tamamlanamayan islem var'
  if (status === 'requires_action') return 'Kullanici adimi bekleyen islem var'
  return 'Islem hala isleniyor'
}

export function outboxTitle(status?: string | null) {
  if (status === 'failed' || status === 'skipped') return 'Sistem guncellemesi tamamlanamadi'
  return 'Sistem guncellemesi bekliyor'
}

export function projectionWarningTitle() {
  return 'Liste bilgileri guncelleniyor'
}

export function integrityWarningTitle() {
  return 'Veri tutarliligi uyarisi var'
}

export function moduleLabel(moduleKey?: string | null) {
  const labels: Record<string, string> = {
    companies: 'Sirketlerimiz',
    branches: 'Subelerimiz',
    partners: 'Ortaklarimiz',
    representatives: 'Temsilcilerimiz',
    organization: 'Teskilat/Kadro',
    facilities: 'Tesisler/Lokasyonlar',
    process: 'Surecler',
    system: 'Sistem',
    settings: 'Sistem',
    sirket: 'Sirketlerimiz',
  }
  return labels[String(moduleKey || '')] || 'Eden ERP'
}

export function operationLabel(operationType?: string | null) {
  const labels: Record<string, string> = {
    branch_opening: 'Sube Acilisi',
    branch_closing: 'Sube Kapanisi',
    capital_increase: 'Sermaye Artirimi',
    representative_authority: 'Temsil Yetkisi',
    ownership_transaction: 'Ortaklik Islemi',
    opening: 'Sirket Acilisi',
    title_change: 'Unvan Degisikligi',
    address_change: 'Adres Degisikligi',
    nace_change: 'NACE Guncelleme',
    activity_subject_change: 'Faaliyet Konusu Degisikligi',
  }
  const key = String(operationType || '')
  return labels[key] || key.replace(/_/g, ' ') || 'Islem'
}

export function severityLabel(severity: ActionCenterSeverity) {
  if (severity === 'critical') return 'Kritik'
  if (severity === 'error') return 'Hata'
  if (severity === 'warning') return 'Uyari'
  return 'Bilgi'
}

export function priorityLabel(priority: ActionCenterPriority) {
  if (priority === 'urgent') return 'Acil'
  if (priority === 'high') return 'Yuksek'
  if (priority === 'low') return 'Dusuk'
  return 'Normal'
}

export function recordTargetPage(entityType?: string | null, entityId?: string | null, companyId?: string | null) {
  const id = entityId || companyId || ''
  if (entityType === 'company') return `/app/sirket/companies${id ? `?id=${id}` : ''}`
  if (entityType === 'company_branch' || entityType === 'branch') return `/app/sirket/companies/branches${id ? `?id=${id}` : ''}`
  if (entityType === 'company_partner' || entityType === 'partner') return `/app/sirket/companies/partners${id ? `?id=${id}` : ''}`
  if (entityType === 'company_representative' || entityType === 'representative') return `/app/sirket/companies/representatives${id ? `?id=${id}` : ''}`
  return '/app'
}
