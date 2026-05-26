export function detectVersionConflict(
  current: Record<string, any>,
  baseVersion?: number | null,
  baseUpdatedAt?: string | null
) {
  if (baseVersion !== undefined && baseVersion !== null && Number(current.version || 0) !== Number(baseVersion)) {
    return {
      ok: false as const,
      status: 409,
      code: 'VERSION_CONFLICT',
      error: 'Kayit bu islem hazirlanirken degismis. Lutfen kaydi yenileyip tekrar deneyin.',
      details: { current_version: current.version, base_version: baseVersion },
    }
  }

  if (baseUpdatedAt && current.updated_at && new Date(current.updated_at).getTime() !== new Date(baseUpdatedAt).getTime()) {
    return {
      ok: false as const,
      status: 409,
      code: 'VERSION_CONFLICT',
      error: 'Kayit bu islem hazirlanirken guncellenmis. Lutfen kaydi yenileyip tekrar deneyin.',
      details: { current_updated_at: current.updated_at, base_updated_at: baseUpdatedAt },
    }
  }

  return null
}

export function normalizeLifecycleStatus(value: unknown) {
  const status = String(value || '').trim().toLocaleLowerCase('tr-TR')
  if (['active', 'aktif', 'opened'].includes(status)) return 'active'
  if (['draft', 'taslak'].includes(status)) return 'draft'
  if (['liquidation', 'tasfiye', 'tasfiye halinde'].includes(status)) return 'liquidation'
  if (['closed', 'kapali', 'kapalı', 'passive', 'pasif', 'deregistered', 'terkin'].includes(status)) return 'deregistered'
  return status
}

export function isActiveStatus(row: Record<string, any>) {
  const values = [row.record_status, row.status, row.company_status].map(normalizeLifecycleStatus)
  return row.is_deleted !== true && values.includes('active')
}
