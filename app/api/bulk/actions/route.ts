// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// TARGET_FASTAPI_ENDPOINT: /api/v1/bulk/actions
import { NextRequest } from 'next/server'
import { proxyToFastApiImportExport } from '../_proxy'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  return proxyToFastApiImportExport(request, '/api/v1/bulk/actions', { timeoutMs: 30000 })
}
