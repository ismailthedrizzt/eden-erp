// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// TARGET_FASTAPI_ENDPOINT: /api/v1/onboarding/workspace/skip
import { NextRequest } from 'next/server'
import { proxyToFastApiOnboarding } from '../../_proxy'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  return proxyToFastApiOnboarding(request, '/api/v1/onboarding/workspace/skip', { method: 'POST' })
}
