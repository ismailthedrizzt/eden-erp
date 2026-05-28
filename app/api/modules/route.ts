// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// TARGET_FASTAPI_ENDPOINT: /api/v1/modules
// NOTES: Module status/readiness/license decisions are canonical in FastAPI.

import { NextRequest } from 'next/server'
import { fastApiUnavailableResponse, proxyToFastApi } from '@/lib/backend/fastApiProxy'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const response = await proxyToFastApi(request, '/api/v1/modules')
  return response || fastApiUnavailableResponse()
}
