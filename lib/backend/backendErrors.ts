export type BackendErrorBody = {
  error?: string
  code?: string
  message?: string
  details?: unknown
  request_id?: string | null
  correlation_id?: string | null
}

export class BackendRequestError extends Error {
  status: number
  code?: string
  details?: unknown
  requestId?: string | null
  correlationId?: string | null

  constructor(message: string, status: number, body: BackendErrorBody = {}) {
    super(message)
    this.name = 'BackendRequestError'
    this.status = status
    this.code = body.code
    this.details = body.details
    this.requestId = body.request_id
    this.correlationId = body.correlation_id
  }
}

export function normalizeBackendError(payload: unknown, status: number) {
  const body = payload && typeof payload === 'object' ? payload as BackendErrorBody : {}
  return new BackendRequestError(
    body.message || body.error || 'Islem tamamlanamadi. Lutfen tekrar deneyin.',
    status,
    body,
  )
}
