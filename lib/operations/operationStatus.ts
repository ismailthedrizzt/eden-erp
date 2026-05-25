import type { OperationStatus } from '@/lib/operations/types'

export const operationStatusLabels: Record<OperationStatus, string> = {
  accepted: 'İşlem Alındı',
  processing: 'İşleniyor',
  completed: 'Tamamlandı',
  failed: 'Başarısız',
  cancelled: 'İptal Edildi',
  requires_action: 'Müdahale Gerekli',
}

export function operationStatusMessage(status: OperationStatus) {
  if (status === 'accepted') return 'İşlem alındı ve işleniyor.'
  if (status === 'processing') return 'İşlem işleniyor.'
  if (status === 'completed') return 'İşlem tamamlandı.'
  if (status === 'failed') return 'İşlem tamamlanamadı.'
  if (status === 'requires_action') return 'İşlem için kullanıcı müdahalesi gerekiyor.'
  return 'İşlem iptal edildi.'
}

