// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// TARGET_FASTAPI_ENDPOINT: /api/v1/accounting/cari-accounts/{id}/summary
// NOTES: Cari account summary is calculated by FastAPI Accounting domain.

import { NextRequest } from 'next/server'
import { fastApiUnavailableResponse, proxyToFastApi } from '@/lib/backend/fastApiProxy'

export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const response = await proxyToFastApi(request, `/api/v1/accounting/cari-accounts/${id}/summary`)
  return response || fastApiUnavailableResponse()
}
