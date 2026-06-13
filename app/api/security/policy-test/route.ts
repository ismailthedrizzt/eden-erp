// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// TARGET_FASTAPI_ENDPOINT: /api/v1/security/policy-test
import { NextRequest } from 'next/server'
import { proxyToFastApiSecurity } from '../_proxy'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  return proxyToFastApiSecurity(request, '/api/v1/security/policy-test')
}
