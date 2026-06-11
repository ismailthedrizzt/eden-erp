// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// TARGET_FASTAPI_ENDPOINT: /api/v1/hr/sgk-codes
// NOTES: Thin Next.js proxy only. DB and Supabase access belong to FastAPI.

import { NextRequest } from 'next/server'
import { fastApiUnavailableResponse, proxyToFastApi } from '@/lib/backend/fastApiProxy'
import { referenceQueryRequiredResponse, wantsFullReferencePayload } from '../_boundedQuery'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const explicitFullPayload = wantsFullReferencePayload(request.nextUrl.searchParams)
  const boundedResponse = referenceQueryRequiredResponse(request.nextUrl.searchParams)
  if (boundedResponse && !explicitFullPayload) return boundedResponse

  const response = await proxyToFastApi(request, '/api/v1/hr/sgk-codes', { internal: true })
  return response || fastApiUnavailableResponse()
}
