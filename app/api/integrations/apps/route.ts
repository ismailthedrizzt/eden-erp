// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// TARGET_FASTAPI_ENDPOINT: /api/v1/integrations/apps
// NOTES: Integration apps collection route is proxy-only.

import { NextRequest } from 'next/server'
import { proxyToFastApiIntegrations } from '../_proxy'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  return proxyToFastApiIntegrations(request, '/api/v1/integrations/apps')
}

export async function POST(request: NextRequest) {
  return proxyToFastApiIntegrations(request, '/api/v1/integrations/apps')
}

