// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// TARGET_FASTAPI_ENDPOINT: /api/v1/accounting/cari-accounts
// NOTES: New accounting cari account route is proxy-only; no legacy fallback.

import { NextRequest } from 'next/server'
import { fastApiUnavailableResponse, proxyToFastApi } from '@/lib/backend/fastApiProxy'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const response = await proxyToFastApi(request, '/api/v1/accounting/cari-accounts')
  return response || fastApiUnavailableResponse()
}

export async function POST(request: NextRequest) {
  const response = await proxyToFastApi(request, '/api/v1/accounting/cari-accounts')
  return response || fastApiUnavailableResponse()
}
