// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// TARGET_FASTAPI_ENDPOINT: /api/v1/search/query
import { NextRequest } from 'next/server'
import { proxyToFastApiSearch } from '../_proxy'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  return proxyToFastApiSearch(request, '/api/v1/search/query', { timeoutMs: 20000 })
}
