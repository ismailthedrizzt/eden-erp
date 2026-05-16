export function isSoftDeletedRecord(record?: Record<string, any> | null) {
  const status = String(record?.record_status || record?.status || record?.calisma_durumu || '').toLocaleLowerCase('tr-TR')
  return ['passive', 'pasif', 'ayrilmis', 'ayrılmış', 'kapatıldı', 'kapali', 'kapalı'].includes(status)
}
