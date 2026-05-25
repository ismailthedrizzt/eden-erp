import { randomUUID } from 'crypto'
import { NextRequest } from 'next/server'

export const CLIENT_REQUEST_ID_HEADER = 'x-client-request-id'

export function resolveClientRequestId(request: NextRequest, body?: Record<string, any> | null) {
  return String(
    request.headers.get(CLIENT_REQUEST_ID_HEADER)
      || body?.client_request_id
      || body?.clientRequestId
      || randomUUID()
  )
}

export function stripOperationControlFields<T extends Record<string, any>>(body: T): T {
  const next = { ...body }
  delete next.client_request_id
  delete next.clientRequestId
  delete next.base_version
  delete next.baseVersion
  delete next.base_updated_at
  delete next.baseUpdatedAt
  return next
}

export function resolveBaseVersion(body?: Record<string, any> | null) {
  const value = body?.base_version ?? body?.baseVersion
  if (value === undefined || value === null || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

export function resolveBaseUpdatedAt(body?: Record<string, any> | null) {
  const value = body?.base_updated_at ?? body?.baseUpdatedAt
  return value ? String(value) : null
}

