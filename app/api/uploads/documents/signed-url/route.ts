// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// TARGET_FASTAPI_ENDPOINT: /api/v1/documents/uploads/signed-url
// NOTES: Thin Next.js proxy only. DB and local document storage access belong to FastAPI.

import { NextRequest, NextResponse } from 'next/server'
import { fastApiUnavailableResponse, proxyJsonToFastApi } from '@/lib/backend/fastApiProxy'
import { resolveTenantContext } from '@/lib/tenancy/server'

export const runtime = 'nodejs'

function clientStoragePath(payload: Record<string, unknown>) {
  const value = payload.storagePath || payload.storage_path || payload.path
  return typeof value === 'string' ? value.trim() : ''
}

export async function POST(request: NextRequest) {
  let payload: Record<string, unknown>
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON payload', code: 'INVALID_JSON_PAYLOAD' },
      { status: 400, headers: { 'cache-control': 'no-store, max-age=0' } }
    )
  }

  const tenantContext = resolveTenantContext(request)
  const requestedPath = clientStoragePath(payload)
  if (requestedPath && !requestedPath.startsWith(`tenants/${tenantContext.tenantId}/`)) {
    return NextResponse.json(
      { error: 'Storage path is outside tenant scope.', code: 'STORAGE_PATH_FORBIDDEN' },
      { status: 403, headers: { 'cache-control': 'no-store, max-age=0' } }
    )
  }

  const response = await proxyJsonToFastApi(request, '/api/v1/documents/uploads/signed-url', payload, { internal: true })
  return response || fastApiUnavailableResponse()
}
