// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// TARGET_FASTAPI_ENDPOINT: /api/v1/accounting/cari-transactions/{id}
// NOTES: New accounting cari transaction detail route is proxy-only; no legacy fallback.

import { NextRequest } from 'next/server'
import { fastApiUnavailableResponse, proxyToFastApi } from '@/lib/backend/fastApiProxy'

export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const response = await proxyToFastApi(request, `/api/v1/accounting/cari-transactions/${id}`)
  return response || fastApiUnavailableResponse()
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const response = await proxyToFastApi(request, `/api/v1/accounting/cari-transactions/${id}`)
  return response || fastApiUnavailableResponse()
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const response = await proxyToFastApi(request, `/api/v1/accounting/cari-transactions/${id}`)
  return response || fastApiUnavailableResponse()
}
