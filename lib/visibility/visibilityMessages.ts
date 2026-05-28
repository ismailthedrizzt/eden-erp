import type { VisibilityDecision, VisibilityStatus, VisibilitySetupAction } from './visibility.types'

const STATUS_MESSAGES: Record<VisibilityStatus, string> = {
  available: '',
  disabled: 'Bu modul calisma alaninizda aktif degil.',
  unlicensed: 'Bu modul lisansinizda bulunmuyor.',
  setup_required: 'Bu modulun kurulumu tamamlanmamis.',
  dependency_missing: 'Bu islem icin gerekli modul aktif degil.',
  feature_disabled: 'Bu ozellik su anda kapali.',
  permission_denied: 'Bu islem icin yetkiniz bulunmuyor.',
  record_status_blocked: 'Bu islem mevcut kayit durumunda baslatilamaz.',
  hidden: 'Bu ozellik su anda gosterilmiyor.',
}

export function visibilityStatusMessage(status: VisibilityStatus) {
  return STATUS_MESSAGES[status] || STATUS_MESSAGES.hidden
}

export function moduleStatusMessage(status: VisibilityStatus, moduleName?: string) {
  if (status === 'disabled') return `${moduleName || 'Bu modul'} calisma alaninizda aktif degil.`
  if (status === 'unlicensed') return `${moduleName || 'Bu modul'} lisansinizda bulunmuyor.`
  if (status === 'setup_required') return `${moduleName || 'Bu modul'} kurulumu tamamlanmamis.`
  if (status === 'dependency_missing') return `${moduleName || 'Bu islem'} icin gerekli modul aktif degil.`
  if (status === 'feature_disabled') return `${moduleName || 'Bu ozellik'} su anda kapali.`
  return visibilityStatusMessage(status)
}

export function setupActionForStatus(moduleKey: string, status: VisibilityStatus): VisibilitySetupAction | undefined {
  if (status === 'setup_required' || status === 'dependency_missing') {
    return {
      label: 'Kuruluma Git',
      targetPage: `/app/sistem/kurulum?module=${encodeURIComponent(moduleKey)}`,
    }
  }
  if (status === 'unlicensed' || status === 'disabled') {
    return {
      label: 'Modul Ayarlarina Git',
      targetPage: '/app/sistem/module-licenses',
    }
  }
  if (status === 'feature_disabled') {
    return {
      label: 'Ozellik Ayarlarina Git',
      targetPage: '/app/sistem/module-licenses',
    }
  }
  return undefined
}

export function explainVisibilityDecision(decision: VisibilityDecision) {
  return decision.reason || visibilityStatusMessage(decision.status)
}
