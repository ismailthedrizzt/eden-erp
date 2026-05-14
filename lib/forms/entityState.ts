export function isSoftDeletedRecord(record?: Record<string, any> | null) {
  return record?.is_deleted === true
}
