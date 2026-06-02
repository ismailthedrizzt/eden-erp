import type { NotificationRecord, NotificationStatus } from '@/lib/services/notifications'

export type NotificationCardParts = {
  recordLabel: string
  cardType: string
  pendingAction: string
  targetPage: string
}

export function notificationStatusLabel(status: NotificationStatus | string) {
  if (status === 'unread') return 'Okunmamış'
  if (status === 'read') return 'Okundu'
  if (status === 'dismissed' || status === 'archived') return 'Tamamlandı'
  return String(status || 'Bildirim')
}

export function notificationRecordStatusValue(status: NotificationStatus | string) {
  if (status === 'unread') return 'unread'
  if (status === 'read') return 'read'
  return 'completed'
}

export function isTaskNotification(notification: NotificationRecord) {
  const type = String(notification.notification_type || '')
  return Boolean(
    notification.task_id
    || type.startsWith('task_')
    || type.startsWith('process_task')
  )
}

export function notificationCardParts(notification: NotificationRecord): NotificationCardParts {
  const metadata = notification.metadata_json || {}
  const entityType = text(metadata.entity_type) || notification.related_entity_type || ''
  const recordLabel = text(metadata.record_label)
    || notification.related_record_label
    || notification.title
    || notification.related_entity_id
    || 'Kayıt'
  const cardType = text(metadata.card_type)
    || [statusLabelFromMetadata(metadata), text(metadata.entity_type_label) || entityTypeLabel(entityType)]
      .filter(Boolean)
      .join(' ')
    || 'Kayıt'
  const pendingAction = text(metadata.pending_action_label)
    || notification.action_label
    || notification.message
    || notification.title
    || 'İşlem bekliyor'

  return {
    recordLabel,
    cardType,
    pendingAction,
    targetPage: notification.target_page || text(metadata.target_page) || '/app/ayarlar/bildirimler',
  }
}

function statusLabelFromMetadata(metadata: Record<string, unknown>) {
  const raw = text(metadata.record_status_label) || text(metadata.status_label) || text(metadata.record_status)
  const normalized = raw.toLocaleLowerCase('tr-TR')
  if (normalized === 'draft' || normalized === 'taslak') return 'Taslak'
  if (normalized === 'active' || normalized === 'aktif') return 'Aktif'
  if (normalized === 'passive' || normalized === 'pasif') return 'Pasif'
  if (normalized === 'pending' || normalized === 'pending_approval' || normalized === 'waiting_approval') return 'Onayda'
  return raw
}

function entityTypeLabel(entityType: string) {
  const labels: Record<string, string> = {
    company: 'Şirket',
    branch: 'Şube',
    company_branch: 'Şube',
    partner: 'Ortak',
    company_partner: 'Ortak',
    representative: 'Temsilci',
    company_representative: 'Temsilci',
    employee: 'Çalışan',
    hr_employee: 'Çalışan',
    person: 'Gerçek Kişi',
  }
  return labels[entityType] || 'Kayıt'
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}
