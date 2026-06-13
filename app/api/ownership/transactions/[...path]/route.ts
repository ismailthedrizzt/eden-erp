// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// TARGET_FASTAPI_ENDPOINT: /api/v1/ownership/transactions
// TARGET_FASTAPI_ENDPOINTS:
// - /api/v1/ownership/transactions/approved

import { NextRequest } from 'next/server'
import { fastApiUnavailableResponse, proxyToFastApi } from '@/lib/backend/fastApiProxy'

export const runtime = 'nodejs'

type Context = { params: Promise<{ path?: string[] }> }

async function handler(request: NextRequest, context: Context) {
  const { path = [] } = await context.params
  const response = await proxyToFastApi(request, `/api/v1/ownership/transactions/${path.join('/')}`, { internal: true })
  return response || fastApiUnavailableResponse()
}

export { handler as GET, handler as POST, handler as PATCH, handler as DELETE }
