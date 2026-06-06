// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// TARGET_FASTAPI_ENDPOINT: /api/v1/contracts
// NOTES: Contract list/create route is proxy-only; no legacy fallback.

import { NextRequest } from 'next/server'
import { proxyToFastApiContracts } from './_proxy'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  return proxyToFastApiContracts(request, '/api/v1/contracts')
}

export async function POST(request: NextRequest) {
  return proxyToFastApiContracts(request, '/api/v1/contracts')
}
