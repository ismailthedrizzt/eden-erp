export type VersionConflictInput = {
  current?: Record<string, any> | null
  baseVersion?: number | null
  baseUpdatedAt?: string | null
  versionField?: string
  updatedAtField?: string
}

export function detectVersionConflict({
  current,
  baseVersion,
  baseUpdatedAt,
  versionField = 'version',
  updatedAtField = 'updated_at',
}: VersionConflictInput) {
  if (!current) return null

  if (baseVersion !== null && baseVersion !== undefined) {
    const currentVersion = Number(current[versionField])
    if (Number.isFinite(currentVersion) && currentVersion !== baseVersion) {
      return {
        error: 'Kayıt siz formu açtıktan sonra değişmiş.',
        code: 'VERSION_CONFLICT',
        current_version: currentVersion,
        base_version: baseVersion,
      }
    }
  }

  if (baseUpdatedAt) {
    const currentUpdatedAt = normalizeDate(current[updatedAtField])
    const base = normalizeDate(baseUpdatedAt)
    if (currentUpdatedAt && base && currentUpdatedAt !== base) {
      return {
        error: 'Kayıt siz formu açtıktan sonra değişmiş.',
        code: 'VERSION_CONFLICT',
        current_updated_at: current[updatedAtField],
        base_updated_at: baseUpdatedAt,
      }
    }
  }

  return null
}

function normalizeDate(value: unknown) {
  const date = value ? new Date(String(value)) : null
  if (!date || Number.isNaN(date.getTime())) return ''
  return date.toISOString()
}

