// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// TARGET_FASTAPI_ENDPOINT: /api/v1/data-quality/rules
import { NextRequest } from 'next/server'
import { proxyToFastApiDataQuality } from '../_proxy'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  return proxyToFastApiDataQuality(request, '/api/v1/data-quality/rules')
}

