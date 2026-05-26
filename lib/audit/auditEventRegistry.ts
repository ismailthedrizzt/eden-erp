import 'server-only'

import type { AuditActionType, AuditSeverity } from './audit.types'

export interface AuditEventDefinition {
  actionType: AuditActionType
  label: string
  defaultSeverity: AuditSeverity
  resultStatus: 'success' | 'failed' | 'denied' | 'pending'
}

export const auditEventRegistry: AuditEventDefinition[] = [
  event('view', 'Kayit goruntulendi', 'info', 'success'),
  event('create', 'Kayit olusturuldu', 'info', 'success'),
  event('update', 'Kayit guncellendi', 'info', 'success'),
  event('delete', 'Kayit silindi', 'warning', 'success'),
  event('hard_delete', 'Kayit kalici silindi', 'critical', 'success'),
  event('soft_delete', 'Kayit pasife alindi', 'warning', 'success'),
  event('restore', 'Kayit geri alindi', 'info', 'success'),
  event('operation_start', 'Islem baslatildi', 'info', 'pending'),
  event('operation_complete', 'Islem tamamlandi', 'info', 'success'),
  event('operation_fail', 'Islem tamamlanamadi', 'error', 'failed'),
  event('process_start', 'Surec baslatildi', 'info', 'pending'),
  event('process_step_complete', 'Surec adimi tamamlandi', 'info', 'success'),
  event('process_approve', 'Onay verildi', 'info', 'success'),
  event('process_reject', 'Onay reddedildi', 'warning', 'denied'),
  event('process_cancel', 'Surec iptal edildi', 'warning', 'failed'),
  event('permission_denied', 'Yetki engeli olustu', 'warning', 'denied'),
  event('policy_denied', 'Is kuralı engeli olustu', 'warning', 'denied'),
  event('login', 'Oturum acildi', 'info', 'success'),
  event('logout', 'Oturum kapatildi', 'info', 'success'),
  event('export', 'Disa aktarim yapildi', 'warning', 'success'),
  event('import', 'Ice aktarim yapildi', 'warning', 'success'),
  event('document_upload', 'Belge yuklendi', 'info', 'success'),
  event('document_delete', 'Belge silindi', 'warning', 'success'),
  event('document_version_update', 'Belge guncellendi', 'info', 'success'),
  event('system_event', 'Sistem olayi kaydedildi', 'info', 'success'),
]

const eventByType = new Map(auditEventRegistry.map(item => [item.actionType, item]))

export function getAuditEventDefinition(actionType: AuditActionType) {
  return eventByType.get(actionType) || null
}

export function listAuditEventDefinitions() {
  return [...auditEventRegistry]
}

function event(
  actionType: AuditActionType,
  label: string,
  defaultSeverity: AuditSeverity,
  resultStatus: AuditEventDefinition['resultStatus']
): AuditEventDefinition {
  return { actionType, label, defaultSeverity, resultStatus }
}
