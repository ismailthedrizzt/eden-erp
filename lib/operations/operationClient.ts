'use client'

export type OperationResponseLike = {
  operation_status?: string
  message?: string
}

export function buildOperationToast(
  result: OperationResponseLike | null | undefined,
  fallback: { title: string; message: string; type?: 'success' | 'warning' | 'error' }
) {
  const status = result?.operation_status
  if (!status || status === 'completed') return { type: fallback.type || 'success', title: fallback.title, message: fallback.message }
  if (status === 'accepted' || status === 'processing') {
    return { type: 'warning' as const, title: 'İşlem Alındı', message: result?.message || 'İşlem alındı ve işleniyor.' }
  }
  if (status === 'requires_action') {
    return { type: 'warning' as const, title: 'Müdahale Gerekli', message: result?.message || 'İşlem için kullanıcı müdahalesi gerekiyor.' }
  }
  if (status === 'failed') {
    return { type: 'error' as const, title: 'İşlem Başarısız', message: result?.message || 'İşlem tamamlanamadı.' }
  }
  return { type: fallback.type || 'success', title: fallback.title, message: fallback.message }
}

export function createClientRequestId(prefix = 'ui') {
  const randomId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `${prefix}:${randomId}`
}
