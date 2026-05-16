export function isSoftDeletedRecord(record?: Record<string, any> | null) {
  const status = String(record?.record_status || record?.status || record?.work_status || '').toLocaleLowerCase('tr-TR')
  return ['passive', 'pasif', 'terminated', 'ayrılmış', 'kapatıldı', 'kapali', 'kapalı'].includes(status)
}
