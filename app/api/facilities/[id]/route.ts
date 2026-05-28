// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// TARGET_FASTAPI_ENDPOINT: /api/v1/facilities/{facility_id}
// NOTES: This route is a BFF/proxy compatibility layer. Do not add facility lifecycle logic here.

import { NextRequest } from 'next/server'
import { fastApiUnavailableResponse, proxyToFastApi } from '@/lib/backend/fastApiProxy'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const fastApiResponse = await proxyToFastApi(request, `/api/v1/facilities/${id}`)
  return fastApiResponse || fastApiUnavailableResponse()
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const fastApiResponse = await proxyToFastApi(request, `/api/v1/facilities/${id}`)
  return fastApiResponse || fastApiUnavailableResponse()
}
