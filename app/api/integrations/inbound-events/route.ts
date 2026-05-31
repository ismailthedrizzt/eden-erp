// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// TARGET_FASTAPI_ENDPOINT: /api/v1/integrations/inbound-events
// NOTES: Inbound event admin list route is proxy-only. Public inbound webhook posts directly to FastAPI.

import { NextRequest } from 'next/server'
import { proxyToFastApiIntegrations } from '../_proxy'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  return proxyToFastApiIntegrations(request, '/api/v1/integrations/inbound-events')
}
